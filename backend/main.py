import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.analyze import router as analyze_router
import uvicorn

app = FastAPI(
    title="RepoLens AI Backend",
    description="Evidence-based GitHub repository static analyzer with optional LLM insights",
    version="2.0.0",
)

allowed_origins = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001").split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)
app.include_router(analyze_router, prefix="/api", tags=["analysis"])


@app.get("/")
async def root():
    return {"message": "RepoLens AI Backend", "version": "2.0.0", "status": "running", "docs": "/docs"}


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "RepoLens AI", "scoring": "static-v1"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
