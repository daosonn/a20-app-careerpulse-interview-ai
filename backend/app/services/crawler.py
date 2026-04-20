import httpx
from bs4 import BeautifulSoup
import time
from typing import List, Dict, Any
import os
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class TopCVCrawler:
    def __init__(self):
        self.base_url = "https://www.topcv.vn/tim-viec-lam"
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }

    async def scrape_jobs(self, keyword: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Cào danh sách công việc đầy đủ thông tin từ TopCV."""
        params = {"keyword": keyword}
        async with httpx.AsyncClient(headers=self.headers, timeout=30.0) as client:
            response = await client.get(self.base_url, params=params)
            if response.status_code != 200:
                return []
            
            soup = BeautifulSoup(response.text, "html.parser")
            job_items = soup.select(".job-item-2") 
            
            jobs = []
            for item in job_items[:limit]:
                try:
                    title_elem = item.select_one(".title a")
                    company_elem = item.select_one(".company a")
                    salary_elem = item.select_one(".label-salary")
                    location_elem = item.select_one(".label-location")
                    
                    link = title_elem["href"] if title_elem else ""
                    if not link: continue
                        
                    # Dữ liệu cơ bản
                    job_data = {
                        "title": title_elem.text.strip() if title_elem else "N/A",
                        "company": company_elem.text.strip() if company_elem else "N/A",
                        "url": link,
                        "salary": salary_elem.text.strip() if salary_elem else "Thỏa thuận",
                        "location": location_elem.text.strip() if location_elem else "N/A",
                        "source": "topcv",
                        "description": "",
                        "requirements": "",
                        "skills": []
                    }
                    
                    # Giả lập hoặc gọi LLM để trích xuất thêm thông tin nếu cần
                    # Để tối ưu, ta có thể cào thêm nội dung chi tiết ở đây
                    
                    jobs.append(job_data)
                except Exception:
                    continue
            
            return jobs

    def enrich_job_data(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        """(Tùy chọn) Dùng LLM để làm phong phú dữ liệu từ description."""
        # Logic trích xuất skills, requirements từ text thô
        return job_data
