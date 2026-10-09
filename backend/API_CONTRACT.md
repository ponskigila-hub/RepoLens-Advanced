# RepoLens API contract — v1.3

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

`POST /api/analyze/stream` accepts the same body and emits Server-Sent Events: `progress` milestones (`fetch`, `inventory`, `metrics`, `report`, `complete`) followed by a `result` event containing the normal v1.3 report. Failures are delivered as an `error` event. Progress events report actual backend phase transitions; the full report payload is delivered together at the end.

The response has `schema_version: "1.3"`; the [complete response fixture](examples/analyze-response.example.json) defines all returned fields. Stable groups include:

| Group | Description |
|---|---|
| `repository`, `repo_info` | Canonical owner/repository identity, URL, clone depth, technologies, and inventory totals. |
| `repository_overview` | Maintainer-provided purpose text from a README introduction/explicit overview or supported manifest. `purpose` is nullable with explicit status, source, evidence, and limitations; code counts are never substituted for product intent. |
| `code_overview` | Code-first structural synopsis, source/test counts, file-based language counts, declared framework names, path-based directory roles, entry-point candidates, sampled function/class names, and README/framework comparison. This remains available as independent evidence when README purpose is missing. |
| `github_metadata` | Best-effort public GitHub REST API data: `created_at`, owner login/type/profile, up to 10 named contributors and contribution counts, fetch/truncation status, source, and limitation note. API errors/rate limits do not fail repository analysis. |
| `technology_stack` | Existing technology categories plus direct `frameworks` declarations with package, manifest, and section evidence; `framework_detection` distinguishes detected, not detected, and unavailable. |
| `metrics` | Observed file/line/language/dependency/artifact metrics, Python AST measures, supported coverage reports, and static maintenance-pattern candidates. |
| `project_guide` | README feature bullets with source paths, safe setup commands/package scripts, explicit runtime/language versions, direct dependencies with declared versions, and environment variable names from example templates only. Environment values are never returned. |
| `scores` | Quality, maintainability, scalability, architecture, and production-readiness weighted scorecards. Components contain score, weight, and evidence. Method: `static-v2`. |
| `quick_fix_checklist` | Five root-level file-presence checks: `README.md`, `LICENSE`/`LICENSE.*`/`COPYING`, `.github/workflows/*.yml`/`.yaml`, `Dockerfile`, and `.gitignore`. |
| `file_breakdown`, `files`, `folder_breakdown` | Inventory totals, every path within the bounded 12,000-file scan cap, and folder aggregates. `files[].dependency_imports` optionally lists direct declared packages with literal import matches in supported source files. Generated/vendor directories and symlinks are excluded. Source text is not included in analysis responses or saved reports. |
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

## Repository history and trend charts

`POST /api/history` accepts `{"github_url":"https://github.com/owner/repository"}` and returns best-effort GitHub history separately from `POST /api/analyze`. It does not clone or execute the repository and is requested only when the user opens **Findings**. The response includes weekly commit activity for roughly the last year when GitHub has it cached, plus up to eight recent commits with messages, dates, patch sizes, and source-change estimates. Results are cached in memory for 15 minutes.

`activity_status` is `available`, `pending`, or `unavailable`. GitHub's statistics API can respond with `202 Accepted` while preparing its weekly data; RepoLens reports that state rather than showing fake zeros. The user can retry later; the recent commit sample can still be available meanwhile. `status` is `available`, `partial`, or `unavailable`; a history failure does not affect the main analysis report.

`complexity_trend` is an explicitly limited **branch/decision-token change proxy** computed from up to eight patches sampled across the most recent 30 commits. It counts additions and removals of common branch-like syntax in supported source-file diffs, then plots the per-commit net changes in chronological order. Patch omissions, unsupported syntax, language heuristics, refactors, and string/comment contexts can affect it; this is **not** a full-repository historical cyclomatic-complexity recomputation. Each sampled commit includes patch coverage so incomplete data remains visible. It does not affect scores and is not stored in saved report snapshots.

The history lookup uses bounded GitHub REST responses and parallelizes only the small recent-commit sample. Public unauthenticated limits may apply; optional server-side `GITHUB_TOKEN` raises the rate limit. Never expose that token to frontend JavaScript or commit it.

Frameworks are recognized from direct declarations in supported `package.json`, requirements files, `pyproject.toml`, or `Cargo.toml`; declarations do not prove runtime use. Unsupported/indirect dependencies may not be recognized.

The quick-fix checklist reports presence only, not quality or certification. Checklist artifacts contribute to the dynamic Production Readiness score; evidence is returned under `scores.production_readiness.components`.

## On-demand repository file preview

`POST /api/file-preview` accepts `{"github_url":"https://github.com/owner/repository","path":"src/main.py"}`. It validates the same public GitHub URL boundary, performs a fresh depth-1 clone, returns one UTF-8 text file, and always removes the temporary clone. It does not execute or persist repository code.

- Paths are repository-relative; traversal, symlinks, private-key formats, local `.env` files, binaries, and files over 256 KiB are rejected.
- Files with secret-shaped assignments are heuristically redacted. This is a best-effort safeguard, not a guarantee that every secret is found.
- The UI requests the content only after a user selects **View**. The inventory itself remains path-only and searchable/paginated.
- `200` returns `{path, content, size_bytes, redacted_values, note}`; `403`, `413`, `415`, and `422` explain blocked path/content/size/request cases.

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
- Payloads are limited to 8 MiB to accommodate the bounded full path index. Invalid/incomplete payloads return `422`; unknown IDs return `404`.

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
| `POST /api/analyze/stream` | Same analysis response with backend stage events before the final report payload. |
| `POST /api/history` | On-demand weekly commit activity and a caveated recent-patch complexity-change trend. |
| `POST /api/file-preview` | Fresh bounded clone and safe on-demand UTF-8 text preview for one selected file. |
| `POST /api/reports` | Save completed report. |
| `GET /api/reports/{id}` | Read saved report. |
| `GET /badge/{owner}/{repository}.svg` | Latest saved score as SVG. |

`400` indicates clone/fetch failure, `404` an unknown report/badge, `422` invalid requests, `500` an unexpected scan/server failure, and `503`/`504` are returned by the Next.js proxy when FastAPI is unavailable or times out. FastAPI validation errors use the standard `detail` shape.
