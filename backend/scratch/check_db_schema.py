import sqlite3
import os

def check_all_tables():
    db_path = "data/interview_coach.db"
    if not os.path.exists(db_path):
        print("DB not found")
        return

    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    # Danh sách tất cả các bảng trong Model
    tables = [
        'users', 'educations', 'interviews', 'interview_turns', 
        'resume_uploads', 'suggested_jobs', 'user_activities', 'question_bank'
    ]
    
    for t in tables:
        print(f"\n--- Table: {t} ---")
        try:
            c.execute(f"PRAGMA table_info({t})")
            columns = c.fetchall()
            if not columns:
                print(f"  [!] Table {t} does not exist in DB!")
            for col in columns:
                print(f"  {col[1]} ({col[2]})")
        except Exception as e:
            print(f"  Error checking {t}: {e}")
            
    conn.close()

if __name__ == "__main__":
    check_all_tables()
