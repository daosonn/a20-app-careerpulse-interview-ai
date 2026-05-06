import datetime

from sqlalchemy import (JSON, Boolean, Column, DateTime, ForeignKey, Integer,
                        String, Text)
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.core.logger import log_func


def utcnow() -> datetime.datetime:
    return datetime.datetime.utcnow()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    avatar = Column(String)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)
    last_cv_uploaded_at = Column(DateTime, nullable=True)
    last_profile_update_at = Column(DateTime, nullable=True)
    last_activity_at = Column(DateTime, nullable=True)

    cv_text = Column(Text)
    skills = Column(JSON)
    tools = Column(JSON)
    projects = Column(JSON)
    is_onboarded = Column(Boolean, default=False)
    full_name = Column(String)
    dob = Column(String)
    current_position = Column(String)

    # Preferences
    preferred_language = Column(String, default="vi")
    difficulty = Column(String, default="Normal")
    ai_persona = Column(String, default="AI Coach")
    availability = Column(String, default="")
    default_interview_type = Column(String, default="Behavioral")
    stress_test_default = Column(Boolean, default=False)
    auto_read_questions = Column(Boolean, default=True)
    questions_per_session = Column(Integer, default=5)

    # Settings
    ui_language = Column(String, default="vi")
    theme = Column(String, default="dark")
    email_reminders = Column(Boolean, default=True)
    ai_suggestions = Column(Boolean, default=True)
    security_alerts = Column(Boolean, default=True)
    public_profile = Column(Boolean, default=False)
    anonymous_practice = Column(Boolean, default=False)

    interviews = relationship("Interview", back_populates="owner", cascade="all, delete-orphan")
    educations = relationship("Education", back_populates="user", cascade="all, delete-orphan")
    resume_uploads = relationship("ResumeUpload", back_populates="user", cascade="all, delete-orphan")
    suggested_jobs = relationship("SuggestedJob", back_populates="user", cascade="all, delete-orphan")
    activities = relationship("UserActivity", back_populates="user", cascade="all, delete-orphan")


class Education(Base):
    __tablename__ = "educations"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    school = Column(String, nullable=False)
    degree = Column(String, default="")
    field = Column(String, default="")
    year = Column(String, default="")
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    user = relationship("User", back_populates="educations")


class Interview(Base):
    __tablename__ = "interviews"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    cv_text = Column(Text)
    jd_text = Column(Text)
    interview_type = Column(String)
    language = Column(String)
    transcript = Column(JSON)  # List of {role, content}
    evaluations = Column(JSON)  # List of evaluations
    final_report = Column(Text)
    score = Column(Integer, default=0)
    status = Column(String, default="setup")  # setup, in_progress, completed
    predicted_questions = Column(JSON)
    pending_questions = Column(JSON) # To survive session interruptions
    is_stress_test = Column(Boolean, default=False)
    question_count = Column(Integer, default=5)
    resume_upload_id = Column(Integer, ForeignKey("resume_uploads.id"), nullable=True)
    matched_skills = Column(JSON) # To store skills used for this interview session
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)
    ended_at = Column(DateTime, nullable=True)
    owner = relationship("User", back_populates="interviews")
    turns = relationship("InterviewTurn", back_populates="interview", cascade="all, delete-orphan")


class InterviewTurn(Base):
    __tablename__ = "interview_turns"

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, ForeignKey("interviews.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    turn_order = Column(Integer, nullable=False)
    question = Column(Text, default="")
    answer = Column(Text, default="")
    tip = Column(Text, default="")
    evaluation = Column(JSON)
    audio_meta = Column(JSON)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    interview = relationship("Interview", back_populates="turns")
    user = relationship("User")


class ResumeUpload(Base):
    __tablename__ = "resume_uploads"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    file_name = Column(String, default="")
    source = Column(String, default="manual")  # onboard, cv_update, manual, import
    raw_text = Column(Text)
    status = Column(String, default="processed")  # pending, processed, failed
    parsed_skills = Column(JSON)
    matched_skills = Column(JSON) # Canonical skills matched against QuestionBank
    rich_summary = Column(Text) # The "Van ban dai" for AI planning and job matching
    cv_vector = Column(JSON) # To store precomputed embedding vector for job matching
    created_at = Column(DateTime, default=utcnow, nullable=False)
    processed_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    user = relationship("User", back_populates="resume_uploads")


class SuggestedJob(Base):
    __tablename__ = "suggested_jobs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    company = Column(String, default="")
    industry = Column(String, default="")
    fit_score = Column(Integer, default=0)
    reason = Column(Text, default="")
    url = Column(String)
    deadline = Column(String)
    source = Column(String, default="auto")  # auto, admin, imported
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    user = relationship("User", back_populates="suggested_jobs")


class UserActivity(Base):
    __tablename__ = "user_activities"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    event_type = Column(String, nullable=False, index=True)
    details = Column(JSON)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    user = relationship("User", back_populates="activities")


class QuestionBank(Base):
    __tablename__ = "question_bank"

    id = Column(Integer, primary_key=True, index=True)
    question = Column(Text, nullable=False)
    skills = Column(JSON, nullable=False)  # List of canonical skills, e.g. ["Python", "Backend"]
    intent = Column(Text)
    tip = Column(Text)
    persona = Column(String, default="Ms. Linh")
    evaluation_type = Column(String, default="technical") # technical, behavioral, project, etc.
    language = Column(String, default="vi")
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)
