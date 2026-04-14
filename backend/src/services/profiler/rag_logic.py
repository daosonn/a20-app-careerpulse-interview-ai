import os
import sys
from langchain_openai import OpenAIEmbeddings
from langchain_chroma import Chroma

# Project imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..")))
from src.core.config import interviewer_llm

CHROMA_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "chroma_data"))

import json

def extract_cv_info_logic(cv_text: str) -> dict:
    prompt = f"""
    Bạn là một chuyên gia phân tích CV. Hãy đọc đoạn CV sau và trích xuất đúng các thông tin được yêu cầu dưới định dạng JSON sau:
    {{
      "full_name": "Họ và tên của ứng viên",
      "dob": "Ngày tháng năm sinh (ví dụ: dd/mm/yyyy), nếu không có để null",
      "current_position": "Vị trí công việc hiện tại hoặc gần nhất (ví dụ: Senior Java Developer)",
      "skills": ["Kỹ năng 1", "Kỹ năng 2", "Kỹ năng 3"]
    }}

    Lưu ý: Chỉ trả về JSON, không viết thêm bất kỳ lời dẫn nào. Nếu không tìm thấy thông tin nào đó, hãy để giá trị là null cho field đó.
    
    CV CONTENT:
    {cv_text[:3000]}
    """
    try:
        response = interviewer_llm.invoke(prompt)
        content = response.content.strip()
        # Clean up in case AI wraps JSON in backticks
        if content.startswith("```json"):
            content = content[7:-3].strip()
        elif content.startswith("```"):
            content = content[3:-3].strip()
        
        return json.loads(content)
    except Exception as e:
        print(f"[ERROR] CV Extraction failed: {e}")
        return {
            "full_name": None,
            "dob": None,
            "current_position": "Chưa xác định",
            "skills": ["Kỹ năng chung"]
        }

def search_questions_logic(skills: list[str]) -> str:
    if not skills:
        return "Hãy giới thiệu bản thân."
    try:
        embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
        vector_store = Chroma(
            collection_name="interview_questions",
            embedding_function=embeddings,
            persist_directory=CHROMA_PATH
        )
        query = "Các câu hỏi phỏng vấn về: " + ", ".join(skills)
        docs = vector_store.similarity_search(query, k=3)
        
        if not docs:
            return "Không tìm thấy câu hỏi chuyên môn phù hợp trong DB."
            
        result_text = "Dưới đây là các câu hỏi chuyên môn lấy từ Database:\n"
        for i, doc in enumerate(docs):
            result_text += f"{i+1}. {doc.page_content}\n"
        return result_text
    except Exception as e:
        return f"Error querying RAG: {str(e)}"
