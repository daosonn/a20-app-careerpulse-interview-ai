from fastapi import APIRouter, HTTPException
from app.core.database import SessionDep
from app.models.models import Interview, User

router = APIRouter()

@router.get("/")
async def get_history(user_email: str, db: SessionDep):
    db_user = db.query(User).filter(User.email == user_email).first()
    if not db_user or not db_user.is_onboarded:
        raise HTTPException(status_code=403, detail="Onboarding required")
        
    interviews = db.query(Interview).filter(Interview.user_id == db_user.id).order_by(Interview.created_at.desc()).all()
    return [{"id": i.id, "interview_type": i.interview_type, "created_at": i.created_at.isoformat(), "score": i.score, "language": i.language} for i in interviews]

@router.get("/{interview_id}")
async def get_interview_detail(interview_id: int, user_id: int = 1, db: SessionDep = None):
    # For now user_id is hardcoded to 1 as in original
    hist = db.query(Interview).filter(Interview.id == interview_id, Interview.user_id == user_id).first()
    if not hist: raise HTTPException(status_code=404, detail="Interview not found")
    return {
        "id": hist.id, "cv_text": hist.cv_text, "jd_text": hist.jd_text, "interview_type": hist.interview_type,
        "language": hist.language, "transcript": hist.transcript, "evaluations": hist.evaluations,
        "final_report": hist.final_report, "created_at": hist.created_at.isoformat()
    }
