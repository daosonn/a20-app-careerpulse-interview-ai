import os
import sys
import logging
import datetime
import subprocess
from pathlib import Path

# --- IDE & PROJECT PATH SETUP ---
# Ensure the 'backend' directory is in sys.path so 'app.xxx' imports work
current_file = Path(__file__).resolve()
backend_path = current_file.parents[3] # daily_agent.py -> auto_crawl_data -> rag_service -> app -> backend
if str(backend_path) not in sys.path:
    sys.path.append(str(backend_path))

from app.core.config import PROJECT_ROOT, BACKEND_DIR, LOGS_DIR
from app.rag_service.auto_crawl_data.unified_crawler import UnifiedCrawler, init_logging
from app.rag_service.auto_crawl_data.ingestion import run_ingestion

def main():
    init_logging()
    
    # Simple lock file to prevent multiple instances
    lock_file = LOGS_DIR / "daily_agent.lock"
    if lock_file.exists():
        logging.warning("=== LOCK FILE EXISTS ===")
        logging.warning(f"Another instance might be running. If not, delete {lock_file} and try again.")
        return
    
    try:
        with open(lock_file, "w") as f:
            f.write(str(os.getpid()))
            
        logging.info("=== DAILY AGENT STARTED ===")
        
        # 1. Scrape new jobs
        categories = {
            "AI": "https://www.topcv.vn/tim-viec-lam-artificial-intelligence-ai-cr257cb260?sort=new&type_keyword=1",
            "Software": "https://www.topcv.vn/tim-viec-lam-software-engineering-cr257cb258?sort=new&type_keyword=1",
            "Data": "https://www.topcv.vn/tim-viec-lam-data-science-cr257cb261?sort=new&type_keyword=1"
        }
        
        crawler = UnifiedCrawler()
        try:
            logging.info("Starting crawler...")
            crawler.run(categories, max_pages=1)
            logging.info("Crawler finished.")
        except Exception as e:
            logging.error(f"Crawler failed: {e}")
        
        # 2. Ingest new data to ChromaDB using Jina ONLY
        try:
            provider = "jina"
            ingestion_script = Path(__file__).resolve().parent / "ingestion.py"
            
            logging.info(f"Starting ingestion for provider: {provider.upper()}...")
            env = os.environ.copy()
            env["EMBEDDING_PROVIDER"] = provider
            
            # Chạy script bằng subprocess để khởi tạo lại config.py với biến môi trường mới
            result = subprocess.run(
                [sys.executable, str(ingestion_script)],
                env=env,
                capture_output=True,
                text=True
            )
            
            # Log output của subprocess
            for line in result.stdout.splitlines():
                logging.info(f"[ingestion_{provider}] {line}")
            
            if result.returncode == 0:
                logging.info(f"Ingestion finished successfully for {provider.upper()}.")
            else:
                logging.error(f"Ingestion failed for {provider.upper()}. Error output:")
                for line in result.stderr.splitlines():
                    logging.error(f"[ingestion_{provider}] {line}")
                        
        except Exception as e:
            logging.error(f"Ingestion process failed: {e}")

        logging.info("=== DAILY AGENT COMPLETED ===")
    finally:
        if lock_file.exists():
            lock_file.unlink()

if __name__ == "__main__":
    main()
