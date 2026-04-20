from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from app.schemas.interview import SetupReq, ChatReq
from app.services.graph import app_graph
from app.services.reporter import generate_report_logic
from app.core.database import SessionDep
from app.core.auth import CurrentUser
from app.models.models import Interview, UserActivity
from app.core.config import async_client, transcribe_audio_async, generate_speech_base64_async
import base64
import os
import tempfile
import json
import re
from typing import Any
import datetime
import asyncio

router = APIRouter()

def _utcnow() -> datetime.datetime:
    return datetime.datetime.utcnow()

DEFAULT_QUESTIONS_VI = [
    "Hãy giới thiệu ngắn gọn về bản thân và kinh nghiệm gần đây nhất của bạn.",
    "Trong CV của bạn, đâu là dự án bạn tự hào nhất và vì sao?",
    "Bạn đã từng xử lý một tình huống khó trong công việc như thế nào?",
    "Điểm mạnh phù hợp nhất của bạn với vị trí này là gì?",
    "Bạn mong muốn điều gì ở vai trò tiếp theo và định hướng 1-2 năm tới?",
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

async def _generate_predicted_questions(req: SetupReq) -> list[str]:
    prompt = (
        f"Analyze this CV and JD for a {req.interview_type} interview in {req.language}. "
        f"CV: {req.cv_text[:500]} JD: {req.jd_text[:500]}. "
        "Return exactly 5 concise predicted interview questions, each on a new line."
    )
    llm_response = await async_client.chat.completions.create(
        # model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}]
    )
    raw = llm_response.choices[0].message.content or ""
    lines = [line.strip("-* \t") for line in raw.splitlines() if line.strip()]
    if not lines:
        return _fallback_questions(req.language)
    return lines[:5]

def _normalize_transcript(history: Any) -> list[dict[str, str]]:
    if not isinstance(history, list): return []
    normalized: list[dict[str, str]] = []
    for msg in history:
        if not isinstance(msg, dict): continue
        role, content = msg.get("role"), msg.get("content")
        if not isinstance(role, str) or not isinstance(content, str): continue
        if role == "model": role = "ai"
        normalized.append({"role": role, "content": content})
    return normalized

def _build_base_state(interview: Interview, req: ChatReq | None = None) -> dict[str, Any]:
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
        "pending_questions": [],
        "total_question_count": 0,
        "current_model_answer": "",
        "current_tip": ""
    }

async def _transcribe_logic(file: UploadFile) -> str:
    tmp_path = None
    try:
        fd, tmp_path = tempfile.mkstemp(suffix=".wav")
        with os.fdopen(fd, 'wb') as tmp:
            tmp.write(await file.read())
        return await transcribe_audio_async(tmp_path)
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)

@router.post("/setup")
async def setup_interview(req: SetupReq, db: SessionDep, current_user: CurrentUser):
    try:
        try:
            questions = await _generate_predicted_questions(req)
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
        db.add(UserActivity(user_id=current_user.id, event_type="interview_setup", details={"type": req.interview_type}))
        db.commit()
        db.refresh(new_interview)
        return {"session_id": new_interview.id, "predicted_questions": questions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...), current_user: CurrentUser = None):
    try:
        text = await _transcribe_logic(file)
        return {"text": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def _stream_interview_logic(new_input: dict, config: dict, interview_id: int):
    """
    Streams LangGraph events, extracts LLM tokens for the next question,
    splits into sentences, and generates TTS chunks.
    """
    buffer = ""
    sentence_pattern = re.compile(r'(?<=[.!?\n])')
    full_response_text = ""
    is_capturing_question = True
    final_result = {}
    
    # We use astream_events to capture tokens from the LLM inside the graph nodes
    async for event in app_graph.astream_events(new_input, config=config, version="v2"):
        kind = event.get("event")
        
        # 1. Handle LLM Streaming Tokens
        if kind == "on_chat_model_stream":
            content = event["data"]["chunk"].content
            if not content: continue
            
            # Check for the separator we added in interviewer.py
            if "---BATCH---" in buffer + content:
                is_capturing_question = False
            
            if is_capturing_question:
                # Clean up "Next Question:" prefix if present
                clean_content = content
                if full_response_text == "" and content.lstrip().startswith("Next Question:"):
                    clean_content = content.replace("Next Question:", "", 1).lstrip()

                full_response_text += clean_content
                buffer += clean_content
                
                # Yield token for frontend text display
                yield f"data: {json.dumps({'type': 't', 'c': clean_content})}\n\n"
                
                # Sentence splitting for TTS
                if any(p in clean_content for p in ".!?\n"):
                    parts = sentence_pattern.split(buffer)
                    if len(parts) > 1:
                        for sentence in parts[:-1]:
                            s_text = sentence.strip()
                            if s_text and len(s_text) > 2:
                                audio_b64 = await generate_speech_base64_async(s_text)
                                if audio_b64:
                                    yield f"data: {json.dumps({'type': 'a', 'c': audio_b64})}\n\n"
                        buffer = parts[-1]
        
        # 2. Handle Final Output and Metadata
        elif kind == "on_chain_end":
            if event.get("name") == "LangGraph":
                final_result = event["data"].get("output") or {}

    # 3. Handle Case: Question was NOT streamed (e.g. pulled from bank/cache)
    if not full_response_text and final_result:
        history = final_result.get("chat_history", [])
        if history and history[-1]["role"] == "ai":
            cached_q = history[-1]["content"]
            full_response_text = cached_q
            # Stream the cached question in one or few chunks for TTS
            yield f"data: {json.dumps({'type': 't', 'c': cached_q})}\n\n"
            buffer = cached_q

    # Process remaining buffer for TTS
    if buffer.strip():
        # If there's still something in the buffer, split and send
        parts = sentence_pattern.split(buffer)
        for sentence in parts:
            s_text = sentence.strip()
            if s_text and len(s_text) > 1:
                audio_b64 = await generate_speech_base64_async(s_text)
                if audio_b64:
                    yield f"data: {json.dumps({'type': 'a', 'c': audio_b64})}\n\n"

    # Send metadata at the very end
    if final_result:
        payload = {
            "type": "m", # metadata
            "tip": final_result.get("current_tip"),
            "phase": final_result.get("current_phase"),
            "evaluations": final_result.get("evaluations", [])[-1:] if final_result.get("evaluations") else [],
            "should_end": final_result.get("current_phase") == "Closing"
        }
        yield f"data: {json.dumps(payload)}\n\n"
    
    yield "data: [DONE]\n\n"

@router.post("/start")
async def start_interview(session_id: int, db: SessionDep, current_user: CurrentUser):
    if not current_user.is_onboarded:
         raise HTTPException(status_code=403, detail="Tài khoản chưa hoàn thành Onboarding.")

    interview = db.query(Interview).filter(Interview.id == session_id, Interview.user_id == current_user.id).first()
    if not interview: raise HTTPException(status_code=404, detail="Session not found")

    safe_thread_id = f"user_{current_user.id}_{session_id}"
    config = {"configurable": {"thread_id": safe_thread_id}}
    state = _build_base_state(interview)

    interview.status = "in_progress"
    db.commit()

    return StreamingResponse(
        _stream_interview_logic(state, config, session_id),
        media_type="text/event-stream"
    )

@router.post("/chat")
async def chat_interview(req: ChatReq, db: SessionDep, current_user: CurrentUser):
    if not req.message: raise HTTPException(status_code=400, detail="Empty message")
    
    session_id = int(req.session_id)
    interview = db.query(Interview).filter(Interview.id == session_id, Interview.user_id == current_user.id).first()
    if not interview: raise HTTPException(status_code=404, detail="Session not found")

    safe_thread_id = f"user_{current_user.id}_{session_id}"
    config = {"configurable": {"thread_id": safe_thread_id}}

    snapshot = await app_graph.aget_state(config=config)
    graph_state = dict(snapshot.values) if snapshot and getattr(snapshot, "values", None) else {}

    if graph_state:
        new_input = {"chat_history": [{"role": "user", "content": req.message}]}
    else:
        bootstrap_state = _build_base_state(interview)
        persisted_history = _normalize_transcript(interview.transcript)
        bootstrap_state["chat_history"] = persisted_history + [{"role": "user", "content": req.message}]
        new_input = bootstrap_state

    current_user.last_activity_at = _utcnow()
    db.commit()

    return StreamingResponse(
        _stream_interview_logic(new_input, config, session_id),
        media_type="text/event-stream"
    )

@router.post("/transcribe-and-chat")
async def transcribe_and_chat(
    session_id: int,
    file: UploadFile = File(...),
    db: SessionDep = None,
    current_user: CurrentUser = None
):
    try:
        text = await _transcribe_logic(file)
        if not text: raise HTTPException(status_code=400, detail="Could not transcribe audio")
        return await _chat_logic(session_id, text, db, current_user)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/end")
async def end_interview(req: ChatReq, db: SessionDep, current_user: CurrentUser):
    history = [{"role": m.role, "content": m.content} for m in req.history]
    report_req = type('Mock', (), {"chat_history": history, "evaluations": req.evaluations, "language": req.language})
    feedback_text = generate_report_logic(report_req)
    
    target_interview = db.query(Interview).filter(Interview.id == int(req.session_id), Interview.user_id == current_user.id).first()
    if target_interview:
        target_interview.transcript = history
        target_interview.evaluations = req.evaluations
        target_interview.final_report = feedback_text
        target_interview.status = "completed"
        target_interview.ended_at = _utcnow()
    
    db.commit()
    audio_base64 = await generate_speech_base64_async(feedback_text)
    return {"feedback": feedback_text, "audio_base64": audio_base64}
