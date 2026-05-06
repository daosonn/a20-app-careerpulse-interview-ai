import sqlite3
import os
from pathlib import Path

PROJECT_ROOT = Path("d:/A - AI Project/A20-App-011")
DB_PATH = PROJECT_ROOT / "database/sql/interview_coach.db"
LANGGRAPH_DB_PATH = PROJECT_ROOT / "database/sql/langgraph_checkpoints.sqlite"

def cleanup_main_db():
    print(f"Cleaning up {DB_PATH}...")
    if not DB_PATH.exists():
        print("Database not found.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Tables to clear
    tables = [
        "users",
        "educations",
        "interviews",
        "interview_turns",
        "resume_uploads",
        "suggested_jobs",
        "user_activities"
    ]

    for table in tables:
        try:
            cursor.execute(f"DELETE FROM {table}")
            print(f"  - Cleared table: {table}")
        except sqlite3.OperationalError as e:
            print(f"  - Error clearing {table}: {e}")

    conn.commit()
    cursor.execute("VACUUM")
    conn.close()
    print("Main database cleanup complete.")

def cleanup_langgraph_db():
    print(f"Cleaning up {LANGGRAPH_DB_PATH}...")
    if not LANGGRAPH_DB_PATH.exists():
        print("LangGraph database not found.")
        return

    conn = sqlite3.connect(LANGGRAPH_DB_PATH)
    cursor = conn.cursor()

    # Get all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [row[0] for row in cursor.fetchall()]

    for table in tables:
        try:
            cursor.execute(f"DELETE FROM {table}")
            print(f"  - Cleared table: {table}")
        except sqlite3.OperationalError as e:
            print(f"  - Error clearing {table}: {e}")

    conn.commit()
    cursor.execute("VACUUM")
    conn.close()
    print("LangGraph database cleanup complete.")

if __name__ == "__main__":
    cleanup_main_db()
    cleanup_langgraph_db()
    print("\nCleanup finished. QuestionBank and ChromaDB preserved.")
