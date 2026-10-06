# RepoLens-Advanced

RepoLens-Advanced is a Next.js + FastAPI tool for a grounded first read of a **public GitHub repository**. It separates maintainer-written project intent from evidence found in source paths, function/class declarations, dependency manifests, and GitHub metadata. It takes a bounded shallow snapshot and never executes repository code.

## What a report shows

- **Project purpose and evidence:** README/manifest descriptions are shown as maintainer-provided text, not treated as verified fact. When no clear statement exists, the purpose is explicitly unavailable.
- **Code-first map:** A file/folder tree, source-bearing directory roles, entry-point candidates, and sampled function/class names. Python symbols come from AST; JavaScript, TypeScript, Go, and Rust use declaration patterns. This is a static map, not runtime call-graph analysis.
- **README cross-check:** Literal framework names mentioned in the README are compared with direct package declarations in supported manifests. This is a narrow text comparison, not semantic validation.
- **Technology and languages:** File-based language counts, recognized direct framework declarations with manifest evidence, and dependency/lockfile inventory. Declarations do not prove runtime use.
- **GitHub identity:** Repository creation date and owner plus up to 10 visible contributors from the public GitHub REST API. This lookup is best-effort and can be unavailable/rate-limited without affecting the source scan. Optional `GITHUB_TOKEN` can raise API limits.
- **Dynamic engineering report:** Evidence-backed Quality, Maintainability, Scalability, Architecture, and Production Readiness scorecards; inventory; measured tests/coverage when available; risks and recommendations.
- **Production-readiness quick fixes:** Root-level checks for `README.md`, `LICENSE`, `.github/workflows/*.yml`/`.yaml`, `Dockerfile`, and `.gitignore`.
- **Share and export:** Explicitly save an unlisted public report, copy its dynamic SVG README badge, and print/save the report as PDF in the browser.
- **Optional AI narrative:** Text-only, opt-in, separate from measurements, and unable to change scores.

## Local setup

### Backend

```bash
cd backend
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # optional settings
uvicorn main:app --reload --port 8000
```

SQLite stores explicitly saved report snapshots at `backend/data/reports.sqlite3` by default. Set `REPORT_DB_PATH` to change it. `GITHUB_TOKEN` is optional; `OPENAI_API_KEY` is only needed for optional AI narrative generation.

### Frontend

```bash
cd frontend
npm ci
cp .env.example .env.local
# REPOLENS_API_URL=http://127.0.0.1:8000
npm run dev
```

The browser calls the same-origin Next.js API proxy. For deployment, set the **server-side** `REPOLENS_API_URL` to the FastAPI origin (without `/api`) and deploy both services. A frontend-only deployment cannot run the analyzer. See [deployment](DEPLOYMENT.md), [frontend setup](frontend/README.md), and [troubleshooting](TROUBLESHOOTING.md).

## API and architecture

`POST /api/analyze` returns schema v1.2. The [API contract](backend/API_CONTRACT.md) documents `repository_overview`, `code_overview`, `github_metadata`, metrics, score evidence, checklist, and errors; a [complete response example](backend/examples/analyze-response.example.json) is maintained alongside it. Architecture and file-level changes are summarized in [REFACTORING.md](REFACTORING.md).

To save/share, the UI calls `POST /api/reports`; `GET /api/reports/{id}` retrieves the snapshot. `/badge/{owner}/{repository}.svg` serves the latest saved quality score. Saved links are public and unlisted—anyone holding the URL can view them. Mount persistent storage for SQLite in production.

## Tests

```bash
cd backend
pip install -r requirements-dev.txt
python -m unittest discover -s tests -v
```

```bash
cd frontend
npm ci
npm run build
```

Current scores use the deterministic `static-v2` methodology. Historical training code under `backend/ml/` is not loaded by the analysis request path; see [backend/ml/README.md](backend/ml/README.md).
