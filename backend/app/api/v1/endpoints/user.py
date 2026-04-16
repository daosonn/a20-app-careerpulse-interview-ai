from fastapi import APIRouter, HTTPException
import datetime
from typing import Optional
from app.schemas.user import (
    OnboardReq,
    ProfileUpdateReq,
    CVUpdateReq,
    EducationReq,
    EducationResp,
    PreferencesReq,
    PreferencesResp,
    SettingsReq,
    SettingsResp,
)
from app.core.database import SessionDep
from app.core.auth import CurrentUser
from app.models.models import User, Education, ResumeUpload, SuggestedJob, UserActivity
from app.services.profiler import extract_cv_info_logic

router = APIRouter()


def _utcnow() -> datetime.datetime:
    return datetime.datetime.utcnow()


def _log_activity(db: SessionDep, user_id: int, event_type: str, details: Optional[dict] = None) -> None:
    db.add(
        UserActivity(
            user_id=user_id,
            event_type=event_type,
            details=details or {},
            created_at=_utcnow(),
        )
    )


# ================================================================
#  Onboarding (existing)
# ================================================================

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
        current_user.last_cv_uploaded_at = _utcnow()
        current_user.last_profile_update_at = _utcnow()
        current_user.last_activity_at = _utcnow()

        db.add(
            ResumeUpload(
                user_id=current_user.id,
                file_name="onboarding_cv.txt",
                source="onboard",
                raw_text=req.cv_text,
                status="processed",
                parsed_skills=skills,
                processed_at=_utcnow(),
            )
        )
        _log_activity(
            db,
            current_user.id,
            "onboarding_completed",
            {
                "skills_count": len(skills),
                "has_position": bool(current_user.current_position),
            },
        )

        db.commit()
        db.refresh(current_user)
        return {"status": "success", "skills": skills, "user_id": current_user.id, "info": info}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ================================================================
#  Profile — read / update
# ================================================================

@router.get("/profile")
async def get_user_profile(current_user: CurrentUser):
    return {
        "onboarded": current_user.is_onboarded,
        "cv_text": current_user.cv_text,
        "skills": current_user.skills,
        "name": current_user.name,
        "full_name": current_user.full_name,
        "dob": current_user.dob,
        "current_position": current_user.current_position,
    }


@router.put("/profile")
async def update_profile(req: ProfileUpdateReq, db: SessionDep, current_user: CurrentUser):
    try:
        if req.full_name is not None:
            current_user.full_name = req.full_name
        if req.dob is not None:
            current_user.dob = req.dob
        if req.current_position is not None:
            current_user.current_position = req.current_position
        current_user.last_profile_update_at = _utcnow()
        current_user.last_activity_at = _utcnow()

        _log_activity(
            db,
            current_user.id,
            "profile_updated",
            {
                "updated_fields": [
                    field
                    for field in ["full_name", "dob", "current_position"]
                    if getattr(req, field) is not None
                ]
            },
        )
        db.commit()
        db.refresh(current_user)
        return {
            "status": "success",
            "full_name": current_user.full_name,
            "dob": current_user.dob,
            "current_position": current_user.current_position,
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ================================================================
#  CV — update + re-extract skills
# ================================================================

@router.put("/cv")
async def update_cv(req: CVUpdateReq, db: SessionDep, current_user: CurrentUser):
    if not req.cv_text.strip():
        raise HTTPException(status_code=400, detail="CV text cannot be empty.")
    try:
        info = extract_cv_info_logic(req.cv_text)
        skills = info.get("skills", current_user.skills or [])
        current_user.cv_text = req.cv_text
        current_user.skills = skills
        # Update extracted fields if the CV re-extraction provides them
        if info.get("full_name"):
            current_user.full_name = info["full_name"]
        if info.get("current_position"):
            current_user.current_position = info["current_position"]
        if info.get("dob"):
            current_user.dob = info["dob"]
        current_user.last_cv_uploaded_at = _utcnow()
        current_user.last_profile_update_at = _utcnow()
        current_user.last_activity_at = _utcnow()

        db.add(
            ResumeUpload(
                user_id=current_user.id,
                file_name="profile_cv_update.txt",
                source="cv_update",
                raw_text=req.cv_text,
                status="processed",
                parsed_skills=skills,
                processed_at=_utcnow(),
            )
        )
        _log_activity(
            db,
            current_user.id,
            "cv_updated",
            {
                "skills_count": len(skills),
            },
        )
        db.commit()
        db.refresh(current_user)
        return {
            "status": "success",
            "skills": current_user.skills,
            "full_name": current_user.full_name,
            "current_position": current_user.current_position,
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ================================================================
#  Education — CRUD
# ================================================================

@router.get("/education", response_model=list[EducationResp])
async def list_education(db: SessionDep, current_user: CurrentUser):
    return db.query(Education).filter(Education.user_id == current_user.id).all()


@router.post("/education", response_model=EducationResp, status_code=201)
async def add_education(req: EducationReq, db: SessionDep, current_user: CurrentUser):
    try:
        edu = Education(
            user_id=current_user.id,
            school=req.school,
            degree=req.degree or "",
            field=req.field or "",
            year=req.year or "",
        )
        db.add(edu)
        current_user.last_profile_update_at = _utcnow()
        current_user.last_activity_at = _utcnow()
        _log_activity(
            db,
            current_user.id,
            "education_added",
            {"school": req.school, "degree": req.degree or ""},
        )
        db.commit()
        db.refresh(edu)
        return edu
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/education/{edu_id}", response_model=EducationResp)
async def update_education(edu_id: int, req: EducationReq, db: SessionDep, current_user: CurrentUser):
    edu = db.query(Education).filter(
        Education.id == edu_id, Education.user_id == current_user.id
    ).first()
    if not edu:
        raise HTTPException(status_code=404, detail="Education entry not found.")
    try:
        edu.school = req.school
        edu.degree = req.degree or ""
        edu.field = req.field or ""
        edu.year = req.year or ""
        current_user.last_profile_update_at = _utcnow()
        current_user.last_activity_at = _utcnow()
        _log_activity(
            db,
            current_user.id,
            "education_updated",
            {"education_id": edu_id, "school": req.school},
        )
        db.commit()
        db.refresh(edu)
        return edu
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/education/{edu_id}")
async def delete_education(edu_id: int, db: SessionDep, current_user: CurrentUser):
    edu = db.query(Education).filter(
        Education.id == edu_id, Education.user_id == current_user.id
    ).first()
    if not edu:
        raise HTTPException(status_code=404, detail="Education entry not found.")
    try:
        current_user.last_profile_update_at = _utcnow()
        current_user.last_activity_at = _utcnow()
        _log_activity(
            db,
            current_user.id,
            "education_deleted",
            {"education_id": edu_id, "school": edu.school},
        )
        db.delete(edu)
        db.commit()
        return {"status": "deleted", "id": edu_id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ================================================================
#  Preferences — read / update
# ================================================================

PREF_FIELDS = [
    "preferred_language", "difficulty", "ai_persona", "availability",
    "default_interview_type", "stress_test_default", "auto_read_questions",
    "questions_per_session",
]


@router.get("/preferences", response_model=PreferencesResp)
async def get_preferences(current_user: CurrentUser):
    return PreferencesResp.model_validate(current_user)


@router.put("/preferences", response_model=PreferencesResp)
async def update_preferences(req: PreferencesReq, db: SessionDep, current_user: CurrentUser):
    try:
        data = req.model_dump(exclude_unset=True)
        for field in PREF_FIELDS:
            if field in data:
                setattr(current_user, field, data[field])
        current_user.last_activity_at = _utcnow()
        _log_activity(
            db,
            current_user.id,
            "preferences_updated",
            {"updated_fields": sorted(list(data.keys()))},
        )
        db.commit()
        db.refresh(current_user)
        return PreferencesResp.model_validate(current_user)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ================================================================
#  Settings — read / update
# ================================================================

SETTINGS_FIELDS = [
    "ui_language", "theme", "email_reminders", "ai_suggestions",
    "security_alerts", "public_profile", "anonymous_practice",
]


@router.get("/settings", response_model=SettingsResp)
async def get_settings(current_user: CurrentUser):
    return SettingsResp.model_validate(current_user)


@router.put("/settings", response_model=SettingsResp)
async def update_settings(req: SettingsReq, db: SessionDep, current_user: CurrentUser):
    try:
        data = req.model_dump(exclude_unset=True)
        for field in SETTINGS_FIELDS:
            if field in data:
                setattr(current_user, field, data[field])
        current_user.last_activity_at = _utcnow()
        _log_activity(
            db,
            current_user.id,
            "settings_updated",
            {"updated_fields": sorted(list(data.keys()))},
        )
        db.commit()
        db.refresh(current_user)
        return SettingsResp.model_validate(current_user)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ================================================================
#  Suggested Jobs (simple heuristic based on profile)
# ================================================================

@router.get("/suggested-jobs")
async def get_suggested_jobs(db: SessionDep, current_user: CurrentUser):
    """Return suggested roles based on user's position and skills.

    This is a deterministic heuristic — no LLM call.  It returns 3 roles
    tailored to the user's ``current_position`` keyword and skills.
    """
    position = (current_user.current_position or "").lower()
    skills = current_user.skills or []

    # Default suggestions
    jobs = [
        {
            "title": "Senior Product Manager",
            "company": "Công ty công nghệ hàng đầu",
            "industry": "Technology",
            "fit": 92,
            "reason": "Phù hợp cao với kinh nghiệm quản lý sản phẩm và kỹ năng lãnh đạo.",
        },
        {
            "title": "Business Strategy Lead",
            "company": "Tập đoàn tư vấn quốc tế",
            "industry": "Consulting",
            "fit": 87,
            "reason": "Tư duy chiến lược và khả năng phân tích phù hợp với vai trò cấp cao.",
        },
        {
            "title": "Data-Driven Operations Manager",
            "company": "Startup FinTech",
            "industry": "FinTech",
            "fit": 81,
            "reason": "Nền tảng kỹ thuật kết hợp kinh nghiệm vận hành.",
        },
    ]

    # Tailor if we can detect a domain from position or skills
    skills_lower = [s.lower() for s in skills] if skills else []

    if any(k in position for k in ["data", "analyst", "scientist"]):
        jobs = [
            {"title": "Senior Data Scientist", "company": "Big Tech", "industry": "Technology", "fit": 94,
             "reason": "Kỹ năng phân tích dữ liệu và ML phù hợp tuyệt vời."},
            {"title": "ML Engineering Lead", "company": "AI Startup", "industry": "AI/ML", "fit": 88,
             "reason": "Kinh nghiệm xây dựng pipeline ML phù hợp với vai trò lead."},
            {"title": "Analytics Manager", "company": "FinTech", "industry": "FinTech", "fit": 83,
             "reason": "Kết hợp kỹ năng phân tích với kinh nghiệm quản lý."},
        ]
    elif any(k in position for k in ["engineer", "developer", "dev", "backend", "frontend", "fullstack"]):
        jobs = [
            {"title": "Senior Software Engineer", "company": "Big Tech", "industry": "Technology", "fit": 93,
             "reason": "Kinh nghiệm kỹ thuật và kỹ năng lập trình phù hợp cao."},
            {"title": "Tech Lead", "company": "Scale-up", "industry": "SaaS", "fit": 89,
             "reason": "Sẵn sàng chuyển từ IC sang vai trò dẫn dắt kỹ thuật."},
            {"title": "Platform Engineer", "company": "Cloud Provider", "industry": "Infrastructure", "fit": 84,
             "reason": "Kỹ năng hệ thống phân tán và DevOps phù hợp."},
        ]
    elif any(k in position for k in ["design", "ux", "ui", "product design"]):
        jobs = [
            {"title": "Senior Product Designer", "company": "Design-led Startup", "industry": "Technology", "fit": 95,
             "reason": "Kỹ năng UX/UI và tư duy sản phẩm xuất sắc."},
            {"title": "Design Lead", "company": "Agency", "industry": "Creative", "fit": 88,
             "reason": "Kinh nghiệm dẫn dắt design team và client management."},
            {"title": "UX Researcher", "company": "Enterprise SaaS", "industry": "B2B", "fit": 82,
             "reason": "Kỹ năng nghiên cứu người dùng và phân tích dữ liệu."},
        ]
    elif any(k in skills_lower for k in ["python", "machine learning", "ai", "deep learning"]):
        jobs[0] = {"title": "AI/ML Engineer", "company": "AI Startup", "industry": "AI/ML", "fit": 91,
                   "reason": "Kỹ năng Python và ML phù hợp với các dự án AI tiên tiến."}

    try:
        db.query(SuggestedJob).filter(SuggestedJob.user_id == current_user.id).delete(synchronize_session=False)
        for job in jobs:
            db.add(
                SuggestedJob(
                    user_id=current_user.id,
                    title=job.get("title", ""),
                    company=job.get("company", ""),
                    industry=job.get("industry", ""),
                    fit_score=int(job.get("fit", 0) or 0),
                    reason=job.get("reason", ""),
                    source="auto",
                    is_active=True,
                )
            )
        current_user.last_activity_at = _utcnow()
        _log_activity(
            db,
            current_user.id,
            "jobs_suggested_refreshed",
            {"job_count": len(jobs)},
        )
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Warning: failed to persist suggested jobs for user {current_user.id}: {e}")

    return {"jobs": jobs}
