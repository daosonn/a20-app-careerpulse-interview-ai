from pydantic import BaseModel
from typing import List

class ProfilerRequest(BaseModel):
    cv_content: str

class ProfilerResponse(BaseModel):
    skills_extracted: List[str]
    question_bank: str
    full_name: str = None
    dob: str = None
    current_position: str = None
