"""Best-effort public GitHub metadata; failures never invalidate static analysis."""
from __future__ import annotations

import copy
import json
import os
import threading
import time
from collections import OrderedDict
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen


class GitHubMetadataService:
    """Fetch repository creation/owner data and a bounded contributor sample.

    Public endpoints work without credentials. ``GITHUB_TOKEN`` is optional and
    should only be configured as a deployment secret to raise API rate limits.
    No repository contents are uploaded by this service.
    """

    API_ROOT = "https://api.github.com"
    TIMEOUT_SECONDS = 1.5
    MAX_RESPONSE_BYTES = 1024 * 1024
    CONTRIBUTOR_LIMIT = 10
    CACHE_TTL_SECONDS = 900
    CACHE_MAX_ENTRIES = 512

    def __init__(self) -> None:
        self._cache: OrderedDict[str, tuple[float, dict]] = OrderedDict()
        self._lock = threading.Lock()

    def fetch(self, owner: str, repository: str) -> dict:
        cache_key = f"{owner.casefold()}/{repository.casefold()}"
        now = time.monotonic()
        with self._lock:
            cached = self._cache.get(cache_key)
            if cached and now - cached[0] < self.CACHE_TTL_SECONDS:
                self._cache.move_to_end(cache_key)
                return copy.deepcopy(cached[1])
            if cached:
                del self._cache[cache_key]

        safe_owner, safe_repository = quote(owner, safe=""), quote(repository, safe="")
        repo_url = f"{self.API_ROOT}/repos/{safe_owner}/{safe_repository}"
        contributors_url = f"{repo_url}/contributors?per_page={self.CONTRIBUTOR_LIMIT}"
        repository_data = None
        contributors_data = None
        contributors_truncated = False
        contributors_error = False

        try:
            repository_data, _ = self._get_json(repo_url)
        except (HTTPError, URLError, TimeoutError, OSError, ValueError, json.JSONDecodeError):
            repository_data = None

        try:
            contributors_data, headers = self._get_json(contributors_url)
            contributors_truncated = "rel=\"next\"" in headers.get("Link", "")
        except (HTTPError, URLError, TimeoutError, OSError, ValueError, json.JSONDecodeError):
            contributors_error = True

        owner_data = None
        created_at = None
        if isinstance(repository_data, dict):
            raw_owner = repository_data.get("owner")
            if isinstance(raw_owner, dict) and isinstance(raw_owner.get("login"), str):
                login = raw_owner["login"]
                owner_data = {
                    "login": login,
                    "type": raw_owner.get("type") if isinstance(raw_owner.get("type"), str) else None,
                    "html_url": f"https://github.com/{quote(login, safe='')}",
                    "avatar_url": raw_owner.get("avatar_url") if isinstance(raw_owner.get("avatar_url"), str) else None,
                }
            raw_created_at = repository_data.get("created_at")
            if isinstance(raw_created_at, str):
                created_at = raw_created_at

        contributors = []
        if isinstance(contributors_data, list):
            for item in contributors_data[: self.CONTRIBUTOR_LIMIT]:
                if not isinstance(item, dict) or not isinstance(item.get("login"), str):
                    continue
                login = item["login"]
                count = item.get("contributions")
                contributors.append({
                    "login": login,
                    "contributions": count if isinstance(count, int) and count >= 0 else None,
                    "html_url": f"https://github.com/{quote(login, safe='')}",
                    "avatar_url": item.get("avatar_url") if isinstance(item.get("avatar_url"), str) else None,
                })

        if contributors_error:
            contributors_status = "unavailable"
        elif contributors:
            contributors_status = "available"
        else:
            contributors_status = "none_reported"

        repository_available = owner_data is not None or created_at is not None
        if repository_available and not contributors_error:
            status = "available"
        elif repository_available or (not contributors_error and isinstance(contributors_data, list)):
            status = "partial"
        else:
            status = "unavailable"

        if status == "available":
            note = "Public GitHub API metadata. Contributors are the first 10 named accounts ordered by contribution count; the list may be truncated."
        elif status == "partial":
            note = "Some GitHub metadata could not be retrieved. Repository file analysis completed independently."
        else:
            note = "GitHub metadata is temporarily unavailable or rate-limited. Repository file analysis completed independently."
        result = {
            "status": status,
            "created_at": created_at,
            "owner": owner_data,
            "contributors": contributors,
            "contributors_status": contributors_status,
            "contributors_truncated": contributors_truncated,
            "contributors_limit": self.CONTRIBUTOR_LIMIT,
            "source": "GitHub REST API",
            "note": note,
        }

        # Cache successful/partial lookups, not transient all-endpoint failures.
        if status != "unavailable":
            with self._lock:
                self._cache[cache_key] = (time.monotonic(), copy.deepcopy(result))
                self._cache.move_to_end(cache_key)
                while len(self._cache) > self.CACHE_MAX_ENTRIES:
                    self._cache.popitem(last=False)
        return result

    def _get_json(self, url: str) -> tuple[object, dict[str, str]]:
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
            body = response.read(self.MAX_RESPONSE_BYTES + 1)
            if len(body) > self.MAX_RESPONSE_BYTES:
                raise ValueError("GitHub API response exceeded the configured size limit")
            payload = json.loads(body.decode("utf-8"))
            return payload, {key: value for key, value in response.headers.items()}
