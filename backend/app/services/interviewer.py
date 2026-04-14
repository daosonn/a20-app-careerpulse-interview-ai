from app.core.config import interviewer_llm
from typing import List, Tuple, Any

PHASES = ["Introduction", "CV Deep-dive", "Job-fit Assessment", "Behavioral", "Motivation", "Candidate Questions", "Closing"]

def get_next_phase(current_phase: str) -> str:
    if not current_phase: return PHASES[0]
    try:
        idx = PHASES.index(current_phase)
        if idx < len(PHASES) - 1: return PHASES[idx + 1]
    except: pass
    return PHASES[-1]

def generate_question_logic(req_data: Any) -> Tuple[str, str, int]:
    current_phase = req_data.current_phase
    q_count = req_data.current_question_count
    
    # Process phase transition
    MAX_QUESTIONS = 15
    if q_count > 0 and q_count % 2 == 0 and q_count < 13:
        current_phase = get_next_phase(current_phase)
    
    if q_count >= 13:
        current_phase = "Closing"

    lang_instruction = "Respond ONLY in Vietnamese" if req_data.language == "vi" else "Respond ONLY in English"
    stress_instruction = "BE VERY STRICT, CHALLENGING, and probing (Stress-test mode)." if req_data.is_stress_test else "Be professional, polite, and encouraging."
    
    limit_instruction = f"This is question number {q_count + 1} of {MAX_QUESTIONS}."
    if q_count == MAX_QUESTIONS - 1:
        limit_instruction += " This is the FINAL question. Thank the candidate and end the interview clearly."

    system_prompt = f"""You are a professional Interviewer for a {req_data.interview_type} interview.
    Current Phase: {current_phase}
    {limit_instruction}
    
    Context:
    - CV: {req_data.cv_content}
    - JD: {req_data.jd_content}
    - Skills: {req_data.skills_extracted}
    - RAG Suggestions: {req_data.question_bank}
    
    Guidelines:
    1. {lang_instruction}
    2. {stress_instruction}
    3. Keep your question concise (max 2 sentences).
    4. Current Objective:
       - {current_phase}: If it is 'Closing', then summarize and say goodbye. Otherwise, probe deeper or move to {current_phase}.
    
    Chat History: {req_data.chat_history}
    Ask the NEXT question or provide the closing statement."""

    response = interviewer_llm.invoke(system_prompt)
    return response.content, current_phase, q_count + 1
