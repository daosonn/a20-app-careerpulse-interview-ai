import json
import os
import uuid
from typing import List, Dict, Any
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.services.rag_service.rag_service import rag_service

class JobIngestor:
    """
    Service để xử lý và nạp dữ liệu Job từ file JSON vào ChromaDB.
    Hỗ trợ tiền xử lý văn bản và phân đoạn theo ngữ cảnh (Semantic Sectioning).
    """
    def __init__(self):
        # Text Splitter dự phòng nếu một section quá dài (>1000 ký tự)
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=100,
            separators=["\n\n", "\n", ". ", " ", ""]
        )

    def _clean_text(self, text: str) -> str:
        """Làm sạch văn bản: tách các dòng dính lẹo, sửa lỗi khoảng trắng."""
        if not text: return ""
        
        # 1. Tách các dòng bị dính bởi dấu gạch đầu dòng (Ví dụ: "-Công việc A-Công việc B")
        # Tìm các vị trí có dấu "-" hoặc "•" đứng ngay sau một ký tự không phải khoảng trắng
        text = re.sub(r'([^\s])([•\-\*\+])', r'\1\n\2', text)
        
        # 2. Đảm bảo có dấu cách sau dấu gạch đầu dòng
        text = re.sub(r'([•\-\*\+])([^\s])', r'\1 \2', text)
        
        # 3. Xử lý các câu bị dính nhau (chữ thường dính chữ hoa: "việc.Tham" -> "việc. Tham")
        text = re.sub(r'([a-z])([A-Z])', r'\1. \2', text)
        
        # 4. Loại bỏ khoảng trắng thừa và chuẩn hóa xuống dòng
        text = re.sub(r' +', ' ', text)
        text = re.sub(r'\n\s*\n', '\n\n', text)
        
        return text.strip()

    def process_json_file(self, file_path: str):
        """Đọc file JSON và nạp vào Vector DB."""
        if not os.path.isabs(file_path):
            file_path = os.path.join(os.getcwd(), file_path)

        if not os.path.exists(file_path):
            print(f"    File not found: {file_path}")
            return

        print(f"    Reading data from {file_path}...")
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                jobs_data = json.load(f)
        except Exception as e:
            print(f"    Error reading JSON: {e}")
            return

        all_docs = []
        for job in jobs_data:
            docs = self.chunk_job_data(job)
            all_docs.extend(docs)

        if all_docs:
            print(f"    Ingesting {len(all_docs)} semantic chunks to ChromaDB...")
            try:
                rag_service.vector_db.add_documents(all_docs)
                print(f"    Successfully ingested {len(jobs_data)} jobs into {len(all_docs)} semantic chunks.")
            except Exception as e:
                print(f"    Error during ingestion: {e}")
        else:
            print("    No documents to ingest.")

    def chunk_job_data(self, job: Dict[str, Any]) -> List[Document]:
        """
        Chia một Job thành các đoạn dựa trên logic từng phần (Requirements, Description, etc.)
        Giúp tăng độ chính xác khi tìm kiếm theo nhu cầu cụ thể.
        """
        url = job.get("url", "")
        meta = job.get("metadata", {})
        content = job.get("content", {})
        
        job_title = meta.get("job_title", "N/A")
        company = meta.get("company_name", "N/A")

        # 1. Metadata cơ bản (luôn đi kèm mỗi chunk)
        base_metadata = {
            "url": url,
            "title": job_title,
            "company": company,
            "location": meta.get("location", "N/A"),
            "salary": meta.get("salary", "N/A"),
            "experience": meta.get("experience", "N/A"),
            "category": meta.get("category", "N/A"),
            "tags": ",".join(meta.get("tags", [])) if meta.get("tags") else ""
        }

        # 2. Định nghĩa các sections quan trọng
        # Mỗi section được gắn thêm context để embedding model hiểu rõ nội dung đó nói về cái gì
        sections = [
            ("overview", f"Thông tin chung vị trí {job_title} tại {company}:\n- Lương: {meta.get('salary')}\n- Kinh nghiệm: {meta.get('experience')}\n- Địa điểm: {meta.get('location')}\n- Lĩnh vực: {meta.get('company_field')}\n- Tags: {', '.join(meta.get('tags', []))}"),
            ("requirements", f"Yêu cầu tuyển dụng cho vị trí {job_title} (Requirements):\n{self._clean_text(content.get('job_requirement', ''))}"),
            ("description", f"Mô tả công việc và nhiệm vụ cho vị trí {job_title} tại {company} (Job Description):\n{self._clean_text(content.get('job_description', ''))}"),
            ("benefits", f"Quyền lợi, chế độ đãi ngộ và môi trường làm việc tại {company} cho vị trí {job_title}:\n{self._clean_text(content.get('job_benefit', ''))}")
        ]

        documents = []
        for section_name, section_text in sections:
            # Nếu một section quá dài, vẫn cần chia nhỏ tiếp bằng text_splitter
            text_chunks = self.text_splitter.split_text(section_text.strip())
            
            for i, text in enumerate(text_chunks):
                # ID duy nhất bao gồm cả tên section để tránh trùng lặp
                doc_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"{url}_{section_name}_{i}"))
                
                metadata = base_metadata.copy()
                metadata["section"] = section_name
                
                documents.append(Document(
                    page_content=text,
                    metadata=metadata,
                    id=doc_id
                ))
            
        return documents

def run_ingestion(file_path: str = "backend/raw_data/detailed_jobs_for_rag.json"):
    """Hàm helper để chạy nhanh quá trình nạp dữ liệu."""
    ingestor = JobIngestor()
    ingestor.process_json_file(file_path)

if __name__ == "__main__":
    # Cho phép chạy độc lập để test
    run_ingestion()
