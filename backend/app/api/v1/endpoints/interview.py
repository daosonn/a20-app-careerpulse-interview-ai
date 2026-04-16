from fastapi import APIRouter, HTTPException
from app.schemas.interview import SetupReq, ChatReq
from app.services.graph import app_graph
from app.services.reporter import generate_report_logic
from app.core.database import SessionDep
from app.core.auth import CurrentUser
from app.models.models import Interview, UserActivity
import base64
from openai import OpenAI
import os
from fastapi import UploadFile, File
import tempfile
from typing import Any
import datetime

router = APIRouter()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def _utcnow() -> datetime.datetime:
    return datetime.datetime.utcnow()

DEFAULT_QUESTIONS_VI = [
    "Hay gioi thieu ngan gon ve ban than va kinh nghiem gan day nhat cua ban.",
    "Trong CV cua ban, dau la du an ban tu hao nhat va vi sao?",
    "Ban da tung xu ly mot tinh huong kho trong cong viec nhu the nao?",
    "Diem manh phu hop nhat cua ban voi vi tri nay la gi?",
    "Ban mong muon dieu gi o vai tro tiep theo va dinh huong 1-2 nam toi?",
]

DEFAULT_QUESTIONS_EN = [
    "Can you briefly introduce yourself and your most recent experience?",
    "Which project in your resume are you most proud of, and why?",
    "How did you handle a difficult situation at work?",
    "What is your strongest skill for this role?",
    "What are you looking for in your next role over the next 1-2 years?",
]


def _fallback_questions(language: str) -> list[str]:
    return DEFAULT_QUESTIONS_VI if language == "vi" else DEFAULT_QUESTIONS_EN


def _generate_predicted_questions(req: SetupReq) -> list[str]:
    prompt = (
        f"Analyze this CV and JD for a {req.interview_type} interview in {req.language}. "
        f"CV: {req.cv_text[:500]} JD: {req.jd_text[:500]}. "
        "Return exactly 5 concise predicted interview questions, each on a new line."
    )
    llm_response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}]
    )
    raw = llm_response.choices[0].message.content or ""
    lines = [line.strip("-* \t") for line in raw.splitlines() if line.strip()]
    if not lines:
        return _fallback_questions(req.language)
    return lines[:5]


def _normalize_transcript(history: Any) -> list[dict[str, str]]:
    """Normalize persisted history roles to the graph's expected format."""
    if not isinstance(history, list):
        return []

    normalized: list[dict[str, str]] = []
    for msg in history:
        if not isinstance(msg, dict):
            continue
        role = msg.get("role")
        content = msg.get("content")
        if not isinstance(role, str) or not isinstance(content, str):
            continue
        if role == "model":
            role = "ai"
        normalized.append({"role": role, "content": content})
    return normalized


def _build_base_state(interview: Interview, req: ChatReq | None = None) -> dict[str, Any]:
    """Create a complete state payload for graph bootstrap."""
    return {
        "cv_content": interview.cv_text or "",
        "jd_content": interview.jd_text or "",
        "chat_history": [],
        "current_question_count": req.question_count if req and req.question_count else 0,
        "interview_type": interview.interview_type or (req.interview_type if req else "Behavioral"),
        "language": interview.language or (req.language if req else "vi"),
        "is_stress_test": req.is_stress_test if req else False,
        "current_phase": req.current_phase if req else None,
        "skills_extracted": req.skills_extracted or [] if req else [],
        "question_bank": req.question_bank or "" if req else "",
        "evaluations": req.evaluations or [] if req else [],
        "final_report": "",
    }

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
        # Never block session creation on AI pre-analysis.
        try:
            questions = _generate_predicted_questions(req)
        except Exception as e:
            print(f"Warning: predicted-question generation failed: {e}")
            questions = _fallback_questions(req.language)
        
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
        current_user.last_activity_at = _utcnow()
        db.add(
            UserActivity(
                user_id=current_user.id,
                event_type="interview_setup",
                details={
                    "interview_type": req.interview_type,
                    "language": req.language,
                },
            )
        )
        db.commit()
        db.refresh(new_interview)
        
        return {"session_id": new_interview.id, "predicted_questions": questions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create interview session: {str(e)}")

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

    safe_thread_id = f"user_{current_user.id}_{session_id}"
    config = {"configurable": {"thread_id": safe_thread_id}}
    state = _build_base_state(interview)

    interview.status = "in_progress"
    current_user.last_activity_at = _utcnow()
    db.add(
        UserActivity(
            user_id=current_user.id,
            event_type="interview_started",
            details={"session_id": session_id},
        )
    )
    db.commit()

    try:
        result = await app_graph.ainvoke(state, config=config)
        ai_text = result["chat_history"][-1]["content"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start interview: {str(e)}")
    
    return {
        "first_question": ai_text,
        "audio_base64": generate_speech_base64(ai_text),
        "current_phase": result.get("current_phase"),
        "skills_extracted": result.get("skills_extracted"),
        "question_bank": result.get("question_bank")
    }

@router.post("/chat")
async def chat_interview(req: ChatReq, db: SessionDep, current_user: CurrentUser):
    message = (req.message or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    if not req.session_id:
        raise HTTPException(status_code=400, detail="session_id is required")

    try:
        session_id = int(req.session_id)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="session_id must be an integer")

    interview = db.query(Interview).filter(
        Interview.id == session_id,
        Interview.user_id == current_user.id
    ).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Session not found")

    safe_thread_id = f"user_{current_user.id}_{session_id}"
    config = {"configurable": {"thread_id": safe_thread_id}}

    graph_state: dict[str, Any] = {}
    try:
        snapshot = await app_graph.aget_state(config=config)
        if snapshot and getattr(snapshot, "values", None):
            graph_state = dict(snapshot.values)
    except Exception as e:
        print(f"Warning: cannot load graph state for thread {safe_thread_id}: {e}")

    if graph_state:
        new_input: dict[str, Any] = {
            "chat_history": [{"role": "user", "content": message}]
        }
    else:
        bootstrap_state = _build_base_state(interview, req)
        persisted_history = _normalize_transcript(interview.transcript)
        bootstrap_state["chat_history"] = persisted_history + [{"role": "user", "content": message}]
        new_input = bootstrap_state

    try:
        result = await app_graph.ainvoke(new_input, config=config)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat processing failed: {str(e)}")

    ai_text = result["chat_history"][-1]["content"]
    current_phase = result.get("current_phase")
    current_user.last_activity_at = _utcnow()
    db.commit()
    
    current_evals = result.get("evaluations", [])
    last_eval = current_evals[-1] if current_evals else None
    
    return {
        "reply": ai_text,
        "evaluations": result.get("evaluations", []),
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
    
    target_interview = None
    if req.session_id:
        try:
            session_id = int(req.session_id)
            target_interview = db.query(Interview).filter(
                Interview.id == session_id,
                Interview.user_id == current_user.id,
            ).first()
        except (TypeError, ValueError):
            target_interview = None

    if target_interview:
        target_interview.cv_text = req.cv_text
        target_interview.jd_text = req.jd_text
        target_interview.interview_type = req.interview_type
        target_interview.language = req.language
        target_interview.transcript = history
        target_interview.evaluations = req.evaluations
        target_interview.final_report = feedback_text
        target_interview.score = 85
        target_interview.status = "completed"
        target_interview.ended_at = _utcnow()
    else:
        target_interview = Interview(
            user_id=current_user.id,
            cv_text=req.cv_text,
            jd_text=req.jd_text,
            interview_type=req.interview_type,
            language=req.language,
            transcript=history,
            evaluations=req.evaluations,
            final_report=feedback_text,
            score=85,
            status="completed",
            ended_at=_utcnow(),
        )
        db.add(target_interview)

    current_user.last_activity_at = _utcnow()
    db.add(
        UserActivity(
            user_id=current_user.id,
            event_type="interview_completed",
            details={
                "session_id": req.session_id,
                "turn_count": len(history),
            },
        )
    )
    db.commit()

    return {"feedback": feedback_text, "audio_base64": generate_speech_base64(feedback_text)}



