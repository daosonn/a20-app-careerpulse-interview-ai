from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.models import SuggestedJob
from .rag_service import rag_service
from .crawler import TopCVCrawler

class JobMatcherService:
    def __init__(self, db: Session):
        self.db = db
        self.crawler = TopCVCrawler()

    async def match_and_persist(self, user_id: int, skills: List[str], current_position: str = None) -> List[Dict[str, Any]]:
        """
        Quy trình khớp kỹ năng:
        1. Cào thêm job mới từ TopCV.
        2. Lưu trực tiếp vào ChromaDB (không qua SQL).
        3. Truy xuất kết quả khớp nhất từ ChromaDB.
        4. Lưu vết khớp vào SQL SuggestedJob (để quản lý lịch sử gợi ý của User).
        """
        if not skills:
            return []

        # 1. Thu thập dữ liệu mới
        keyword = current_position or (skills[0] if skills else "Software Engineer")
        try:
            # Lấy dữ liệu job mới
            new_jobs_data = await self.crawler.scrape_jobs(keyword, limit=8)
            
            # 2. Lưu THẲNG vào ChromaDB
            if new_jobs_data:
                rag_service.add_jobs_to_vector_db(new_jobs_data)
                
        except Exception as e:
            print(f"Matcher Service error: {e}")

        # 3. Truy xuất kết quả khớp nhất từ Vector DB
        recommendations = rag_service.retrieve_recommendations(skills, limit=5)

        # 4. Lưu kết quả gợi ý vào SQL (để Frontend hiển thị nhanh)
        try:
            self.db.query(SuggestedJob).filter(SuggestedJob.user_id == user_id).delete(synchronize_session=False)
            for r in recommendations:
                self.db.add(SuggestedJob(
                    user_id=user_id,
                    title=r["title"],
                    company=r["company"],
                    industry="Technology",
                    fit_score=r.get("fit_score", 85),
                    reason=r.get("reason", "Phù hợp với kỹ năng của bạn."),
                    url=r.get("url"),
                    source="chromadb_rag",
                    is_active=True
                ))
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            print(f"Error persisting recommendations: {e}")

        return recommendations
