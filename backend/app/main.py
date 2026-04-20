from dotenv import load_dotenv
import os

# Load variables from root .env file BEFORE any other imports load
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env')
load_dotenv(env_path)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.api import api_router
from app.core.database import init_db

app = FastAPI(title="AI Interviewer Unified Backend")

cors_origins = os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001")
allowed_origins = [origin.strip() for origin in cors_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

@app.get("/")
def health_check():
    return {"status": "ok", "service": "backend"}

@app.on_event("startup")
def on_startup():
    init_db()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
