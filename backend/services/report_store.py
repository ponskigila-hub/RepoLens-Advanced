"""SQLite persistence for explicitly shared, unlisted RepoLens reports."""
from __future__ import annotations
from contextlib import closing


import json
import os
import re
import secrets
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


class ReportStore:
    MAX_REPORT_BYTES = 8 * 1024 * 1024
    REPO_NAME_RE = re.compile(r"^[A-Za-z0-9_.-]{1,100}/[A-Za-z0-9_.-]{1,100}$")

    def __init__(self, db_path: str | Path | None = None):
        configured = db_path or os.getenv("REPORT_DB_PATH")
        self.db_path = Path(configured) if configured else Path(__file__).resolve().parents[1] / "data" / "reports.sqlite3"

    def _connect(self) -> sqlite3.Connection:
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(self.db_path, timeout=10)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA journal_mode=WAL")
        connection.execute(
            """CREATE TABLE IF NOT EXISTS reports (
                id TEXT PRIMARY KEY,
                repository_full_name TEXT NOT NULL,
                repository_key TEXT NOT NULL,
                owner TEXT NOT NULL,
                name TEXT NOT NULL,
                quality_score REAL NOT NULL,
                created_at TEXT NOT NULL,
                report_json TEXT NOT NULL
            )"""
        )
        connection.execute("CREATE INDEX IF NOT EXISTS idx_reports_repo_latest ON reports(repository_key, created_at DESC)")
        return connection

    @staticmethod
    def _identity(result: dict[str, Any]) -> tuple[str, str, str, float]:
        repository = result.get("repository") or {}
        full_name = repository.get("full_name")
        if not isinstance(full_name, str) or not ReportStore.REPO_NAME_RE.fullmatch(full_name):
            raise ValueError("The analysis result does not contain a valid owner/repository identity.")
        owner, name = full_name.split("/", 1)
        scores = result.get("scores") or {}
        score = (scores.get("quality") or scores.get("overall_quality") or {}).get("score")
        if score is None:
            score = (result.get("ml_scores") or {}).get("overall_quality")
        if isinstance(score, bool) or not isinstance(score, (int, float)) or not 0 <= float(score) <= 100:
            raise ValueError("The analysis result does not contain a valid quality score.")
        return owner, name, full_name, float(score)

    def save(self, result: dict[str, Any]) -> dict[str, Any]:
        if not isinstance(result, dict) or result.get("success") is not True:
            raise ValueError("Only completed repository analyses can be saved.")
        owner, name, full_name, score = self._identity(result)
        try:
            serialized = json.dumps(result, ensure_ascii=False, allow_nan=False, separators=(",", ":"))
        except (TypeError, ValueError) as exc:
            raise ValueError("The analysis result contains values that cannot be safely stored as JSON.") from exc
        if len(serialized.encode("utf-8")) > self.MAX_REPORT_BYTES:
            raise ValueError(f"The report is too large to store (maximum {self.MAX_REPORT_BYTES // (1024 * 1024)} MiB).")

        report_id = secrets.token_urlsafe(15)
        created_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
        with closing(self._connect()) as connection, connection:
            connection.execute(
                "INSERT INTO reports(id, repository_full_name, repository_key, owner, name, quality_score, created_at, report_json) VALUES(?, ?, ?, ?, ?, ?, ?, ?)",
                (report_id, full_name, full_name.casefold(), owner, name, score, created_at, serialized),
            )
        return self._metadata(report_id, owner, name, full_name, score, created_at)

    @staticmethod
    def _metadata(report_id: str, owner: str, name: str, full_name: str, score: float, created_at: str) -> dict[str, Any]:
        return {
            "id": report_id,
            "repository": {"owner": owner, "name": name, "full_name": full_name},
            "quality_score": score,
            "created_at": created_at,
            "report_url": f"/reports/{report_id}",
            "badge_url": f"/badge/{owner}/{name}.svg",
            "visibility": "public_unlisted",
        }

    def get(self, report_id: str) -> dict[str, Any] | None:
        with closing(self._connect()) as connection, connection:
            row = connection.execute("SELECT * FROM reports WHERE id = ?", (report_id,)).fetchone()
        if row is None:
            return None
        return {
            **self._metadata(row["id"], row["owner"], row["name"], row["repository_full_name"], row["quality_score"], row["created_at"]),
            "result": json.loads(row["report_json"]),
        }

    def latest_for_repository(self, owner: str, name: str) -> dict[str, Any] | None:
        full_name = f"{owner}/{name}"
        with closing(self._connect()) as connection, connection:
            row = connection.execute(
                "SELECT * FROM reports WHERE repository_key = ? ORDER BY created_at DESC, rowid DESC LIMIT 1",
                (full_name.casefold(),),
            ).fetchone()
        if row is None:
            return None
        return self._metadata(row["id"], row["owner"], row["name"], row["repository_full_name"], row["quality_score"], row["created_at"])
