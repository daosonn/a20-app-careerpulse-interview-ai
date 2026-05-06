import json
import os
import uuid
import re
import html
import time
from typing import List, Dict, Any
from pathlib import Path
import sys

# --- IDE & PROJECT PATH SETUP ---
# Ensure the 'backend' directory is in sys.path so 'app.xxx' imports work
current_file = Path(__file__).resolve()
backend_path = current_file.parents[3] # ingestion.py -> auto_crawl_data -> rag_service -> app -> backend
if str(backend_path) not in sys.path:
    sys.path.append(str(backend_path))

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.core.config import PROJECT_ROOT, DATA_DIR, EMBEDDING_PROVIDER
from app.rag_service.rag_service import rag_service

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
        # Mặc định gọi hàm xử lý partition mới nếu không truyền file_path cụ thể
        self.process_partitions()

    def process_partitions(self, partitions_dir: str = "partitions", start_partition: str = None):
        """Xử lý các file JSON phân vùng trong thư mục database/raw/partitions."""
        from app.core.config import RAW_DATA_DIR
        partitions_path = RAW_DATA_DIR / partitions_dir
        # Theo dõi trạng thái đã ingest cho từng model
        state_file = DATA_DIR / f"ingestion_state_{EMBEDDING_PROVIDER}.json"

        if not partitions_path.exists():
            print(f"    Partitions directory not found: {partitions_path}")
            return

        # Load trạng thái đã ingest
        ingested_files = {}
        if os.path.exists(state_file):
            with open(state_file, 'r') as f:
                ingested_files = json.load(f)

        files = [f for f in os.listdir(partitions_path) if f.endswith(".json")]
        files.sort() # Đảm bảo thứ tự thời gian

        for filename in files:
            partition_name = filename.replace("jobs_", "").replace(".json", "")
            
            # 1. Bỏ qua nếu trước partition được yêu cầu
            if start_partition and partition_name < start_partition:
                # print(f"    Skipping partition (before {start_partition}): {filename}")
                continue

            file_full_path = partitions_path / filename
            file_mtime = os.path.getmtime(file_full_path)
            
            # 2. Kiểm tra xem file đã được ingest chưa (nếu không phải partition đang resume)
            if partition_name != start_partition:
                if filename in ingested_files and ingested_files[filename] >= file_mtime:
                    print(f"    Skipping already ingested/unchanged file: {filename}")
                    continue

            print(f"    Processing partition: {filename}...")
            try:
                with open(file_full_path, 'r', encoding='utf-8') as f:
                    jobs_data = json.load(f)
                
                all_docs = []
                seen_ids = set()
                for job in jobs_data:
                    # Thêm thông tin partition vào metadata để sau này có thể filter theo tuần
                    partition_info = partition_name
                    docs = self.chunk_job_data(job)
                    for d in docs:
                        d.metadata["partition"] = partition_info
                        if d.id not in seen_ids:
                            seen_ids.add(d.id)
                            all_docs.append(d)

                if all_docs:
                    # 3. Lọc các chunk đã tồn tại để tránh tốn token embedding lại
                    new_docs = self.filter_existing_documents(all_docs)
                    
                    if not new_docs:
                        print(f"    All chunks in {filename} already exist in DB. Skipping.")
                    else:
                        print(f"    Ingesting {len(new_docs)} new chunks from {filename} (Total: {len(all_docs)})...")
                        
                        # Ingest theo batch để tránh rate limit (Jina AI: 100k tokens/min)
                        batch_size = 100 
                        sleep_time = 15

                        for i in range(0, len(new_docs), batch_size):
                            batch = new_docs[i:i + batch_size]
                            print(f"      -> Batch {i//batch_size + 1}/{(len(new_docs)-1)//batch_size + 1} ({len(batch)} chunks)...")
                            rag_service.vector_db.add_documents(batch)
                            
                            # Nghỉ một chút giữa các batch
                            if i + batch_size < len(new_docs):
                                time.sleep(sleep_time)
                        
                        print(f"    Successfully ingested {filename}")
                    
                    # Cập nhật trạng thái file
                    ingested_files[filename] = file_mtime
                    with open(state_file, 'w') as f:
                        json.dump(ingested_files, f)
            except Exception as e:
                print(f"    Error processing {filename}: {e}")

    def filter_existing_documents(self, documents: List[Document]) -> List[Document]:
        """
        Lọc bỏ các Document đã tồn tại trong Vector DB dựa trên ID.
        """
        if not documents:
            return []
        
        # Chroma có giới hạn số lượng IDs trong 1 lần get, chia nhỏ nếu cần
        # Nhưng thông thường vài trăm chunk vẫn ổn.
        ids = [doc.id for doc in documents if doc.id]
        if not ids:
            return documents
            
        try:
            # Lấy các ID đã tồn tại trong DB
            existing_data = rag_service.vector_db.get(ids=ids)
            existing_ids = set(existing_data.get('ids', []))
            
            filtered_docs = [doc for doc in documents if doc.id not in existing_ids]
            return filtered_docs
        except Exception as e:
            print(f"    Warning: Could not check existing documents: {e}")
            return documents

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
            "tags": ",".join(meta.get("tags", [])) if meta.get("tags") else "",
            "deadline": meta.get("deadline", "N/A"),
            "scraped_at": job.get("scraped_at", "")
        }

        # 2. Định nghĩa các sections quan trọng
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
            text_chunks = self.text_splitter.split_text(section_text.strip())
            for i, text in enumerate(text_chunks):
                doc_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"{url}_{section_name}_{i}"))
                metadata = base_metadata.copy()
                metadata["section"] = section_name
                documents.append(Document(page_content=text, metadata=metadata, id=doc_id))
        return documents

def run_ingestion(start_partition: str = None):
    """Hàm helper để chạy nhanh quá trình nạp dữ liệu."""
    print(f"=== Starting data ingestion with Embedding Provider: {EMBEDDING_PROVIDER.upper()} ===")
    ingestor = JobIngestor()
    ingestor.process_partitions(start_partition=start_partition)

if __name__ == "__main__":
    # Ví dụ: python ingestion.py 2026_W21
    # start_p = sys.argv[1] if len(sys.argv) > 1 else None
    # run_ingestion(start_partition=start_p)
    run_ingestion(start_partition="2026_W17")

