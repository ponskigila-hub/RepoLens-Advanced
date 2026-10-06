# Troubleshooting

## The page says the analysis service is unavailable

1. Check FastAPI directly: `curl http://127.0.0.1:8000/health`.
2. Check the frontend proxy by opening `/api/health` on the Next.js origin.
3. Set `REPOLENS_API_URL` on the **Next.js server** to the FastAPI origin (no `/api` suffix), then restart/redeploy the frontend.
4. Review both services' logs. A frontend-only deployment cannot run the analyzer.

The browser calls same-origin Next.js routes. `NEXT_PUBLIC_API_URL` is not the active configuration.

## Analysis returned an error

- Confirm the URL is one public repository: `https://github.com/{owner}/{repository}`. Private repositories and organization pages are not supported.
- Check that `git` is installed on the FastAPI host and outbound access to `github.com` is permitted.
- Clone and scan work is bounded. Very large repositories may be capped or time out; review returned scan warnings and backend logs.
- HTTP `503` from the frontend proxy usually means FastAPI is unreachable; `504` means the proxy timed out; `400` usually indicates a failed/unsupported clone; `500` indicates an unexpected server error. Inspect the backend traceback before retrying.
- Optional LLM failures appear under `insights.llm`; they should not invalidate static scores. Disable optional AI narrative to isolate the core scan.

## GitHub owner, creation date, or contributors are unavailable

These values come from the public GitHub REST API, not from the clone. GitHub can rate-limit unauthenticated requests. Analysis still completes; metadata is marked `partial` or `unavailable`. Optionally configure `GITHUB_TOKEN` as a backend secret, then restart the API. Never expose it in frontend code or commit it.

## Purpose, framework, or function details are missing

- A purpose statement is shown only when readable README/manifest evidence exists; code counts are not substituted for product intent.
- Function/class names are extracted for Python (AST) and supported JavaScript/TypeScript/Go/Rust syntax; other languages may have no symbol sample.
- Framework detection covers direct declarations in supported manifests. Indirect dependencies, custom frameworks, monorepo tooling, or runtime wiring may not be recognized.
- README cross-check is literal framework-name matching, not semantic verification. Review the separately cited README/manifest evidence and code map.

## Saved reports or badges disappear

Set `REPORT_DB_PATH` to a writable persistent volume. Container-local SQLite data may be lost when an instance is replaced. Report links are public and unlisted; the initial implementation has no authentication or delete endpoint.

## Frontend build fails

Use the committed lockfile:

```bash
cd frontend
npm ci
npm run build
```

Avoid deleting `package-lock.json` as a troubleshooting step; `npm ci` reproduces the locked dependency tree.
