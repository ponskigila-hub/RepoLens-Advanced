# RepoLens AI — Frontend

Responsive Next.js interface for evidence-based analysis of public GitHub repositories. The UI uses a warm paper, forest-green, and terracotta palette; scores and report details come from the API response, while the initial workspace remains an honest empty state.

## Local setup

1. Start the FastAPI service in a terminal:

   ```bash
   cd ../backend
   python -m venv .venv
   . .venv/bin/activate
   pip install -r requirements.txt
   uvicorn main:app --reload --port 8000
   ```

2. In another terminal, configure and start Next.js:

   ```bash
   cd frontend
   npm ci
   cp .env.example .env.local
   npm run dev
   ```

   The example points the Next.js server to `http://127.0.0.1:8000`.

3. Open [http://localhost:3000](http://localhost:3000). The header's **API ready / API offline** indicator checks `/api/health` through the same-origin proxy.

## API connection and deployment

The browser sends requests to its own origin at `/api/analyze` and `/api/health`. Next.js forwards them server-to-server to FastAPI; the browser never tries to fetch `localhost:8000`, and normal use does not require cross-origin CORS configuration.

For deployment, configure **`REPOLENS_API_URL`** in the frontend host's server environment to the FastAPI service origin, for example `https://your-api.example.com` (do not append `/api`). Deploy the FastAPI backend separately and ensure the frontend server can reach it. Then redeploy/restart the frontend so the route handlers receive the setting. A frontend-only deployment cannot run the Python repository analyzer.

If the indicator stays offline:

1. Open `https://your-frontend.example.com/api/health`; a working connection returns `{"status":"healthy", ...}`.
2. Confirm `REPOLENS_API_URL` is set on the **frontend server**, not only in the browser or in a local shell.
3. Confirm the URL points to a live FastAPI deployment whose `/health` endpoint responds.
4. Check frontend and backend server logs. If calling FastAPI directly from the browser instead of using the proxy, set `CORS_ORIGINS` to the exact frontend origin on the backend.

## Build

```bash
npm ci
npm run build
npm start
```

## Main files

- `app/page.tsx` — landing page, API health indicator, and scan states.
- `app/api/analyze/route.ts` — same-origin analysis proxy.
- `app/api/health/route.ts` — same-origin backend health proxy.
- `services/backendProxy.ts` — server-side upstream forwarding and clear 503/504 errors.
- `services/api.ts` — typed browser client.
- `components/AnalysisCard.tsx` — dynamic report tabs and visualizations.
- `components/RepoInput.tsx` — validated public GitHub URL form.
- `components/LoadingSpinner.tsx` — accessible indeterminate scan state.
- `types/analysis.ts` — frontend/API response contract.

## Environment variables

| Variable | Where it is used | Example |
| --- | --- | --- |
| `REPOLENS_API_URL` | Next.js server only; FastAPI origin, no `/api` suffix | `http://127.0.0.1:8000` locally |

Optional AI narrative settings are configured on the FastAPI service; static scanning and scores do not require an LLM key.
