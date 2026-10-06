from __future__ import annotations

import html
import re
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from starlette.responses import Response

from services.report_store import ReportStore

api_router = APIRouter()
badge_router = APIRouter()
report_store = ReportStore()
REPORT_ID_RE = re.compile(r"^[A-Za-z0-9_-]{12,64}$")
REPO_PART_RE = re.compile(r"^[A-Za-z0-9_.-]{1,100}$")


class SaveReportRequest(BaseModel):
    result: dict[str, Any]


@api_router.post("/reports", status_code=201)
def save_report(request: SaveReportRequest):
    try:
        return report_store.save(request.result)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@api_router.get("/reports/{report_id}")
def get_report(report_id: str):
    if not REPORT_ID_RE.fullmatch(report_id):
        raise HTTPException(status_code=404, detail="Report not found.")
    report = report_store.get(report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found.")
    return report


@badge_router.get("/badge/{owner}/{repository}")
def repository_badge(owner: str, repository: str):
    if not repository.endswith(".svg"):
        raise HTTPException(status_code=404, detail="Use the .svg badge URL.")
    name = repository[:-4]
    if not REPO_PART_RE.fullmatch(owner) or not REPO_PART_RE.fullmatch(name):
        raise HTTPException(status_code=404, detail="Repository badge not found.")
    report = report_store.latest_for_repository(owner, name)
    if report is None:
        raise HTTPException(status_code=404, detail="No saved RepoLens report exists for this repository yet.")

    score = float(report["quality_score"])
    color = "#47734f" if score >= 80 else "#98712f" if score >= 60 else "#a55a4e"
    label = html.escape(f"RepoLens score for {owner}/{name}", quote=True)
    score_label = html.escape(f"{score:.1f}/100", quote=True)
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="250" height="32" role="img" aria-label="{label} score {score_label}" viewBox="0 0 250 32">
  <title>{label}: {score_label}</title>
  <rect width="250" height="32" rx="6" fill="#f4f1e8" stroke="#d8ddd2"/>
  <path d="M6 0h158v32H6a6 6 0 0 1-6-6V6a6 6 0 0 1 6-6Z" fill="#203229"/>
  <path d="M164 0h80a6 6 0 0 1 6 6v20a6 6 0 0 1-6 6h-80Z" fill="{color}"/>
  <text x="85" y="20.5" text-anchor="middle" fill="#fffefa" font-family="Arial,sans-serif" font-size="12" font-weight="600">RepoLens Score</text>
  <text x="204" y="20.5" text-anchor="middle" fill="#fffefa" font-family="Arial,sans-serif" font-size="12" font-weight="700">{score:.1f}/100</text>
</svg>'''
    return Response(
        content=svg,
        media_type="image/svg+xml",
        headers={"Cache-Control": "public, max-age=300", "X-Content-Type-Options": "nosniff"},
    )
