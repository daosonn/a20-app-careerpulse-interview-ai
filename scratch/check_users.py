import sqlite3
import os

db_path = r'd:\A - AI Project\A20-App-011\backend\data\interview_coach.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, email, name, is_onboarded FROM users;")
        rows = cursor.fetchall()
        print(f"Found {len(rows)} users:")
        for row in rows:
            print(f"ID: {row[0]}, Email: {row[1]}, Onboarded: {row[3]}")
    except sqlite3.OperationalError as e:
        print(f"Error: {e}")
    conn.close()
else:
    print(f"Database not found at {db_path}")
