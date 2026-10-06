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
7. **Best-effort GitHub metadata** — In parallel with local inventory, the backend requests repository creation/owner details and up to 10 visible contributors from GitHub's public REST API. The lookup has short timeouts, bounded responses, an in-memory TTL cache, and an optional server-side `GITHUB_TOKEN`; failures/rate limits never fail static analysis.
8. **API response** — Schema v1.3 adds `github_metadata`, `code_overview`, a provenance-labeled `project_guide`, and every indexed path within the 12,000-file cap. README framework mentions are compared literally with direct manifest declarations. README/manifest project purpose remains separate and can be unavailable; no business intent is fabricated. Source text is fetched only through the guarded on-demand preview route, not embedded in analysis or saved reports. Legacy `ml_scores` aliases remain for compatibility.
9. **Save/share/badge** — Saving a completed result explicitly stores the JSON snapshot in SQLite. `GET /api/reports/{id}` serves the unlisted public snapshot; `/badge/{owner}/{repository}.svg` renders the latest saved quality score. The database path is configurable and must be on persistent storage in production.
10. **UI** — The compact landing page removes the slogan strip and duplicate decorative report preview. Four focused sections surface purpose/stack/health, architecture and all paths, setup/configuration, and hotspots/fixes. A persistent light/dark toggle, local technology logos, detailed expandable methodology, save/share, dynamic badge, and browser PDF controls are available. Unknown metadata and measurements remain explicitly unavailable.

## Changed files

| File | Technical change |
|---|---|
| `backend/services/file_scanner.py` | Bounded full-tree inventory, safe symlink handling, language/folder breakdowns, manifest/lockfile parsing, exact readiness-file paths, direct-dependency framework evidence, and bounded Python AST / JS-TS-Go-Rust function/class name extraction. |
| `backend/services/static_analyzer.py` | Python AST/heuristic static metrics, report-backed coverage reader, five dynamic scorecards, component evidence, and `static-v2` Production Readiness artifact weights. |
| `backend/services/repo_cloner.py` | Strict GitHub HTTPS URL parsing, shallow/filter clone, timeout, no interactive credentials/LFS smudging, unique temp paths, safe cleanup. |
| `backend/routes/analyze.py`, `backend/services/github_metadata.py` | `/api/analyze` v1.3; README/manifest purpose provenance, source-derived code map and symbol summary, project guide, complete bounded path index, literal README/framework cross-check, plus best-effort GitHub creation/owner/contributor metadata with timeout/cache/rate-limit fallback. |
| `backend/services/report_store.py`, `backend/routes/reports.py` | SQLite persistence for explicitly saved public-unlisted JSON snapshots; bounded payload validation; report retrieval and sanitized dynamic latest-score SVG badges. |
| `backend/services/analysis_service.py` | Removed ML model initialization from the API path; optional bounded OpenAI-compatible LLM generation only. |
| `backend/ml/__init__.py` | Removed eager imports of offline trainers/model artifacts so importing the package cannot load ML dependencies at API startup. |
| `backend/ml/ml_service.py` | Retained the legacy class name as a compatibility adapter to real `StaticAnalyzer` scan results; rejects synthetic/tabular features instead of returning constant fallbacks. |
| `backend/test_ml_integration.py` | Replaced the obsolete demo script with a runner for the deterministic static-analysis test suite. |
| `backend/requirements.txt`, `backend/requirements-dev.txt`, `backend/Dockerfile` | Removed unused runtime ML/GitPython packages from the API image, added isolated HTTP test dependency, retained system Git, and cleaned apt package lists to reduce cold start/image size. |
| `backend/services/prompt_builder.py` | Replaced fragile prompt parsing with a compact prompt builder grounded in structured scan data and score evidence. |
| `backend/main.py` | Registers analysis, health, report, and root-level SVG badge routes; retains environment-driven CORS and the scoring health signal. |
| `backend/.env.example`, `backend/Dockerfile`, `.gitignore` | Documents/configures `REPORT_DB_PATH`, optional server-side `GITHUB_TOKEN`, provides `/app/data` as a persistent mount point, and excludes SQLite database/WAL/SHM files from source control. |
| `frontend/services/api.ts`, `frontend/services/backendProxy.ts` | Same-origin typed analysis, health, report-save/report-fetch clients and server-to-server forwarding, including badge responses. |
| `frontend/app/page.tsx`, `frontend/components/AnalysisCard.tsx` | Removes slogan/duplicate preview; groups the report into four readable sections with code-first summary, file index, symbol list, owner/created-date/contributors card, stack marks, README check, detailed methodology, and explicit unknown states. |
| `frontend/app/reports/[reportId]/page.tsx` | Loads and renders a public saved report snapshot; exposes the same print-to-PDF action. |
| `frontend/app/api/reports/`, `frontend/app/badge/` | Same-origin Next.js proxy routes for report persistence/retrieval and dynamic SVG assets. |
| `frontend/types/analysis.ts` | Typed schema v1.3 including code-map/symbol, README comparison, GitHub identity/contributor, project guide, full path index, safe preview, scoring, checklist, and saved/public report contracts. |
| `frontend/next-env.d.ts` | Regenerated Next.js 15 route type reference during the production build. |
| `frontend/package.json`, `frontend/package-lock.json` | Upgraded Next.js to patched 15.5.27 and moved Tailwind/PostCSS to v4; npm audit reports zero advisories at this lockfile. |
| `frontend/app/globals.css`, `frontend/postcss.config.js`, `frontend/tailwind.config.js` | Migrated Tailwind directives and PostCSS plugin to v4 and consolidated the active JS configuration. |
| `frontend/components/RepoInput.tsx` | Restricts input format to public HTTPS GitHub repo URLs and relabels mock toggle as skipping optional LLM only. |
| `frontend/components/MLScoresCard.tsx`, `frontend/components/FeatureContributionCard.tsx` | Removes old ML/prediction claims and labels the legacy confidence value as evidence scan coverage. |
| `backend/tests/test_static_analysis.py`, `backend/tests/test_github_metadata.py`, `backend/tests/test_reports.py` | Cover score evidence, unavailable purpose, cross-check, symbol extraction, metadata parsing/rate-limit fallback, checklist, and saved report/badge routes. |
| `backend/API_CONTRACT.md`, `backend/examples/analyze-response.example.json` | Documents schema v1.3, code map/symbols, GitHub metadata statuses, score/checklist/share/file-preview APIs, and a current response fixture. |
| `README.md`, `FUTUREPLAN.md`, `DEPLOYMENT.md`, `TROUBLESHOOTING.md`, `backend/README.md`, `frontend/README.md`, `backend/ml/README.md` | Replaces stale setup/deployment/ML claims with a small current documentation set and future ideas that are not already implemented. |
| `DEPLOYMENT_GUIDE.md`, `FRONTEND_UPGRADE_PLAN.md`, `QUICKSTART.md`, `SETUP_AND_RUN.md`, `ML_INTEGRATION_GUIDE.md`, `ML_INTEGRATION_README.md`, `QUICK_START_ML.md` | Removed duplicate or obsolete instructions (mock scores, required model training, deprecated provider secrets/URLs, and completed upgrade steps). |

The older `backend/ml/` training modules and saved artifacts remain in the repository for historical/reference purposes but are not loaded or used by the `/api/analyze` request path.

## Report-sharing privacy and operations

- Saving is a user-initiated action. Saved links are public and unlisted: possession of the random report ID is sufficient to read the snapshot. There is no login/ACL or delete endpoint in this initial implementation.
- Stored report data includes repository metadata, metrics, and bounded file paths; source text is not included. The JSON body is capped at 8 MiB.
- The README badge is based on the latest saved report for its repository and does not appear until at least one report has been saved. SVG responses are cached for five minutes.
- `Save PDF` uses the user's browser print dialog; the service does not generate or store PDF files.
- SQLite defaults to `backend/data/reports.sqlite3` locally and `/app/data/reports.sqlite3` in the container. Mount persistent storage at that path; ephemeral filesystems can lose reports when replaced.

## Operational notes / limitations

- Runtime is bounded by a 60-second shallow clone and a 12,000-file / 24 MiB text scan budget. Large repos return a warning when a cap is reached.
- Repository cloning supports public repositories only. Owner/date/contributor metadata uses the public GitHub API; private-repository access still requires a separate explicit authorization design.
- Cyclomatic complexity is AST-based for Python; estimates for other languages use syntax patterns and are labeled accordingly.
- Coverage is not guessed. It remains `null` until an actual supported report is found.
- LLM is optional and can fail without invalidating scores. Configure `OPENAI_API_KEY`, `OPENAI_BASE_URL`, and `OPENAI_MODEL` only in the deployment environment.
- RepoLens does not execute analyzed code, install repository dependencies, run tests, or claim runtime security/performance results.
- Frontend security baseline: Next.js `15.5.27` is the official September 2026 Maintenance LTS patch; Tailwind `4.3.3` and PostCSS `8.5.29` resolve the checked npm advisories. Sources: [Next.js September 2026 Security Release](https://nextjs.org/blog/september-2026-security-release), [Next.js December 2025 Security Update](https://nextjs.org/blog/security-update-2025-12-11).

## Follow-up fix: HTTP 500 for root-level source files

The traceback showed `StaticAnalyzer._signals()` indexing `Path(".").parts[-1]`. Repositories with code files directly in their root have an empty path-parts tuple for the root folder, which raised `IndexError` and returned HTTP 500. The scorer now excludes the unnamed root folder from architectural layer-name detection while still counting its files in all other repository metrics.

`backend/tests/test_static_analysis.py` adds a regression that places a Python source file at the repository root and runs the complete score calculation. The same analysis route was then exercised against the public `FireClow/SuruAhai` repository with optional LLM disabled: it returned HTTP 200 in approximately 2.5 seconds.

## Follow-up: project purpose, framework provenance, and readability

- `backend/routes/analyze.py` now extracts purpose only from the README introduction or an explicit overview/about/description section, then falls back to supported manifest metadata. Installation commands and scan metrics are never presented as what the product does. If no source description exists, `purpose` is `null` with `purpose_status: unavailable` and an explanation.
- `backend/services/file_scanner.py` recognizes framework/UI-library package declarations in readable `package.json`, requirements files, `pyproject.toml`, and `Cargo.toml`. The response includes each package’s manifest path and dependency section; no declaration is described as proof of runtime use. `detected`, `not_detected`, and `unavailable` are distinct.
- `frontend/components/AnalysisCard.tsx` puts project purpose and framework evidence above scorecards, separates the scan summary from product purpose, cites description/framework evidence, and labels missing measurements instead of treating them as negative findings. Small helper text and status colors were darkened for stronger contrast.
- Regression tests pass (18 backend tests); the Next.js production build passes. A live analysis and browser preview were verified for `FireClow/SuruAhai`; the response identifies its README purpose and declared React/FastAPI dependencies with manifest evidence.

## Follow-up: code-first report, GitHub identity, and documentation cleanup

- `backend/services/file_scanner.py` emits bounded name/path/line samples: Python declarations use AST; JavaScript/TypeScript, Go, and Rust use syntax patterns. It exposes counts, parsed-file count, truncation, and limitations; source contents are not returned in the report.
- `backend/routes/analyze.py` builds `code_overview` from scanned paths, file-based languages, path-name directory roles, common entry-point candidates, extracted symbols, and a literal README framework-name comparison against direct declarations. The comparison states it is heuristic; documented purpose remains a separate source field.
- `backend/services/github_metadata.py` requests creation date/owner and up to 10 visible contributors, with a 1.5-second timeout per endpoint, 1 MiB response cap, 15-minute in-memory cache, and explicit `available`/`partial`/`unavailable` status. Metadata errors cannot invalidate the clone scan.
- `frontend/components/AnalysisCard.tsx` adds an expandable repository path tree and function/class list, language/framework markers, GitHub owner/date/contributor details, README cross-check, and a **How it works** tab. `frontend/app/page.tsx` removes the slogan bar and duplicate decorative preview, retaining concise scan-scope and service-state information.
- Rewrote setup/deployment/troubleshooting/API docs and the future roadmap. Removed seven stale duplicated guides; retained historical ML source only with one concise `backend/ml/README.md` pointer.
- Verification at this checkpoint: backend tests pass (18), Python compile checks pass, and `npm run build` passes. The subsequent final-verification section records the completed fixture refresh and end-to-end metadata/report checks.

## Follow-up: dependency inventory accuracy and final verification

- `backend/services/file_scanner.py` now reads dependency names from structured `pyproject.toml` sections (`project.dependencies`, optional groups, and Poetry groups) instead of treating arbitrary metadata/config keys such as `name`, `version`, or `requires-python` as packages.
- `backend/tests/test_static_analysis.py` adds a regression combining Python and JavaScript manifests and verifies only declared package names enter the inventory.
- Refreshed the sandbox-only FastAPI process after detecting that the first UI smoke test was still reaching an older in-memory backend. The current preview now reports `static-v2`, and the actual report shows code evidence (26 source files, 226 extracted symbols), declared FastAPI/React, GitHub owner/date, and four visible contributors for the public test repository.
- Final validation: 19 backend tests pass; Python compile checks and the previously completed Next.js production build pass. Desktop/mobile landing screenshots were reviewed; the real report Overview, Code map, and Stack tabs were also inspected in the browser. All checks were local/sandbox-only; no commit, push, or deployment was performed.

## Follow-up: focused report sections, full path index, and accessible theme

- `frontend/components/AnalysisCard.tsx` replaces the seven-tab report with four information groups: **At a Glance**, **Architecture & Flow**, **Getting Started**, and **Hotspots & Fixes**. Save/share links, the dynamic README badge, browser PDF printing, and static-score caveats remain available.
- `frontend/components/ReportSections.tsx` shows README purpose separately from a code-first synopsis, quotes up to five README capability bullets with file provenance, renders language/framework marks and measured health scores, maps directories/entry-point candidates/symbol names, extracts manifest-backed setup/version/dependency details, lists engineering hotspots, and retains the readiness checklist.
- `frontend/components/TechLogo.tsx` uses the locally bundled Simple Icons SVG path data for recognized languages/frameworks; unrecognized technologies receive readable initials. Brand marks identify their owners and are not endorsements.
- `backend/services/project_guide.py` adds evidence-only feature, command, package-script, runtime-version, dependency-version, and environment-key extraction. Environment-template values are not returned. `backend/services/file_scanner.py` includes the additional runtime/config filenames in its existing read budget.
- `backend/routes/analyze.py` advances the response contract to v1.3 and returns every indexed path within the existing 12,000-file cap. The generated/vendor-directory and symlink exclusions remain in effect; the report does not fetch every file's content up front.
- `backend/services/file_preview.py`, `POST /api/file-preview`, `frontend/app/api/file-preview/route.ts`, `frontend/services/api.ts`, and `frontend/components/RepositoryFiles.tsx` add search/filter/pagination for all returned paths and fetch file text only after selection. Preview blocks traversal, symlinks, local environment files, common private-key formats, binary content, and files over 256 KiB; secret-shaped assignments are redacted heuristically. Preview content is not saved with shareable reports.
- `frontend/components/ThemeToggle.tsx`, `frontend/app/layout.tsx`, `frontend/app/globals.css`, and the landing/shared-report headers add a system-aware, persistent light/dark switch and high-contrast dark tokens. Theme is available on both live and saved reports; print export retains its light paper styles.
- `backend/services/report_store.py` raises the unlisted snapshot size ceiling to 8 MiB to support the bounded full path index without embedding source text. `backend/API_CONTRACT.md` records v1.3, preview boundaries, inventory limits, and setup provenance.
- Regression tests cover the updated contract, project-guide extraction without environment values, secret redaction, blocked preview paths/content, and preview clone cleanup.

## Final readability and validation pass

- `frontend/components/ReportSections.tsx` now removes the already-rendered directory/entry-point lists from the prose synopsis, strips raw Markdown backticks, labels the remaining entry-point chips, and hides an empty README capability card rather than showing a low-information placeholder.
- `frontend/components/RepositoryFiles.tsx` shows a technology mark only for recognized languages; unknown file types remain plain extensions instead of receiving an invented “Other” logo.
- Final live browser smoke check succeeded for `FireClow/SuruAhai`: all four report groups rendered, dark mode was active with readable contrast, logo-backed language/framework badges appeared, and the entry-point labels were clear. The all-path index, selected source preview, and detailed methodology were also checked during this validation pass.
- Validation completed: 24 backend unittest cases, Python `compileall`, `git diff --check`, response-fixture schema validation, and optimized Next.js production build all passed. Work remains local; no commit, push, or deployment was performed.

## Follow-up: restrained gradients and reading rhythm

- Preserved the existing landing and report placement. `frontend/app/page.tsx` removes the top-right service-status pill while retaining the offline diagnostic, slightly moderates the hero headline size, and applies a palette-matched forest-to-terracotta text gradient.
- `frontend/app/globals.css` layers sage, linen, terracotta, and muted ochre gradients into the page backdrop and existing surfaces, with dark-theme equivalents and reduced-motion-aware surface transitions. Heading wrapping and default line spacing were adjusted for easier scanning.
- `frontend/components/AnalysisCard.tsx` adds a restrained paper gradient to the report surface and a forest gradient to the selected report tab; no report sections or layout order changed.
- Production build passed. The updated landing page was checked in light and dark modes; the final live report was checked in light mode. The status pill is absent from the rendered header.
