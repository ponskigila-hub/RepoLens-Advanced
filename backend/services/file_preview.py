"""Safe, bounded text preview for a file inside a freshly cloned public repository."""
from __future__ import annotations

import re
from pathlib import Path, PurePosixPath
from typing import Any

from fastapi import HTTPException

MAX_PREVIEW_BYTES = 256 * 1024
TEXT_EXTENSIONS = {
    ".py", ".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".java", ".go", ".rs",
    ".rb", ".php", ".swift", ".kt", ".cs", ".scala", ".c", ".h", ".cpp", ".cc",
    ".hpp", ".html", ".css", ".scss", ".vue", ".svelte", ".sh", ".sql", ".md",
    ".txt", ".json", ".jsonc", ".toml", ".yaml", ".yml", ".xml", ".ini", ".cfg",
    ".conf", ".properties", ".mod", ".sum", ".gradle", ".lock", ".gitignore",
}
TEXT_FILENAMES = {
    "dockerfile", "makefile", "procfile", "gemfile", "gemspec", ".gitignore",
    ".dockerignore", ".editorconfig", ".env.example", ".env.sample", "example.env",
    "requirements.txt", "requirements-dev.txt", "go.mod", "cargo.toml", "license",
    "license.md", "copying", "notice", "notice.md",
}
BLOCKED_EXTENSIONS = {".pem", ".key", ".p12", ".pfx", ".p7b", ".p7c", ".jks", ".keystore", ".mobileprovision"}
BLOCKED_NAMES = {"id_rsa", "id_dsa", "id_ecdsa", "id_ed25519", "authorized_keys", "known_hosts"}
SECRET_ASSIGNMENT = re.compile(
    r"(?i)(\b[A-Za-z0-9_.-]*(?:api[_-]?key|client[_-]?secret|private[_-]?key|secret|password|token)"
    r"[A-Za-z0-9_.-]*['\"]?\s*[:=]\s*)(['\"]?)([^\s,;#'\"}]+)(['\"]?)"
)


def read_file_preview(repository_root: str, relative_path: str) -> dict[str, Any]:
    """Return a single UTF-8 text preview after strict path and content checks."""
    if not isinstance(relative_path, str) or not relative_path or len(relative_path) > 512 or "\\" in relative_path:
        raise HTTPException(status_code=422, detail="Provide a valid repository-relative file path.")
    relative = PurePosixPath(relative_path)
    if relative.is_absolute() or any(part in {"", ".", ".."} for part in relative.parts):
        raise HTTPException(status_code=422, detail="The file path must stay inside the repository.")

    name = relative.name.lower()
    suffix = Path(name).suffix.lower()
    if name == ".env" or (name.startswith(".env.") and name not in {".env.example", ".env.sample"}):
        raise HTTPException(status_code=403, detail="Environment files containing local values cannot be previewed.")
    if suffix in BLOCKED_EXTENSIONS or name in BLOCKED_NAMES:
        raise HTTPException(status_code=403, detail="Credential and private-key files are not available for preview.")
    if suffix not in TEXT_EXTENSIONS and name not in TEXT_FILENAMES:
        raise HTTPException(status_code=415, detail="This file type is not supported for text preview.")

    root = Path(repository_root).resolve(strict=True)
    candidate = root
    for part in relative.parts:
        candidate = candidate / part
        if candidate.is_symlink():
            raise HTTPException(status_code=403, detail="Symbolic-link targets are not available for preview.")
    try:
        resolved = candidate.resolve(strict=True)
        resolved.relative_to(root)
    except (OSError, ValueError):
        raise HTTPException(status_code=404, detail="The requested file was not found in this repository snapshot.") from None
    if not resolved.is_file():
        raise HTTPException(status_code=404, detail="The requested path is not a regular file.")

    try:
        size = resolved.stat().st_size
    except OSError:
        raise HTTPException(status_code=404, detail="The requested file could not be read.") from None
    if size > MAX_PREVIEW_BYTES:
        raise HTTPException(status_code=413, detail=f"Preview is limited to {MAX_PREVIEW_BYTES // 1024} KiB per file.")
    try:
        raw = resolved.read_bytes()
    except OSError:
        raise HTTPException(status_code=404, detail="The requested file could not be read.") from None
    if b"\x00" in raw:
        raise HTTPException(status_code=415, detail="Binary files are listed but cannot be previewed as text.")
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=415, detail="Only UTF-8 text files can be previewed.") from None

    redacted = 0

    def redact(match: re.Match[str]) -> str:
        nonlocal redacted
        value = match.group(3).strip().strip("'\"")
        if value and value.lower() not in {"none", "null", "true", "false", "your_key_here", "changeme"}:
            redacted += 1
            return f"{match.group(1)}[REDACTED]"
        return match.group(0)

    text = SECRET_ASSIGNMENT.sub(redact, text)
    return {
        "path": relative.as_posix(),
        "content": text,
        "size_bytes": size,
        "redacted_values": redacted,
        "note": "Previewed on demand from a public repository. Secret-shaped assignments are redacted; this heuristic may not catch every secret." if redacted else "Previewed on demand from a public repository. This is a static text view; no repository code was executed.",
    }
