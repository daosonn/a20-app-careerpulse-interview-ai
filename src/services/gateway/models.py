from pydantic import BaseModel
from typing import List, Optional

class SetupReq(BaseModel):
    cv_text: str
    jd_text: str
    interview_type: str = "Behavioral"
    language: str = "vi"
    is_stress_test: bool = False
    session_id: Optional[str] = "default_user"


class ChatMsg(BaseModel):
    role: str
    content: str

class ChatReq(BaseModel):
    message: str
    history: List[ChatMsg]
    cv_text: str
    jd_text: str
    question_count: int
    evaluations: List[str] = []
    interview_type: str = "Behavioral"
    language: str = "vi"
    is_stress_test: bool = False
    current_phase: Optional[str] = "Introduction"
    skills_extracted: Optional[List[str]] = []
    question_bank: Optional[str] = ""
    session_id: Optional[str] = "default_user"


class HistoryBrief(BaseModel):
    id: int
    interview_type: str
    created_at: Optional[str] = None
    score: int = 0
    language: str
    class Config:
        from_attributes = True
class OnboardReq(BaseModel):
    uid: str
    email: str
    name: str
    avatar: Optional[str] = None
    cv_text: str
