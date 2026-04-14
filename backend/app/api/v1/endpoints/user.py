from app.schemas.user import OnboardReq
from app.core.database import SessionDep
from app.core.auth import CurrentUser
from app.models.models import User
from app.services.profiler import extract_cv_info_logic

router = APIRouter()

@router.post("/onboard")
async def onboard_user(req: OnboardReq, db: SessionDep, current_user: CurrentUser):
    try:
        info = extract_cv_info_logic(req.cv_text)
        skills = info.get("skills", ["Kỹ năng chung"])
        full_name = info.get("full_name") or req.name
        
        current_user.cv_text = req.cv_text
        current_user.skills = skills
        current_user.full_name = full_name
        current_user.dob = info.get("dob")
        current_user.current_position = info.get("current_position")
        current_user.is_onboarded = True
        
        db.commit()
        db.refresh(current_user)
        return {"status": "success", "skills": skills, "user_id": current_user.id, "info": info}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/profile")
async def get_user_profile(current_user: CurrentUser):
    return {
        "onboarded": current_user.is_onboarded,
        "cv_text": current_user.cv_text,
        "skills": current_user.skills,
        "name": current_user.name,
        "full_name": current_user.full_name,
        "dob": current_user.dob,
        "current_position": current_user.current_position
    }
