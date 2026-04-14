from fastapi import APIRouter, HTTPException, Depends
from typing import Annotated
from app.schemas.interview import SetupReq, ChatReq
from app.services.graph import app_graph
from app.services.reporter import generate_report_logic
from app.core.database import SessionDep
from app.models.models import Interview, User
import base64
from openai import OpenAI
import os

router = APIRouter()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def generate_speech_base64(text: str) -> str:
    """Helper to convert text to speech (Base64)."""
    try:
        response = client.audio.speech.create(
            model="tts-1-hd",
            voice="nova",
            input=text
        )
        return base64.b64encode(response.content).decode('utf-8')
    except Exception as e:
        print("Error generating speech:", e)
        return ""

@router.post("/start")
async def start_interview(req: SetupReq, db: SessionDep):
    # Ensure user is onboarded
    user_email = req.session_id # Simplified assumption
    db_user = db.query(User).filter(User.email == user_email).first()
    
    if not db_user or not db_user.is_onboarded:
         raise HTTPException(status_code=403, detail="Tài khoản chưa hoàn thành Onboarding. Vui lòng upload CV.")

    config = {"configurable": {"thread_id": req.session_id or "default_user"}}
    state = {
        "cv_content": req.cv_text, "jd_content": req.jd_text,
        "chat_history": [], "current_question_count": 0,
        "interview_type": req.interview_type, "language": req.language,
        "is_stress_test": req.is_stress_test, "current_phase": None,
        "skills_extracted": [], "question_bank": "", "evaluations": [], "final_report": ""
    }
    
    result = await app_graph.ainvoke(state, config=config)
    ai_text = result['chat_history'][-1]['content']
    
    return {
        "first_question": ai_text,
        "audio_base64": generate_speech_base64(ai_text),
        "current_phase": result.get("current_phase"),
        "skills_extracted": result.get("skills_extracted"),
        "question_bank": result.get("question_bank")
    }

@router.post("/chat")
async def chat_interview(req: ChatReq):
    config = {"configurable": {"thread_id": req.session_id or "default_user"}}
    new_input = {
        "chat_history": [{"role": "user", "content": req.message}]
    }

    result = await app_graph.ainvoke(new_input, config=config)
    ai_text = result['chat_history'][-1]['content']
    
    current_evals = result.get('evaluations', [])
    last_eval = current_evals[-1] if current_evals else None
    
    return {
        "reply": ai_text,
        "evaluations": result.get('evaluations', []),
        "last_evaluation": last_eval,
        "audio_base64": generate_speech_base64(ai_text),
        "current_phase": result.get("current_phase")
    }

@router.post("/end")
async def end_interview(req: ChatReq, db: SessionDep):
    history = [{"role": m.role, "content": m.content} for m in req.history]
    
    class MockReq:
        def __init__(self, data):
            for k, v in data.items(): setattr(self, k, v)
            
    report_req = MockReq({"chat_history": history, "evaluations": req.evaluations, "language": req.language})
    feedback_text = generate_report_logic(report_req)
    
    new_interview = Interview(
        user_id=1, cv_text=req.cv_text, jd_text=req.jd_text, interview_type=req.interview_type,
        language=req.language, transcript=history, evaluations=req.evaluations,
        final_report=feedback_text, score=85
    )
    db.add(new_interview)
    db.commit()

    return {"feedback": feedback_text, "audio_base64": generate_speech_base64(feedback_text)}
