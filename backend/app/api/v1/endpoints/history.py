from fastapi import APIRouter, HTTPException
from app.core.database import SessionDep
from app.core.auth import CurrentUser
from app.models.models import Interview, User

router = APIRouter()

@router.get("/")
async def get_history(db: SessionDep, current_user: CurrentUser):
    if not current_user.is_onboarded:
        raise HTTPException(status_code=403, detail="Onboarding required")
        
    interviews = db.query(Interview).filter(Interview.user_id == current_user.id).order_by(Interview.created_at.desc()).all()
    return [{"id": i.id, "interview_type": i.interview_type, "created_at": i.created_at.isoformat(), "score": i.score, "language": i.language} for i in interviews]

@router.get("/{interview_id}")
async def get_interview_detail(interview_id: int, current_user: CurrentUser, db: SessionDep):
    hist = db.query(Interview).filter(Interview.id == interview_id, Interview.user_id == current_user.id).first()
    if not hist: raise HTTPException(status_code=404, detail="Interview not found or unauthorized")
    return {
        "id": hist.id, "cv_text": hist.cv_text, "jd_text": hist.jd_text, "interview_type": hist.interview_type,
        "language": hist.language, "transcript": hist.transcript, "evaluations": hist.evaluations,
        "final_report": hist.final_report, "created_at": hist.created_at.isoformat()
    }
