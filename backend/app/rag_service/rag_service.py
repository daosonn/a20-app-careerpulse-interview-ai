from typing import List, Dict, Any, Optional
import os
import datetime
import asyncio
import json
from langchain_chroma import Chroma
from langchain_core.documents import Document
import uuid
from pathlib import Path
from app.core.config import embedding_model, EMBEDDING_PROVIDER, PROJECT_ROOT, VECTOR_DATA_DIR

class RAGService:
    def __init__(self):
        self.embeddings = embedding_model
        # Lưu vào thư mục tương ứng trong database/vector/ (VD: database/vector/chroma_db_jina)
        self.persist_directory = str(VECTOR_DATA_DIR / f"chroma_db_{EMBEDDING_PROVIDER}")
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

    async def embed_text(self, text: str) -> List[float]:
        """Chuyển văn bản thành vector embedding dùng model Jina (chạy trong thread để không block)."""
        if not text:
            return []
        try:
            return await asyncio.to_thread(self.embeddings.embed_query, text)
        except Exception as e:
            print(f"⚠️ Jina Embedding Error: {e}")
            return []

    async def embed_text_multi(self, text: str) -> Dict[str, List[float]]:
        """Chuyển văn bản thành vector Jina (giữ lại cấu trúc dict để tương thích code cũ)."""
        vector = await self.embed_text(text)
        return {"jina": vector}

    async def retrieve_by_text(self, query: str, limit: int = 5, only_active: bool = True) -> List[Dict[str, Any]]:
        """Truy xuất job từ ChromaDB dựa trên đoạn văn bản (CV hoặc query)."""
        filter_metadata = None
        if only_active:
            active_partitions = []
            now = datetime.date.today()
            for i in range(12): 
                target_date = now + datetime.timedelta(weeks=i)
                year, week, _ = target_date.isocalendar()
                active_partitions.append(f"{year}_W{week:02d}")
            filter_metadata = {"partition": {"$in": active_partitions}}

        try:
            # Chạy search trong thread pool
            results = await asyncio.to_thread(
                self.vector_db.similarity_search, 
                query, k=limit * 3, filter=filter_metadata
            )
            return await self._process_results_async(results, limit)
        except Exception as e:
            print(f"RAG Retrieval Error: {e}")
            return []

    async def retrieve_by_vector(self, embedding: List[float], limit: int = 5, only_active: bool = True) -> List[Dict[str, Any]]:
        """Truy xuất job từ ChromaDB dựa trên vector đã có sẵn."""
        if not embedding:
            return []
            
        filter_metadata = None
        if only_active:
            active_partitions = []
            now = datetime.date.today()
            for i in range(12):
                target_date = now + datetime.timedelta(weeks=i)
                year, week, _ = target_date.isocalendar()
                active_partitions.append(f"{year}_W{week:02d}")
            filter_metadata = {"partition": {"$in": active_partitions}}

        try:
            # Chạy search trong thread pool
            results = await asyncio.to_thread(
                self.vector_db.similarity_search_by_vector,
                embedding, k=limit * 3, filter=filter_metadata
            )
            return await self._process_results_async(results, limit)
        except Exception as e:
            print(f"RAG Retrieval by Vector Error: {e}")
            return []

    async def _process_results_async(self, results: List[Document], limit: int) -> List[Dict[str, Any]]:
        """Xử lý kết quả tìm kiếm một cách tối ưu, tránh loop query DB quá nhiều."""
        recommendations = []
        seen_urls = set()
        
        # Lọc ra các URL duy nhất trước
        unique_docs = []
        for doc in results:
            url = doc.metadata.get("url")
            if url and url not in seen_urls:
                seen_urls.add(url)
                unique_docs.append(doc)
            if len(unique_docs) >= limit:
                break

        # Tối ưu: Lấy Full JD chỉ khi thực sự cần hoặc lấy theo batch (hiện tại lấy từng cái nhưng chạy async)
        for doc in unique_docs:
            meta = doc.metadata
            url = meta.get("url")
            
            # Thay vì query lại toàn bộ chunks, nếu page_content đã đủ dài thì dùng luôn
            # Hoặc chỉ query nếu metadata chỉ ra đây là job có nhiều phần
            full_description = doc.page_content
            
            # Nếu muốn lấy full JD, hãy dùng get() một lần cho tất cả thay vì loop (nếu Chroma hỗ trợ tốt)
            # Ở đây ta giữ logic lấy từng cái nhưng bọc trong to_thread để không treo main thread
            try:
                # Chỉ lấy thêm chunks nếu nội dung hiện tại quá ngắn (vd < 500 ký tự)
                if len(full_description) < 500:
                    job_chunks = await asyncio.to_thread(self.vector_db.get, where={"url": url})
                    if job_chunks and job_chunks.get('documents'):
                        full_description = "\n\n".join(job_chunks['documents'])
            except: 
                pass
                
            recommendations.append({
                "title": meta.get("title"),
                "company": meta.get("company"),
                "url": url,
                "salary": meta.get("salary"),
                "location": meta.get("location"),
                "skills": meta.get("skills", "").split(",") if meta.get("skills") else [],
                "description": full_description,
                "fit_score": 90, 
                "reason": "Phù hợp với hồ sơ của bạn."
            })
        
        return recommendations

# Instance duy nhất
rag_service = RAGService()
