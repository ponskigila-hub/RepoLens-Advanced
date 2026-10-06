# RepoLens API contract — v1.1

## Analyze a repository

`POST /api/analyze` (`Content-Type: application/json`)

```json
{
  "github_url": "https://github.com/owner/repository",
  "include_llm": false,
  "use_mock": false
}
```

Only public HTTPS GitHub URLs of the form `github.com/{owner}/{repository}` are accepted. `include_llm` enables an optional text narrative; it never changes measurements or scores. `use_mock` remains a backwards-compatible flag that skips the optional LLM request; it does not return mock scores.

The response has `schema_version: "1.1"` and is defined by [the complete validated example](examples/analyze-response.example.json). Stable groups include:

| Group | Description |
|---|---|
| `repository`, `repo_info` | Canonical repository identity, URL, clone depth, technologies, and inventory totals. |
| `repository_overview` | Concise project description sourced from the first README paragraph or a supported manifest (`package.json`, `pyproject.toml`, `Cargo.toml`), plus `summary_source`, `summary_confidence`, and `evidence`. If no description is found, the API says so and reports only detected technologies; it does not guess project intent. |
| `metrics` | Observed file/line/language/dependency/artifact metrics, Python AST measures, coverage when a supported report exists, and maintenance/security-pattern candidates. |
| `scores` | Quality, maintainability, scalability, architecture, and production-readiness weighted scorecards. Each component includes its score, weight, and evidence. Current method is `static-v2`. |
| `quick_fix_checklist` | Five file-presence checks at the repository root: `README.md`, `LICENSE` (or `LICENSE.*`/`COPYING`), `.github/workflows/*.yml`/`.yaml`, `Dockerfile`, and `.gitignore`. Each item includes `complete`, `status`, evidence paths, a maintainer-directed instruction, and its Production Readiness component. |
| `file_breakdown`, `files`, `folder_breakdown` | Totals by category/language/extension, up to 1,000 file rows, and up to 100 folder aggregates. |
| `insights` | Deterministic strengths, risks, recommendations, scan limitations, score snapshot, and optional LLM state/text. |
| Compatibility fields | `ml_scores`, architecture/onboarding/quality/security/performance summaries remain available; the `ml_scores` name is historical, not an ML prediction. |

The checklist only reports whether matching files exist. A present file is not a quality or safety certification. README documentation, license, GitHub Actions workflow, Dockerfile, and `.gitignore` signals contribute to the dynamic Production Readiness score; the contribution breakdown and evidence are returned under `scores.production_readiness.components`.

## Save and retrieve a shareable report

Saving is explicit. The frontend sends the completed analysis response:

`POST /api/reports` (`Content-Type: application/json`)

```json
{ "result": { "success": true, "repository": { "full_name": "owner/repository" }, "scores": { "quality": { "score": 82.5 } } } }
```

A successful save returns metadata such as:

```json
{
  "id": "unguessable_report_id",
  "repository": { "owner": "owner", "name": "repository", "full_name": "owner/repository" },
  "quality_score": 82.5,
  "created_at": "2026-10-06T05:00:00+00:00",
  "report_url": "/reports/unguessable_report_id",
  "badge_url": "/badge/owner/repository.svg",
  "visibility": "public_unlisted"
}
```

- `GET /api/reports/{id}` returns the saved metadata plus the immutable `result` snapshot.
- The browser app exposes the public page at `/reports/{id}`. It contains **Save PDF**, which opens the browser print dialog; choose **Save as PDF**. The server does not render or store a PDF.
- Reports are **public and unlisted**: anyone with the URL can view the saved metrics and repository metadata. The report does not include source-file contents. There is no authentication or delete endpoint in this initial implementation.
- A report payload is limited to 3 MiB. Invalid/incomplete payloads return `422`; unknown IDs return `404`.

SQLite is used by default at `backend/data/reports.sqlite3` (inside the backend container, `/app/data/reports.sqlite3`). Configure `REPORT_DB_PATH` to override it. Mount a persistent volume at the database directory in production; container-local storage can be lost when an instance is replaced. Keep the database out of source control and protect backups according to the fact that reports are public.

## Dynamic README badge

`GET /badge/{owner}/{repository}.svg` returns an SVG showing the quality score from the **latest saved report** for that repository. No badge exists until a report has been explicitly saved; before then the endpoint returns `404`.

```md
[![RepoLens Score](https://repolens.example/badge/owner/repository.svg)](https://repolens.example/reports/REPORT_ID)
```

The dashboard generates the actual Markdown snippet and copy buttons after saving. The SVG is served with a short public cache lifetime (five minutes).

## Measurement and operational limits

Scores are deterministic weighted sums of observed signals. Missing evidence is not silently replaced by defaults. `coverage_percent` remains `null` until an actual supported coverage report is measured. Python complexity uses AST traversal; other languages use documented syntax-pattern estimates. RepoLens does not execute repository code, install dependencies, run repository tests, profile runtime performance, or perform a full security audit.

The API uses a depth-1 clone, caps inventory at 12,000 files and text reads at 24 MiB, and reports scan limitations. Optional LLM errors are isolated under `insights.llm` and do not invalidate a successful static scan.

## Other routes and errors

| Route | Purpose |
|---|---|
| `GET /health` | FastAPI health check. |
| `POST /api/analyze` | Static analysis and optional LLM narrative. |
| `POST /api/reports` | Save a completed report. |
| `GET /api/reports/{id}` | Read a saved report. |
| `GET /badge/{owner}/{repository}.svg` | Latest saved score as SVG. |

`400` indicates clone/fetch failure, `404` an unknown report/badge, `422` invalid requests, `500` scan/server failure, and `503`/`504` are returned by the Next.js proxy when FastAPI is unavailable or times out. FastAPI validation errors use the standard `detail` shape.
