# RepoLens-Advanced

RepoLens-Advanced is a Next.js + FastAPI tool for getting a grounded first read of a public GitHub repository: what it appears to do, how its source is organized, which engineering signals are present, and what setup gaps deserve attention. It performs a bounded shallow clone and static scan; it never executes repository code.

## Features

- **Evidence-based analysis:** Python AST metrics, syntax-based estimates for other languages, real file/folder/language/dependency inventory, and dynamic scores for Quality, Maintainability, Scalability, Architecture, and Production Readiness.
- **Project-purpose explanation:** A concise description is extracted from the README or supported project manifests. The response cites its source and confidence; when no description exists, RepoLens says so instead of inventing intent.
- **Production-readiness quick fixes:** The results check root-level `README.md`, `LICENSE`, `.github/workflows/*.yml`/`.yaml`, `Dockerfile`, and `.gitignore`, with evidence, actionable instructions, and the score component each item affects.
- **Shareable report:** Save a completed report to SQLite and receive a public, unlisted report URL. Anyone with that URL can view its saved analysis snapshot; source file contents are not stored in the report.
- **README badge:** A dynamic SVG endpoint displays the latest saved quality score for a repository. The UI generates a Markdown snippet ready to copy into a README.
- **PDF export:** The report page's **Save PDF** button opens the browser print dialog; choose **Save as PDF**.
- **Optional LLM narrative:** The optional text-only LLM insight is separate from the static measurements and cannot change scores.

## Run locally

### Backend

```bash
cd backend
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # optional LLM and service settings
uvicorn main:app --reload --port 8000
```

SQLite defaults to `backend/data/reports.sqlite3`. Set `REPORT_DB_PATH` to change it. `OPENAI_API_KEY` is optional. For production, mount persistent storage for the SQLite file and configure `CORS_ORIGINS` only if browsers will call FastAPI directly.

### Frontend

```bash
cd frontend
npm ci
cp .env.example .env.local
# REPOLENS_API_URL=http://127.0.0.1:8000
npm run dev
```

For deployment, set the **server-side** `REPOLENS_API_URL` on the frontend service to the FastAPI origin (without `/api`). The same-origin Next.js proxy forwards analysis, report, and badge requests. A frontend-only deployment cannot run the Python analyzer. See [frontend setup and troubleshooting](frontend/README.md).

## API and data flow

`POST /api/analyze` returns dynamic metrics, evidence-backed scorecards, repository breakdowns, `repository_overview`, and `quick_fix_checklist`. Saving is explicit: `POST /api/reports` persists a completed result, `GET /api/reports/{id}` retrieves it, and `/badge/{owner}/{repository}.svg` serves the latest saved score. Full schema and privacy/operations notes are in [backend/API_CONTRACT.md](backend/API_CONTRACT.md); architecture and file changelog are in [REFACTORING.md](REFACTORING.md).

## Tests

```bash
cd backend
pip install -r requirements-dev.txt
python -m unittest discover -s tests -v
```

Frontend production build:

```bash
cd frontend
npm ci
npm run build
```

Current scores use the deterministic `static-v2` methodology. Historical model-training files under `backend/ml/` are not loaded or used by the analysis request path.
