from typing import List, Optional

from pydantic import BaseModel


class ProfilerRequest(BaseModel):
    cv_content: str

class ProfilerResponse(BaseModel):
    skills_extracted: List[str]
    question_bank: str
    full_name: Optional[str] = None
    dob: Optional[str] = None
    current_position: Optional[str] = None

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

class EvaluatorRequest(BaseModel):
    last_ai_msg: str
    last_user_msg: str
    language: str

class EvaluatorResponse(BaseModel):
    evaluation: str

class ReporterRequest(BaseModel):
    chat_history: List[dict]
    evaluations: List[str]
    language: str

class ReporterResponse(BaseModel):
    final_report: str
