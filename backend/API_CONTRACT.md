# RepoLens API contract — v1.2

## Analyze a repository

`POST /api/analyze` (`Content-Type: application/json`)

```json
{
  "github_url": "https://github.com/owner/repository",
  "include_llm": false,
  "use_mock": false
}
```

Only public HTTPS GitHub repository URLs are accepted. `include_llm` enables an optional text narrative; it never changes measurements or scores. `use_mock` is a backwards-compatible flag that skips optional LLM generation; it does not return mock scores.

The response has `schema_version: "1.2"`; the [complete response fixture](examples/analyze-response.example.json) defines all returned fields. Stable groups include:

| Group | Description |
|---|---|
| `repository`, `repo_info` | Canonical owner/repository identity, URL, clone depth, technologies, and inventory totals. |
| `repository_overview` | Maintainer-provided purpose text from a README introduction/explicit overview or supported manifest. `purpose` is nullable with explicit status, source, evidence, and limitations; code counts are never substituted for product intent. |
| `code_overview` | Code-first structural synopsis, source/test counts, file-based language counts, declared framework names, path-based directory roles, entry-point candidates, sampled function/class names, and README/framework comparison. This remains available as independent evidence when README purpose is missing. |
| `github_metadata` | Best-effort public GitHub REST API data: `created_at`, owner login/type/profile, up to 10 named contributors and contribution counts, fetch/truncation status, source, and limitation note. API errors/rate limits do not fail repository analysis. |
| `technology_stack` | Existing technology categories plus direct `frameworks` declarations with package, manifest, and section evidence; `framework_detection` distinguishes detected, not detected, and unavailable. |
| `metrics` | Observed file/line/language/dependency/artifact metrics, Python AST measures, supported coverage reports, and static maintenance-pattern candidates. |
| `scores` | Quality, maintainability, scalability, architecture, and production-readiness weighted scorecards. Components contain score, weight, and evidence. Method: `static-v2`. |
| `quick_fix_checklist` | Five root-level file-presence checks: `README.md`, `LICENSE`/`LICENSE.*`/`COPYING`, `.github/workflows/*.yml`/`.yaml`, `Dockerfile`, and `.gitignore`. |
| `file_breakdown`, `files`, `folder_breakdown` | Inventory totals, up to 1,000 file rows, and up to 100 folder aggregates. UI builds its expandable file tree from returned paths and marks the sample limit. |
| `insights` | Deterministic strengths, risks, recommendations, scan limitations, score snapshot, and isolated optional LLM state/text. |
| Compatibility fields | Historical `ml_scores` and summary aliases remain available; they represent static-v2 values, not model predictions. |

### Code overview details

`code_overview.status` is `available` when source files are found, otherwise `unavailable`. `summary` describes measured repository structure and package declarations; it does **not** claim to infer business purpose.

`symbols` includes total `count`, `parsed_files`, `sample_limit`, `truncated`, and `items` with `{path, line, kind, name}`. Python symbols use the Python AST. JavaScript/TypeScript/Go/Rust are matched with declaration syntax patterns. Other languages may be omitted; names do not establish runtime usage or call flow.

`directory_roles` are path-name hints (for example `services` or `components`), not verified architectural boundaries. `entrypoint_candidates` are common filename/path matches, not proof those files are executed.

`readme_framework_crosscheck.status` is:

- `compared`: literal recognized framework names found in README and/or direct manifests; items use `mentioned_and_declared`, `readme_only`, or `manifest_only`.
- `no_recognized_framework_names`: a readable README exists but no recognized framework string/declaration was available to compare.
- `unavailable`: no readable README excerpt was available.

This check is an exact-name/text heuristic, not semantic verification. A README mention may be incidental; a manifest declaration may be unused.

### GitHub metadata details

`github_metadata.status` is `available`, `partial`, or `unavailable`. `contributors_status` is `available`, `none_reported`, or `unavailable`. The service requests GitHub's public repository and contributors endpoints with bounded response sizes and short timeouts; it returns at most 10 named accounts. `contributors_truncated` is set when GitHub advertises another page. Creation date is nullable and comes from the repository API, not commit timestamps.

Metadata lookup is best-effort: a rate limit, network failure, or API error does not affect cloned files, scorecards, or code overview. Set optional backend secret `GITHUB_TOKEN` to raise GitHub API limits. Never expose the token to frontend JavaScript or commit it.

Frameworks are recognized from direct declarations in supported `package.json`, requirements files, `pyproject.toml`, or `Cargo.toml`; declarations do not prove runtime use. Unsupported/indirect dependencies may not be recognized.

The quick-fix checklist reports presence only, not quality or certification. Checklist artifacts contribute to the dynamic Production Readiness score; evidence is returned under `scores.production_readiness.components`.

## Save and retrieve a shareable report

Saving is explicit: `POST /api/reports` accepts the completed result JSON. A successful response returns metadata such as:

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

- `GET /api/reports/{id}` returns saved metadata plus the immutable `result` snapshot.
- The browser app exposes `/reports/{id}`. **Save PDF** opens the browser print dialog; choose **Save as PDF**. The server does not generate or store a PDF.
- Reports are **public and unlisted**: anyone with the URL can view repository metadata and metrics. Source-file contents are not stored. There is no authentication or delete endpoint in this initial implementation.
- Payloads are limited to 3 MiB. Invalid/incomplete payloads return `422`; unknown IDs return `404`.

SQLite defaults to `backend/data/reports.sqlite3` (container path `/app/data/reports.sqlite3`). Configure `REPORT_DB_PATH` to override it and mount persistent storage in production.

## Dynamic README badge

`GET /badge/{owner}/{repository}.svg` returns the latest **saved** quality score badge for a repository. Before the first saved report, it returns `404`.

```md
[![RepoLens Score](https://repolens.example/badge/owner/repository.svg)](https://repolens.example/reports/REPORT_ID)
```

The dashboard generates the Markdown after save. SVG responses are briefly cached (five minutes).

## Measurement and operational limits

Scores are deterministic weighted sums of observed signals. Missing evidence is not replaced by fixed success defaults. `coverage_percent` is `null` until a supported coverage report is actually measured. Python complexity uses AST; other-language complexity estimates use documented syntax patterns. RepoLens does not execute code, install dependencies, run repository tests, profile runtime performance, or perform a complete security audit.

The API uses a depth-1 clone, caps inventory at 12,000 files and text reads at 24 MiB, and reports scan limitations. Optional LLM errors are isolated under `insights.llm`. GitHub metadata is read from the public REST API and is independently best-effort.

## Routes and errors

| Route | Purpose |
|---|---|
| `GET /health` | FastAPI health/methodology check. |
| `POST /api/analyze` | Static analysis, optional LLM narrative, code map, and best-effort GitHub metadata. |
| `POST /api/reports` | Save completed report. |
| `GET /api/reports/{id}` | Read saved report. |
| `GET /badge/{owner}/{repository}.svg` | Latest saved score as SVG. |

`400` indicates clone/fetch failure, `404` an unknown report/badge, `422` invalid requests, `500` an unexpected scan/server failure, and `503`/`504` are returned by the Next.js proxy when FastAPI is unavailable or times out. FastAPI validation errors use the standard `detail` shape.
