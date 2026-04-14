import os
import sys

# Project imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..")))
from src.core.config import interviewer_llm

def generate_report_logic(req_data):
    lang_instruction = "Vietnamese" if req_data.language == "vi" else "English"
    
    system_prompt = f"""You are a Head of Recruitment. Write a detailed Feedback Report in {lang_instruction}.
    History: {req_data.chat_history}
    Process evaluations: {req_data.evaluations}
    
    Structure:
    1. Overall Impression
    2. Deep Dive Analysis
    3. Technical Skill Gap
    4. Improvement Roadmap (3 actions)"""

    response = interviewer_llm.invoke(system_prompt)
    return response.content
