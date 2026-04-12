import os
import sys
from langchain_openai import OpenAIEmbeddings
from langchain_chroma import Chroma

# Project imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..")))
from src.core.config import interviewer_llm

CHROMA_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "chroma_data"))

def extract_skills_logic(cv_text: str) -> list[str]:
    prompt = f"""
    Đọc đoạn CV sau và trích xuất đúng 3 kỹ năng công nghệ/chuyên môn nổi bật nhất (Ví dụ: Python, React, SQL).
    Chỉ trả về 3 từ khóa, cách nhau bằng dấu phẩy. Không viết thêm gì khác.
    CV: {cv_text[:2000]}...
    """
    try:
        response = interviewer_llm.invoke(prompt)
        return [s.strip() for s in response.content.split(',')]
    except:
        return ["Kỹ năng chung"]

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
