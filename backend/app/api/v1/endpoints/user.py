from fastapi import APIRouter, HTTPException
from app.schemas.user import OnboardReq
from app.core.database import SessionDep
from app.models.models import User
from app.services.profiler import extract_cv_info_logic

router = APIRouter()

@router.post("/onboard")
async def onboard_user(req: OnboardReq, db: SessionDep):
    try:
        info = extract_cv_info_logic(req.cv_text)
        skills = info.get("skills", ["Kỹ năng chung"])
        full_name = info.get("full_name") or req.name
        
        db_user = db.query(User).filter(User.email == req.email).first()
        if not db_user:
            db_user = User(
                email=req.email,
                name=full_name,
                avatar=req.avatar,
                cv_text=req.cv_text,
                skills=skills,
                full_name=full_name,
                dob=info.get("dob"),
                current_position=info.get("current_position"),
                is_onboarded=True
            )
            db.add(db_user)
        else:
            db_user.cv_text = req.cv_text
            db_user.skills = skills
            db_user.full_name = full_name
            db_user.dob = info.get("dob")
            db_user.current_position = info.get("current_position")
            db_user.is_onboarded = True
        
        db.commit()
        db.refresh(db_user)
        return {"status": "success", "skills": skills, "user_id": db_user.id, "info": info}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/profile/{email}")
async def get_user_profile(email: str, db: SessionDep):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return {"onboarded": False}
    return {
        "onboarded": user.is_onboarded,
        "cv_text": user.cv_text,
        "skills": user.skills,
        "name": user.name,
        "full_name": user.full_name,
        "dob": user.dob,
        "current_position": user.current_position
    }
