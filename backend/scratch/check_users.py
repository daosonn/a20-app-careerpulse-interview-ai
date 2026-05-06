import sqlite3
from pathlib import Path

def check_users():
    db_path = Path("database/sql/interview_coach.db")
    if not db_path.exists():
        print(f"Database not found at {db_path}")
        return

    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT id, email, name, is_onboarded FROM users")
        users = cursor.fetchall()
        print(f"Found {len(users)} users:")
        for u in users:
            email = u[1]
            onboarded = u[3]
            print(f"ID: {u[0]}, Email: {email}, Onboarded: {onboarded}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    check_users()
