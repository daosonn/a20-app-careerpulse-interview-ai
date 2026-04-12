from pydantic import BaseModel
from typing import List

class InterviewerRequest(BaseModel):
    cv_content: str
    jd_content: str
    chat_history: List[dict]
    current_question_count: int
    current_phase: str
    skills_extracted: List[str]
    question_bank: str
    interview_type: str
    language: str
    is_stress_test: bool

class InterviewerResponse(BaseModel):
    ai_response: str
    current_phase: str
    current_question_count: int
