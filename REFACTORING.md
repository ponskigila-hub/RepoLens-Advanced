# RepoLens-Advanced — refactoring notes

## Executive summary

The previous request path advertised ML scores but the active scoring input was partly synthesized from source line counts, README length, and inferred GitHub metadata; the ML module also returned identical `50` scores on prediction exceptions. The previous scanner counted only its first set of “important” files and line totals, and the API parsed free-form model text into structured fields with fixed score defaults. The current path replaces those scores with transparent, reproducible scorecards from repository contents and removes ML model loading from API startup. Optional LLM text is separate from measurements and cannot set or override scores.

This is a static-analysis product, not a runtime test or vulnerability scanner. It reports what it observed and labels missing coverage/LLM configuration rather than fabricating evidence.

## Data flow after refactoring

1. **Input and validation** — `POST /api/analyze` accepts a public GitHub HTTPS URL and optional `include_llm`. URL validation pins hostname to `github.com`, rejects credentials/ports/unexpected paths, and prevents arbitrary remote hosts.
2. **Fetch** — Git runs `clone --depth=1 --single-branch --no-tags --filter=blob:none`; terminal prompts and LFS smudging are disabled. A 60-second process timeout, isolated temporary directory, and guaranteed cleanup contain latency and disk use.
3. **Inventory** — `FileScanner` walks the checked-out tree without following symlinks, ignores common generated/vendor directories, caps inventory at 12,000 files and text reads at 24 MiB, and emits file/folder/language/extension summaries, source/test lines, dependency manifests, lockfiles, CI, Docker, license, environment-template, coverage, and security-automation signals.
4. **Static / AST analysis** — `StaticAnalyzer` parses Python modules with `ast` to count functions, classes, imports and cyclomatic branch complexity; non-Python languages receive documented syntax-pattern estimates. It detects large files, TODO markers, credential-like literal patterns, and reads actual LCOV/Cobertura or supported coverage JSON if present.
5. **Scoring** — Quality, maintainability, scalability, architecture, and production readiness are normalized 0–100 weighted scorecards. Every component includes observed evidence and weight. Current methodology is `static-v2`; Production Readiness now explicitly includes GitHub Actions, Dockerfile, and `.gitignore` signals in addition to tests, lockfiles, license, environment template, security automation, and documentation. No popularity, synthetic metadata, trained artifact, exception-default score, or AI output affects scores.
6. **Insights** — Deterministic recommendations and risk/strength summaries are derived from measured signals. If `include_llm=true` and `OPENAI_API_KEY` is configured, a small bounded evidence package can be sent to an OpenAI-compatible chat endpoint. The LLM response is text-only and isolated under `insights.llm`; no key or repository source files are sent as part of the default prompt. Without credentials, scanning works and the response reports `not_configured`.
7. **API response** — Schema v1.1 includes repo identity, metrics, score evidence, bounded file/folder breakdowns, strengths/risks/recommendations, onboarding steps, the new five-file `quick_fix_checklist`, and an honest project-purpose summary sourced from README/manifest text (or explicitly marked unavailable). Legacy `ml_scores` aliases remain for compatibility.
8. **Save/share/badge** — Saving a completed result explicitly stores the JSON snapshot in SQLite. `GET /api/reports/{id}` serves the unlisted public snapshot; `/badge/{owner}/{repository}.svg` renders the latest saved quality score. The database path is configurable and must be on persistent storage in production.
9. **UI** — The Next.js client talks to same-origin `/api/*` routes; the server forwards through `REPOLENS_API_URL`. The dashboard presents project purpose, evidence, scorecards, file inventory, quick fixes, copyable report/badge links, and a browser print-to-PDF action. The public report page loads a saved immutable snapshot.

## Changed files

| File | Technical change |
|---|---|
| `backend/services/file_scanner.py` | Bounded full-tree inventory, safe symlink handling, language/folder breakdowns, manifest/lockfile parsing, exact README/license/workflow/Dockerfile/`.gitignore` paths, safe package-description extraction, and scan warnings. |
| `backend/services/static_analyzer.py` | Python AST/heuristic static metrics, report-backed coverage reader, five dynamic scorecards, component evidence, and `static-v2` Production Readiness artifact weights. |
| `backend/services/repo_cloner.py` | Strict GitHub HTTPS URL parsing, shallow/filter clone, timeout, no interactive credentials/LFS smudging, unique temp paths, safe cleanup. |
| `backend/routes/analyze.py` | `/api/analyze` response v1.1; README/manifest-sourced project overview with provenance and a five-item file-presence checklist tied to score components; deterministic findings and optional LLM result. |
| `backend/services/report_store.py`, `backend/routes/reports.py` | SQLite persistence for explicitly saved public-unlisted JSON snapshots; bounded payload validation; report retrieval and sanitized dynamic latest-score SVG badges. |
| `backend/services/analysis_service.py` | Removed ML model initialization from the API path; optional bounded OpenAI-compatible LLM generation only. |
| `backend/ml/__init__.py` | Removed eager imports of offline trainers/model artifacts so importing the package cannot load ML dependencies at API startup. |
| `backend/ml/ml_service.py` | Retained the legacy class name as a compatibility adapter to real `StaticAnalyzer` scan results; rejects synthetic/tabular features instead of returning constant fallbacks. |
| `backend/test_ml_integration.py` | Replaced the obsolete demo script with a runner for the deterministic static-analysis test suite. |
| `backend/requirements.txt`, `backend/requirements-dev.txt`, `backend/Dockerfile` | Removed unused runtime ML/GitPython packages from the API image, added isolated HTTP test dependency, retained system Git, and cleaned apt package lists to reduce cold start/image size. |
| `backend/services/prompt_builder.py` | Replaced fragile prompt parsing with a compact prompt builder grounded in structured scan data and score evidence. |
| `backend/main.py` | Registers analysis, health, report, and root-level SVG badge routes; retains environment-driven CORS and the scoring health signal. |
| `backend/.env.example`, `backend/Dockerfile`, `.gitignore` | Documents/configures `REPORT_DB_PATH`, provides `/app/data` as a persistent mount point, and excludes SQLite database/WAL/SHM files from source control. |
| `frontend/services/api.ts`, `frontend/services/backendProxy.ts` | Same-origin typed analysis, health, report-save/report-fetch clients and server-to-server forwarding, including badge responses. |
| `frontend/app/page.tsx`, `frontend/components/AnalysisCard.tsx` | Report page UI with project-purpose provenance, scores, files, quick-fix checklist, explicit save/share controls, copyable Markdown badge, and browser-native PDF print styling. |
| `frontend/app/reports/[reportId]/page.tsx` | Loads and renders a public saved report snapshot; exposes the same print-to-PDF action. |
| `frontend/app/api/reports/`, `frontend/app/badge/` | Same-origin Next.js proxy routes for report persistence/retrieval and dynamic SVG assets. |
| `frontend/types/analysis.ts` | Typed schema v1.1 score/metrics, artifact checklist, project provenance, and saved/public report contracts. |
| `frontend/next-env.d.ts` | Regenerated Next.js 15 route type reference during the production build. |
| `frontend/package.json`, `frontend/package-lock.json` | Upgraded Next.js to patched 15.5.27 and moved Tailwind/PostCSS to v4; npm audit reports zero advisories at this lockfile. |
| `frontend/app/globals.css`, `frontend/postcss.config.js`, `frontend/tailwind.config.js` | Migrated Tailwind directives and PostCSS plugin to v4 and consolidated the active JS configuration. |
| `frontend/components/RepoInput.tsx` | Restricts input format to public HTTPS GitHub repo URLs and relabels mock toggle as skipping optional LLM only. |
| `frontend/components/MLScoresCard.tsx`, `frontend/components/FeatureContributionCard.tsx` | Removes old ML/prediction claims and labels the legacy confidence value as evidence scan coverage. |
| `backend/tests/test_static_analysis.py`, `backend/tests/test_reports.py` | Cover dynamic artifact scores, project-summary provenance, readiness checklist, SQLite save/retrieve, public SVG score output, and invalid/not-found cases. |
| `backend/API_CONTRACT.md`, `backend/examples/analyze-response.example.json` | Documents analysis, report, and badge contracts; JSON fixture is validated against schema v1.1. |
| `ML_INTEGRATION_GUIDE.md`, `ML_INTEGRATION_README.md`, `QUICK_START_ML.md`, `backend/README.md` | Added a deprecation notice to historical ML docs so old model-training claims are not mistaken for the active score path. |
| `README.md` | Replaces obsolete ML and cold-start claims with the current reproducible flow and setup instructions. |

The older `backend/ml/` training modules and saved artifacts remain in the repository for historical/reference purposes but are not loaded or used by the `/api/analyze` request path.

## Report-sharing privacy and operations

- Saving is a user-initiated action. Saved links are public and unlisted: possession of the random report ID is sufficient to read the snapshot. There is no login/ACL or delete endpoint in this initial implementation.
- Stored report data includes repository metadata, metrics, and bounded file paths; source text is not included. The JSON body is capped at 3 MiB.
- The README badge is based on the latest saved report for its repository and does not appear until at least one report has been saved. SVG responses are cached for five minutes.
- `Save PDF` uses the user's browser print dialog; the service does not generate or store PDF files.
- SQLite defaults to `backend/data/reports.sqlite3` locally and `/app/data/reports.sqlite3` in the container. Mount persistent storage at that path; ephemeral filesystems can lose reports when replaced.

## Operational notes / limitations

- Runtime is bounded by a 60-second shallow clone and a 12,000-file / 24 MiB text scan budget. Large repos return a warning when a cap is reached.
- This API supports public repositories only. Authenticated/private repository access and GitHub API metadata require a separate explicit auth design.
- Cyclomatic complexity is AST-based for Python; estimates for other languages use syntax patterns and are labeled accordingly.
- Coverage is not guessed. It remains `null` until an actual supported report is found.
- LLM is optional and can fail without invalidating scores. Configure `OPENAI_API_KEY`, `OPENAI_BASE_URL`, and `OPENAI_MODEL` only in the deployment environment.
- RepoLens does not execute analyzed code, install repository dependencies, run tests, or claim runtime security/performance results.
- Frontend security baseline: Next.js `15.5.27` is the official September 2026 Maintenance LTS patch; Tailwind `4.3.3` and PostCSS `8.5.29` resolve the checked npm advisories. Sources: [Next.js September 2026 Security Release](https://nextjs.org/blog/september-2026-security-release), [Next.js December 2025 Security Update](https://nextjs.org/blog/security-update-2025-12-11).

## Follow-up fix: HTTP 500 for root-level source files

The traceback showed `StaticAnalyzer._signals()` indexing `Path(".").parts[-1]`. Repositories with code files directly in their root have an empty path-parts tuple for the root folder, which raised `IndexError` and returned HTTP 500. The scorer now excludes the unnamed root folder from architectural layer-name detection while still counting its files in all other repository metrics.

`backend/tests/test_static_analysis.py` adds a regression that places a Python source file at the repository root and runs the complete score calculation. The same analysis route was then exercised against the public `FireClow/SuruAhai` repository with optional LLM disabled: it returned HTTP 200 in approximately 2.5 seconds.
