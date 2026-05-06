from typing import Any

from app.core.config import interviewer_llm
from app.core.logger import log_func

async def generate_report_logic(req_data: Any) -> str:
    log_func("generate_report_logic")
    lang_instruction = "Vietnamese" if req_data.language == "vi" else "English"
    
    system_prompt = f"""You are a Head of Recruitment. Write a detailed Feedback Report in {lang_instruction}.
    History: {req_data.chat_history}
    Process evaluations: {req_data.evaluations}
    
    Structure:
    1. Overall Impression
    2. Deep Dive Analysis
    3. Technical Skill Gap
    4. Improvement Roadmap (3 actions)"""

    response = await interviewer_llm.ainvoke(system_prompt)
    return response.content
