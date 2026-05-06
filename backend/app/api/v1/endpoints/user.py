from fastapi import APIRouter, HTTPException
import datetime
import json
import logging
from typing import Optional
from fastapi.responses import StreamingResponse
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
from app.models.models import User, Education, ResumeUpload, SuggestedJob, UserActivity, QuestionBank
from app.services.profiler import extract_cv_info_logic, extract_cv_info_stream, map_cv_skills_to_canonical
from app.rag_service.matcher import JobMatcherService

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


def _profile_payload(user: User) -> dict:
    return {
        "onboarded": user.is_onboarded,
        "cv_text": user.cv_text,
        "skills": user.skills,
        "tools": user.tools,
        "projects": user.projects,
        "name": user.name,
        "full_name": user.full_name,
        "dob": user.dob,
        "current_position": user.current_position,
    }


def _preferences_payload(user: User) -> dict:
    return {
        field: getattr(user, field)
        for field in PREF_FIELDS
    }


def _settings_payload(user: User) -> dict:
    return {
        field: getattr(user, field)
        for field in SETTINGS_FIELDS
    }


def _education_payload(entries: list[Education]) -> list[dict]:
    return [
        {
            "id": entry.id,
            "school": entry.school,
            "degree": entry.degree,
            "field": entry.field,
            "year": entry.year,
        }
        for entry in entries
    ]


def _jobs_payload(jobs: list[SuggestedJob]) -> list[dict]:
    return [
        {
            "title": job.title,
            "company": job.company,
            "industry": job.industry,
            "fit": job.fit_score,
            "reason": job.reason,
            "url": job.url,
            "source": job.source,
        }
        for job in jobs
    ]


# ================================================================
#  Onboarding (existing)
# ================================================================

@router.post("/onboard")
async def onboard_user(req: OnboardReq, db: SessionDep, current_user: CurrentUser):
    try:
        info = await extract_cv_info_logic(req.cv_text)
        skills = info.get("skills", ["Kỹ năng chung"])
        full_name = info.get("full_name") or req.name

        current_user.cv_text = req.cv_text
        current_user.skills = skills
        current_user.tools = info.get("tools", [])
        current_user.projects = info.get("projects", [])
        current_user.full_name = full_name
        current_user.dob = info.get("dob")
        current_user.current_position = info.get("current_position")
        current_user.is_onboarded = True
        current_user.last_cv_uploaded_at = _utcnow()
        current_user.last_profile_update_at = _utcnow()
        current_user.last_activity_at = _utcnow()

        # Skill Mapping Logic
        from sqlalchemy import func
        all_canonical_skills = db.query(QuestionBank.skills).all()
        # Flatten and unique the skills list
        flat_skills = set()
        for item in all_canonical_skills:
            if isinstance(item[0], list):
                for s in item[0]: flat_skills.add(s)
            elif isinstance(item[0], str):
                flat_skills.add(item[0])
        
        matched_skills = await map_cv_skills_to_canonical(req.cv_text, list(flat_skills))

        # Generate CV Vector for Job Matching (One-time)
        from app.rag_service.rag_service import rag_service
        query_parts = []
        if current_user.current_position: query_parts.append(f"Vị trí: {current_user.current_position}")
        if skills: query_parts.append(f"Kỹ năng: {', '.join(skills)}")
        if info.get("tools"): query_parts.append(f"Công cụ: {', '.join(info['tools'])}")
        if info.get("projects"): query_parts.append(f"Dự án tiêu biểu: {json.dumps(info['projects'], ensure_ascii=False)}")
        query_str = ". ".join(query_parts)
        # Generate vectors for both providers
        cv_vectors = await rag_service.embed_text_multi(query_str) if query_str else {}

        db.add(
            ResumeUpload(
                user_id=current_user.id,
                file_name=req.file_name or "onboarding_cv.pdf",
                source="onboard",
                raw_text=req.cv_text,
                status="processed",
                parsed_skills=skills,
                matched_skills=matched_skills,
                rich_summary=query_str,
                cv_vector=cv_vectors, # Store dictionary of vectors
                processed_at=_utcnow(),
            )
        )
        _log_activity(
            db,
            current_user.id,
            "onboarding_completed",
            {
                "skills_count": len(skills),
                "matched_skills_count": len(matched_skills),
                "has_position": bool(current_user.current_position),
            },
        )

        db.commit()
        db.refresh(current_user)
        return {"status": "success", "skills": skills, "matched_skills": matched_skills, "user_id": current_user.id, "info": info}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ================================================================
#  Profile — read / update
# ================================================================

@router.get("/profile")
async def get_user_profile(current_user: CurrentUser):
    return _profile_payload(current_user)


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

@router.get("/resumes")
async def list_resumes(db: SessionDep, current_user: CurrentUser):
    try:
        # Chỉ lấy các trường cần thiết để hiển thị danh sách
        from sqlalchemy import select
        from app.models.models import ResumeUpload
        
        stmt = select(ResumeUpload.id, ResumeUpload.file_name, ResumeUpload.created_at)\
            .where(ResumeUpload.user_id == current_user.id)\
            .order_by(ResumeUpload.created_at.desc())
        
        results = db.execute(stmt).all()
        return [
            {
                "id": r.id, 
                "file_name": r.file_name, 
                "created_at": r.created_at.isoformat() if r.created_at else None
            } for r in results
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/resumes/{resume_id}")
async def get_resume_detail(resume_id: int, db: SessionDep, current_user: CurrentUser):
    from app.rag_service.rag_service import rag_service
    resume = db.query(ResumeUpload).filter(ResumeUpload.id == resume_id, ResumeUpload.user_id == current_user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    # Lấy luôn Job gợi ý trong cùng 1 nốt nhạc
    suggested_jobs = []
    if isinstance(resume.cv_vector, dict) and resume.cv_vector.get("jina"):
        suggested_jobs = await rag_service.retrieve_by_vector(resume.cv_vector["jina"], limit=5)
        
    return {
        "id": resume.id,
        "raw_text": resume.raw_text,
        "file_name": resume.file_name,
        "suggested_jobs": suggested_jobs # Trả về luôn để Frontend không phải gọi thêm
    }

@router.get("/resumes/{resume_id}/jobs")
async def get_resume_jobs(resume_id: int, db: SessionDep, current_user: CurrentUser):
    from app.rag_service.rag_service import rag_service
    resume = db.query(ResumeUpload).filter(ResumeUpload.id == resume_id, ResumeUpload.user_id == current_user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    # Use stored Jina vector if available
    jina_vector = None
    if isinstance(resume.cv_vector, dict):
        jina_vector = resume.cv_vector.get("jina")
    
    # If no vector stored, we might need to re-embed, but for now just return empty if missing
    if not jina_vector:
        return []
        
    jobs = await rag_service.retrieve_by_vector(jina_vector, limit=5)
    return jobs

@router.put("/cv")
async def update_cv(req: CVUpdateReq, db: SessionDep, current_user: CurrentUser):
    if not req.cv_text.strip():
        raise HTTPException(status_code=400, detail="CV text cannot be empty.")
    try:
        info = await extract_cv_info_logic(req.cv_text)
        skills = info.get("skills", current_user.skills or [])
        current_user.cv_text = req.cv_text
        current_user.skills = skills
        current_user.tools = info.get("tools", current_user.tools or [])
        current_user.projects = info.get("projects", current_user.projects or [])
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

        # Skill Mapping Logic (One-time during CV upload)
        from sqlalchemy import func
        all_canonical_skills = db.query(QuestionBank.skills).all()
        flat_skills = set()
        for item in all_canonical_skills:
            if isinstance(item[0], list):
                for s in item[0]: flat_skills.add(s)
            elif isinstance(item[0], str):
                flat_skills.add(item[0])
        
        matched_skills = await map_cv_skills_to_canonical(req.cv_text, list(flat_skills))

        # Generate CV Vector for Job Matching (One-time)
        from app.rag_service.rag_service import rag_service
        query_parts = []
        if current_user.current_position: query_parts.append(f"Vị trí: {current_user.current_position}")
        if skills: query_parts.append(f"Kỹ năng: {', '.join(skills)}")
        if info.get("tools"): query_parts.append(f"Công cụ: {', '.join(info['tools'])}")
        if info.get("projects"): query_parts.append(f"Dự án tiêu biểu: {json.dumps(info['projects'], ensure_ascii=False)}")
        query_str = ". ".join(query_parts)
        # Generate vectors for both providers
        cv_vectors = await rag_service.embed_text_multi(query_str) if query_str else {}

        db.add(
            ResumeUpload(
                user_id=current_user.id,
                file_name=req.file_name or "profile_cv_update.pdf",
                source="cv_update",
                raw_text=req.cv_text,
                status="processed",
                parsed_skills=skills,
                matched_skills=matched_skills,
                rich_summary=query_str,
                cv_vector=cv_vectors, # Store dictionary of vectors
                processed_at=_utcnow(),
            )
        )
        _log_activity(
            db,
            current_user.id,
            "cv_updated",
            {
                "skills_count": len(skills),
                "matched_skills_count": len(matched_skills),
            },
        )
        db.commit()
        db.refresh(current_user)
        # Tự động tìm kiếm Job gợi ý bằng Vector Jina (mặc định)
        suggested_jobs = []
        if cv_vectors.get("jina"):
            suggested_jobs = await rag_service.retrieve_by_vector(cv_vectors["jina"], limit=5)

        return {
            "status": "success",
            "skills": current_user.skills,
            "matched_skills": matched_skills,
            "full_name": current_user.full_name,
            "current_position": current_user.current_position,
            "suggested_jobs": suggested_jobs
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cv/analyze-stream")
async def analyze_cv_stream(req: CVUpdateReq, current_user: CurrentUser):
    """Endpoint stream để Frontend hiển thị tiến trình bóc tách CV."""
    async def event_generator():
        async for update in extract_cv_info_stream(req.cv_text):
            yield f"data: {update}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


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
#  Aggregate profile bundle
# ================================================================

@router.get("/me")
async def get_user_bundle(db: SessionDep, current_user: CurrentUser):
    education = (
        db.query(Education)
        .filter(Education.user_id == current_user.id)
        .order_by(Education.created_at.desc())
        .all()
    )
    suggested_jobs = (
        db.query(SuggestedJob)
        .filter(SuggestedJob.user_id == current_user.id, SuggestedJob.is_active == True)
        .order_by(SuggestedJob.fit_score.desc())
        .all()
    )
    return {
        "profile": _profile_payload(current_user),
        "education": _education_payload(education),
        "preferences": _preferences_payload(current_user),
        "settings": _settings_payload(current_user),
        "suggested_jobs": _jobs_payload(suggested_jobs),
    }


# ================================================================
#  Suggested Jobs (simple heuristic based on profile)
# ================================================================

@router.get("/suggested-jobs")
async def get_suggested_jobs(db: SessionDep, current_user: CurrentUser, refresh: bool = False):
    """Lấy danh sách job gợi ý, tự động khớp nếu chưa có dữ liệu."""
    saved_suggestions = db.query(SuggestedJob).filter(
        SuggestedJob.user_id == current_user.id,
        SuggestedJob.is_active == True
    ).all()
    
    if refresh and current_user.skills:
        matcher = JobMatcherService(db)
        # Lấy CV mới nhất để lấy Vector đã lưu
        latest_cv = db.query(ResumeUpload).filter(ResumeUpload.user_id == current_user.id).order_by(ResumeUpload.created_at.desc()).first()
        
        cv_vector = None
        if latest_cv and isinstance(latest_cv.cv_vector, dict):
            # Tự động chọn vector dựa trên EMBEDDING_PROVIDER hiện tại
            from app.core.config import EMBEDDING_PROVIDER
            cv_vector = latest_cv.cv_vector.get(EMBEDDING_PROVIDER)
            
            # Fallback nếu provider hiện tại chưa có vector trong bản ghi này
            if not cv_vector:
                print(f"Warning: No vector found for provider {EMBEDDING_PROVIDER} in latest CV. Attempting fallback.")
                cv_vector = list(latest_cv.cv_vector.values())[0] if latest_cv.cv_vector else None

        # Gọi matcher với vector đã chọn lọc
        await matcher.match_and_persist(
            user_id=current_user.id,
            skills=current_user.skills,
            current_position=current_user.current_position,
            precomputed_vector=cv_vector
        )
        saved_suggestions = db.query(SuggestedJob).filter(
            SuggestedJob.user_id == current_user.id
        ).all()

    return {
        "jobs": [
            {
                "title": s.title,
                "company": s.company,
                "industry": s.industry,
                "fit": s.fit_score,
                "reason": s.reason,
                "url": s.url,
                "source": s.source
            }
            for s in saved_suggestions
        ]
    }
