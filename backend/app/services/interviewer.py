import json
from app.core.config import interviewer_llm
from typing import List, Tuple, Any

async def astream_ai_batch(req_data: Any):
    """Streams a batch of 3 questions (for the first one)."""
    # Simplified for streaming the FIRST question of the batch
    # In a full implementation, we'd stream the entire JSON and parse it.
    # For now, let's keep it simple: stream the next question text.
    pass # Reserved for future full stream implementation if needed

async def generate_ai_batch(req_data: Any) -> List[dict]:
    """Generates a batch of 3 questions with tips and model answers.
    Uses a streaming-friendly format: Text first, then JSON.
    """
    # Handle both dict and object access
    def get_val(key, default=None):
        if isinstance(req_data, dict):
            return req_data.get(key, default)
        return getattr(req_data, key, default)

    language = get_val("language", "vi")
    is_stress_test = get_val("is_stress_test", False)
    interview_type = get_val("interview_type", "Behavioral")
    cv_content = get_val("cv_content", "")
    jd_content = get_val("jd_content", "")
    chat_history = get_val("chat_history", [])

    lang_instruction = "Vietnamese (Tiếng Việt)" if language == "vi" else "English"
    stress_instruction = "BE VERY STRICT, CHALLENGING, and probing (Stress-test mode)." if is_stress_test else "Be professional, polite, and encouraging."
    
    system_prompt = f"""You are a professional Interviewer for a {interview_type} interview.
    Generates a batch of 3 concise interview questions based on the candidate's CV and the Job Description.
    
    Context:
    - CV: {cv_content}
    - JD: {jd_content}
    - Previous Chat History: {chat_history}
    
    Guidelines:
    1. Respond in {lang_instruction}.
    2. {stress_instruction}
    3. Output format:
       Next Question: <The actual text of the next question to ask now>
       ---BATCH---
       [
         {{
           "question": "...",
           "tip": "...",
           "model_answer": "..."
         }},
         ... (total 3 objects, including the one above)
       ]
    
    4. Each question object must include:
       - 'question': The actual question text.
       - 'tip': A short 3-5 word tip for the candidate.
       - 'model_answer': A sample ideal response.
    
    Return the text followed by the JSON block."""

    full_content = ""
    try:
        # We use astream even here so that on_chat_model_stream events are triggered for LangGraph astream_events
        async for chunk in interviewer_llm.astream(system_prompt):
            full_content += chunk.content
        
        content = full_content.strip()
        if "---BATCH---" in content:
            parts = content.split("---BATCH---")
            json_part = parts[1].strip()
            # Clean up potential markdown
            if json_part.startswith("```"):
                json_part = json_part.split("```")[1]
                if json_part.startswith("json"):
                    json_part = json_part[4:].strip()
            return json.loads(json_part)
        else:
            # Fallback to old behavior if separator missing
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
    """Wrapper mainly for backward compatibility."""
    return "", "", req_data.current_question_count, ""
