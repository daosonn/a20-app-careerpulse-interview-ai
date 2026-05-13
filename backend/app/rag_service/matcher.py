"""
Job Matcher Service

Pipeline:
  1. Build a search query from the user's current_position and top skills.
  2. Fetch real job listings from ITviec, TopCV, and VietnamWorks in parallel.
  3. If platforms return fewer than MIN_JOBS results (e.g. API down / no match),
     fill the gap with LLM-generated jobs so the user always gets a response.
  4. AI Agent (job_evaluator) scores every candidate's fit against the user's
     profile and writes a personalised reason.
  5. Sort by fit_score, keep top MIN_JOBS, persist to SQL SuggestedJob.
"""
from typing import Any, Dict, List

from sqlalchemy.orm import Session

from app.core.logger import log_func
from app.models.models import SuggestedJob
from app.services.job_evaluator import ai_evaluate_job_fit, generate_llm_jobs
from app.services.job_fetcher import fetch_jobs_from_platforms

_MIN_JOBS = 5


def _build_query(current_position: str, skills: List[str]) -> str:
    """Use current_position as primary search term; fall back to top skills."""
    if current_position:
        return current_position
    if skills:
        # Use top 2 skills joined — keeps the query focused
        return " ".join(skills[:2])
    return ""


class JobMatcherService:
    def __init__(self, db: Session):
        log_func("JobMatcherService.__init__", level=2)
        self.db = db

    async def match_and_persist(
        self,
        user_id: int,
        cv_text: str = "",
        skills: List[str] = None,
        current_position: str = None,
        # Legacy params — kept for call-site compatibility, no longer used
        tools: List[Any] = None,
        projects: List[Any] = None,
        precomputed_vector: List[float] = None,
    ) -> List[Dict[str, Any]]:
        log_func("JobMatcherService.match_and_persist")

        skills = skills or []
        current_position = current_position or ""

        # ── Step 1: Build search query ───────────────────────────────────────
        query = _build_query(current_position, skills)
        if not query:
            return []

        # ── Step 2: Fetch real jobs from platforms ───────────────────────────
        candidates = await fetch_jobs_from_platforms(query, per_platform=6)

        # ── Step 3: LLM fallback when platforms return too few results ───────
        if len(candidates) < _MIN_JOBS and (cv_text or skills or current_position):
            needed = _MIN_JOBS - len(candidates)
            generated = await generate_llm_jobs(
                cv_text=cv_text,
                skills=skills,
                current_position=current_position,
                count=needed,
            )
            candidates.extend(generated)
            print(f"[matcher] LLM generated {len(generated)} fallback jobs")

        if not candidates:
            return []

        # ── Step 4: AI Agent — evaluate fit for all candidates ───────────────
        if cv_text or skills:
            candidates = await ai_evaluate_job_fit(
                cv_text=cv_text,
                skills=skills,
                current_position=current_position,
                jobs=candidates,
            )

        # ── Step 5: Sort, keep top _MIN_JOBS, persist ────────────────────────
        candidates.sort(key=lambda j: j.get("fit_score", 0), reverse=True)
        recommendations = candidates[:_MIN_JOBS]

        try:
            self.db.query(SuggestedJob).filter(
                SuggestedJob.user_id == user_id
            ).delete(synchronize_session=False)

            for r in recommendations:
                self.db.add(
                    SuggestedJob(
                        user_id=user_id,
                        title=r.get("title", ""),
                        company=r.get("company", ""),
                        industry=r.get("industry", "Technology"),
                        fit_score=int(r.get("fit_score", 70)),
                        reason=r.get("reason", "Phù hợp với hồ sơ của bạn."),
                        url=r.get("url") or None,
                        source=r.get("source", "platform"),
                        is_active=True,
                    )
                )
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            print(f"[matcher] persist error: {e}")

        return recommendations
