import os
from typing import List, Dict, Any
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain_core.documents import Document
import uuid

class RAGService:
    def __init__(self):
        self.embeddings = OpenAIEmbeddings(api_key=os.getenv("OPENAI_API_KEY"))
        self.persist_directory = "./chroma_db"
        self.collection_name = "jobs_collection"
        self.vector_db = Chroma(
            collection_name=self.collection_name,
            embedding_function=self.embeddings,
            persist_directory=self.persist_directory
        )

    def add_jobs_to_vector_db(self, jobs_data: List[Dict[str, Any]]):
        """
        Lưu trực tiếp dữ liệu job vào ChromaDB.
        Metadata chứa: title, company, url, skills, requirements, etc.
        """
        documents = []
        for job in jobs_data:
            # Tạo nội dung text để embedding (tìm kiếm)
            content = f"""
            Job Title: {job.get('title')}
            Company: {job.get('company')}
            Skills Required: {', '.join(job.get('skills', []))}
            Requirements: {job.get('requirements', '')}
            Description: {job.get('description', '')}
            """
            
            # Metadata đầy đủ các thuộc tính để hiển thị ở Frontend
            metadata = {
                "url": job.get("url"),
                "title": job.get("title"),
                "company": job.get("company"),
                "salary": job.get("salary", "N/A"),
                "location": job.get("location", "N/A"),
                "skills": ",".join(job.get("skills", [])), # Chroma metadata only supports simple types
                "source": job.get("source", "topcv")
            }
            
            # Kiểm tra trùng lặp dựa trên URL (nếu ChromaDB collection hỗ trợ filter)
            # Ở đây ta dùng id là hash của URL hoặc URL chính nó
            doc_id = str(uuid.uuid5(uuid.NAMESPACE_URL, job.get("url")))
            
            documents.append(Document(page_content=content, metadata=metadata, id=doc_id))
        
        if documents:
            self.vector_db.add_documents(documents)
            print(f"Added {len(documents)} jobs directly to ChromaDB.")

    def retrieve_recommendations(self, user_skills: List[str], limit: int = 5) -> List[Dict[str, Any]]:
        """Truy xuất job từ ChromaDB dựa trên kỹ năng."""
        query = f"Tìm công việc phù hợp với các kỹ năng: {', '.join(user_skills)}"
        results = self.vector_db.similarity_search(query, k=limit)
        
        recommendations = []
        for doc in results:
            meta = doc.metadata
            recommendations.append({
                "title": meta.get("title"),
                "company": meta.get("company"),
                "url": meta.get("url"),
                "salary": meta.get("salary"),
                "location": meta.get("location"),
                "skills": meta.get("skills", "").split(","),
                "fit_score": 90, # Có thể tính toán dựa trên distance
                "reason": "Phù hợp với các từ khóa kỹ năng của bạn."
            })
        return recommendations

# Instance duy nhất
rag_service = RAGService()
