# Backend

FastAPI service for bounded static analysis of public GitHub repositories. It uses a shallow Git clone, inventories files/manifests, extracts supported code symbols, computes evidence-backed `static-v2` scorecards, and optionally stores explicitly saved report snapshots in SQLite. Repository source is never executed.

## Run locally

```bash
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # optional settings
uvicorn main:app --reload --port 8000
```

System Git must be installed. Static analysis does not require an LLM key. Optional `GITHUB_TOKEN` can increase public GitHub REST API rate limits; metadata lookup failures do not fail a code scan. Optional `OPENAI_API_KEY` enables a separate text-only narrative.

## API

- `GET /health` — liveness and scoring methodology.
- `POST /api/analyze` — public-repository analysis, schema v1.2.
- `POST /api/reports` — explicitly save a report snapshot.
- `GET /api/reports/{id}` — retrieve a public-unlisted snapshot.
- `GET /badge/{owner}/{repository}.svg` — latest saved quality score badge.

See [API_CONTRACT.md](API_CONTRACT.md) and the [complete response example](examples/analyze-response.example.json).

## Persistence

The report database defaults to `backend/data/reports.sqlite3`; set `REPORT_DB_PATH` to override it. Use a persistent volume in production. Saved report URLs are public and unlisted; the initial release has no authentication or delete endpoint.

## Tests

```bash
pip install -r requirements-dev.txt
python -m unittest discover -s tests -v
```

## Static-analysis boundaries

Python functions/classes and complexity measurements use AST. JavaScript, TypeScript, Go, and Rust symbol names use syntax patterns. Frameworks are inferred from direct manifest declarations. RepoLens does not install dependencies, execute code, run repository tests, profile performance, or perform a complete security audit. Missing measurements are labeled unavailable/not measured.
