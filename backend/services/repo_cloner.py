"""Shallow, time-bounded GitHub repository fetcher."""
from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
import uuid
from pathlib import Path
from urllib.parse import urlparse


class RepoCloner:
    def __init__(self, temp_dir: str | None = None, timeout_seconds: int = 60):
        self.temp_dir = Path(temp_dir or os.getenv("REPOLENS_TEMP_DIR", tempfile.gettempdir() + "/repolens-repos")).resolve()
        self.timeout_seconds = max(5, int(timeout_seconds))
        self.temp_dir.mkdir(parents=True, exist_ok=True)

    @staticmethod
    def parse_github_url(url: str) -> tuple[str, str] | None:
        try:
            parsed = urlparse(url.strip())
            if parsed.scheme != "https" or (parsed.hostname or "").lower() != "github.com" or parsed.port not in (None, 443) or parsed.username or parsed.password:
                return None
            parts = [p for p in parsed.path.strip("/").split("/") if p]
            if len(parts) != 2:
                return None
            owner, repo = parts
            if repo.endswith(".git"):
                repo = repo[:-4]
            safe = lambda value: bool(value) and all(c.isalnum() or c in "-_." for c in value) and value not in {".", ".."}
            return (owner, repo) if safe(owner) and safe(repo) else None
        except (ValueError, TypeError):
            return None

    def validate_github_url(self, url: str) -> bool:
        return self.parse_github_url(url) is not None

    def get_repo_name(self, url: str) -> str:
        parts = self.parse_github_url(url)
        return f"{parts[0]}/{parts[1]}" if parts else "unknown/unknown"

    def clone_repository(self, github_url: str) -> dict:
        parsed = self.parse_github_url(github_url)
        if not parsed:
            return {"success": False, "error": "Provide a public GitHub repository URL in the form https://github.com/owner/repository."}
        owner, repo = parsed
        local_path = self.temp_dir / f"repo-{uuid.uuid4().hex}"
        normalized_url = f"https://github.com/{owner}/{repo}.git"
        env = {**os.environ, "GIT_TERMINAL_PROMPT": "0", "GIT_LFS_SKIP_SMUDGE": "1"}
        command = ["git", "-c", "core.hooksPath=/dev/null", "clone", "--depth=1", "--single-branch", "--no-tags", "--filter=blob:none", normalized_url, str(local_path)]
        try:
            result = subprocess.run(command, capture_output=True, text=True, timeout=self.timeout_seconds, env=env, check=False)
            if result.returncode:
                self.cleanup_repo(str(local_path))
                detail = (result.stderr or result.stdout or "git clone failed").strip()[-1200:]
                return {"success": False, "error": f"Unable to clone repository: {detail}"}
            return {"success": True, "local_path": str(local_path), "repo_name": f"{owner}/{repo}", "owner": owner, "repository": repo, "clone_depth": 1}
        except subprocess.TimeoutExpired:
            self.cleanup_repo(str(local_path))
            return {"success": False, "error": f"Repository clone exceeded the {self.timeout_seconds}-second time limit."}
        except OSError as exc:
            self.cleanup_repo(str(local_path))
            return {"success": False, "error": f"Git is unavailable or clone failed: {exc}"}

    def cleanup_repo(self, local_path: str) -> bool:
        try:
            path = Path(local_path).resolve()
            if path.parent != self.temp_dir or not path.name.startswith("repo-"):
                return False
            if path.exists():
                shutil.rmtree(path)
            return True
        except OSError:
            return False
