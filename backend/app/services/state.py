from typing import TypedDict, Annotated
import operator

class InterviewState(TypedDict):
    cv_content: str
    jd_content: str
    skills_extracted: list[str]
    question_bank: str
    chat_history: Annotated[list[dict], operator.add]
    current_question_count: int
    current_phase: str
    interview_type: str  # Behavioral / Technical
    language: str       # vi / en
    is_stress_test: bool
    evaluations: Annotated[list[str], operator.add]
    final_report: str
    pending_questions: list[dict] # list of {"question", "tip", "model_answer"}
    total_question_count: int
    current_model_answer: str
    current_tip: str
