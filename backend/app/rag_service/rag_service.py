from typing import List, Dict, Any, Optional
import os
import datetime
from langchain_chroma import Chroma
from langchain_core.documents import Document
import uuid
from pathlib import Path
from app.core.config import embedding_model, PROJECT_ROOT

class RAGService:
    def __init__(self):
        self.embeddings = embedding_model
        self.persist_directory = str(PROJECT_ROOT / "chroma_db")
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
        return self.retrieve_by_text(query, limit)

    def retrieve_by_text(self, query: str, limit: int = 5, only_active: bool = True) -> List[Dict[str, Any]]:
        """Truy xuất job từ ChromaDB dựa trên đoạn văn bản (CV hoặc query)."""
        filter_metadata = None
        if only_active:
            # Tạo danh sách các partition hợp lệ (tuần hiện tại và 12 tuần tới)
            # Vì deadline thường không quá 3 tháng
            active_partitions = []
            now = datetime.date.today()
            for i in range(12): # Lấy các tuần trong 3 tháng tới
                target_date = now + datetime.timedelta(weeks=i)
                year, week, _ = target_date.isocalendar()
                active_partitions.append(f"{year}_W{week:02d}")
            
            # ChromaDB filter syntax: {"partition": {"$in": ["2026_W17", "2026_W18", ...]}}
            filter_metadata = {"partition": {"$in": active_partitions}}

        try:
            results = self.vector_db.similarity_search(query, k=limit, filter=filter_metadata)
        except Exception as e:
            print(f"RAG Retrieval Error: {e}")
            # Likely an embedding dimension mismatch if you switched models.
            # You should clear the 'chroma_db' directory and re-ingest data.
            return []
        
        recommendations = []
        for doc in results:
            meta = doc.metadata
            recommendations.append({
                "title": meta.get("title"),
                "company": meta.get("company"),
                "url": meta.get("url"),
                "salary": meta.get("salary"),
                "location": meta.get("location"),
                "skills": meta.get("skills", "").split(",") if meta.get("skills") else [],
                "description": doc.page_content, # Trả về nội dung để làm JD
                "fit_score": 90, 
                "reason": "Phù hợp với hồ sơ của bạn."
            })
        return recommendations

# Instance duy nhất
rag_service = RAGService()
