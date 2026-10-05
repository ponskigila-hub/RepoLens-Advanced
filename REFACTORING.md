# RepoLens-Advanced — refactoring notes

## Executive summary

The previous request path advertised ML scores but the active scoring input was partly synthesized from source line counts, README length, and inferred GitHub metadata; the ML module also returned identical `50` scores on prediction exceptions. The previous scanner counted only its first set of “important” files and line totals, and the API parsed free-form model text into structured fields with fixed score defaults. The current path replaces those scores with transparent, reproducible scorecards from repository contents and removes ML model loading from API startup. Optional LLM text is separate from measurements and cannot set or override scores.

This is a static-analysis product, not a runtime test or vulnerability scanner. It reports what it observed and labels missing coverage/LLM configuration rather than fabricating evidence.

## Data flow after refactoring

1. **Input and validation** — `POST /api/analyze` accepts a public GitHub HTTPS URL and optional `include_llm`. URL validation pins hostname to `github.com`, rejects credentials/ports/unexpected paths, and prevents arbitrary remote hosts.
2. **Fetch** — Git runs `clone --depth=1 --single-branch --no-tags --filter=blob:none`; terminal prompts and LFS smudging are disabled. A 60-second process timeout, isolated temporary directory, and guaranteed cleanup contain latency and disk use.
3. **Inventory** — `FileScanner` walks the checked-out tree without following symlinks, ignores common generated/vendor directories, caps inventory at 12,000 files and text reads at 24 MiB, and emits file/folder/language/extension summaries, source/test lines, dependency manifests, lockfiles, CI, Docker, license, environment-template, coverage, and security-automation signals.
4. **Static / AST analysis** — `StaticAnalyzer` parses Python modules with `ast` to count functions, classes, imports and cyclomatic branch complexity; non-Python languages receive documented syntax-pattern estimates. It detects large files, TODO markers, credential-like literal patterns, and reads actual LCOV/Cobertura or supported coverage JSON if present.
5. **Scoring** — Quality, maintainability, scalability, architecture, and production readiness are normalized 0–100 weighted scorecards. Every component includes the observed evidence and weight. The result includes `score_methodology.version=static-v1`; no popularity, synthetic metadata, trained artifact, exception-default score, or AI output affects the scores.
6. **Insights** — Deterministic recommendations and risk/strength summaries are derived from measured signals. If `include_llm=true` and `OPENAI_API_KEY` is configured, a small bounded evidence package can be sent to an OpenAI-compatible chat endpoint. The LLM response is text-only and isolated under `insights.llm`; no key or repository source files are sent as part of the default prompt. Without credentials, scanning works and the response reports `not_configured`.
7. **API response** — The response includes schema version, repo identity, detailed metrics, each score and component, bounded file/folder breakdowns, evidence-based insights, onboarding steps, important files, and legacy `ml_scores` aliases for compatibility.
8. **UI** — The Next.js page calls one environment-configured API client (`NEXT_PUBLIC_API_URL`) instead of a hard-coded localhost fetch. Existing dashboard fields are retained; the expanded TypeScript type includes versioned score and metrics fields for the upcoming UI redesign.

## Changed files

| File | Technical change |
|---|---|
| `backend/services/file_scanner.py` | Replaced “important-files only” counting with bounded full-tree inventory, safe symlink handling, language and folder breakdowns, manifest/lockfile parsing, artifact flags, and scan warnings. |
| `backend/services/static_analyzer.py` | New Python AST/heuristic static metrics, report-backed coverage reader, five dynamic weighted scorecards, component evidence, and explicit methodology version. |
| `backend/services/repo_cloner.py` | Strict GitHub HTTPS URL parsing, shallow/filter clone, timeout, no interactive credentials/LFS smudging, unique temp paths, safe cleanup. |
| `backend/routes/analyze.py` | Rebuilt `/api/analyze` around the local scanner/scorer; threadpool execution for blocking work; rich response contract; legacy aliases; deterministic findings and optional LLM result. |
| `backend/services/analysis_service.py` | Removed ML model initialization from the API path; optional bounded OpenAI-compatible LLM generation only. |
| `backend/ml/__init__.py` | Removed eager imports of offline trainers/model artifacts so importing the package cannot load ML dependencies at API startup. |
| `backend/ml/ml_service.py` | Retained the legacy class name as a compatibility adapter to real `StaticAnalyzer` scan results; rejects synthetic/tabular features instead of returning constant fallbacks. |
| `backend/test_ml_integration.py` | Replaced the obsolete demo script with a runner for the deterministic static-analysis test suite. |
| `backend/requirements.txt`, `backend/requirements-dev.txt`, `backend/Dockerfile` | Removed unused runtime ML/GitPython packages from the API image, added isolated HTTP test dependency, retained system Git, and cleaned apt package lists to reduce cold start/image size. |
| `backend/services/prompt_builder.py` | Replaced fragile prompt parsing with a compact prompt builder grounded in structured scan data and score evidence. |
| `backend/main.py` | API version/description update, environment-driven CORS allowlist, limited methods/headers, scoring health signal. |
| `backend/.env.example` | Documents optional LLM, timeout, CORS, temp-dir, and port configuration; static analysis needs no key. |
| `frontend/services/api.ts` | Environment-configured API URL, structured errors, cancellation support, new `include_llm` contract. |
| `frontend/app/page.tsx` | Routes submissions through the shared API client instead of `http://localhost:8000`. |
| `frontend/types/analysis.ts` | Adds the versioned dynamic-score, metric, breakdown, and LLM insight contracts. |
| `frontend/next-env.d.ts` | Regenerated Next.js 15 route type reference during the production build. |
| `frontend/package.json`, `frontend/package-lock.json` | Upgraded Next.js to patched 15.5.27 and moved Tailwind/PostCSS to v4; npm audit reports zero advisories at this lockfile. |
| `frontend/app/globals.css`, `frontend/postcss.config.js`, `frontend/tailwind.config.js` | Migrated Tailwind directives and PostCSS plugin to v4 and consolidated the active JS configuration. |
| `frontend/components/RepoInput.tsx` | Restricts input format to public HTTPS GitHub repo URLs and relabels mock toggle as skipping optional LLM only. |
| `frontend/components/MLScoresCard.tsx`, `frontend/components/FeatureContributionCard.tsx` | Removes old ML/prediction claims and labels the legacy confidence value as evidence scan coverage. |
| `backend/tests/test_static_analysis.py` | Adds scanner, score sensitivity, coverage semantics, URL validation, legacy-scorer safety, and async API contract tests. |
| `backend/API_CONTRACT.md`, `backend/examples/analyze-response.example.json` | Documents the versioned request/response contract and provides a complete captured JSON fixture from this modified checkout. |
| `ML_INTEGRATION_GUIDE.md`, `ML_INTEGRATION_README.md`, `QUICK_START_ML.md`, `backend/README.md` | Added a deprecation notice to historical ML docs so old model-training claims are not mistaken for the active score path. |
| `README.md` | Replaces obsolete ML and cold-start claims with the current reproducible flow and setup instructions. |

The older `backend/ml/` training modules and saved artifacts remain in the repository for historical/reference purposes but are not loaded or used by the `/api/analyze` request path.

## Operational notes / limitations

- Runtime is bounded by a 60-second shallow clone and a 12,000-file / 24 MiB text scan budget. Large repos return a warning when a cap is reached.
- This API supports public repositories only. Authenticated/private repository access and GitHub API metadata require a separate explicit auth design.
- Cyclomatic complexity is AST-based for Python; estimates for other languages use syntax patterns and are labeled accordingly.
- Coverage is not guessed. It remains `null` until an actual supported report is found.
- LLM is optional and can fail without invalidating scores. Configure `OPENAI_API_KEY`, `OPENAI_BASE_URL`, and `OPENAI_MODEL` only in the deployment environment.
- RepoLens does not execute analyzed code, install repository dependencies, run tests, or claim runtime security/performance results.
- Frontend security baseline: Next.js `15.5.27` is the official September 2026 Maintenance LTS patch; Tailwind `4.3.3` and PostCSS `8.5.29` resolve the checked npm advisories. Sources: [Next.js September 2026 Security Release](https://nextjs.org/blog/september-2026-security-release), [Next.js December 2025 Security Update](https://nextjs.org/blog/security-update-2025-12-11).
