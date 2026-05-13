from __future__ import annotations
import asyncio
import base64
import datetime
import json
import os
import re
import tempfile
from typing import Any

from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse

from app.schemas.interview import SetupReq, ChatReq, RecommendationReq
from app.services.reporter import generate_report_logic
from app.rag_service.rag_service import rag_service
from app.services.job_fetcher import fetch_jobs_from_platforms
from app.services.job_evaluator import ai_evaluate_job_fit, generate_llm_jobs
from app.core.database import SessionDep
from app.core.auth import CurrentUser
from app.models.models import Interview, InterviewTurn, UserActivity, User, ResumeUpload
from app.core.config import async_client, transcribe_audio_async, generate_speech_base64_async, CHAT_MODEL
from app.services.tts_service import WAV_MIME_TYPE, character_from_phase
from app.services.interview_flow import (
    create_initial_flow_state,
    fill_missing_evaluations,
    handle_answer_flow,
    start_flow,
    wait_for_pending_evaluations,
)
from app.services.trace_logger import trace_event
from app.services.cv_guard import detect_injection, scrub_pii
from app.core.logger import log_func

router = APIRouter()


def _get_app_graph():
    log_func("_get_app_graph", level=2)
    from app.services.graph import app_graph

    return app_graph

def _utcnow() -> datetime.datetime:
    log_func("_utcnow", level=2)
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
    log_func("_fallback_questions", level=2)
    return DEFAULT_QUESTIONS_VI if language == "vi" else DEFAULT_QUESTIONS_EN

async def _generate_predicted_questions(req: SetupReq) -> list[str]:
    log_func("_generate_predicted_questions", level=2)
    target_lang = "Vietnamese (Tiếng Việt)" if req.language == "vi" else "English"
    system_msg = f"You are a professional recruiter. You must respond ONLY in {target_lang}."
    prompt = (
        f"Analyze this CV and JD for a {req.interview_type} interview. "
        f"CV: {scrub_pii(req.cv_text)[:500]} JD: {scrub_pii(req.jd_text)[:500]}. "
        f"Return exactly 5 concise predicted interview questions in {target_lang}. "
        "Return as a JSON object with a 'questions' key containing a list of strings."
    )
    try:
        llm_response = await async_client.chat.completions.create(
            model=CHAT_MODEL,
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )
        data = json.loads(llm_response.choices[0].message.content)
        return data.get("questions", _fallback_questions(req.language))[:5]
    except Exception as e:
        print(f"Error generating predicted questions: {e}")
        return _fallback_questions(req.language)

def _normalize_transcript(history: Any) -> list[dict[str, str]]:
    log_func("_normalize_transcript", level=2)
    if not isinstance(history, list): return []
    normalized: list[dict[str, str]] = []
    for msg in history:
        if isinstance(msg, dict):
            role, content = msg.get("role"), msg.get("content")
        else:
            role = getattr(msg, "role", None) or getattr(msg, "type", None)
            content = getattr(msg, "content", None)
        if not isinstance(role, str) or not isinstance(content, str): continue
        if role in ("model", "assistant"): role = "ai"
        if role == "human": role = "user"
        normalized.append({"role": role, "content": content})
    return normalized

def _last_ai_message(history: Any) -> str:
    log_func("_last_ai_message", level=2)
    for msg in reversed(_normalize_transcript(history)):
        if msg.get("role") in ("ai", "model"):
            return msg.get("content", "")
    return ""

def _evaluation_score(evaluation: Any) -> float | None:
    log_func("_evaluation_score", level=2)
    if not isinstance(evaluation, dict):
        return None
    scores = evaluation.get("scores")
    if not isinstance(scores, dict):
        return None
    keys = ("relevance", "structure", "specificity", "clarity", "confidence")
    values = []
    for key in keys:
        try:
            values.append(float(scores.get(key, 0) or 0))
        except (TypeError, ValueError):
            values.append(0)
    return sum(values) / len(values)

def _sync_interview_state_from_graph(
    db: SessionDep,
    interview_id: int,
    current_user: User,
    final_result: dict[str, Any],
    answered_question: str | None = None,
    user_message: str | None = None,
) -> None:
    log_func("_sync_interview_state_from_graph", level=2)
    if not final_result:
        return

    interview = db.query(Interview).filter(
        Interview.id == interview_id,
        Interview.user_id == current_user.id,
    ).first()
    if not interview:
        return

    final_history = _normalize_transcript(final_result.get("chat_history", []))
    if final_history:
        interview.transcript = final_history

    evaluations = final_result.get("evaluations")
    if isinstance(evaluations, list):
        interview.evaluations = evaluations
        scored = [_evaluation_score(evaluation) for evaluation in evaluations]
        scored = [score for score in scored if score is not None]
        if scored:
            interview.score = round(sum(scored) / len(scored))

    if isinstance(final_result.get("pending_questions"), list):
        interview.pending_questions = final_result.get("pending_questions")

    if user_message:
        evaluation = evaluations[-1] if isinstance(evaluations, list) and evaluations else None
        turn_order = db.query(InterviewTurn).filter(
            InterviewTurn.interview_id == interview.id,
            InterviewTurn.user_id == current_user.id,
        ).count() + 1
        db.add(InterviewTurn(
            interview_id=interview.id,
            user_id=current_user.id,
            turn_order=turn_order,
            question=answered_question or "",
            answer=user_message,
            tip=final_result.get("current_tip") or "",
            evaluation=evaluation,
        ))

    current_user.last_activity_at = _utcnow()
    db.commit()

def _replace_turns_from_history(
    db: SessionDep,
    interview: Interview,
    user_id: int,
    history: list[dict[str, str]],
    evaluations: list[dict],
) -> None:
    log_func("_replace_turns_from_history", level=2)
    db.query(InterviewTurn).filter(InterviewTurn.interview_id == interview.id).delete(synchronize_session=False)

    turn_order = 1
    evaluation_index = 0
    index = 0
    while index < len(history):
        message = history[index]
        role = message.get("role")
        if role not in ("ai", "model"):
            index += 1
            continue

        next_message = history[index + 1] if index + 1 < len(history) else None
        if not next_message or next_message.get("role") != "user":
            index += 1
            continue

        evaluation = evaluations[evaluation_index] if evaluation_index < len(evaluations) else None
        db.add(InterviewTurn(
            interview_id=interview.id,
            user_id=user_id,
            turn_order=turn_order,
            question=message.get("content", ""),
            answer=next_message.get("content", ""),
            evaluation=evaluation,
        ))
        turn_order += 1
        evaluation_index += 1
        index += 2

    scored = [_evaluation_score(evaluation) for evaluation in evaluations]
    scored = [score for score in scored if score is not None]
    if scored:
        interview.score = round(sum(scored) / len(scored))

def _build_base_state(interview: Interview, user: User, req: ChatReq | None = None) -> dict[str, Any]:
    log_func("_build_base_state", level=2)
    max_question_count = (
        req.question_count
        if req and req.question_count
        else interview.question_count or user.questions_per_session or 5
    )
    return {
        "cv_content": interview.cv_text or "",
        "jd_content": interview.jd_text or "",
        "chat_history": [],
        "current_question_count": req.question_count if req and req.question_count else 0,
        "interview_type": interview.interview_type or (req.interview_type if req else "Behavioral"),
        "language": interview.language or (req.language if req else "vi"),
        "is_stress_test": req.is_stress_test if req else bool(interview.is_stress_test),
        "current_phase": (req.current_phase if req and req.current_phase else None) or "Introduction",
        "skills_extracted": (req.skills_extracted if req and req.skills_extracted else None) or user.skills or [],
        "question_bank": req.question_bank or "" if req else "",
        "evaluations": req.evaluations or [] if req else [],
        "final_report": "",
        "pending_questions": [{"question": q, "tip": "Phát triển ý dựa trên kinh nghiệm trong CV của bạn.", "model_answer": ""} for q in (interview.predicted_questions or [])],
        "total_question_count": 0,
        "max_question_count": max_question_count,
        "current_model_answer": "",
        "current_tip": ""
    }

async def _transcribe_logic(file: UploadFile) -> str:
    log_func("_transcribe_logic", level=2)
    tmp_path = None
    try:
        fd, tmp_path = tempfile.mkstemp(suffix=".wav")
        with os.fdopen(fd, 'wb') as tmp:
            tmp.write(await file.read())
        return await transcribe_audio_async(tmp_path)
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)

@router.post("/recommend-jobs")
async def recommend_jobs(req: RecommendationReq, db: SessionDep, current_user: CurrentUser):
    log_func("recommend_jobs")
    limit = req.limit or 5
    _MIN_REAL = 3

    # Build search query from user profile; cv_text is used only for AI scoring
    query = current_user.current_position or ""
    if not query and current_user.skills:
        query = " ".join((current_user.skills or [])[:2])

    candidates: list = []
    if query:
        try:
            candidates = await fetch_jobs_from_platforms(query, per_platform=max(limit, 5))
        except Exception as e:
            print(f"[recommend_jobs] platform fetch error: {e}")

    # LLM fallback when real platforms return too few results
    if len(candidates) < _MIN_REAL:
        needed = _MIN_REAL - len(candidates)
        try:
            generated = await generate_llm_jobs(
                cv_text=req.cv_text,
                skills=current_user.skills or [],
                current_position=current_user.current_position or "",
                count=needed,
            )
            candidates.extend(generated)
        except Exception as e:
            print(f"[recommend_jobs] llm fallback error: {e}")

    if not candidates:
        return []

    # AI evaluate fit score and reason for each candidate
    if req.cv_text or current_user.skills:
        try:
            candidates = await ai_evaluate_job_fit(
                cv_text=req.cv_text,
                skills=current_user.skills or [],
                current_position=current_user.current_position or "",
                jobs=candidates,
            )
        except Exception as e:
            print(f"[recommend_jobs] ai evaluation error: {e}")

    candidates.sort(key=lambda j: j.get("fit_score", 0), reverse=True)
    return candidates[:limit]

@router.post("/setup")
async def setup_interview(req: SetupReq, db: SessionDep, current_user: CurrentUser):
    log_func("setup_interview")
    # Block injection attempts in CV or JD before touching any state
    for field, text in (("CV", req.cv_text), ("JD", req.jd_text)):
        guard = detect_injection(text)
        if guard.is_malicious:
            raise HTTPException(
                status_code=422,
                detail=f"{field} bị từ chối: nội dung chứa mã độc ({guard.reason}).",
            )
    # Scrub PII from the text stored in the Interview record so the LLM never
    # sees raw personal identifiers during the session. The original CV lives in
    # ResumeUpload.raw_text and is unaffected.
    safe_cv = scrub_pii(req.cv_text)
    safe_jd = scrub_pii(req.jd_text)
    try:
        initial_state = create_initial_flow_state(req.language, req.question_count)
        trace_event(None, "interview.setup_request", {
            "user_id": current_user.id,
            "interview_type": req.interview_type,
            "language": req.language,
            "is_stress_test": req.is_stress_test,
            "question_count": req.question_count,
        })
        matched_skills = []
        if req.cv_id:
            resume = db.query(ResumeUpload).filter(ResumeUpload.id == req.cv_id, ResumeUpload.user_id == current_user.id).first()
            if resume:
                matched_skills = resume.matched_skills or []

        new_interview = Interview(
            user_id=current_user.id,
            cv_text=safe_cv,
            jd_text=safe_jd,
            interview_type=req.interview_type,
            language=req.language,
            predicted_questions=[],
            pending_questions=initial_state,
            is_stress_test=req.is_stress_test,
            question_count=req.question_count,
            resume_upload_id=req.cv_id,
            matched_skills=matched_skills,
            status="setup"
        )
        db.add(new_interview)
        current_user.last_activity_at = _utcnow()
        db.add(UserActivity(
            user_id=current_user.id,
            event_type="interview_setup",
            details={
                "type": req.interview_type,
                "stress_test": req.is_stress_test,
                "question_count": req.question_count,
            },
        ))
        db.commit()
        db.refresh(new_interview)
        trace_event(new_interview.id, "interview.setup_created", {
            "user_id": current_user.id,
            "interview_type": req.interview_type,
            "language": req.language,
            "is_stress_test": req.is_stress_test,
            "question_count": req.question_count,
            "initial_state": initial_state,
        })
        return {
            "session_id": new_interview.id,
            "sessionId": new_interview.id,
            "id": new_interview.id,
            "predicted_questions": [],
            "plan_status": initial_state["question_plan_status"],
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...), current_user: CurrentUser = None):
    log_func("transcribe_audio")
    try:
        text = await _transcribe_logic(file)
        return {"text": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def _stream_interview_logic(
    new_input: dict,
    config: dict,
    interview_id: int,
    user_message: str = None,
    db: SessionDep = None,
    current_user: User = None,
    answered_question: str = None,
):
    log_func("_stream_interview_logic", level=2)
    """
    Streams LangGraph events, extracts LLM tokens for the next question,
    splits into sentences, and generates TTS chunks.
    """
    buffer = ""
    sentence_pattern = re.compile(r'(?<=[.!?\n])')
    full_response_text = ""
    final_result = {}
    tts_sentences: list[str] = []
    
    # 0. Yield user message if provided (for audio transcript sync)
    if user_message:
        yield f"data: {json.dumps({'type': 'u', 'c': user_message})}\n\n"
    
    # We use astream_events to capture tokens from the LLM inside the graph nodes
    app_graph = _get_app_graph()
    async for event in app_graph.astream_events(new_input, config=config, version="v2"):
        kind = event.get("event")
        
        # 1. Handle LLM Streaming Tokens
        if kind == "on_chat_model_stream":
            # Only process tokens from the interviewer model
            if "interviewer" not in event.get("tags", []):
                continue
                
            content = event["data"]["chunk"].content
            if not content: continue
            
            full_response_text += content
            buffer += content
            
            # Yield token for frontend text display when a future interviewer node streams text.
            yield f"data: {json.dumps({'type': 't', 'c': content})}\n\n"
            
            # Sentence splitting for TTS
            if any(p in content for p in ".!?\n"):
                parts = sentence_pattern.split(buffer)
                if len(parts) > 1:
                    for sentence in parts[:-1]:
                        s_text = sentence.strip()
                        if s_text and len(s_text) > 2:
                            tts_sentences.append(s_text)
                    buffer = parts[-1]
        
        # 2. Handle Final Output and Metadata
        elif kind == "on_chain_end":
            output = event["data"].get("output")
            # Capture any output that looks like our graph state
            if isinstance(output, dict) and "chat_history" in output:
                final_result = output

    # 3. Handle Case: Question was NOT streamed (e.g. pulled from bank/cache)
    if not full_response_text and final_result:
        history = final_result.get("chat_history", [])
        if history and len(history) > 0:
            last_msg = history[-1]
            if last_msg.get("role") in ["ai", "model"]:
                cached_q = last_msg.get("content", "")
                if cached_q:
                    full_response_text = cached_q
                    # Stream the cached question for frontend display
                    yield f"data: {json.dumps({'type': 't', 'c': cached_q})}\n\n"
                    buffer = cached_q

    # Process remaining buffer for TTS
    if buffer.strip():
        # If there's still something in the buffer, split and send
        parts = sentence_pattern.split(buffer)
        for sentence in parts:
            s_text = sentence.strip()
            if s_text and len(s_text) > 1:
                tts_sentences.append(s_text)

    # Send metadata at the very end
    if final_result:
        if db and current_user:
            try:
                _sync_interview_state_from_graph(
                    db,
                    interview_id,
                    current_user,
                    final_result,
                    answered_question=answered_question,
                    user_message=user_message,
                )
            except Exception as e:
                db.rollback()
                print(f"Warning: failed to persist interview stream state: {e}")

        payload = {
            "type": "m", # metadata
            "tip": final_result.get("current_tip"),
            "phase": final_result.get("current_phase"),
            "evaluations": final_result.get("evaluations", [])[-1:] if final_result.get("evaluations") else [],
            "should_end": final_result.get("current_phase") == "Closing"
        }
        yield f"data: {json.dumps(payload)}\n\n"

    tts_character = character_from_phase(final_result.get("current_phase") if final_result else None)
    for sentence in tts_sentences:
        audio_b64 = await generate_speech_base64_async(sentence, character=tts_character)
        if audio_b64:
            yield f"data: {json.dumps({'type': 'a', 'c': audio_b64, 'mime_type': WAV_MIME_TYPE, 'character': tts_character})}\n\n"
    
    yield "data: [DONE]\n\n"

@router.post("/start")
async def start_interview(session_id: int, db: SessionDep, current_user: CurrentUser):
    log_func("start_interview")
    interview = db.query(Interview).filter(Interview.id == session_id, Interview.user_id == current_user.id).first()
    if not interview: raise HTTPException(status_code=404, detail="Session not found")

    return StreamingResponse(
        start_flow(interview, db, current_user),
        media_type="text/event-stream"
    )

async def _chat_logic(session_id: int, message: str, db: SessionDep, current_user: CurrentUser):
    log_func("_chat_logic", level=2)
    interview = db.query(Interview).filter(Interview.id == session_id, Interview.user_id == current_user.id).first()
    if not interview: raise HTTPException(status_code=404, detail="Session not found")

    return StreamingResponse(
        handle_answer_flow(interview, message, db, current_user),
        media_type="text/event-stream"
    )

@router.post("/chat")
async def chat_interview(req: ChatReq, db: SessionDep, current_user: CurrentUser):
    log_func("chat_interview")
    if not req.message: raise HTTPException(status_code=400, detail="Empty message")
    return await _chat_logic(int(req.session_id), req.message, db, current_user)

@router.post("/transcribe-and-chat")
async def transcribe_and_chat(
    session_id: int,
    file: UploadFile = File(...),
    db: SessionDep = None,
    current_user: CurrentUser = None
):
    log_func("transcribe_and_chat")
    try:
        text = await _transcribe_logic(file)
        if not text: raise HTTPException(status_code=400, detail="Could not transcribe audio")
        trace_event(session_id, "stt.transcribe_and_chat", {
            "user_id": current_user.id if current_user else None,
            "filename": file.filename,
            "transcript": text,
        })
        return await _chat_logic(session_id, text, db, current_user)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/end")
async def end_interview(req: ChatReq, db: SessionDep, current_user: CurrentUser):
    log_func("end_interview")
    try:
        session_id = int(req.session_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid session_id")

    target_interview = db.query(Interview).filter(
        Interview.id == session_id,
        Interview.user_id == current_user.id,
    ).first()
    if not target_interview:
        raise HTTPException(status_code=404, detail="Session not found")

    trace_event(target_interview.id, "interview.end_requested", {
        "user_id": current_user.id,
        "request_history_count": len(req.history),
        "request_evaluations_count": len(req.evaluations),
        "status_before": target_interview.status,
    })

    await wait_for_pending_evaluations(target_interview.id)
    db.refresh(target_interview)
    fill_missing_evaluations(db, target_interview)

    request_history = [{"role": m.role, "content": m.content} for m in req.history]
    persisted_history = _normalize_transcript(target_interview.transcript)
    history = request_history or persisted_history

    request_evaluations = [item for item in req.evaluations if isinstance(item, dict)]
    persisted_evaluations = target_interview.evaluations if isinstance(target_interview.evaluations, list) else []
    persisted_evaluations = [item for item in persisted_evaluations if isinstance(item, dict)]
    evaluations = persisted_evaluations if len(persisted_evaluations) >= len(request_evaluations) else request_evaluations

    # Generate feedback report, but never block completing the session.
    try:
        report_req = type('Mock', (), {
            "chat_history": history,
            "evaluations": evaluations,
            "language": req.language,
        })
        trace_event(target_interview.id, "report.prompt", {
            "history": history,
            "evaluations": evaluations,
            "language": req.language,
        })
        feedback_text = await generate_report_logic(report_req)
        trace_event(target_interview.id, "report.result", {
            "feedback": feedback_text,
        })
    except Exception as e:
        print(f"Warning: report generation failed: {e}")
        trace_event(target_interview.id, "report.failed_fallback", {"error": str(e)})
        feedback_text = (
            "Buổi phỏng vấn đã hoàn thành. Báo cáo chi tiết tạm thời không khả dụng — vui lòng thử lại sau."
            if req.language == "vi"
            else "Interview completed. Detailed feedback is temporarily unavailable — please try again later."
        )

    target_interview.transcript = history
    target_interview.evaluations = evaluations
    target_interview.final_report = feedback_text
    target_interview.status = "completed"
    target_interview.ended_at = _utcnow()
    current_user.last_activity_at = _utcnow()

    existing_turn_count = db.query(InterviewTurn).filter(InterviewTurn.interview_id == target_interview.id).count()
    if history and existing_turn_count == 0:
        _replace_turns_from_history(db, target_interview, current_user.id, history, evaluations)

    db.commit()

    # TTS for feedback — skip silently if unavailable
    try:
        audio_base64 = await generate_speech_base64_async(
            feedback_text,
            trace_context={
                "session_id": target_interview.id,
                "event": "tts.final_report_audio",
                "character": "Ms. Linh",
            },
        )
    except Exception as e:
        print(f"Warning: TTS generation failed: {e}")
        trace_event(target_interview.id, "tts.final_report_failed", {"error": str(e)})
        audio_base64 = None

    trace_event(target_interview.id, "interview.end_completed", {
        "status": target_interview.status,
        "history_count": len(history),
        "evaluations_count": len(evaluations),
        "has_audio": bool(audio_base64),
    })

    return {"feedback": feedback_text, "audio_base64": audio_base64}
