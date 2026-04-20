import os
from typing import List, Dict, Any
import json
from app.core.config import async_client

async def extract_cv_info_logic(cv_text: str) -> Dict[str, Any]:
    """Sử dụng Async LLM trích xuất kỹ năng và thông tin từ CV."""
    prompt = f"""Phân tích CV sau và trích xuất:
    1. Danh sách các kỹ năng chính (skills)
    2. Họ và tên (full_name)
    3. Ngày tháng năm sinh (dob)
    4. Vị trí hiện tại (current_position)
    
    CV: {cv_text}
    
    Trả về kết quả dưới dạng JSON thuần túy."""
    
    try:
        completion = await async_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        return json.loads(completion.choices[0].message.content)
    except Exception as e:
        print(f"Error extracting CV info: {e}")
        return {"skills": ["Kỹ năng chung"]}

def search_questions_logic(skills: List[str]) -> str:
    """Mock search trong Vector DB."""
    return f"Câu hỏi liên quan đến: {', '.join(skills)}"

