from __future__ import annotations

import asyncio
from collections import Counter
import json
from pathlib import Path
import re
from typing import Any, Callable
from urllib.parse import urlparse

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from starlette.responses import StreamingResponse
from starlette.concurrency import run_in_threadpool

from services.analysis_service import AnalysisService
from services.file_scanner import FileScanner
from services.file_preview import read_file_preview
from services.github_metadata import GitHubMetadataService
from services.github_history import GitHubHistoryService
from services.prompt_builder import PromptBuilder
from services.repo_cloner import RepoCloner
from services.static_analyzer import StaticAnalyzer

router = APIRouter()
repo_cloner = RepoCloner()
prompt_builder = PromptBuilder()
analysis_service = AnalysisService()
static_analyzer = StaticAnalyzer()
github_metadata_service = GitHubMetadataService()
github_history_service = GitHubHistoryService()


class AnalyzeRequest(BaseModel):
    github_url: str = Field(min_length=1, max_length=500)
    use_mock: bool = False  # Kept for backwards compatibility; scores are never mocked.
    include_llm: bool = True


class FilePreviewRequest(BaseModel):
    github_url: str = Field(min_length=1, max_length=500)
    path: str = Field(min_length=1, max_length=512)


class HistoryRequest(BaseModel):
    github_url: str = Field(min_length=1, max_length=500)


class AnalyzeResponse(BaseModel):
    success: bool
    schema_version: str
    repository: dict[str, Any]
    repo_info: dict[str, Any]
    metrics: dict[str, Any]
    scores: dict[str, Any]
    score_methodology: dict[str, Any]
    file_breakdown: dict[str, Any]
    files: list[dict[str, Any]]
    folder_breakdown: list[dict[str, Any]]
    insights: dict[str, Any]
    quick_fix_checklist: dict[str, Any]
    ml_scores: dict[str, Any]
    repository_overview: dict[str, Any]
    code_overview: dict[str, Any]
    github_metadata: dict[str, Any]
    creator_information: dict[str, Any]
    technology_stack: dict[str, Any]
    architecture_overview: dict[str, Any]
    architecture_analysis: dict[str, Any]
    important_files: list[dict[str, Any]]
    onboarding_guide: list[dict[str, Any]]
    project_guide: dict[str, Any]
    code_quality_analysis: list[dict[str, Any]]
    security_analysis: list[dict[str, Any]]
    performance_analysis: list[dict[str, Any]]
    improvement_suggestions: list[dict[str, Any]]
    final_summary: dict[str, Any]
    error: str | None = None


def _emit_progress(progress: Callable[[dict[str, Any]], None] | None, stage: str, message: str, completed_steps: int) -> None:
    if progress:
        progress({"stage": stage, "message": message, "completed_steps": completed_steps, "total_steps": 4})


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_repository(request: AnalyzeRequest):
    return await _run_analysis(request)


@router.post("/analyze/stream")
async def analyze_repository_stream(request: AnalyzeRequest):
    async def event_stream():
        queue: asyncio.Queue[dict[str, Any] | None] = asyncio.Queue()
        task = asyncio.create_task(_run_analysis(request, queue.put_nowait))
        task.add_done_callback(lambda _: queue.put_nowait(None))
        yield ": connected\n\n"
        while True:
            event = await queue.get()
            if event is None:
                break
            yield f"event: progress\ndata: {json.dumps(event, separators=(',', ':'))}\n\n"
        try:
            result = task.result()
        except HTTPException as exc:
            payload = json.dumps({"detail": exc.detail, "status": exc.status_code}, separators=(',', ':'))
            yield f"event: error\ndata: {payload}\n\n"
            return
        except Exception:
            yield 'event: error\ndata: {"detail":"Analysis failed unexpectedly."}\n\n'
            return
        yield f"event: result\ndata: {result.model_dump_json()}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream", headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"})


async def _run_analysis(request: AnalyzeRequest, progress: Callable[[dict[str, Any]], None] | None = None):
    _emit_progress(progress, "fetch", "Validating the public GitHub URL and fetching a depth-1 snapshot.", 0)
    if not repo_cloner.validate_github_url(request.github_url):
        raise HTTPException(status_code=422, detail="Provide a public GitHub repository URL in the form https://github.com/owner/repository.")
    clone = await run_in_threadpool(repo_cloner.clone_repository, request.github_url)
    if not clone.get("success"):
        raise HTTPException(status_code=400, detail=clone.get("error", "Repository clone failed."))
    local_path = clone["local_path"]
    try:
        _emit_progress(progress, "inventory", "Snapshot received; walking repository paths and parsing manifests.", 1)
        scan, github_metadata = await asyncio.gather(
            run_in_threadpool(FileScanner(local_path).scan),
            _best_effort_github_metadata(clone["owner"], clone["repository"]),
        )
        if not scan.get("success"):
            raise HTTPException(status_code=500, detail=scan.get("error", "Repository scan failed."))
        _emit_progress(progress, "metrics", f"Inventory complete ({scan.get('file_count', 0)} paths); measuring AST and static-code signals.", 2)
        static = await run_in_threadpool(static_analyzer.analyze, scan)
        owner, name = clone["owner"], clone["repository"]
        scores = static["scores"]
        score_values = {key: value["score"] for key, value in scores.items()}
        insights = _build_insights(scan, static)
        llm_state = {"status": "not_requested", "provider": None, "model": None, "text": None, "error": None}
        _emit_progress(progress, "report", "Scores measured; assembling findings and the structured report.", 3)
        if request.include_llm and not request.use_mock:
            prompt = prompt_builder.build_static_analysis_prompt(clone["repo_name"], scan, static)
            llm_state = await run_in_threadpool(analysis_service.generate_insights, prompt)
        insights["llm"] = llm_state
        files = scan.get("files", [])
        project_overview = _project_overview(scan, clone["repo_name"], technologies=scan.get("technologies", []))
        code_overview = _code_overview(scan)
        quick_fix_checklist = _quick_fix_checklist(scan)
        categories = Counter(f.get("category", "other") for f in files)
        important = [_important_file(f) for f in scan.get("important_files", [])[:30]]
        technologies = scan.get("technologies", [])
        source_dirs = sorted({Path(f["path"]).parts[0] for f in files if f["category"] == "source" and len(Path(f["path"]).parts) > 1})
        layers = [name for name in source_dirs if name.lower() in StaticAnalyzer.LAYER_NAMES]
        architecture = {
            "architecture_type": _architecture_type(technologies, layers),
            "architecture_explanation": f"Detected {len(source_dirs)} top-level source directories and {len(layers)} recognized layer directories: {', '.join(layers) if layers else 'none detected'}.",
            "design_patterns": _patterns(technologies, layers),
            "folder_structure": {"structure_quality": _score_band(score_values["architecture"]), "organization_level": f"{len(source_dirs)} source directories detected", "key_directories": source_dirs[:30], "structure_explanation": "Derived from the scanned directory tree."},
            "code_organization": {"modularity_level": _score_band(score_values["maintainability"]), "separation_of_concerns": f"{len(layers)} recognized architectural directories detected", "reusability_score": score_values["maintainability"]},
            "scalability": {"horizontal_scalability": "Container configuration detected" if scan["artifacts"]["has_docker"] else "No container deployment configuration detected", "vertical_scalability": "Code-level estimate only; runtime behavior is not measured", "scalability_notes": "Score uses measured modularity, architecture directories, CI/container signals, dependency footprint, and concurrency syntax."},
            "strengths": insights["strengths"], "weaknesses": insights["risks"],
        }
        tech_stack = _technology_stack(technologies)
        tech_stack["frameworks"] = scan.get("frameworks", [])
        tech_stack["framework_detection"] = scan.get("framework_detection", {"status": "unavailable", "manifests": [], "parsed_manifests": [], "note": "Framework detection was not included in the scan."})
        report_confidence = round(min(1.0, len(scan.get("source_files", [])) / max(scan.get("source_file_count", 0), 1)), 2)
        components = scores["quality"]["components"]
        contribution = {
            "positive_factors": [{"factor": c["name"], "impact": "positive", "description": c["evidence"]} for c in components if c["score"] >= 70],
            "negative_factors": [{"factor": c["name"], "impact": "needs_attention", "description": c["evidence"]} for c in components if c["score"] < 40],
            "top_contributing_features": sorted([{"name": c["name"], "score": c["score"], "weight": c["weight"]} for c in components], key=lambda x: x["weight"], reverse=True),
        }
        ml_scores = {
            "overall_quality": score_values["overall_quality"], "maintainability": score_values["maintainability"],
            "scalability": score_values["scalability"], "architecture": score_values["architecture"],
            "production_readiness": score_values["production_readiness"], "feature_contributions": contribution,
            "confidence": report_confidence, "model_used": static["score_methodology"]["version"],
        }
        score_band = _score_band(score_values["quality"])
        final_summary = {
            "repository_quality_score": round(score_values["quality"]),
            "architecture_quality_score": round(score_values["architecture"]),
            "maintainability_score": round(score_values["maintainability"]),
            "onboarding_difficulty": "Easy" if scan.get("file_count", 0) < 100 and scan["artifacts"]["has_readme"] else "Moderate" if scan["artifacts"]["has_readme"] else "Complex",
            "scalability_level": _score_band(score_values["scalability"]),
            "production_readiness": _score_band(score_values["production_readiness"]),
            "final_assessment": f"Static analysis rates this repository {score_band.lower()} for quality using {scan['file_count']} scanned files and {scan['total_lines']} source/test lines. Scores are evidence-based heuristics and do not claim runtime or human-review validation.",
        }
        response = AnalyzeResponse(
            success=True, schema_version="1.3", repository={"owner": owner, "name": name, "full_name": clone["repo_name"], "url": f"https://github.com/{owner}/{name}", "clone_depth": clone["clone_depth"]},
            repo_info={"name": clone["repo_name"], "technologies": technologies, "file_count": scan["file_count"], "total_lines": scan["total_lines"], "is_mock": False, "ml_model_used": static["score_methodology"]["version"]},
            metrics=static["metrics"], scores=scores, score_methodology=static["score_methodology"],
            file_breakdown={"total": scan["file_count"], "by_category": dict(categories), "by_language": scan["language_breakdown"], "by_extension": scan["extension_breakdown"], "sample_limit": FileScanner.MAX_FILES},
            files=files[:FileScanner.MAX_FILES], folder_breakdown=scan["folder_breakdown"], insights=insights,
            quick_fix_checklist=quick_fix_checklist, ml_scores=ml_scores,
            code_overview=code_overview, github_metadata=github_metadata,
            repository_overview={"name": project_overview["title"], "purpose": project_overview["description"], "purpose_status": project_overview["status"], "purpose_note": project_overview["note"], "problem_solved": None, "application_type": _application_type(technologies) if scan.get("frameworks") else None, "application_type_status": "inferred_from_declared_frameworks" if scan.get("frameworks") else "unavailable", "application_type_note": "Project type is a lightweight inference from declared frameworks, not a verified runtime behavior." if scan.get("frameworks") else "No declared framework was available to infer a project type.", "target_users": None, "domain": None, "summary_source": project_overview["source"], "summary_confidence": project_overview["confidence"], "evidence": project_overview["evidence"]},
            creator_information={"owner": owner, "maturity_level": _score_band(score_values["quality"]), "coding_style": "Measured file and complexity metrics; stylistic linting is not run.", "open_source_ready": scan["artifacts"]["has_license"], "collaboration_ready": scan["artifacts"]["has_ci"] and scan["artifacts"]["has_tests"]},
            technology_stack=tech_stack,
            architecture_overview={"pattern": architecture["architecture_type"], "description": architecture["architecture_explanation"], "folder_structure": ", ".join(source_dirs) or "No nested source directories detected", "data_flow": "Static code review required for precise runtime data flow.", "scalability": architecture["scalability"]["scalability_notes"]},
            architecture_analysis=architecture, important_files=important,
            onboarding_guide=_onboarding(scan, technologies), code_quality_analysis=_quality_issues(scan, static),
            project_guide=scan.get("project_guide", {}),
            security_analysis=_security_issues(scan, static), performance_analysis=_performance_issues(static),
            improvement_suggestions=insights["recommendations"], final_summary=final_summary,
        )
        _emit_progress(progress, "complete", "Analysis complete; the report is ready to explore.", 4)
        return response
    finally:
        repo_cloner.cleanup_repo(local_path)


@router.post("/history")
async def repository_history(request: HistoryRequest):
    """Fetch optional GitHub activity and recent source-patch trend data."""
    parsed = repo_cloner.parse_github_url(request.github_url)
    if not parsed:
        raise HTTPException(status_code=422, detail="Provide a public HTTPS GitHub repository URL.")
    try:
        return await run_in_threadpool(github_history_service.fetch, parsed[0], parsed[1])
    except Exception:
        return {
            "status": "unavailable",
            "source": "GitHub REST API",
            "activity_status": "unavailable",
            "weekly_activity": [],
            "activity_note": "Weekly activity statistics were not available from GitHub for this request.",
            "recent_commits": [],
            "complexity_trend": [],
            "complexity_note": "A branch-token change proxy could not be calculated for this request.",
            "commit_limit": GitHubHistoryService.COMMIT_LIMIT,
            "complexity_sample_limit": GitHubHistoryService.PATCH_SAMPLE_LIMIT,
            "note": "GitHub history is temporarily unavailable; repository analysis remains available.",
        }


@router.post("/file-preview")
async def preview_repository_file(request: FilePreviewRequest):
    """Fetch a single public text file only after the user selects it in the UI."""
    if not repo_cloner.validate_github_url(request.github_url):
        raise HTTPException(status_code=422, detail="Provide a public HTTPS GitHub repository URL.")
    clone = await run_in_threadpool(repo_cloner.clone_repository, request.github_url)
    if not clone.get("success"):
        raise HTTPException(status_code=400, detail=clone.get("error", "Repository clone failed."))
    local_path = clone["local_path"]
    try:
        return await run_in_threadpool(read_file_preview, local_path, request.path)
    finally:
        repo_cloner.cleanup_repo(local_path)


async def _best_effort_github_metadata(owner: str, repository: str) -> dict[str, Any]:
    try:
        return await run_in_threadpool(github_metadata_service.fetch, owner, repository)
    except Exception:
        return {
            "status": "unavailable", "created_at": None, "owner": None,
            "contributors": [], "contributors_status": "unavailable",
            "contributors_truncated": False, "contributors_limit": 10,
            "source": "GitHub REST API",
            "note": "GitHub metadata could not be retrieved; repository file analysis completed independently.",
        }


def _build_insights(scan, static):
    metrics, artifacts = static["metrics"], scan["artifacts"]
    strengths, risks, recommendations = [], [], []
    if artifacts["has_readme"]: strengths.append(f"README documentation is present ({len(scan.get('readme_content', '').splitlines())} lines scanned).")
    if not artifacts["has_readme"]:
        risks.append("No README file was detected.")
        recommendations.append(_suggestion("Documentation", "high", "Add a README.md describing the project, prerequisites, setup, and validation commands.", "Helps new contributors understand and run the repository."))
    if metrics["ast"]["average_cyclomatic_complexity"] is not None and metrics["ast"]["average_cyclomatic_complexity"] <= 5:
        strengths.append(f"Measured average cyclomatic complexity is {metrics['ast']['average_cyclomatic_complexity']}.")
    if artifacts["has_ci"]: strengths.append("A CI configuration file is present.")
    if artifacts["has_tests"]: strengths.append(f"{scan['test_file_count']} test files were detected.")
    if not artifacts["has_tests"]:
        risks.append("No test files were detected in the scanned tree.")
        recommendations.append(_suggestion("Testing", "high", "Add automated tests for core modules and expose a machine-readable coverage report.", "Improves change safety and makes coverage measurable."))
    if not artifacts["has_ci"]:
        risks.append("No common CI/CD workflow file was detected.")
        recommendations.append(_suggestion("Delivery", "high", "Add CI checks for linting, tests, dependency auditing, and builds.", "Provides repeatable validation on each change."))
    if not artifacts["has_docker"]:
        recommendations.append(_suggestion("Deployment", "medium", "Document or add a reproducible deployment/container configuration if this application is intended for production.", "Reduces environment drift; containerization may not be necessary for every project."))
    if not static["metrics"]["tests"]["coverage_is_measured"] and artifacts["has_tests"]:
        risks.append("Tests exist, but no supported coverage report was found; coverage is reported as unknown.")
        recommendations.append(_suggestion("Testing", "medium", "Publish coverage.xml, lcov.info, or a supported coverage JSON report from the test pipeline.", "Turns test presence into a measurable coverage signal."))
    if not artifacts["has_license"]:
        risks.append("No license file was detected.")
        recommendations.append(_suggestion("Governance", "medium", "Add an explicit license if redistribution or external contributions are intended.", "Clarifies reuse and contribution terms."))
    if not artifacts.get("has_gitignore"):
        risks.append("No .gitignore file was detected.")
        recommendations.append(_suggestion("Repository hygiene", "medium", "Add a .gitignore for local secrets, caches, build output, and generated files.", "Reduces accidental commits of local or generated artifacts."))
    if not scan.get("dependencies", {}).get("lockfiles") and scan.get("dependencies", {}).get("count", 0):
        risks.append("Dependencies are declared without a recognized lockfile.")
        recommendations.append(_suggestion("Dependencies", "medium", "Commit a lockfile for application dependencies.", "Makes dependency resolution reproducible."))
    if metrics["maintenance_signals"]["credential_literal_candidates"]:
        risks.append(f"{len(metrics['maintenance_signals']['credential_literal_candidates'])} credential-like literal pattern(s) need manual verification; patterns are not proof of exposed secrets.")
    if metrics["ast"]["syntax_error_files"]:
        risks.append(f"Python AST parsing failed for {metrics['ast']['syntax_error_files']} source file(s).")
    if not strengths: strengths.append(f"The scan identified {scan['source_file_count']} source files across {len(scan['folder_breakdown'])} folders; no additional positive signal met the reporting threshold.")
    if not risks: risks.append("No high-signal static risk was identified by the configured checks; this is not a security audit.")
    scores = {k: v["score"] for k, v in static["scores"].items()}
    return {"summary": f"Scanned {scan['file_count']} repository files, {scan['source_file_count']} source files, and {scan['total_lines']} source/test lines. Detected: {', '.join(scan['technologies']) or 'no recognized technologies'}.", "strengths": strengths[:8], "risks": risks[:10], "recommendations": recommendations[:10], "llm": {}, "score_snapshot": scores, "scan_warnings": scan.get("warnings", [])}


def _suggestion(category, priority, suggestion, impact):
    return {"category": category, "priority": priority, "suggestion": suggestion, "impact": impact}


def _project_overview(scan, repository_name, technologies=None):
    readme = scan.get("readme_content", "")
    metadata = scan.get("project_metadata", {})
    title = repository_name
    lines = readme.splitlines()
    section_start = len(lines)
    first_h1 = None
    for index, raw_line in enumerate(lines):
        heading = re.match(r"^(#{1,6})\s+(.+?)\s*#*\s*$", raw_line.strip())
        if not heading:
            continue
        if len(heading.group(1)) == 1 and first_h1 is None:
            first_h1 = index
            title = heading.group(2).strip() or title
        elif len(heading.group(1)) >= 2:
            section_start = index
            break

    intro_start = first_h1 + 1 if first_h1 is not None else 0
    description = _first_readme_paragraph(lines[intro_start:section_start])
    source = (scan.get("readme_path") or "README.md") if description else None
    if not description:
        purpose_sections = {"overview", "about", "description", "project overview", "introduction", "purpose", "what it does", "what is this project"}
        for index, raw_line in enumerate(lines):
            heading = re.match(r"^#{2,6}\s+(.+?)\s*#*\s*$", raw_line.strip())
            if not heading:
                continue
            label = re.sub(r"[^a-z0-9 ]", " ", heading.group(1).lower())
            label = re.sub(r"\s+", " ", label).strip()
            if label not in purpose_sections:
                continue
            end = next((cursor for cursor in range(index + 1, len(lines)) if re.match(r"^#{1,6}\s+", lines[cursor].strip())), len(lines))
            description = _first_readme_paragraph(lines[index + 1:end])
            if description:
                source = scan.get("readme_path") or "README.md"
                break

    if description:
        description = re.split(r"(?<=[.!?])\s+", re.sub(r"\s+", " ", description), maxsplit=1)[0][:700]
        confidence = "medium"
        status = "documented"
        note = "Text excerpted from repository documentation; static analysis does not independently validate the claims."
        evidence = [source]
    elif metadata.get("description"):
        description = metadata["description"][:700]
        source = metadata.get("manifest_path") or "project manifest"
        title = metadata.get("name") or title
        confidence = "high"
        status = "documented"
        note = "Description read from a supported project manifest; this is maintainer-provided metadata, not runtime verification."
        evidence = [source]
    else:
        description = None
        source = None
        confidence = None
        status = "unavailable"
        note = "No clear introductory purpose text was found in the scanned README or supported manifests. RepoLens will not guess the product purpose from file names or language counts."
        evidence = []
    return {"title": title, "description": description, "status": status, "note": note, "source": source, "confidence": confidence, "evidence": evidence}


def _first_readme_paragraph(lines):
    paragraph = []
    in_code = False
    for raw_line in lines:
        line = raw_line.strip()
        if line.startswith("```") or line.startswith("~~~"):
            in_code = not in_code
            continue
        if in_code:
            continue
        if not line:
            if paragraph:
                break
            continue
        if line.startswith("#"):
            break
        if line.startswith(("![", "<!--", "|", "<")) or "shields.io" in line.lower():
            continue
        clean = re.sub(r"!?\[([^\]]*)\]\([^)]*\)", r"\1", line)
        clean = re.sub(r"<[^>]+>", "", clean)
        clean = re.sub(r"^[>*+\-\s]+", "", clean)
        clean = re.sub(r"[`*_~]", "", clean).strip()
        if not clean or re.match(r"^(?:\$\s*)?(npm|pnpm|yarn|bun|pip|python|uv|docker|git|cd|make)\b", clean, re.I):
            continue
        paragraph.append(clean)
        if sum(len(part) for part in paragraph) >= 700:
            break
    return re.sub(r"\s+", " ", " ".join(paragraph)).strip()


def _quick_fix_checklist(scan):
    artifacts = scan.get("artifacts", {})
    evidence_paths = artifacts.get("checklist_paths", {})
    checks = [
        ("readme", "README.md", "has_root_readme", "Document the project purpose, setup, usage, and test commands.", "Root README.md"),
        ("license", "LICENSE", "has_root_license", "Add a LICENSE file with terms chosen by the project maintainers.", "Root license file"),
        ("github_actions", ".github/workflows/*.yml", "has_github_workflow", "Add a GitHub Actions workflow to run tests, lint, and build checks.", "GitHub Actions workflow"),
        ("dockerfile", "Dockerfile", "has_root_dockerfile", "Add a Dockerfile if container deployment is intended; otherwise document the target deployment path.", "Root Dockerfile"),
        ("gitignore", ".gitignore", "has_root_gitignore", "Add ignore rules for local secrets, caches, build output, and generated files.", "Root .gitignore"),
    ]
    items = []
    for key, label, artifact_key, instruction, score_component in checks:
        path_key = "github_workflows" if key == "github_actions" else key
        paths = evidence_paths.get(path_key, [])
        present = bool(artifacts.get(artifact_key))
        items.append({
            "id": key,
            "file_pattern": label,
            "complete": present,
            "status": "present" if present else "missing",
            "evidence": ", ".join(paths) if paths else ("Detected in scanned tree" if present else "No matching file in the scanned tree"),
            "instruction": instruction,
            "production_readiness_component": score_component,
        })
    return {"completed": sum(item["complete"] for item in items), "total": len(items), "items": items, "note": "Presence checks only; these items do not replace security, deployment, or license review."}


def _code_overview(scan):
    """Describe observed source layout and names without claiming business intent."""
    files = scan.get("files", [])
    language_counts = scan.get("language_breakdown", {})
    languages = [
        {"name": name, "files": count}
        for name, count in sorted(language_counts.items(), key=lambda item: (-item[1], item[0]))
    ]
    role_names = {
        "app": "application entry / routes", "pages": "page routes", "components": "UI components",
        "routes": "API or route handlers", "api": "API boundary", "services": "service logic",
        "service": "service logic", "models": "data/domain models", "model": "data/domain models",
        "repositories": "data access", "repository": "data access", "controllers": "request controllers",
        "middleware": "middleware", "tests": "tests", "test": "tests", "utils": "utilities",
        "lib": "shared libraries", "core": "core modules", "backend": "backend modules",
        "frontend": "frontend modules", "src": "source modules", "infra": "infrastructure",
        "infrastructure": "infrastructure",
    }
    folders = []
    for folder in scan.get("folder_breakdown", []):
        path = folder.get("path", ".")
        if not folder.get("source_files"):
            continue
        leaf = Path(path).name.lower()
        folders.append({
            "path": path,
            "role": role_names.get(leaf, "source modules"),
            "source_files": folder.get("source_files", 0),
            "file_count": folder.get("file_count", 0),
        })
    folders.sort(key=lambda item: (-item["source_files"], item["path"]))

    entry_names = StaticAnalyzer.ENTRYPOINTS | {"index.html"}
    entrypoints = []
    for item in files:
        path = item.get("path", "")
        lower_path = path.lower()
        basename = Path(path).name.lower()
        is_next_route = basename in {"page.tsx", "page.jsx", "page.js"} and ("/app/" in f"/{lower_path}/" or "/pages/" in f"/{lower_path}/")
        if basename in entry_names or is_next_route:
            entrypoints.append(path)

    symbols = scan.get("code_symbols", {"status": "unavailable", "count": 0, "parsed_files": 0, "sample_limit": 0, "truncated": False, "items": [], "method": "Symbol extraction was not included in this scan."})
    frameworks = [item.get("name") for item in scan.get("frameworks", []) if item.get("name")]
    directory_names = [item["path"] for item in folders[:5]]
    language_text = ", ".join(f"{item['name']} ({item['files']} {'file' if item['files'] == 1 else 'files'})" for item in languages[:4]) or "no recognized source languages"
    framework_text = ", ".join(frameworks[:6]) or "no recognized direct framework declarations"
    if scan.get("source_file_count", 0):
        parts = [
            f"The code scan found {scan.get('source_file_count', 0)} source {'file' if scan.get('source_file_count', 0) == 1 else 'files'} and {scan.get('test_file_count', 0)} test {'file' if scan.get('test_file_count', 0) == 1 else 'files'}.",
            f"Languages by scanned file count: {language_text}.",
            f"Recognized framework declarations: {framework_text}.",
        ]
        if directory_names:
            parts.append(f"Main code directories: {', '.join(f'`{path}`' for path in directory_names)}.")
        if symbols.get("count"):
            parts.append(f"{symbols['count']} function/class names were extracted from supported source syntax.")
        if entrypoints:
            parts.append(f"Entry-point candidates: {', '.join(f'`{path}`' for path in entrypoints[:8])}.")
        summary = " ".join(parts)
        status = "available"
    else:
        summary = None
        status = "unavailable"

    readme = scan.get("readme_content", "")
    declared = {item.get("name") for item in scan.get("frameworks", [])}
    package_to_framework = {package.lower(): name for package, (name, _role) in FileScanner.FRAMEWORK_PACKAGES.items()}
    candidates = set(declared)
    readme_lower = readme.casefold()
    for package, framework_name in package_to_framework.items():
        terms = (framework_name.casefold(), package)
        if any(re.search(r"(?<![a-z0-9])" + re.escape(term) + r"(?![a-z0-9])", readme_lower) for term in terms if term):
            candidates.add(framework_name)
    crosscheck_items = []
    if readme:
        for framework_name in sorted(candidates)[:30]:
            package_terms = [package for package, name in package_to_framework.items() if name == framework_name]
            terms = [framework_name.casefold(), *package_terms]
            mentioned = any(re.search(r"(?<![a-z0-9])" + re.escape(term) + r"(?![a-z0-9])", readme_lower) for term in terms)
            is_declared = framework_name in declared
            if mentioned and is_declared:
                match_status = "mentioned_and_declared"
            elif mentioned:
                match_status = "readme_only"
            else:
                match_status = "manifest_only"
            crosscheck_items.append({"name": framework_name, "readme_mentions": mentioned, "manifest_declared": is_declared, "status": match_status})
        crosscheck_status = "compared" if crosscheck_items else "no_recognized_framework_names"
        crosscheck_note = "Literal name matching only; this does not verify semantic claims or prove a dependency is active at runtime."
    else:
        crosscheck_status = "unavailable"
        crosscheck_note = "No readable README excerpt was available to compare; code and manifest evidence are still shown separately."

    return {
        "status": status,
        "summary": summary,
        "source_files": scan.get("source_file_count", 0),
        "test_files": scan.get("test_file_count", 0),
        "languages": languages,
        "frameworks": frameworks,
        "directory_roles": folders[:30],
        "entrypoint_candidates": entrypoints[:30],
        "symbols": symbols,
        "readme_framework_crosscheck": {
            "status": crosscheck_status,
            "items": crosscheck_items,
            "note": crosscheck_note,
        },
        "limitations": "This is a static map of paths, declarations, and symbol names. It does not execute code, prove that a file is active at runtime, or infer business purpose from identifiers alone.",
    }


def _important_file(item):
    path = item.get("path", "")
    name = Path(path).name.lower()
    known = {"main.py": "Application/API entry point", "package.json": "JavaScript dependencies and scripts", "requirements.txt": "Python dependencies", "pyproject.toml": "Python project/build configuration", "dockerfile": "Container build instructions", "readme.md": "Project documentation", "docker-compose.yml": "Multi-container service configuration"}
    purpose = next((v for k, v in known.items() if name == k or name.startswith(k)), f"{item.get('category', 'repository')} file ({item.get('language', 'unclassified')})")
    return {"file": path, "purpose": purpose, "importance": "Selected from repository structure and file type; not a dependency or execution claim.", "size_bytes": item.get("size_bytes", 0), "lines": item.get("lines")}


def _quality_issues(scan, static):
    issues = []
    ast_metrics = static["metrics"]["ast"]
    if ast_metrics["maximum_cyclomatic_complexity"] and ast_metrics["maximum_cyclomatic_complexity"] > 10:
        issues.append({"type": "High cyclomatic complexity", "severity": "medium", "description": f"Maximum measured function complexity is {ast_metrics['maximum_cyclomatic_complexity']}.", "suggestion": "Split complex functions into smaller units and add focused tests."})
    if ast_metrics["syntax_error_files"]:
        issues.append({"type": "Python parse failures", "severity": "high", "description": f"{ast_metrics['syntax_error_files']} Python source file(s) could not be parsed.", "suggestion": "Fix syntax errors or verify generated/vendor files are excluded."})
    if not scan["artifacts"]["has_tests"]:
        issues.append({"type": "No test files detected", "severity": "high", "description": "The repository scan found no test/spec-named paths.", "suggestion": "Add automated tests and a coverage report."})
    for f in static["metrics"]["maintenance_signals"]["large_source_files_over_500_lines"][:10]:
        issues.append({"type": "Large source file", "severity": "low", "description": f"{f['path']} contains {f['lines']} lines.", "suggestion": "Review for responsibilities that can be separated."})
    return issues


def _security_issues(scan, static):
    issues = []
    for item in static["metrics"]["maintenance_signals"]["credential_literal_candidates"]:
        issues.append({"type": "Credential-like literal candidate", "severity": "high", "description": f"Pattern detected at {item['path']}:{item['line']}; this is a heuristic and may be a false positive.", "recommendation": "Manually verify, remove any real secret, rotate it if exposed, and use managed environment secrets."})
    if not scan["artifacts"]["has_security_workflow"]:
        issues.append({"type": "No security automation detected", "severity": "low", "description": "No CodeQL or Dependabot marker was found.", "recommendation": "Consider dependency and static security scanning in CI; absence is not proof of vulnerability."})
    return issues


def _performance_issues(static):
    issues = []
    for f in static["metrics"]["maintenance_signals"]["large_source_files_over_500_lines"][:10]:
        issues.append({"type": "Large source unit", "impact": "review", "description": f"{f['path']} has {f['lines']} lines; the scan did not profile runtime behavior.", "solution": "Profile before optimizing and split modules if they carry multiple responsibilities."})
    if not issues:
        issues.append({"type": "Runtime performance not measured", "impact": "unknown", "description": "Static repository inspection does not execute or profile the application.", "solution": "Use representative benchmarks and production telemetry for runtime performance."})
    return issues


def _onboarding(scan, technologies):
    package_managers = scan.get("dependencies", {}).get("manifests", [])
    steps = [
        {"step": 1, "title": "Inspect project structure", "description": f"Review {len(scan['folder_breakdown'])} measured folders and the important files list."},
        {"step": 2, "title": "Install dependencies", "description": f"Use manifests found: {', '.join(package_managers) if package_managers else 'no supported dependency manifest detected'}."},
        {"step": 3, "title": "Configure the environment", "description": "Review the environment template if present; never commit secret values." if scan["artifacts"]["has_env_example"] else "No environment template was detected; confirm required runtime settings with maintainers."},
        {"step": 4, "title": "Run validation", "description": "Use the repository's test and build scripts; tests are detected." if scan["artifacts"]["has_tests"] else "Add/locate project-specific tests; no tests were detected by the scan."},
        {"step": 5, "title": "Understand architecture", "description": f"Detected technologies: {', '.join(technologies) or 'none classified'}. Follow entrypoints, modules, and API boundaries."},
    ]
    return steps


def _technology_stack(technologies):
    groups = {"frontend": {"React", "Next.js", "Vue", "Angular", "Svelte", "Tailwind CSS", "TypeScript", "JavaScript"}, "backend": {"FastAPI", "Django", "Flask", "Express", "Fastify", "Python", "Go", "Java", "Rust"}, "database": {"PostgreSQL", "MySQL", "MongoDB", "Redis", "SQLite", "Prisma"}, "deployment": {"Docker", "Kubernetes", "Vercel", "AWS", "Nginx"}, "testing": {"Jest", "Vitest", "Playwright", "Pytest"}}
    result = {key: [tech for tech in technologies if tech in values] for key, values in groups.items()}
    known = set().union(*groups.values())
    result["other"] = [tech for tech in technologies if tech not in known]
    return result


def _application_type(technologies):
    if any(t in technologies for t in ("Next.js", "React", "Vue", "Angular")): return "Web application"
    if any(t in technologies for t in ("FastAPI", "Django", "Flask", "Express", "Fastify")): return "API/service"
    return "Software repository"


def _architecture_type(technologies, layers):
    labels = []
    if any(t in technologies for t in ("Next.js", "React", "Vue", "Angular")): labels.append("component-based frontend")
    if layers: labels.append("layered/module-oriented layout")
    return ", ".join(labels) if labels else "No specific architecture pattern inferred from directory evidence"


def _patterns(technologies, layers):
    patterns = []
    if any(t in technologies for t in ("React", "Next.js", "Vue", "Angular")): patterns.append("Component-based UI (framework detected)")
    if layers: patterns.append("Layer separation signals: " + ", ".join(layers))
    return patterns


def _score_band(value):
    return "Strong" if value >= 80 else "Moderate" if value >= 60 else "Developing" if value >= 40 else "Limited"
