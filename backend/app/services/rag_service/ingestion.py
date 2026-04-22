import json
import os
import uuid
import re
import html
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
        # Tăng chunk_size để ưu tiên giữ trọn vẹn 1 section trong 1 chunk
        # Vì _clean_text đã xóa \n, nên ta ưu tiên cắt theo dấu chấm câu.
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1500,
            chunk_overlap=80,
            separators=[". ", " ", ""]
        )

    def _clean_text(self, text: str) -> str:
        """
        Làm sạch văn bản: kết hợp logic phiên bản trước và yêu cầu mới.
        """
        if not text: return ""
        
        # --- LOGIC PHIÊN BẢN TRƯỚC: Sửa lỗi định dạng văn bản cào ---
        # 1. Tách các dòng bị dính bởi dấu gạch đầu dòng (Ví dụ: "-Công việc A-Công việc B")
        text = re.sub(r'([^\s])([•\-\*\+])', r'\1 \2', text)
        
        # 2. Đảm bảo có dấu cách sau dấu gạch đầu dòng
        text = re.sub(r'([•\-\*\+])([^\s])', r'\1 \2', text)
        
        # 3. Xử lý các câu bị dính nhau (chữ thường dính chữ hoa: "việc.Tham" -> "việc. Tham")
        text = re.sub(r'([a-z])([A-Z])', r'\1. \2', text)

        # --- LOGIC MỚI: Lọc nội dung và chuẩn hóa ---
        # 4. Loại bỏ các thẻ HTML
        text = re.sub(r'<[^>]+>', ' ', text)
        
        # 5. Giải mã các thực thể HTML (ví dụ &amp; -> &)
        text = html.unescape(text)
        
        # 6. Loại bỏ Emoji và các ký tự đặc biệt/symbols
        # Giữ lại: Chữ cái (Unicode), số, khoảng trắng và các dấu câu cơ bản
        text = re.sub(r'[^\w\s.,!?;:()\-/\+]', ' ', text)
        
        # 7. Thay thế tất cả khoảng trắng thừa (tab, newline, multiple spaces) bằng 1 space duy nhất
        text = re.sub(r'\s+', ' ', text)
        
        return text.strip()

    def process_json_file(self, file_path: str):
        """Đọc file JSON và nạp vào Vector DB."""
        # Tự động tìm đường dẫn tuyệt đối dựa trên vị trí file ingestion.py này
        if not os.path.isabs(file_path):
            current_dir = os.path.dirname(os.path.abspath(__file__))
            # Đi ngược lên 3 cấp để về thư mục 'backend' (ingestion -> rag_service -> services -> app -> backend)
            # Tuy nhiên để đơn giản và chính xác hơn, ta tìm thư mục 'raw_data'
            project_root = os.path.abspath(os.path.join(current_dir, "../../../"))
            file_path = os.path.join(project_root, file_path.replace("backend/", ""))

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

        # 2. Định nghĩa các sections quan trọng (Bao gồm đầy đủ thông tin từ JSON)
        # Mỗi section được gắn thêm context để embedding model hiểu rõ nội dung
        sections = [
            ("overview", self._clean_text(f"""
                Thông tin chung vị trí {job_title} tại {company}:
                - Lương: {meta.get('salary')}
                - Kinh nghiệm: {meta.get('experience')}
                - Địa điểm: {meta.get('location')} ({content.get('working_location')})
                - Quy mô: {meta.get('company_scale')}
                - Lĩnh vực: {meta.get('company_field')}
                - Ngành: {meta.get('category')}
                - Thời gian làm việc: {content.get('working_time')}
                - Hạn nộp: {meta.get('deadline')}
                - Cách thức ứng tuyển: {content.get('application_method')}
                - Tags: {', '.join(meta.get('tags', []))}
            """)),
            ("requirements", f"Yêu cầu tuyển dụng cho vị trí {job_title} (Requirements): {self._clean_text(content.get('job_requirement', ''))}"),
            ("description", f"Mô tả công việc và nhiệm vụ cho vị trí {job_title} tại {company} (Job Description): {self._clean_text(content.get('job_description', ''))}"),
            ("benefits", f"Quyền lợi, chế độ đãi ngộ và môi trường làm việc tại {company} cho vị trí {job_title}: {self._clean_text(content.get('job_benefit', ''))}")
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

def run_ingestion(file_path: str = "raw_data/detailed_jobs_for_rag.json"):
    """Hàm helper để chạy nhanh quá trình nạp dữ liệu."""
    ingestor = JobIngestor()
    ingestor.process_json_file(file_path)

if __name__ == "__main__":
    # Cho phép chạy độc lập để test
    run_ingestion()
