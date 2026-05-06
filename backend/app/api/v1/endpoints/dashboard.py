from collections import defaultdict
from typing import Any

from fastapi import APIRouter, HTTPException

from app.core.auth import CurrentUser
from app.core.database import SessionDep
from app.core.logger import log_func
from app.models.models import Interview, InterviewTurn

router = APIRouter()

COMPETENCY_KEYS = ("relevance", "structure", "specificity", "clarity", "confidence")


def _iso(value: Any) -> str | None:
    log_func("_iso", level=2)
    return value.isoformat() if value else None


def _scores_from_evaluation(evaluation: Any) -> dict[str, float] | None:
    log_func("_scores_from_evaluation", level=2)
    if not isinstance(evaluation, dict):
        return None
    raw_scores = evaluation.get("scores")
    if not isinstance(raw_scores, dict):
        return None

    scores: dict[str, float] = {}
    for key in COMPETENCY_KEYS:
        try:
            scores[key] = float(raw_scores.get(key, 0) or 0)
        except (TypeError, ValueError):
            scores[key] = 0
    return scores


def _average_score(scores: dict[str, float]) -> float:
    log_func("_average_score", level=2)
    return sum(scores.values()) / len(COMPETENCY_KEYS)


@router.get("/metrics")
async def get_dashboard_metrics(db: SessionDep, current_user: CurrentUser):
    log_func("get_dashboard_metrics")
    # Allow access even if not onboarded, will just return empty stats

    interviews = (
        db.query(Interview)
        .filter(Interview.user_id == current_user.id)
        .order_by(Interview.created_at.desc())
        .all()
    )
    turns_data = db.query(InterviewTurn.interview_id, InterviewTurn.evaluation).filter(InterviewTurn.user_id == current_user.id).all()

    scores_by_interview: dict[int, list[dict[str, float]]] = defaultdict(list)
    all_scores: list[dict[str, float]] = []

    for t_interview_id, t_evaluation in turns_data:
        scores = _scores_from_evaluation(t_evaluation)
        if not scores:
            continue
        scores_by_interview[t_interview_id].append(scores)
        all_scores.append(scores)

    for interview in interviews:
        if scores_by_interview.get(interview.id):
            continue
        if not isinstance(interview.evaluations, list):
            continue
        for evaluation in interview.evaluations:
            scores = _scores_from_evaluation(evaluation)
            if not scores:
                continue
            scores_by_interview[interview.id].append(scores)
            all_scores.append(scores)

    sessions = []
    for interview in interviews:
        session_scores = scores_by_interview.get(interview.id, [])
        avg_score = None
        if session_scores:
            avg_score = sum(_average_score(score) for score in session_scores) / len(session_scores)
        elif interview.score:
            avg_score = float(interview.score)

        payload = {
            "id": str(interview.id),
            "jobDescription": interview.jd_text or "",
            "interviewType": interview.interview_type or "",
            "status": interview.status or "setup",
            "createdAt": _iso(interview.created_at),
        }
        if avg_score is not None:
            payload["avgScore"] = avg_score
        sessions.append(payload)

    if all_scores:
        competency_averages = {
            key: sum(score[key] for score in all_scores) / len(all_scores)
            for key in COMPETENCY_KEYS
        }
    else:
        competency_averages = {key: 0 for key in COMPETENCY_KEYS}

    return {
        "sessions": sessions,
        "competencyAverages": competency_averages,
        "evaluatedTurnCount": len(all_scores),
    }


@router.delete("/sessions/{session_id}")
async def delete_dashboard_session(session_id: int, db: SessionDep, current_user: CurrentUser):
    log_func("delete_dashboard_session")
    interview = (
        db.query(Interview)
        .filter(Interview.id == session_id, Interview.user_id == current_user.id)
        .first()
    )
    if not interview:
        raise HTTPException(status_code=404, detail="Session not found")

    db.delete(interview)
    db.commit()
    return {"ok": True}
