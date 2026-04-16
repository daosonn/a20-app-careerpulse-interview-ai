import json
from app.core.config import interviewer_llm
from typing import List, Tuple, Any

# PHASES = ["Introduction", "CV Deep-dive", "Job-fit Assessment", "Behavioral", "Motivation", "Candidate Questions", "Closing"]

# def get_next_phase(current_phase: str) -> str:
#     if not current_phase: return PHASES[0]
#     try:
#         idx = PHASES.index(current_phase)
#         if idx < len(PHASES) - 1: return PHASES[idx + 1]
#     except: pass
#     return PHASES[-1]

def generate_ai_batch(req_data: Any) -> List[dict]:
    """Generates a batch of 3 questions with tips and model answers."""
    lang_instruction = "Vietnamese (Tiếng Việt)" if req_data.language == "vi" else "English"
    stress_instruction = "BE VERY STRICT, CHALLENGING, and probing (Stress-test mode)." if req_data.is_stress_test else "Be professional, polite, and encouraging."
    
    system_prompt = f"""You are a professional Interviewer for a {req_data.interview_type} interview.
    Generates a batch of 3 concise interview questions based on the candidate's CV and the Job Description.
    
    Context:
    - CV: {req_data.cv_content}
    - JD: {req_data.jd_content}
    - Previous Chat History: {req_data.chat_history}
    
    Guidelines:
    1. Respond in {lang_instruction}.
    2. {stress_instruction}
    3. Each question must include:
       - 'question': The actual question text.
       - 'tip': A short 3-5 word tip for the candidate on how to approach this question.
       - 'model_answer': A sample ideal response for evaluation similarity checks later.
    
    Return ONLY a JSON list of 3 objects."""

    try:
        response = interviewer_llm.invoke(system_prompt)
        content = response.content.strip()
        # Handle cases where LLM might wrap in markdown blocks
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:].strip()
        return json.loads(content)
    except Exception as e:
        print(f"Error generating batch: {e}")
        # Fallback if AI fails
        return [
            {"question": "Can you introduce yourself?", "tip": "Mention key achievements", "model_answer": "I have 5 years of experience..."},
            {"question": "What is your greatest strength?", "tip": "Focus on role-relevant skill", "model_answer": "My strength is attention to detail..."},
            {"question": "Why do you want this job?", "tip": "Align with company values", "model_answer": "I admire your innovation..."}
        ]

def generate_question_logic(req_data: Any) -> Tuple[str, str, int, str]:
    """
    Returns (next_question, phase_placeholder, updated_count, tip)
    We now use a dynamic approach.
    """
    # This function is now mainly a wrapper. 
    # The actual Batch logic will be handled by the graph node using the logic above.
    return "", "", req_data.current_question_count, ""
