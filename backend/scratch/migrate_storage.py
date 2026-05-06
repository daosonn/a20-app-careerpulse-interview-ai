import os
import shutil
from pathlib import Path

def migrate_storage():
    root = Path(".")
    data_root = root / "data"
    
    # Target directories
    sql_dir = data_root / "sql"
    vector_dir = data_root / "vector"
    raw_dir = data_root / "raw"
    logs_dir = data_root / "logs"

    # Create target directories
    for d in [sql_dir, vector_dir, raw_dir, logs_dir]:
        d.mkdir(parents=True, exist_ok=True)

    print("--- Starting Migration ---")

    # 1. Migrate SQL
    old_sql = root / "backend" / "data" / "interview_coach.db"
    # Also check if it was already moved to root by previous attempt
    if not old_sql.exists():
        old_sql = root / "interview_coach.db"
        
    if old_sql.exists():
        print(f"Moving SQL: {old_sql} -> {sql_dir}")
        shutil.move(str(old_sql), str(sql_dir / "interview_coach.db"))

    # 2. Migrate Checkpoints
    old_cp = root / "backend" / "data" / "langgraph_checkpoints.sqlite"
    if old_cp.exists():
        print(f"Moving Checkpoints: {old_cp} -> {sql_dir}")
        shutil.move(str(old_cp), str(sql_dir / "langgraph_checkpoints.sqlite"))

    # 3. Migrate Vector DBs
    for item in os.listdir(root):
        if item.startswith("chroma_db_"):
            old_path = root / item
            print(f"Moving Vector DB: {old_path} -> {vector_dir}")
            # shutil.move can fail if target exists, but we just created it empty
            if (vector_dir / item).exists():
                shutil.rmtree(vector_dir / item)
            shutil.move(str(old_path), str(vector_dir / item))

    # 4. Migrate Raw Data
    old_raw = root / "raw_data"
    if old_raw.exists():
        print(f"Moving Raw Data: {old_raw} -> {raw_dir}")
        # Merge contents if raw_dir already exists
        for item in os.listdir(old_raw):
            s = old_raw / item
            d = raw_dir / item
            if s.is_dir():
                if d.exists(): shutil.rmtree(d)
                shutil.move(str(s), str(d))
            else:
                shutil.move(str(s), str(d))
        # Remove empty old_raw
        try: os.rmdir(old_raw)
        except: pass

    print("--- Migration Finished ---")

if __name__ == "__main__":
    migrate_storage()
