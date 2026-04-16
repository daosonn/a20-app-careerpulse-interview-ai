from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, JSON, ForeignKey, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
import datetime
import os
from typing import Annotated, Generator
from fastapi import Depends

# Path to database relative to this file
# Since we are in backend/app/core/database.py, the data dir is in backend/data/
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEFAULT_SQLITE_PATH = os.path.join(BASE_DIR, 'data', 'interview_coach.db')

if os.getenv("VERCEL") and not os.getenv("DATABASE_URL"):
    # Vercel filesystem is read-only except /tmp.
    DEFAULT_SQLITE_PATH = "/tmp/interview_coach.db"

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_SQLITE_PATH}")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def init_db():
    # Ensure data directory exists when using local sqlite file path.
    if DATABASE_URL.startswith("sqlite:///"):
        sqlite_path = DATABASE_URL.replace("sqlite:///", "", 1)
        data_dir = os.path.dirname(sqlite_path)
        if data_dir and not os.path.exists(data_dir):
            os.makedirs(data_dir, exist_ok=True)
    Base.metadata.create_all(bind=engine)

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Dependency type alias for modern FastAPI
SessionDep = Annotated[Session, Depends(get_db)]
