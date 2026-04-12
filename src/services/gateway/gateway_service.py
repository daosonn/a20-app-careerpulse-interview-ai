from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import sys

# Đảm bảo root project có trong sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..")))

from src.core.database import init_db
from .routes import router

app = FastAPI(title="API Gateway Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")

if __name__ == "__main__":
    import uvicorn
    init_db()
    uvicorn.run(app, host="127.0.0.1", port=8000)
