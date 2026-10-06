# Frontend

Responsive Next.js UI for evidence-based analysis of public GitHub repositories. Reports separate maintainer-provided project purpose from observed code structure, then show a file tree, function/class names, languages/frameworks, repository ownership/contributors, score evidence, quick fixes, and limitations.

## Local setup

1. Start FastAPI from `../backend` on port 8000 after installing its `requirements.txt`.
2. In `frontend/`, run:

   ```bash
   npm ci
   cp .env.example .env.local
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000). The header status checks `/api/health` through the same-origin proxy.

## Report sections

- **Overview:** README/manifest purpose evidence, an independent code-based summary, GitHub owner/creation date/contributors, dynamic scorecards, and measurements.
- **Code map:** Expandable tree from returned file paths, directory-role hints, entry-point candidates, and sampled function/class names. Python uses AST; JavaScript/TypeScript/Go/Rust use syntax patterns.
- **Stack:** Language counts, recognized direct framework declarations with manifest evidence, and dependency inventory. A declaration does not prove runtime use.
- **README cross-check:** Literal framework-name matches against detected direct manifest declarations; this is not semantic verification.
- **How it works:** A report tab explains scan stages, evidence sources, and what is not measured.
- **Save & share:** Explicitly stores a completed JSON snapshot and creates a public-unlisted URL plus copyable README badge Markdown. Anyone with the link can view the snapshot.
- **Save PDF:** Uses the browser print dialog. Choose **Save as PDF**; no PDF is uploaded to the service.

## Backend connection and deployment

The browser calls same-origin `/api/analyze`, `/api/reports`, and `/api/health` routes. Next.js forwards server-to-server to FastAPI; badge paths are proxied as well. Set server-side `REPOLENS_API_URL` to the FastAPI origin (without `/api`) in production. A frontend-only deployment cannot run Python analysis.

On the backend, configure `REPORT_DB_PATH` on persistent storage for saved-report durability. Optional `GITHUB_TOKEN` raises public GitHub REST API limits; without it, creation date/contributors may be unavailable while repository scanning still succeeds. Optional AI narrative settings belong only on FastAPI.

## Main files

- `app/page.tsx` — compact landing page, service status, repository input, and scan scope.
- `components/AnalysisCard.tsx` — report tabs, code map, stack, GitHub metadata, score evidence, sharing, and print action.
- `app/reports/[reportId]/page.tsx` — saved public report page.
- `app/api/` and `app/badge/` — same-origin proxy routes.
- `services/api.ts` and `services/backendProxy.ts` — typed browser client and server-to-server forwarding.
- `types/analysis.ts` — schema v1.2 contracts.

## Environment

| Variable | Used by | Description |
|---|---|---|
| `REPOLENS_API_URL` | Next.js server | FastAPI origin, without `/api`; local default `http://127.0.0.1:8000`. |
| `REPORT_DB_PATH` | FastAPI | Writable persistent SQLite report database location. |
| `GITHUB_TOKEN` | FastAPI | Optional secret for higher GitHub REST API limits. |
