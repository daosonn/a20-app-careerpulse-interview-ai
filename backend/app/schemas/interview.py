from pydantic import BaseModel, ConfigDict
from typing import List, Optional

class ChatMsg(BaseModel):
    role: str
    content: str

class RecommendationReq(BaseModel):
    cv_text: str
    limit: Optional[int] = 5

class SetupReq(BaseModel):
    cv_text: str
    jd_text: str
    interview_type: str = "Behavioral"
    language: str = "vi"
    is_stress_test: bool = False
    session_id: Optional[str] = "default_user"

class ChatReq(BaseModel):
    message: str
    history: List[ChatMsg] = []
    cv_text: Optional[str] = ""
    jd_text: Optional[str] = ""
    question_count: int = 0
    evaluations: List[dict] = []
    interview_type: str = "Behavioral"
    language: str = "vi"
    is_stress_test: bool = False
    current_phase: Optional[str] = "Introduction"
    skills_extracted: Optional[List[str]] = []
    question_bank: Optional[str] = ""
    session_id: Optional[str] = "default_user"

class HistoryBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    interview_type: str
    created_at: Optional[str] = None
    score: int = 0
    language: str
