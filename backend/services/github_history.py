"""Bounded, best-effort GitHub commit activity and complexity-change history."""
from __future__ import annotations

import copy
import json
import os
import re
import threading
import time
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen


_HEX_SHA = re.compile(r"^[0-9a-fA-F]{7,64}$")
_SOURCE_EXTENSIONS = {
    ".py", ".pyi", ".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".go", ".rs",
    ".java", ".cs", ".c", ".h", ".cc", ".cpp", ".hh", ".hpp", ".rb", ".php",
    ".swift", ".kt", ".kts", ".scala", ".vue", ".svelte",
}
_PYTHON_DECISIONS = re.compile(r"\b(?:if|elif|for|while|except)\b|\b(?:and|or)\b")
_OTHER_DECISIONS = re.compile(r"\b(?:if|for|while|catch|case|switch|match|select|when)\b|&&|\|\|")
_COMMENT_PREFIXES = ("#", "//", "/*", "*", "<!--")


class GitHubHistoryService:
    """Fetch commit activity plus a small, cacheable sample of source diffs.

    The complexity signal is explicitly a branch-token change proxy from GitHub
    patches. It is not a full-history AST/cyclomatic-complexity recomputation.
    """

    API_ROOT = "https://api.github.com"
    TIMEOUT_SECONDS = 2.5
    MAX_RESPONSE_BYTES = 2 * 1024 * 1024
    COMMIT_LIMIT = 30
    PATCH_SAMPLE_LIMIT = 8
    CACHE_TTL_SECONDS = 900
    CACHE_MAX_ENTRIES = 256

    def __init__(self) -> None:
        self._cache: OrderedDict[str, tuple[float, dict[str, Any]]] = OrderedDict()
        self._lock = threading.Lock()

    def fetch(self, owner: str, repository: str) -> dict[str, Any]:
        cache_key = f"{owner.casefold()}/{repository.casefold()}"
        now = time.monotonic()
        with self._lock:
            cached = self._cache.get(cache_key)
            if cached and now - cached[0] < self.CACHE_TTL_SECONDS:
                self._cache.move_to_end(cache_key)
                return copy.deepcopy(cached[1])
            if cached:
                del self._cache[cache_key]

        safe_owner = quote(owner, safe="")
        safe_repository = quote(repository, safe="")
        repo_path = f"{self.API_ROOT}/repos/{safe_owner}/{safe_repository}"

        activity: list[dict[str, Any]] = []
        activity_status = "unavailable"
        try:
            payload, _headers, status_code = self._get_json(f"{repo_path}/stats/commit_activity")
            if status_code == 202:
                activity_status = "pending"
            elif status_code == 200 and isinstance(payload, list):
                activity = self._normalize_activity(payload)
                activity_status = "available"
            elif status_code == 204:
                activity_status = "unavailable"
        except (HTTPError, URLError, TimeoutError, OSError, ValueError, json.JSONDecodeError):
            activity_status = "unavailable"

        commit_payload: list[Any] = []
        commits_status = "unavailable"
        try:
            payload, _headers, status_code = self._get_json(f"{repo_path}/commits?per_page={self.COMMIT_LIMIT}")
            if status_code == 200 and isinstance(payload, list):
                commit_payload = payload[: self.COMMIT_LIMIT]
                commits_status = "available"
            elif status_code == 200 and payload == []:
                commits_status = "available"
        except (HTTPError, URLError, TimeoutError, OSError, ValueError, json.JSONDecodeError):
            commits_status = "unavailable"

        normalized = [self._normalize_commit(item, owner, repository) for item in commit_payload]
        normalized = [item for item in normalized if item is not None]
        details = self._fetch_commit_details(repo_path, self._sample_patch_commits(normalized))
        for commit in normalized:
            detail = details.get(commit["sha"])
            if detail is None:
                continue
            stats = detail.get("stats") if isinstance(detail.get("stats"), dict) else {}
            commit["additions"] = _nonnegative_int(stats.get("additions"))
            commit["deletions"] = _nonnegative_int(stats.get("deletions"))
            commit["changed_files"] = _nonnegative_int(stats.get("total"))
            commit["complexity_change"] = self._complexity_change(detail.get("files"))

        trend = self._complexity_trend(normalized)
        if activity_status == "available" and commits_status == "available":
            status = "available"
            note = "Weekly activity and the recent commit sample were retrieved from GitHub."
        elif activity_status != "unavailable" or commits_status == "available":
            status = "partial"
            note = "Some history is unavailable. GitHub may still be preparing repository statistics or may have rate-limited this request."
        else:
            status = "unavailable"
            note = "GitHub history is temporarily unavailable or rate-limited; the repository analysis remains available."

        if activity_status == "pending":
            activity_note = "GitHub is preparing its weekly statistics. Try again later; the recent commit list may still be available."
        elif activity_status == "available":
            activity_note = "GitHub-reported commit totals grouped by week for roughly the last year; merge commits are excluded by GitHub's statistics."
        else:
            activity_note = "Weekly activity statistics were not available from GitHub for this request."

        result = {
            "status": status,
            "source": "GitHub REST API",
            "activity_status": activity_status,
            "weekly_activity": activity,
            "activity_note": activity_note,
            "recent_commits": normalized,
            "complexity_trend": trend,
            "complexity_note": (
                "Trend is a per-commit change proxy from branch/decision tokens on up to eight source-code patches sampled across the 30-commit window. "
                "Patch omissions, unsupported syntax, refactors, token text in strings, and non-Python language heuristics can affect it; it is not a full-repository cyclomatic-complexity history."
            ),
            "commit_limit": self.COMMIT_LIMIT,
            "complexity_sample_limit": self.PATCH_SAMPLE_LIMIT,
            "note": note,
        }
        if status != "unavailable":
            with self._lock:
                self._cache[cache_key] = (time.monotonic(), copy.deepcopy(result))
                self._cache.move_to_end(cache_key)
                while len(self._cache) > self.CACHE_MAX_ENTRIES:
                    self._cache.popitem(last=False)
        return result

    @classmethod
    def _sample_patch_commits(cls, commits: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if len(commits) <= cls.PATCH_SAMPLE_LIMIT:
            return commits
        indices = [round(index * (len(commits) - 1) / (cls.PATCH_SAMPLE_LIMIT - 1)) for index in range(cls.PATCH_SAMPLE_LIMIT)]
        return [commits[index] for index in indices]

    def _fetch_commit_details(self, repo_path: str, commits: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
        def fetch_one(commit: dict[str, Any]) -> tuple[str, dict[str, Any] | None]:
            sha = commit["sha"]
            try:
                payload, _headers, status_code = self._get_json(f"{repo_path}/commits/{quote(sha, safe='')}")
                if status_code == 200 and isinstance(payload, dict):
                    return sha, payload
            except (HTTPError, URLError, TimeoutError, OSError, ValueError, json.JSONDecodeError):
                pass
            return sha, None

        if not commits:
            return {}
        with ThreadPoolExecutor(max_workers=min(4, len(commits))) as pool:
            return dict(pool.map(fetch_one, commits))

    def _get_json(self, url: str) -> tuple[Any, dict[str, str], int]:
        headers = {
            "Accept": "application/vnd.github+json",
            "User-Agent": "RepoLens-Advanced/1.0",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        token = os.getenv("GITHUB_TOKEN", "").strip()
        if token:
            headers["Authorization"] = f"Bearer {token}"
        request = Request(url, headers=headers, method="GET")
        with urlopen(request, timeout=self.TIMEOUT_SECONDS) as response:
            status_code = getattr(response, "status", 200)
            body = response.read(self.MAX_RESPONSE_BYTES + 1)
            if len(body) > self.MAX_RESPONSE_BYTES:
                raise ValueError("GitHub history API response exceeded the configured size limit")
            payload = json.loads(body.decode("utf-8")) if body else None
            response_headers = {key: value for key, value in response.headers.items()}
            return payload, response_headers, status_code

    @staticmethod
    def _normalize_activity(items: list[Any]) -> list[dict[str, Any]]:
        normalized: list[dict[str, Any]] = []
        for item in items:
            if not isinstance(item, dict):
                continue
            week = item.get("week")
            total = _nonnegative_int(item.get("total"))
            if not isinstance(week, (int, float)) or total is None:
                continue
            try:
                week_start = datetime.fromtimestamp(week, timezone.utc).date().isoformat()
            except (OverflowError, OSError, ValueError):
                continue
            normalized.append({"week_start": week_start, "commits": total})
        return sorted(normalized, key=lambda item: item["week_start"])[-52:]

    @staticmethod
    def _normalize_commit(item: Any, owner: str, repository: str) -> dict[str, Any] | None:
        if not isinstance(item, dict):
            return None
        sha = item.get("sha")
        if not isinstance(sha, str) or not _HEX_SHA.fullmatch(sha):
            return None
        commit_data = item.get("commit") if isinstance(item.get("commit"), dict) else {}
        author = commit_data.get("author") if isinstance(commit_data.get("author"), dict) else {}
        committer = commit_data.get("committer") if isinstance(commit_data.get("committer"), dict) else {}
        date = author.get("date") or committer.get("date")
        message = commit_data.get("message")
        first_line = message.splitlines()[0].strip() if isinstance(message, str) and message.splitlines() else "Commit message unavailable"
        url = f"https://github.com/{quote(owner, safe='')}/{quote(repository, safe='')}/commit/{quote(sha, safe='')}"
        return {
            "sha": sha,
            "short_sha": sha[:7],
            "date": date if isinstance(date, str) else None,
            "message": first_line[:180],
            "url": url,
            "additions": None,
            "deletions": None,
            "changed_files": None,
            "complexity_change": None,
        }

    @staticmethod
    def _complexity_change(files: Any) -> dict[str, Any] | None:
        if not isinstance(files, list):
            return None
        source_files = 0
        patched_source_files = 0
        added_points = removed_points = 0
        for item in files:
            if not isinstance(item, dict):
                continue
            filename = item.get("filename")
            if not isinstance(filename, str) or os.path.splitext(filename)[1].lower() not in _SOURCE_EXTENSIONS:
                continue
            source_files += 1
            patch = item.get("patch")
            if not isinstance(patch, str):
                continue
            patched_source_files += 1
            pattern = _PYTHON_DECISIONS if os.path.splitext(filename)[1].lower() in {".py", ".pyi"} else _OTHER_DECISIONS
            for line in patch.splitlines():
                if line.startswith(("+++", "---")) or not line or line[0] not in "+-":
                    continue
                code = line[1:].strip()
                if not code or code.startswith(_COMMENT_PREFIXES):
                    continue
                matches = len(pattern.findall(code))
                if line[0] == "+":
                    added_points += matches
                else:
                    removed_points += matches
        if source_files == 0:
            return None
        return {
            "added_decision_points": added_points,
            "removed_decision_points": removed_points,
            "net_decision_points": added_points - removed_points,
            "source_files_changed": source_files,
            "source_files_with_patch": patched_source_files,
            "patch_coverage_percent": round(100 * patched_source_files / source_files, 1),
        }

    @staticmethod
    def _complexity_trend(commits: list[dict[str, Any]]) -> list[dict[str, Any]]:
        analyzable = [
            commit for commit in commits
            if isinstance(commit.get("date"), str)
            and isinstance(commit.get("complexity_change"), dict)
            and commit["complexity_change"].get("source_files_with_patch", 0) > 0
        ]
        analyzable.sort(key=lambda item: (item.get("date") or "", item["sha"]))
        trend: list[dict[str, Any]] = []
        for commit in analyzable:
            delta = commit["complexity_change"]["net_decision_points"]
            trend.append({
                "sha": commit["short_sha"],
                "date": commit["date"],
                "message": commit["message"],
                "net_decision_points": delta,
                "patch_coverage_percent": commit["complexity_change"]["patch_coverage_percent"],
            })
        return trend


def _nonnegative_int(value: Any) -> int | None:
    return value if isinstance(value, int) and not isinstance(value, bool) and value >= 0 else None
