from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Any, List, Optional
import json

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
    question_count: int = 5
    session_id: Optional[str] = "default_user"

class ChatReq(BaseModel):
    message: Optional[str] = ""
    history: List[ChatMsg] = Field(default_factory=list)
    cv_text: Optional[str] = ""
    jd_text: Optional[str] = ""
    question_count: int = 0
    evaluations: List[Any] = Field(default_factory=list)
    interview_type: str = "Behavioral"
    language: str = "vi"
    is_stress_test: bool = False
    current_phase: Optional[str] = "Introduction"
    skills_extracted: Optional[List[str]] = Field(default_factory=list)
    question_bank: Optional[str] = ""
    session_id: Optional[str] = "default_user"

    @field_validator("evaluations", mode="before")
    @classmethod
    def parse_evaluations(cls, v: Any) -> list:
        """Accept both pre-parsed dicts and JSON-string-encoded dicts."""
        if not isinstance(v, list):
            return []
        result: list = []
        for item in v:
            if isinstance(item, dict):
                result.append(item)
            elif isinstance(item, str):
                try:
                    parsed = json.loads(item)
                    if isinstance(parsed, dict):
                        result.append(parsed)
                except Exception:
                    pass
            # silently drop anything else (None, int, …)
        return result

class HistoryBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    interview_type: str
    created_at: Optional[str] = None
    score: int = 0
    language: str
