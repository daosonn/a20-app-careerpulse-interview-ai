import os
from openai import OpenAI
from typing import List, Dict, Any
from app.core.config import LLMFactory

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def extract_cv_info_logic(cv_text: str) -> Dict[str, Any]:
    """Sử dụng LLM trích xuất kỹ năng và thông tin từ CV."""
    prompt = f"""Phân tích CV sau và trích xuất:
    1. Danh sách các kỹ năng chính (skills)
    2. Họ và tên (full_name)
    3. Ngày tháng năm sinh (dob)
    4. Vị trí hiện tại (current_position)
    
    CV: {cv_text}
    
    Trả về kết quả dưới dạng JSON thuần túy."""
    
    try:
        completion = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        import json
        return json.loads(completion.choices[0].message.content)
    except Exception as e:
        print(f"Error extracting CV info: {e}")
        return {"skills": ["Kỹ năng chung"]}

def search_questions_logic(skills: List[str]) -> str:
    """Mock search trong Vector DB."""
    return f"Câu hỏi liên quan đến: {', '.join(skills)}"
