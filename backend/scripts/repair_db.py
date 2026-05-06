import sqlite3
import os

def repair_database():
    db_path = "data/interview_coach.db"
    if not os.path.exists(db_path):
        print(f"Database file {db_path} not found. Skipping migration.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Danh sách các cột cần thêm vào từng bảng
    migrations = [
        # Bảng interviews
        ("interviews", "resume_upload_id", "INTEGER"),
        ("interviews", "matched_skills", "JSON"),
        
        # Bảng resume_uploads
        ("resume_uploads", "matched_skills", "JSON"),
        ("resume_uploads", "rich_summary", "TEXT"),
        ("resume_uploads", "cv_vector", "JSON"),
    ]

    for table, column, dtype in migrations:
        try:
            # Kiểm tra xem cột đã tồn tại chưa
            cursor.execute(f"PRAGMA table_info({table})")
            columns = [info[1] for info in cursor.fetchall()]
            
            if column not in columns:
                print(f"Adding column {column} to table {table}...")
                cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {dtype}")
                print(f"Successfully added {column}.")
            else:
                print(f"Column {column} already exists in {table}.")
        except Exception as e:
            print(f"Error adding {column} to {table}: {e}")

    conn.commit()
    conn.close()
    print("Database repair completed.")

if __name__ == "__main__":
    repair_database()
