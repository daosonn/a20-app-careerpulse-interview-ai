from fastapi import APIRouter, HTTPException, Depends
from typing import Annotated
from app.schemas.interview import SetupReq, ChatReq
from app.services.graph import app_graph
from app.services.reporter import generate_report_logic
from app.core.database import SessionDep
from app.core.auth import CurrentUser
from app.models.models import Interview, User
import base64
from openai import OpenAI
import os
from fastapi import UploadFile, File
import tempfile

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

@router.post("/setup")
async def setup_interview(req: SetupReq, db: SessionDep, current_user: CurrentUser):
    """Initial analysis: generate predicted questions and save session context."""
    try:
        # 1. Generate predicted questions using LLM (Simulated for now, can use a service function)
        prompt = f"Analyze this CV and JD for a {req.interview_type} interview in {req.language}. CV: {req.cv_text[:500]} JD: {req.jd_text[:500]}. Provide 5 predicted interview questions."
        llm_response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}]
        )
        questions = llm_response.choices[0].message.content.split("\n")
        
        # 2. Save to DB
        new_interview = Interview(
            user_id=current_user.id,
            cv_text=req.cv_text,
            jd_text=req.jd_text,
            interview_type=req.interview_type,
            language=req.language,
            predicted_questions=questions,
            status="setup"
        )
        db.add(new_interview)
        db.commit()
        db.refresh(new_interview)
        
        return {"session_id": new_interview.id, "predicted_questions": questions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...), current_user: CurrentUser = None):
    """Transcribe audio using Whisper."""
    tmp_path = None
    try:
        # Use mkstemp for more robust path assignment
        fd, tmp_path = tempfile.mkstemp(suffix=".wav")
        try:
            with os.fdopen(fd, 'wb') as tmp:
                tmp.write(await file.read())
        except Exception:
            # If writing fails, we still have tmp_path for cleanup in finally
            raise
        
        with open(tmp_path, "rb") as audio_file:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file
            )
        
        return {"text": transcript.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)

@router.post("/start")
async def start_interview(session_id: int, db: SessionDep, current_user: CurrentUser):
    # Ensure current user is onboarded
    if not current_user.is_onboarded:
         raise HTTPException(status_code=403, detail="Tài khoản chưa hoàn thành Onboarding. Vui lòng upload CV.")

    # Get session from DB
    interview = db.query(Interview).filter(Interview.id == session_id, Interview.user_id == current_user.id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Session not found")

    # Secure thread_id: user can only access their own threads
    safe_thread_id = f"user_{current_user.id}_{session_id}"
    config = {"configurable": {"thread_id": safe_thread_id}}
    state = {
        "cv_content": interview.cv_text, "jd_content": interview.jd_text,
        "chat_history": [], "current_question_count": 0,
        "interview_type": interview.interview_type, "language": interview.language,
        "is_stress_test": False, # TODO: pass from UI
        "current_phase": None,
        "skills_extracted": [], "question_bank": "", "evaluations": [], "final_report": ""
    }
    
    interview.status = "in_progress"
    db.commit()
    
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
async def chat_interview(req: ChatReq, current_user: CurrentUser):
    # Secure thread_id
    safe_thread_id = f"user_{current_user.id}_{req.session_id or 'default'}"
    config = {"configurable": {"thread_id": safe_thread_id}}
    new_input = {
        "chat_history": [{"role": "user", "content": req.message}]
    }

    result = await app_graph.ainvoke(new_input, config=config)
    ai_text = result['chat_history'][-1]['content']
    current_phase = result.get("current_phase")
    
    current_evals = result.get('evaluations', [])
    last_eval = current_evals[-1] if current_evals else None
    
    return {
        "reply": ai_text,
        "evaluations": result.get('evaluations', []),
        "last_evaluation": last_eval,
        "audio_base64": generate_speech_base64(ai_text),
        "current_phase": current_phase,
        "should_end": current_phase == "Closing"
    }

@router.post("/end")
async def end_interview(req: ChatReq, db: SessionDep, current_user: CurrentUser):
    history = [{"role": m.role, "content": m.content} for m in req.history]
    
    class MockReq:
        def __init__(self, data):
            for k, v in data.items(): setattr(self, k, v)
            
    report_req = MockReq({"chat_history": history, "evaluations": req.evaluations, "language": req.language})
    feedback_text = generate_report_logic(report_req)
    
    new_interview = Interview(
        user_id=current_user.id, cv_text=req.cv_text, jd_text=req.jd_text, interview_type=req.interview_type,
        language=req.language, transcript=history, evaluations=req.evaluations,
        final_report=feedback_text, score=85
    )
    db.add(new_interview)
    db.commit()

    return {"feedback": feedback_text, "audio_base64": generate_speech_base64(feedback_text)}
