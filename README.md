# RepoLens-Advanced

RepoLens-Advanced is a Next.js + FastAPI tool for inspecting public GitHub repositories. The backend performs a bounded shallow clone, inventories files and build/test/deployment artifacts, computes static code metrics and evidence-backed scorecards, then optionally requests a text-only LLM review.

## What changed in v2

- Quality, maintainability, scalability, architecture, and production-readiness scores now derive from scanned code and artifacts—not GitHub popularity, synthetic metadata, trained-model artifacts, or constant exception fallbacks.
- Python source is analyzed with AST metrics, including function/class/import counts and cyclomatic branching. Other languages use documented syntax-pattern estimates.
- Full repository counts include language, folder, extension, dependency, lockfile, CI, Docker, tests, license, environment template, and coverage-report signals.
- Scanning is bounded; clone uses shallow/filter mode and a timeout. The analyzer never executes repo code.
- LLM insight generation is optional. Static analysis works without an LLM credential, and LLM output cannot change scores.
- Frontend dependencies use the patched Next.js 15.5.27 and Tailwind CSS 4 toolchain; the committed npm lockfile currently passes `npm audit` with zero findings.

## Run locally

### Backend

```bash
cd backend
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # optional; configure an OpenAI-compatible endpoint for LLM text
uvicorn main:app --reload --port 8000
```

`OPENAI_API_KEY` is optional. Set `CORS_ORIGINS` to comma-separated trusted frontend origins in deployment. Keep secrets in deployment environment variables, not in source.

### Frontend

```bash
cd frontend
npm ci
# optional: create .env.local with NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

## API / system flow

`POST /api/analyze` accepts `{"github_url":"https://github.com/owner/repo","include_llm":true}`. It returns dynamic metrics, score components and evidence, file/folder breakdowns, deterministic recommendations, and optional LLM insight status. See [backend/API_CONTRACT.md](backend/API_CONTRACT.md) for the JSON contract and [REFACTORING.md](REFACTORING.md) for a detailed architecture/data-flow and file-by-file change log.

## Tests

```bash
cd backend
pip install -r requirements-dev.txt
python -m unittest discover -s tests -v
```

The project does not load the legacy saved ML models in the API request path; historical training code remains under `backend/ml/` but is not used for current scores.
