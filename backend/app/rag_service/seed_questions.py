import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy.orm import Session

# Adjust path to find .env in project root
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
load_dotenv(PROJECT_ROOT / ".env")

# Add backend directory to sys.path to resolve 'app' module
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(BACKEND_DIR))

from app.core.database import Base, SessionLocal, engine
from app.core.logger import log_func
from app.models.models import QuestionBank

# Ensure tables exist
Base.metadata.create_all(bind=engine)

SAMPLE_QUESTIONS = [
    {
        "question": "Bạn hãy giải thích sự khác biệt giữa list và tuple trong Python. Khi nào nên sử dụng mỗi loại?",
        "skills": ["Python"],
        "intent": "Kiểm tra kiến thức cơ bản về data structures trong Python.",
        "tip": "Nêu được tính bất biến (immutability) của tuple và hiệu năng.",
        "persona": "Ms. Linh",
        "evaluation_type": "technical",
        "language": "vi"
    },
    {
        "question": "Decorator trong Python dùng để làm gì? Bạn có thể cho một ví dụ thực tế đã từng sử dụng không?",
        "skills": ["Python"],
        "intent": "Kiểm tra kiến thức về Functional Programming và Design Patterns.",
        "tip": "Nhắc đến việc bổ sung logic cho hàm mà không sửa đổi code gốc (logging, auth).",
        "persona": "Ms. Linh",
        "evaluation_type": "technical",
        "language": "vi"
    },
    {
        "question": "React Hook 'useEffect' được sử dụng khi nào? Bạn hãy giải thích ý nghĩa của mảng dependency.",
        "skills": ["React", "Frontend"],
        "intent": "Kiểm tra hiểu biết về lifecycle và hooks trong React.",
        "tip": "Đề cập đến side-effects, mount/unmount/update.",
        "persona": "Mr. Hung",
        "evaluation_type": "technical",
        "language": "vi"
    },
    {
        "question": "Sự khác biệt giữa Virtual DOM và Real DOM là gì? Tại sao React lại nhanh hơn việc cập nhật DOM trực tiếp?",
        "skills": ["React", "Frontend"],
        "intent": "Kiểm tra kiến thức về kiến trúc và hiệu năng của React.",
        "tip": "Nhắc đến Reconciliation algorithm và batching updates.",
        "persona": "Mr. Hung",
        "evaluation_type": "technical",
        "language": "vi"
    },
    {
        "question": "Sự khác biệt giữa INNER JOIN và LEFT JOIN là gì? Cho ví dụ trường hợp bạn bắt buộc phải dùng LEFT JOIN.",
        "skills": ["SQL", "Database"],
        "intent": "Kiểm tra kiến thức cơ bản về quan hệ dữ liệu.",
        "tip": "LEFT JOIN lấy toàn bộ dữ liệu bảng trái kể cả khi không có khớp ở bảng phải.",
        "persona": "Ms. Nguyen",
        "evaluation_type": "technical",
        "language": "vi"
    },
    {
        "question": "Hãy kể về một tình huống bạn gặp mâu thuẫn với đồng nghiệp trong dự án. Bạn đã giải quyết nó như thế nào?",
        "skills": ["Teamwork", "Communication"],
        "intent": "Đánh giá kỹ năng mềm và khả năng giải quyết xung đột.",
        "tip": "Sử dụng mô hình STAR (Situation, Task, Action, Result).",
        "persona": "Ms. Linh",
        "evaluation_type": "behavioral",
        "language": "vi"
    },
    {
        "question": "Tại sao bạn lại chọn ứng tuyển vào vị trí này? Bạn mong đợi điều gì ở môi trường làm việc của chúng tôi?",
        "skills": ["Motivation"],
        "intent": "Đánh giá mức độ phù hợp và động lực làm việc.",
        "tip": "Thể hiện sự nghiên cứu về công ty và định hướng cá nhân.",
        "persona": "Ms. Linh",
        "evaluation_type": "behavioral",
        "language": "vi"
    }
]

def seed():
    log_func("seed")
    db = SessionLocal()
    try:
        count = db.query(QuestionBank).count()
        if count > 0:
            print(f"QuestionBank already has {count} entries. Skipping seeding.")
            return

        for q_data in SAMPLE_QUESTIONS:
            q = QuestionBank(**q_data)
            db.add(q)
        
        db.commit()
        print(f"Successfully seeded {len(SAMPLE_QUESTIONS)} questions into QuestionBank.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
