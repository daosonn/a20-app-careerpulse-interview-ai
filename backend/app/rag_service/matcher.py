from typing import List, Dict, Any
import json
from sqlalchemy.orm import Session
from app.models.models import SuggestedJob
from .rag_service import rag_service

class JobMatcherService:
    def __init__(self, db: Session):
        self.db = db

    async def match_and_persist(self, user_id: int, skills: List[str] = None, tools: List[str] = None, projects: List[Any] = None, current_position: str = None) -> List[Dict[str, Any]]:
        """
        Quy trình khớp kỹ năng:
        1. Xây dựng câu query tổng hợp từ Kỹ năng, Công cụ và Dự án.
        2. Truy xuất kết quả khớp nhất từ ChromaDB (Chỉ lấy Job còn hạn).
        3. Lưu vết khớp vào SQL SuggestedJob.
        """
        # Xây dựng query string phong phú để khớp ngữ nghĩa tốt hơn
        query_parts = []
        if current_position: query_parts.append(f"Vị trí: {current_position}")
        if skills: query_parts.append(f"Kỹ năng: {', '.join(skills)}")
        if tools: query_parts.append(f"Công cụ: {', '.join(tools)}")
        if projects: query_parts.append(f"Dự án tiêu biểu: {json.dumps(projects, ensure_ascii=False)}")
        
        query_str = ". ".join(query_parts)
        if not query_str:
            return []

        # 1. Truy xuất kết quả từ Vector DB (Chế độ only_active=True mặc định)
        recommendations = rag_service.retrieve_by_text(query_str, limit=5, only_active=True)

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
                    deadline=r.get("deadline"),
                    source="chromadb_rag",
                    is_active=True
                ))
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            print(f"Error persisting recommendations: {e}")

        return recommendations
