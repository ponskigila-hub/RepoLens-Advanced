# Deployment guide

RepoLens consists of a Next.js frontend and a Python/FastAPI analyzer. Deploy both; the frontend proxy does not run Python analysis.

## FastAPI backend

Build from `backend/` using its Dockerfile, or provision Python 3.11 with system Git available.

- Install: `pip install -r requirements.txt`
- Start: `uvicorn main:app --host 0.0.0.0 --port 8080` in the container. On a non-container host, bind the port assigned by the provider.
- Health check: `GET /health`
- Set `REPORT_DB_PATH=/app/data/reports.sqlite3` and mount a persistent writable volume at `/app/data`. Without persistent storage, saved share links can disappear when the instance is replaced.
- `GITHUB_TOKEN` is optional. Add it only as a backend deployment secret to raise public GitHub REST API limits. Without it, owner/date/contributor metadata can be rate-limited; repository scanning still succeeds.
- Optional LLM narrative: configure `OPENAI_API_KEY` and, if needed, `OPENAI_BASE_URL`, `OPENAI_MODEL`, and `LLM_TIMEOUT_SECONDS`. Static scanning does not require an LLM key.
- `CORS_ORIGINS` is only needed if a browser calls FastAPI directly. The supported Next.js same-origin proxy does not require browser-to-FastAPI CORS access.

## Next.js frontend

Deploy `frontend/` as a Node/Next.js application.

- Install: `npm ci`
- Build and start: `npm run build` and `npm run start -- --hostname 0.0.0.0 --port $PORT` (adapt to provider requirements).
- Configure server-side **`REPOLENS_API_URL`** to the FastAPI origin, for example `https://api.example.com` (no `/api` suffix). Do not use a browser-facing `NEXT_PUBLIC_API_URL`.
- Ensure the frontend runtime can reach FastAPI. The frontend `/api/health` route checks this proxy connection.

## Reports, badges, and limits

Saved reports are public and unlisted: anyone with the random report URL can read the stored snapshot. Configure SQLite volume backups and access accordingly. The SVG README badge shows the latest **saved** quality score for a repository; no badge exists before a report is saved. PDF export runs in the visitor's browser via Print → Save as PDF; the service does not render/store a PDF.

The analyzer accepts public HTTPS GitHub repository URLs, performs a depth-1 clone, applies file/text budgets, and does not execute repository code or install dependencies. GitHub metadata lookups are best-effort and separate from the source scan. See [the API contract](backend/API_CONTRACT.md) for response fields and privacy/operational boundaries.
