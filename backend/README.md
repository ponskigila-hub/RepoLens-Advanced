# RepoLens AI - Backend

FastAPI backend for AI-powered GitHub repository analysis.

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Environment

Create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` and add your IBM Bob API key:

```
IBM_BOB_API_KEY=your_api_key_here
IBM_BOB_API_URL=https://api.ibm.com/bob/v1
BACKEND_PORT=8000
FRONTEND_URL=http://localhost:3000
```

### 3. Run Development Server

```bash
python main.py
```

Or with uvicorn:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints

### POST /api/analyze

Analyze a GitHub repository.

**Request:**
```json
{
  "github_url": "https://github.com/user/repo",
  "use_mock": false
}
```

**Response:**
```json
{
  "success": true,
  "summary": "Project description...",
  "architecture": "Architecture explanation...",
  "important_files": [...],
  "suggestions": [...],
  "onboarding": "Getting started guide...",
  "repo_info": {
    "name": "user_repo",
    "technologies": ["Python", "JavaScript"],
    "file_count": 42,
    "total_lines": 1500
  }
}
```

### GET /health

Health check endpoint.

### POST /api/cleanup

Cleanup old temporary repositories.

## Project Structure

```
backend/
├── main.py                    # FastAPI application entry point
├── requirements.txt           # Python dependencies
├── .env.example              # Environment variables template
├── routes/
│   └── analyze.py            # Analysis API endpoints
├── services/
│   ├── repo_cloner.py        # GitHub repository cloning
│   ├── file_scanner.py       # Repository file scanning
│   ├── prompt_builder.py     # AI prompt construction
│   └── analysis_service.py   # IBM Bob API integration
├── utils/
│   └── cleanup.py            # Temporary file cleanup
└── temp_repos/               # Temporary clone directory
```

## Testing

### Test with Mock Data

```bash
curl -X POST http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"github_url": "https://github.com/user/repo", "use_mock": true}'
```

### Test with Real API

```bash
curl -X POST http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"github_url": "https://github.com/user/repo"}'
```

## Deployment

### Render

1. Create new Web Service
2. Connect GitHub repository
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables
6. Deploy

## Notes

- Temporary repositories are stored in `temp_repos/`
- Old repositories are automatically cleaned up after 24 hours
- Mock mode is available for testing without API key