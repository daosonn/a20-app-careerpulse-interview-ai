from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from sqlalchemy.orm import Session
import httpx
import os
import sys

# Import local modules
from .models import SetupReq, ChatReq
from .logic import generate_speech_base64, transcribe_logic

# Project relative imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..")))
from src.core.database import get_db, Interview
from src.agents.graph import app_graph
from src.services.reporter.logic import generate_report_logic

router = APIRouter()

@router.post("/interview/start")
async def start_interview(req: SetupReq):
    # Initial state
    config = {"configurable": {"thread_id": req.session_id or "default_user"}}

    state = {
        "cv_content": req.cv_text, "jd_content": req.jd_text,
        "chat_history": [], "current_question_count": 0,
        "interview_type": req.interview_type, "language": req.language,
        "is_stress_test": req.is_stress_test, "current_phase": None
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

@router.post("/interview/chat")
async def chat_interview(req: ChatReq):
    config = {"configurable": {"thread_id": req.session_id or "default_user"}}

    
    # We only need to send the NEW user message to the graph.
    # LangGraph will pull the rest from the checkpointer.
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

@router.post("/interview/end")
async def end_interview(req: ChatReq, db: Session = Depends(get_db)):
    history = [{"role": m.role, "content": m.content} for m in req.history]
    
    # Sử dụng logic Reporter trực tiếp
    class MockReq:
        def __init__(self, data):
            for k, v in data.items(): setattr(self, k, v)
            
    report_req = MockReq({"chat_history": history, "evaluations": req.evaluations, "language": req.language})
    feedback_text = generate_report_logic(report_req)
    
    new_history = Interview(
        user_id=1, cv_text=req.cv_text, jd_text=req.jd_text, interview_type=req.interview_type,
        language=req.language, transcript=history, evaluations=req.evaluations,
        final_report=feedback_text, score=85
    )
    db.add(new_history)
    db.commit()

    return {"feedback": feedback_text, "audio_base64": generate_speech_base64(feedback_text)}

@router.get("/history")
async def get_history(user_id: int = 1, db: Session = Depends(get_db)):
    interviews = db.query(Interview).filter(Interview.user_id == user_id).order_by(Interview.created_at.desc()).all()
    return [{"id": i.id, "interview_type": i.interview_type, "created_at": i.created_at.isoformat(), "score": i.score, "language": i.language} for i in interviews]

@router.get("/history/{interview_id}")
async def get_interview_detail(interview_id: int, user_id: int = 1, db: Session = Depends(get_db)):
    hist = db.query(Interview).filter(Interview.id == interview_id, Interview.user_id == user_id).first()
    if not hist: raise HTTPException(status_code=404, detail="Interview not found")
    return {
        "id": hist.id, "cv_text": hist.cv_text, "jd_text": hist.jd_text, "interview_type": hist.interview_type,
        "language": hist.language, "transcript": hist.transcript, "evaluations": hist.evaluations,
        "final_report": hist.final_report, "created_at": hist.created_at.isoformat()
    }
