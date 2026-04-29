from pydantic import BaseModel
from typing import Optional


# --- Onboarding ---

class OnboardReq(BaseModel):
    uid: str
    email: str
    name: str
    avatar: Optional[str] = None
    cv_text: str


# --- Profile update ---

class ProfileUpdateReq(BaseModel):
    full_name: Optional[str] = None
    dob: Optional[str] = None
    current_position: Optional[str] = None


# --- CV update ---

class CVUpdateReq(BaseModel):
    cv_text: str

class ResumeResp(BaseModel):
    id: int
    file_name: str
    source: str
    raw_text: str
    status: str
    created_at: str

    model_config = {"from_attributes": True}


# --- Education CRUD ---

class EducationReq(BaseModel):
    school: str
    degree: Optional[str] = ""
    field: Optional[str] = ""
    year: Optional[str] = ""


class EducationResp(BaseModel):
    id: int
    school: str
    degree: str
    field: str
    year: str

    model_config = {"from_attributes": True}


# --- Preferences ---

class PreferencesReq(BaseModel):
    preferred_language: Optional[str] = None
    difficulty: Optional[str] = None
    ai_persona: Optional[str] = None
    availability: Optional[str] = None
    default_interview_type: Optional[str] = None
    stress_test_default: Optional[bool] = None
    auto_read_questions: Optional[bool] = None
    questions_per_session: Optional[int] = None


class PreferencesResp(BaseModel):
    preferred_language: str
    difficulty: str
    ai_persona: str
    availability: str
    default_interview_type: str
    stress_test_default: bool
    auto_read_questions: bool
    questions_per_session: int

    model_config = {"from_attributes": True}


# --- Settings ---

class SettingsReq(BaseModel):
    ui_language: Optional[str] = None
    theme: Optional[str] = None
    email_reminders: Optional[bool] = None
    ai_suggestions: Optional[bool] = None
    security_alerts: Optional[bool] = None
    public_profile: Optional[bool] = None
    anonymous_practice: Optional[bool] = None


class SettingsResp(BaseModel):
    ui_language: str
    theme: str
    email_reminders: bool
    ai_suggestions: bool
    security_alerts: bool
    public_profile: bool
    anonymous_practice: bool

    model_config = {"from_attributes": True}
