# RepoLens AI — Frontend

Responsive Next.js interface for evidence-based analysis of public GitHub repositories. The initial workspace is an honest empty state; after analysis, the UI explains the project from README/manifest evidence, presents dynamic scorecards and a file-based quick-fix checklist, and lets users save and share reports.

## Local setup

1. Start FastAPI:

   ```bash
   cd ../backend
   python -m venv .venv
   . .venv/bin/activate
   pip install -r requirements.txt
   uvicorn main:app --reload --port 8000
   ```

2. Configure and start Next.js:

   ```bash
   cd frontend
   npm ci
   cp .env.example .env.local
   npm run dev
   ```

   The example points the Next.js server to `http://127.0.0.1:8000`. Open [http://localhost:3000](http://localhost:3000). The header's API status checks `/api/health` through the same-origin proxy.

## Share and export

- **Save & share** persists the completed JSON snapshot in the backend SQLite store and displays a public, unlisted link plus a copyable README badge snippet. Anyone with the link can view the saved report. The stored payload contains repository metadata and static metrics, not source-file contents.
- The public page is `/reports/{id}`. Its **Save PDF** button opens the browser print dialog; choose **Save as PDF**. PDF generation is browser-native; no PDF is uploaded to the service.
- The SVG badge is available at `/badge/{owner}/{repository}.svg` after at least one report has been saved for that repository. It reflects the latest saved report and is cached briefly.

## API connection and deployment

The browser calls its own origin at `/api/analyze`, `/api/reports`, and `/api/health`. Next.js forwards these requests server-to-server to FastAPI. Badge paths are proxied server-side as well, so the browser never needs a backend localhost URL or cross-origin CORS access.

For deployment, configure **`REPOLENS_API_URL`** in the frontend host's server environment to the FastAPI origin (for example `https://your-api.example.com`, without `/api`). Deploy FastAPI separately and ensure the frontend server can reach it. A frontend-only deployment cannot run the analyzer.

FastAPI stores saved reports in SQLite at `backend/data/reports.sqlite3` by default. Configure `REPORT_DB_PATH` on the backend to select another location and mount persistent disk at that path in production; ephemeral container storage can be lost on replacement. Saved report URLs are public and unlisted, and the initial release has no authentication or delete endpoint.

If the API indicator stays offline, open `/api/health`, confirm `REPOLENS_API_URL` is set on the frontend **server**, and check both services' logs. If calling FastAPI directly from browsers, set `CORS_ORIGINS` to the exact frontend origin.

## Main files

- `app/page.tsx` — landing page, API health indicator, scan states.
- `app/reports/[reportId]/page.tsx` — public report page and browser print-to-PDF entry point.
- `app/api/` and `app/badge/` — same-origin Next.js proxy routes.
- `components/AnalysisCard.tsx` — scorecards, project summary, files, quick-fix checks, report sharing, and PDF controls.
- `services/api.ts` — typed browser API client; `services/backendProxy.ts` forwards server-side to FastAPI.
- `types/analysis.ts` — analysis, checklist, and persisted report contracts.

## Environment variables

| Variable | Used by | Example |
|---|---|---|
| `REPOLENS_API_URL` | Next.js server; FastAPI origin without `/api` | `http://127.0.0.1:8000` |
| `REPORT_DB_PATH` | FastAPI server; persistent SQLite file location | `./data/reports.sqlite3` |

Optional AI narrative settings are configured on FastAPI; static scanning and scores do not require an LLM key.
