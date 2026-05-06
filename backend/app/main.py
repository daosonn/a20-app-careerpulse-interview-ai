import os
import traceback
import uvicorn
from datetime import datetime
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import PROJECT_ROOT
from app.api.v1.api import api_router
from app.core.database import init_db
from app.core.logger import log_func

# Load variables from root .env file
env_path = PROJECT_ROOT / '.env'
load_dotenv(str(env_path))

app = FastAPI(title="AI Interviewer Unified Backend")

cors_origins = os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001")
allowed_origins = [origin.strip() for origin in cors_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=600, # Cache preflight for 10 minutes
)

app.include_router(api_router, prefix="/api/v1")

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    log_func("unhandled_exception_handler")
    traceback.print_exc()
    return JSONResponse(status_code=500, content={"detail": str(exc) or "Internal Server Error"})

@app.get("/")
def health_check():
    log_func("health_check")
    return {"status": "ok", "service": "backend"}

@app.on_event("startup")
def on_startup():
    log_func("on_startup")
    init_db()

if __name__ == "__main__":
    # Custom Logging Configuration for precise timestamps
    LOGGING_CONFIG = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "()": "uvicorn.logging.DefaultFormatter",
                "fmt": "%(asctime)s [%(levelname)s] %(message)s",
                "datefmt": "%Y-%m-%d %H:%M:%S",
            },
            "access": {
                "()": "uvicorn.logging.AccessFormatter",
                "fmt": '%(asctime)s [%(levelname)s] %(client_addr)s - "%(request_line)s" %(status_code)s',
                "datefmt": "%Y-%m-%d %H:%M:%S",
            },
        },
        "handlers": {
            "default": {
                "formatter": "default",
                "class": "logging.StreamHandler",
                "stream": "ext://sys.stderr",
            },
            "access": {
                "formatter": "access",
                "class": "logging.StreamHandler",
                "stream": "ext://sys.stdout",
            },
        },
        "loggers": {
            "uvicorn": {"handlers": ["default"], "level": "INFO"},
            "uvicorn.error": {"level": "INFO"},
            "uvicorn.access": {"handlers": ["access"], "level": "INFO", "propagate": False},
        },
    }
    
    uvicorn.run(app, host="127.0.0.1", port=8000, log_config=LOGGING_CONFIG)
