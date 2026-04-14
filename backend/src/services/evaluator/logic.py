import os
import sys

# Project imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..")))
from src.core.config import evaluator_llm

def evaluate_star(req_data):
    lang_instruction = "Respond in Vietnamese" if req_data.language == "vi" else "Respond in English"

    prompt = f"""Evaluate the candidate's last response using the STAR Method (Situation, Task, Action, Result).
    
    Context:
    - Question asked: {req_data.last_ai_msg}
    - Candidate answer: {req_data.last_user_msg}
    
    Provide evaluation in JSON:
    - "scores": {{ "clarity": 1-5, "relevance": 1-5, "technical_depth": 1-5, "confidence": 1-5 }}
    - "feedback": "Short constructive critique"
    - "betterVersion": "A more professional version"
    
    {lang_instruction}. Return ONLY pure JSON."""
    
    try:
        eval_res = evaluator_llm.invoke(prompt)
        return eval_res.content
    except Exception as e:
        return f"Error: {str(e)}"
