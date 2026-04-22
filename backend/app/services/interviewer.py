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
    
    lang_instruction = "VIETNAMESE (Tiếng Việt)" if language == "vi" else "ENGLISH"
    
    system_prompt = f"""You are a professional Interviewer for a {interview_type} interview.
    IMPORTANT: You MUST conduct the interview and generate all questions, tips, and model answers in {lang_instruction}.
    
    Context:
    - CV: {cv_content}
    - JD: {jd_content}
    - Previous Chat History: {chat_history}
    
    Guidelines:
    1. Output MUST be in {lang_instruction}.
    2. {stress_instruction}
    3. Output format (Strictly follow this):
       Next Question: <The actual text of the next question in {lang_instruction}>
       ---BATCH---
       [
         {{
           "question": "The question text in {lang_instruction}",
           "tip": "Short 3-5 word tip in {lang_instruction}",
           "model_answer": "Ideal response in {lang_instruction}"
         }},
         ...
       ]
    
    Return the text followed by the JSON block."""

    from langchain_core.messages import SystemMessage, HumanMessage
    
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=f"Generate the next batch of questions. Previous context: {chat_history[-2:] if len(chat_history) > 2 else chat_history}")
    ]

    full_content = ""
    try:
        # Use astream with messages list
        async for chunk in interviewer_llm.astream(messages):
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
