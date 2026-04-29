from typing import List, Dict, Any, Optional
import os
import datetime
from langchain_chroma import Chroma
from langchain_core.documents import Document
import uuid
from pathlib import Path
from app.core.config import embedding_model, EMBEDDING_PROVIDER, PROJECT_ROOT

class RAGService:
    def __init__(self):
        self.embeddings = embedding_model
        # Lưu vào thư mục tương ứng với từng loại model (VD: chroma_db_jina, chroma_db_openai, chroma_db_gemini)
        self.persist_directory = str(PROJECT_ROOT / f"chroma_db_{EMBEDDING_PROVIDER}")
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
            # Query nhiều hơn (x4) để dự phòng trường hợp bị trùng URL (do 1 job có nhiều chunk)
            results = self.vector_db.similarity_search(query, k=limit * 4, filter=filter_metadata)
        except Exception as e:
            print(f"RAG Retrieval Error: {e}")
            return []
        
        recommendations = []
        seen_urls = set()
        
        for doc in results:
            meta = doc.metadata
            url = meta.get("url")
            
            if not url or url in seen_urls:
                continue
                
            seen_urls.add(url)
            
            # Khôi phục toàn bộ JD (Full Job Description) bằng cách query tất cả các chunk có cùng URL
            full_description = doc.page_content
            try:
                # Tìm tất cả chunks của job này
                job_chunks = self.vector_db.get(where={"url": url})
                if job_chunks and job_chunks.get('documents'):
                    # Ghép các mẩu chunk lại với nhau để ra JD hoàn chỉnh
                    full_description = "\n\n".join(job_chunks['documents'])
            except Exception as e:
                print(f"Lỗi khi ghép chunks cho JD: {e}")
                
            recommendations.append({
                "title": meta.get("title"),
                "company": meta.get("company"),
                "url": url,
                "salary": meta.get("salary"),
                "location": meta.get("location"),
                "skills": meta.get("skills", "").split(",") if meta.get("skills") else [],
                "description": full_description, # Trả về nội dung Full JD thay vì chỉ 1 chunk
                "fit_score": 90, 
                "reason": "Phù hợp với hồ sơ của bạn."
            })
            
            # Đủ số lượng yêu cầu thì dừng
            if len(recommendations) >= limit:
                break
                
        return recommendations

# Instance duy nhất
rag_service = RAGService()
