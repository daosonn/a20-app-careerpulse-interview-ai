import os
from pathlib import Path
from typing import Annotated, Generator

from fastapi import Depends
from sqlalchemy import create_engine, inspect as sa_inspect, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import BACKEND_DIR, PROJECT_ROOT, SQL_DATA_DIR
from app.core.logger import log_func

# Path to database in the unified data/sql directory
DEFAULT_SQLITE_PATH = SQL_DATA_DIR / 'interview_coach.db'


def _normalize_database_url(raw_url: str | None) -> str:
    log_func("_normalize_database_url", level=2)
    if raw_url:
        normalized = raw_url.strip()
        if normalized.startswith("postgres://"):
            return normalized.replace("postgres://", "postgresql+psycopg2://", 1)
        if normalized.startswith("postgresql://"):
            return normalized.replace("postgresql://", "postgresql+psycopg2://", 1)
        return normalized

    if os.getenv("VERCEL"):
        raise RuntimeError(
            "DATABASE_URL is required on Vercel. Configure a managed Postgres "
            "database instead of using ephemeral /tmp SQLite storage."
        )

    return f"sqlite:///{DEFAULT_SQLITE_PATH}"


DATABASE_URL = _normalize_database_url(os.getenv("DATABASE_URL"))

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def _migrate_add_columns(engine_ref):
    log_func("_migrate_add_columns", level=2)
    """Add new columns to existing tables without dropping data.

    SQLAlchemy's ``create_all`` only creates *missing tables*, not missing
    columns.  For SQLite (and Postgres) we issue ``ALTER TABLE ADD COLUMN``
    and silently ignore failures (column already exists).
    """

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
            ("tools", "JSON"),
            ("projects", "JSON"),
        ],
        "educations": [
            ("created_at", "DATETIME"),
            ("updated_at", "DATETIME"),
        ],
        "interviews": [
            ("updated_at", "DATETIME"),
            ("ended_at", "DATETIME"),
            ("pending_questions", "JSON"),
            ("is_stress_test", "BOOLEAN DEFAULT 0"),
            ("question_count", "INTEGER DEFAULT 5"),
            ("resume_upload_id", "INTEGER"),
            ("matched_skills", "JSON"),
        ],
        "resume_uploads": [
            ("matched_skills", "JSON"),
            ("cv_vector", "JSON"),
        ],
        "suggested_jobs": [
            ("url", "VARCHAR"),
            ("source", "VARCHAR DEFAULT 'auto'"),
            ("is_active", "BOOLEAN DEFAULT 1"),
            ("created_at", "DATETIME"),
            ("updated_at", "DATETIME"),
            ("deadline", "VARCHAR"),
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
    log_func("init_db")
    # Ensure data directory exists when using local sqlite file path.
    if DATABASE_URL.startswith("sqlite:///"):
        sqlite_path = Path(DATABASE_URL.replace("sqlite:///", "", 1))
        sqlite_path.parent.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)
    if DATABASE_URL.startswith("sqlite"):
        _migrate_add_columns(engine)

def get_db() -> Generator[Session, None, None]:
    log_func("get_db")
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

# Dependency type alias for modern FastAPI
SessionDep = Annotated[Session, Depends(get_db)]
