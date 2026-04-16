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

def _migrate_add_columns(engine_ref):
    """Add new columns to existing tables without dropping data.

    SQLAlchemy's ``create_all`` only creates *missing tables*, not missing
    columns.  For SQLite (and Postgres) we issue ``ALTER TABLE ADD COLUMN``
    and silently ignore failures (column already exists).
    """
    from sqlalchemy import text, inspect as sa_inspect

    inspector = sa_inspect(engine_ref)

    # Map: table_name -> list of (column_name, column_DDL_suffix)
    migrations: dict[str, list[tuple[str, str]]] = {
        "users": [
            ("created_at", "DATETIME"),
            ("updated_at", "DATETIME"),
            ("last_cv_uploaded_at", "DATETIME"),
            ("last_profile_update_at", "DATETIME"),
            ("last_activity_at", "DATETIME"),
            ("preferred_language", "VARCHAR DEFAULT 'vi'"),
            ("difficulty", "VARCHAR DEFAULT 'Normal'"),
            ("ai_persona", "VARCHAR DEFAULT 'AI Coach'"),
            ("availability", "VARCHAR DEFAULT ''"),
            ("default_interview_type", "VARCHAR DEFAULT 'Behavioral'"),
            ("stress_test_default", "BOOLEAN DEFAULT 0"),
            ("auto_read_questions", "BOOLEAN DEFAULT 1"),
            ("questions_per_session", "INTEGER DEFAULT 5"),
            ("ui_language", "VARCHAR DEFAULT 'vi'"),
            ("theme", "VARCHAR DEFAULT 'dark'"),
            ("email_reminders", "BOOLEAN DEFAULT 1"),
            ("ai_suggestions", "BOOLEAN DEFAULT 1"),
            ("security_alerts", "BOOLEAN DEFAULT 1"),
            ("public_profile", "BOOLEAN DEFAULT 0"),
            ("anonymous_practice", "BOOLEAN DEFAULT 0"),
        ],
        "educations": [
            ("created_at", "DATETIME"),
            ("updated_at", "DATETIME"),
        ],
        "interviews": [
            ("updated_at", "DATETIME"),
            ("ended_at", "DATETIME"),
        ],
    }

    with engine_ref.begin() as conn:
        for table, cols in migrations.items():
            if table not in inspector.get_table_names():
                continue
            existing = {c["name"] for c in inspector.get_columns(table)}
            for col_name, col_ddl in cols:
                if col_name not in existing:
                    try:
                        conn.execute(
                            text(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_ddl}")
                        )
                    except Exception:
                        pass  # Column already exists or DB doesn't support ALTER


def init_db():
    # Ensure data directory exists when using local sqlite file path.
    if DATABASE_URL.startswith("sqlite:///"):
        sqlite_path = DATABASE_URL.replace("sqlite:///", "", 1)
        data_dir = os.path.dirname(sqlite_path)
        if data_dir and not os.path.exists(data_dir):
            os.makedirs(data_dir, exist_ok=True)
    Base.metadata.create_all(bind=engine)
    _migrate_add_columns(engine)

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Dependency type alias for modern FastAPI
SessionDep = Annotated[Session, Depends(get_db)]
