import sqlite3
import os
from pathlib import Path

# Paths
DB_PATH = Path("backend/data/interview_coach.db")
CHECKPOINT_PATH = Path("backend/data/langgraph_checkpoints.sqlite")

def cleanup():
    print(f"--- Starting Database Cleanup ---")
    
    if DB_PATH.exists():
        print(f"Cleaning {DB_PATH}...")
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            # Get all table names
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = [row[0] for row in cursor.fetchall()]
            
            for table in tables:
                if table == "question_bank" or table == "sqlite_sequence":
                    print(f"  [KEEP] Skipping table: {table}")
                    continue
                
                print(f"  [DELETE] Clearing table: {table}")
                cursor.execute(f"DELETE FROM {table};")
            
            conn.commit()
            conn.close()
            print(f"Successfully cleaned main database.")
        except Exception as e:
            print(f"Error cleaning main database: {e}")
    else:
        print(f"Main database {DB_PATH} not found.")

    # Delete LangGraph checkpoints (history)
    checkpoint_files = [
        CHECKPOINT_PATH,
        Path(str(CHECKPOINT_PATH) + "-shm"),
        Path(str(CHECKPOINT_PATH) + "-wal")
    ]
    
    for f in checkpoint_files:
        if f.exists():
            print(f"Deleting checkpoint file: {f}...")
            try:
                os.remove(f)
                print(f"  Deleted.")
            except Exception as e:
                print(f"  Error deleting {f}: {e}")

    print(f"--- Cleanup Finished ---")
    print(f"Note: Chroma databases (chroma_db_*) and raw data were NOT touched.")

if __name__ == "__main__":
    cleanup()
