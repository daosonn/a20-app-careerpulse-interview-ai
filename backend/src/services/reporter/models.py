from pydantic import BaseModel
from typing import List

class ReporterRequest(BaseModel):
    chat_history: List[dict]
    evaluations: List[str]
    language: str

class ReporterResponse(BaseModel):
    final_report: str
