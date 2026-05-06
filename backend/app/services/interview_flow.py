import asyncio
import datetime
import json
import random
import re
import unicodedata
from typing import Any, AsyncGenerator

from sqlalchemy import or_

from app.core.config import async_client, generate_speech_base64_async
from app.core.database import SessionLocal
from app.models.models import Interview, InterviewTurn, User, QuestionBank
from app.services.evaluator import DEFAULT_SCORES, DEFAULT_STAR, evaluate_star_logic
from app.services.tts_service import WAV_MIME_TYPE, character_from_phase
from app.services.trace_logger import trace_event
from app.core.logger import log_func

FLOW_VERSION = 2
MAX_RETRIES = 3
CANDIDATE_QA_LIMIT = 3
PLANNER_TASKS: dict[int, asyncio.Task] = {}
STAR_TASKS: dict[int, set[asyncio.Task]] = {}

WARMUP_QUESTIONS = {
    "vi": [
        {
            "id": "warmup-1",
            "question": "Chào bạn, mình là Ms Linh. Bạn đã sẵn sàng bắt đầu buổi phỏng vấn chưa?",
            "tip": "Bạn chỉ cần trả lời ngắn để làm quen với phòng phỏng vấn.",
            "phase": "Warm-up",
            "persona": "Ms. Linh",
        },
        {
            "id": "warmup-2",
            "question": "Hôm nay tâm trạng của bạn thế nào? Nếu muốn, bạn có thể nói mình cần hỏi chậm hơn hoặc nhắc lại câu hỏi.",
            "tip": "Chia sẻ ngắn về trạng thái của bạn để trải nghiệm phỏng vấn tự nhiên hơn.",
            "phase": "Warm-up",
            "persona": "Ms. Linh",
        },
    ],
    "en": [
        {
            "id": "warmup-1",
            "question": "Hi, I am Ms. Linh. Are you ready to begin the interview?",
            "tip": "Answer briefly so you can get familiar with the room.",
            "phase": "Warm-up",
            "persona": "Ms. Linh",
        },
        {
            "id": "warmup-2",
            "question": "How are you feeling today?",
            "tip": "Share how you want the interview experience to be adjusted.",
            "phase": "Warm-up",
            "persona": "Ms. Linh",
        },
    ],
}

BRIDGE_QUESTION = {
    "vi": {
        "id": "warmup-bridge",
        "question": "Trong lúc hệ thống hoàn tất kế hoạch câu hỏi, bạn hãy chia sẻ ngắn gọn về mục tiêu nghề nghiệp gần nhất của mình.",
        "tip": "Nói về vai trò bạn đang hướng tới và lý do bạn quan tâm.",
        "phase": "Warm-up",
        "persona": "Mr. Hung",
    },
    "en": {
        "id": "warmup-bridge",
        "question": "While the system finishes your interview plan, briefly share your nearest career goal.",
        "tip": "Mention the role you are targeting and why it matters to you.",
        "phase": "Warm-up",
        "persona": "Mr. Hung",
    },
}

def _fetch_bank_questions(db, skills: list[str], language: str) -> list[dict[str, Any]]:
    log_func("_fetch_bank_questions", level=2)
    """Lấy câu hỏi từ QuestionBank dựa trên kỹ năng đã khớp."""
    if not skills:
        return []
    
    try:
        all_qs = db.query(QuestionBank).filter(QuestionBank.language == language).all()
        matched = []
        for q in all_qs:
            q_skills = q.skills if isinstance(q.skills, list) else []
            if any(s in skills for s in q_skills):
                matched.append({
                    "id": f"bank-{q.id}",
                    "question": q.question,
                    "tip": q.tip or "Dựa trên kỹ năng chuyên môn của bạn.",
                    "intent": q.intent,
                    "phase": "Technical Assessment",
                    "persona": q.persona or "Ms. Linh",
                    "evaluation_type": q.evaluation_type or "technical",
                    "model_answer": "", # Placeholder
                })
        
        random.shuffle(matched)
        return matched[:3]
    except Exception as e:
        print(f"Error fetching bank questions: {e}")
        return []

def create_initial_flow_state(language: str, max_questions: int) -> dict[str, Any]:
    log_func("create_initial_flow_state")
    return {
        "version": FLOW_VERSION,
        "question_plan_status": "pending",
        "question_plan": [],
        "bank_questions": [],
        "bank_index": 0,
        "main_index": 0,
        "warmup_index": 0,
        "bridge_used": False,
        "active_question": None,
        "active_question_attempt": 0,
        "active_question_type": None,
        "answer_gate_results": [],
        "evaluation_jobs": [],
        "candidate_qa_status": "not_started",
        "candidate_qa_turn_count": 0,
        "candidate_qa_history": [],
        "max_question_count": max_questions or 5,
        "last_gate_reason": "",
        "last_gate_pass": None,
        "hybrid_interleave_mode": True,
    }

def get_flow_state(interview: Interview) -> dict[str, Any]:
    log_func("get_flow_state")
    if isinstance(interview.pending_questions, dict) and interview.pending_questions.get("version") == FLOW_VERSION:
        state = dict(interview.pending_questions)
    else:
        state = create_initial_flow_state(interview.language or "vi", interview.question_count or 5)
    legacy_questions = interview.predicted_questions if isinstance(interview.predicted_questions, list) else []
    if state.get("question_plan_status") == "pending" and legacy_questions:
        state["question_plan_status"] = "ready"
        state["question_plan"] = [
            _normalize_plan_item({"question": q}, idx + 1, interview.interview_type or "Behavioral")
            for idx, q in enumerate(legacy_questions)
        ]
    state["max_question_count"] = interview.question_count or state.get("max_question_count") or 5
    state.setdefault("candidate_qa_status", "not_started")
    state.setdefault("candidate_qa_turn_count", 0)
    state.setdefault("candidate_qa_history", [])
    return state

def ensure_planner_started(interview_id: int) -> None:
    log_func("ensure_planner_started")
    task = PLANNER_TASKS.get(interview_id)
    if task and not task.done():
        return
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        trace_event(interview_id, "planner.start_failed", {"reason": "no_running_event_loop"})
        return
    trace_event(interview_id, "planner.start_background_task", {})
    PLANNER_TASKS[interview_id] = loop.create_task(_planner_job(interview_id))

async def start_flow(
    interview: Interview,
    db,
    current_user: User,
) -> AsyncGenerator[str, None]:
    log_func("start_flow")
    state = get_flow_state(interview)
    
    if not state.get("bank_questions") and interview.matched_skills:
        bank_qs = _fetch_bank_questions(db, interview.matched_skills, interview.language or "vi")
        if bank_qs:
            state["bank_questions"] = bank_qs
            interview.pending_questions = state
            db.commit()

    if state.get("question_plan_status") == "pending":
        ensure_planner_started(interview.id)

    # 1. If already in progress, handle resumption
    last_message = _last_transcript_message(interview)
    if interview.status == "in_progress":
        # If there's an active question that hasn't been answered, resend it
        if _is_unanswered_ai_message(last_message) or not last_message:
            item = dict(state.get("active_question") or _fallback_active_question(interview))
            item["question_type"] = state.get("active_question_type") or item.get("question_type", "main")
            item = _localize_item_for_language(item, interview.language or "vi")
            state["active_question"] = item
            interview.pending_questions = state
            current_user.last_activity_at = _utcnow()
            db.commit()
            trace_event(interview.id, "interview.start_resend_active_question", {
                "question": item,
                "state": _state_snapshot(state),
            })
            yield _metadata_event(interview, state, item)
            async for event in _stream_question_audio(item, interview.id, include_audio=False):
                yield event
            return

    # 2. Transition from setup to in_progress (First Start)
    if interview.status == "setup":
        interview.status = "in_progress"
        item, state = _select_next_question(interview, state)
        _persist_ai_question(interview, item, state)
        current_user.last_activity_at = _utcnow()
        db.commit()
        if state.get("question_plan_status") == "pending":
            ensure_planner_started(interview.id)
        trace_event(interview.id, "interview.start_question", {
            "question": item,
            "state": _state_snapshot(state),
        })
        yield _metadata_event(interview, state, item)
        async for event in _stream_question_audio(item, interview.id):
            yield event
    else:
        # Already completed or other status
        yield _metadata_event(interview, state, {"phase": "Closing"})
        yield "data: [DONE]\n\n"

async def handle_answer_flow(
    interview: Interview,
    message: str,
    db,
    current_user: User,
) -> AsyncGenerator[str, None]:
    log_func("handle_answer_flow")
    state = get_flow_state(interview)
    active = state.get("active_question") or _fallback_active_question(interview)
    active = _localize_item_for_language(active, interview.language or "vi")
    state["active_question"] = active
    question_type = state.get("active_question_type") or active.get("question_type") or "main"
    trace_event(interview.id, "candidate.answer_received", {
        "question_type": question_type,
        "active_question": active,
        "answer": message,
        "state": _state_snapshot(state),
    })

    _append_transcript(interview, {"role": "user", "content": message})
    turn = _persist_user_turn(interview, current_user.id, active, message, question_type, state)

    gate_result: dict[str, Any] | None = None
    if question_type == "main":
        state["active_question_answer_context"] = [*state.get("active_question_answer_context", []), message]
        gate_result = await evaluate_answer_gate(interview, active, message, state)
        trace_event(interview.id, "answer_gate.result", {
            "active_question": active,
            "answer": message,
            "answer_context": state.get("active_question_answer_context", []),
            "result": gate_result,
        })
        state["answer_gate_results"] = [*state.get("answer_gate_results", []), gate_result]
        state["last_gate_reason"] = gate_result.get("reason", "")
        state["last_gate_pass"] = bool(gate_result.get("pass"))
        turn.audio_meta = {
            **(turn.audio_meta or {}),
            "gate": gate_result,
            "evaluation_status": "pending",
        }
        db.flush()
        if gate_result.get("should_score_star", True):
            _schedule_star_evaluation(interview.id, turn.id, active, message)
        else:
            turn.evaluation = _light_interaction_evaluation(gate_result, message, interview.language or "vi")
            turn.audio_meta = {
                **(turn.audio_meta or {}),
                "evaluation_status": "ready",
            }
            evaluations = interview.evaluations if isinstance(interview.evaluations, list) else []
            interview.evaluations = [*evaluations, turn.evaluation]

        if not gate_result.get("pass"):
            retry_count = int(state.get("active_question_attempt", 0)) + 1
            state["active_question_attempt"] = retry_count
            max_retries = _max_retries_for_question(active, gate_result)
            if retry_count <= max_retries:
                retry_item = _retry_question(active, gate_result, retry_count, interview.language or "vi")
                _persist_ai_question(interview, retry_item, state)
                current_user.last_activity_at = _utcnow()
                db.commit()
                trace_event(interview.id, "interview.retry_question", {
                    "retry_count": retry_count,
                    "max_retries": max_retries,
                    "retry_question": retry_item,
                    "gate_result": gate_result,
                    "state": _state_snapshot(state),
                })
                yield _metadata_event(interview, state, retry_item, gate_result=gate_result, evaluation_status="pending")
                async for event in _stream_question_audio(retry_item, interview.id):
                    yield event
                return
            turn.audio_meta = {
                **(turn.audio_meta or {}),
                "skipped_after_retries": True,
                "evaluation_status": "pending",
            }
    elif question_type == "candidate_qa":
        qa_result = await handle_candidate_qa(interview, message, state)
        turn.evaluation = qa_result["evaluation"]
        turn.audio_meta = {
            **(turn.audio_meta or {}),
            "evaluation_status": "ready",
            "question_type": "candidate_qa",
            "candidate_qa_intent": qa_result["intent"],
        }
        evaluations = interview.evaluations if isinstance(interview.evaluations, list) else []
        interview.evaluations = [*evaluations, qa_result["evaluation"]]
        next_item = qa_result["next_item"]
        _persist_ai_question(interview, next_item, state)
        current_user.last_activity_at = _utcnow()
        db.commit()
        trace_event(interview.id, "candidate_qa.next", {
            "intent": qa_result["intent"],
            "question": message,
            "next_item": next_item,
            "state": _state_snapshot(state),
        })
        yield _metadata_event(
            interview,
            state,
            next_item,
            evaluations=[turn.evaluation],
            evaluation_status="ready",
        )
        async for event in _stream_question_audio(next_item, interview.id):
            yield event
        return
    else:
        warmup_eval = _warmup_evaluation(message, interview.language or "vi")
        trace_event(interview.id, "warmup.light_evaluation", {
            "active_question": active,
            "answer": message,
            "evaluation": warmup_eval,
        })
        turn.evaluation = warmup_eval
        turn.audio_meta = {
            **(turn.audio_meta or {}),
            "evaluation_status": "ready",
        }
        evaluations = interview.evaluations if isinstance(interview.evaluations, list) else []
        interview.evaluations = [*evaluations, warmup_eval]

    next_item, state = _select_next_question(interview, state)
    _persist_ai_question(interview, next_item, state)
    current_user.last_activity_at = _utcnow()
    db.commit()
    if state.get("question_plan_status") == "pending":
        ensure_planner_started(interview.id)
    trace_event(interview.id, "interview.next_question", {
        "question": next_item,
        "gate_result": gate_result,
        "state": _state_snapshot(state),
    })
    yield _metadata_event(
        interview,
        state,
        next_item,
        gate_result=gate_result,
        evaluations=[turn.evaluation] if turn.evaluation else [],
        evaluation_status="ready" if turn.evaluation else ("pending" if question_type == "main" else "ready"),
    )
    async for event in _stream_question_audio(next_item, interview.id):
        yield event

async def handle_candidate_qa(interview: Interview, message: str, state: dict[str, Any]) -> dict[str, Any]:
    log_func("handle_candidate_qa")
    language = interview.language or "vi"
    intent = _candidate_qa_intent(message)
    state["candidate_qa_status"] = "asking"

    if intent == "no_more":
        state["candidate_qa_status"] = "done"
        evaluation = _candidate_qa_evaluation(message, language, intent=intent)
        closing = _closing_item(language)
        item, _ = _activate_question(state, closing, "warmup")
        trace_event(interview.id, "candidate_qa.no_more", {
            "message": message,
            "state": _state_snapshot(state),
        })
        return {"intent": intent, "evaluation": evaluation, "next_item": item}

    if intent == "unclear":
        evaluation = _candidate_qa_evaluation(message, language, intent=intent)
        item = _candidate_qa_prompt_item(
            "Ý bạn là bạn không còn câu hỏi, hay bạn muốn hỏi thêm về công ty hoặc vị trí ứng tuyển?"
            if language == "vi"
            else "Do you mean you have no more questions, or would you like to ask more about the company or role?",
            language,
            "candidate-qa-clarify",
        )
        item, _ = _activate_question(state, item, "candidate_qa")
        trace_event(interview.id, "candidate_qa.unclear", {
            "message": message,
            "state": _state_snapshot(state),
        })
        return {"intent": intent, "evaluation": evaluation, "next_item": item}

    turn_count = int(state.get("candidate_qa_turn_count", 0)) + 1
    state["candidate_qa_turn_count"] = turn_count
    state["candidate_qa_status"] = "answering"
    responder = await generate_candidate_qa_response(interview, message, state, turn_count)
    history = state.get("candidate_qa_history") if isinstance(state.get("candidate_qa_history"), list) else []
    history_item = {
        "user_questions": message,
        "ai_answer": responder.get("answer", ""),
        "sources_used": responder.get("sources_used", []),
        "unresolved_questions": responder.get("unresolved_questions", []),
    }
    state["candidate_qa_history"] = [*history, history_item]
    evaluation = _candidate_qa_evaluation(message, language, intent=intent, responder=responder)

    should_close = bool(responder.get("should_close")) or turn_count >= CANDIDATE_QA_LIMIT
    if should_close:
        state["candidate_qa_status"] = "done"
        close_text = (
            f"{responder.get('answer', '').strip()}\n\n"
            "Cảm ơn bạn đã đặt câu hỏi. Vì phần hỏi đáp đã đủ, chúng ta sẽ kết thúc buổi phỏng vấn và mình sẽ tổng hợp nhận xét cho bạn."
            if language == "vi"
            else f"{responder.get('answer', '').strip()}\n\nThank you for your questions. We will now wrap up the interview and prepare your feedback."
        ).strip()
        item, _ = _activate_question(state, {**_closing_item(language), "question": close_text}, "warmup")
    else:
        state["candidate_qa_status"] = "asking"
        answer = responder.get("answer", "").strip()
        followup = responder.get("followup_prompt") or (
            "Bạn còn câu hỏi nào khác không?" if language == "vi" else "Do you have any other questions?"
        )
        item = _candidate_qa_prompt_item(f"{answer}\n\n{followup}".strip(), language, f"candidate-qa-{turn_count}")
        item, _ = _activate_question(state, item, "candidate_qa")

    trace_event(interview.id, "candidate_qa.responder_result", {
        "turn_count": turn_count,
        "candidate_questions": message,
        "result": responder,
        "next_item": item,
        "state": _state_snapshot(state),
    })
    return {"intent": intent, "evaluation": evaluation, "next_item": item}

async def wait_for_pending_evaluations(interview_id: int, timeout: float = 2.5) -> None:
    log_func("wait_for_pending_evaluations")
    pending = [task for task in STAR_TASKS.get(interview_id, set()) if not task.done()]
    if pending:
        trace_event(interview_id, "star.wait_pending", {"pending_count": len(pending), "timeout_seconds": timeout})
        await asyncio.wait(pending, timeout=timeout)

def fill_missing_evaluations(db, interview: Interview) -> None:
    log_func("fill_missing_evaluations")
    evaluations = interview.evaluations if isinstance(interview.evaluations, list) else []
    changed = False
    turns = (
        db.query(InterviewTurn)
        .filter(InterviewTurn.interview_id == interview.id)
        .order_by(InterviewTurn.turn_order.asc())
        .all()
    )
    for turn in turns:
        meta = turn.audio_meta if isinstance(turn.audio_meta, dict) else {}
        if turn.evaluation or meta.get("question_type") != "main":
            continue
        fallback = {
            "scores": DEFAULT_SCORES.copy(),
            "starAnalysis": DEFAULT_STAR.copy(),
            "feedback": "Evaluation was still processing when the session ended; this fallback score should be refreshed later.",
            "betterVersion": "",
            "questionType": "main",
            "status": "fallback",
        }
        turn.evaluation = fallback
        turn.audio_meta = {**meta, "evaluation_status": "fallback"}
        evaluations.append(fallback)
        changed = True
        trace_event(interview.id, "star.fallback_evaluation", {
            "turn_id": turn.id,
            "question": turn.question,
            "answer": turn.answer,
            "evaluation": fallback,
        })
    if changed:
        interview.evaluations = evaluations

def refresh_flow_state_for_interview(interview: Interview) -> dict[str, Any]:
    log_func("refresh_flow_state_for_interview")
    return get_flow_state(interview)

async def _planner_job(interview_id: int) -> None:
    log_func("_planner_job", level=2)
    db = SessionLocal()
    try:
        interview = db.query(Interview).filter(Interview.id == interview_id).first()
        if not interview:
            trace_event(interview_id, "planner.session_missing", {})
            return
        state = get_flow_state(interview)
        if state.get("question_plan_status") == "ready":
            trace_event(interview_id, "planner.already_ready", {"state": _state_snapshot(state)})
            return
        try:
            plan = await generate_question_plan(interview)
            state["question_plan_status"] = "ready"
            trace_event(interview_id, "planner.ready", {"question_plan": plan})
        except Exception as exc:
            print(f"Question planner failed: {exc}")
            plan = fallback_question_plan(interview.language or "vi", interview.interview_type or "Behavioral")
            state["question_plan_status"] = "failed"
            trace_event(interview_id, "planner.failed_fallback", {
                "error": str(exc),
                "fallback_plan": plan,
            })
        state["question_plan"] = plan[: interview.question_count or 5]
        interview.predicted_questions = [item["question"] for item in state["question_plan"]]
        interview.pending_questions = state
        db.commit()
    finally:
        db.close()

async def generate_question_plan(interview: Interview) -> list[dict[str, Any]]:
    log_func("generate_question_plan")
    db = SessionLocal()
    rich_summary = ""
    try:
        if interview.resume_upload_id:
            from app.models.models import ResumeUpload
            resume = db.query(ResumeUpload).filter(ResumeUpload.id == interview.resume_upload_id).first()
            if resume and resume.rich_summary:
                rich_summary = resume.rich_summary
    finally:
        db.close()

    language = interview.language or "vi"
    interview_type = interview.interview_type or "Behavioral"
    lang_instruction = "Vietnamese" if language == "vi" else "English"
    count = interview.question_count or 5
    cv_context = rich_summary if rich_summary else (interview.cv_text or "")[:6000]
    cleaned_jd = _summarize_jd_simple(interview.jd_text or "")

    system_prompt = f"""You are the Question Planner AI for a realistic interview.
Create a structured interview plan in {lang_instruction}.
Return ONLY JSON with key "questions".
Each item must include: question, intent, expected_signals, model_answer, tip, phase, persona, evaluation_type.
Planning policy:
- Anchor questions to the candidate's specific projects, skills, and the job requirements.
- Use the provided 'CV Profile' which summarizes the candidate's portrait for faster planning.
- Propose deep-dive questions for projects mentioned in the 'CV Profile'.
- Ensure questions are directly relevant to the selected Job Description (JD)."""

    user_prompt = {
        "interview_type": interview_type,
        "question_count": count,
        "cv_profile": cv_context,
        "selected_job_jd": cleaned_jd,
        "question_quality_requirements": [
            "Probe candidate's role, technical choices, tradeoffs, metrics, and impact in the projects listed in CV Profile.",
            "If CV mentions specific tech stacks like Python, FastAPI, Django, Docker, AI, deep-dive into those.",
            "Connect candidate's past experience directly with the JD requirements."
        ],
        "phases": [
            "CV Deep-dive",
            "Job-fit Assessment",
            "Behavioral",
            "Technical" if interview_type == "Technical" else "Motivation",
            "Candidate Questions",
        ],
    }
    trace_event(interview.id, "planner.prompt", {
        "model": "gpt-4o-mini",
        "temperature": 0.45,
        "system_prompt": system_prompt,
        "user_prompt": user_prompt,
    })
    response = await async_client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0.45,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps(user_prompt, ensure_ascii=False)},
        ],
    )
    raw_content = response.choices[0].message.content or "{}"
    trace_event(interview.id, "planner.raw_response", {
        "model": "gpt-4o-mini",
        "content": raw_content,
    })
    payload = json.loads(raw_content)
    questions = payload.get("questions")
    if not isinstance(questions, list):
        raise ValueError("Planner returned invalid questions")
    normalized = [
        _normalize_plan_item(item, idx + 1, interview_type)
        for idx, item in enumerate(questions)
        if isinstance(item, dict)
    ]
    normalized = [item for item in normalized if item.get("question")]
    if not normalized:
        raise ValueError("Planner returned no valid questions")
    return normalized[:count]

def _summarize_jd_simple(jd_text: str) -> str:
    log_func("_summarize_jd_simple", level=2)
    if not jd_text:
        return ""
    if len(jd_text) < 1200:
        return jd_text
    lines = jd_text.split('\n')
    important_sections = []
    keep_keywords = [
        "yêu cầu", "kỹ năng", "trách nhiệm", "mô tả", "công việc", "tech stack", 
        "technology", "experience", "kinh nghiệm", "requirement", "responsibility",
        "must have", "nice to have", "competency", "qualifications"
    ]
    skip_keywords = [
        "về chúng tôi", "giới thiệu công ty", "quy trình", "liên hệ", "apply", "ứng tuyển",
        "hồ sơ", "vòng phỏng vấn", "about us", "company profile", "how to apply",
        "benefits", "phúc lợi", "chế độ", "thời gian làm việc", "văn phòng", "location"
    ]
    current_section_is_important = True
    for line in lines:
        clean_line = line.strip().lower()
        if not clean_line or len(clean_line) < 2:
            continue
        is_header = len(clean_line) < 60 and any(k in clean_line for k in keep_keywords + skip_keywords)
        if is_header:
            if any(k in clean_line for k in skip_keywords):
                current_section_is_important = False
            elif any(k in clean_line for k in keep_keywords):
                current_section_is_important = True
        if current_section_is_important:
            important_sections.append(line)
    result = "\n".join(important_sections)
    if len(result) > 2800:
        return result[:2800]
    if len(result) < 300 and len(jd_text) > 500:
        return jd_text[:2000]
    return result

async def generate_candidate_qa_response(
    interview: Interview,
    candidate_questions: str,
    state: dict[str, Any],
    turn_count: int,
) -> dict[str, Any]:
    log_func("generate_candidate_qa_response")
    language = interview.language or "vi"
    lang_instruction = "Vietnamese" if language == "vi" else "English"
    transcript = interview.transcript if isinstance(interview.transcript, list) else []
    recent_context = [
        {
            "role": item.get("role"),
            "content": item.get("content"),
            "phase": item.get("phase"),
        }
        for item in transcript[-12:]
        if isinstance(item, dict)
    ]
    system_prompt = f"""You are the Candidate Q&A Responder at the end of a mock interview.
Answer the candidate's questions in {lang_instruction}.
Scope and safety:
- Prefer facts from the JD and current interview/session context.
- If the JD/session does not contain official information, say clearly that you do not have enough official information, then provide generic interview guidance as reference.
- Do not invent salary, benefits, process steps, deadlines, headcount, company policy, or project facts.
- If the candidate asks several questions, answer each briefly in numbered bullets.
- If the candidate asks about salary, do not confirm an amount; suggest asking HR about range, level, benefits, and review cycle.
- Keep the interviewer role. Do not score the candidate while answering.
Return ONLY JSON with keys: answer, answered_questions, unresolved_questions, sources_used, followup_prompt, should_close."""
    user_prompt = {
        "candidate_questions": candidate_questions,
        "language": lang_instruction,
        "jd_text": (interview.jd_text or "")[:5000],
        "cv_text": (interview.cv_text or "")[:3000],
        "interview_type": interview.interview_type or "",
        "interview_context": recent_context,
        "candidate_qa_turn_count": turn_count,
        "candidate_qa_limit": CANDIDATE_QA_LIMIT,
        "candidate_qa_history": state.get("candidate_qa_history", []),
        "default_followup_prompt": "Bạn còn câu hỏi nào khác không?" if language == "vi" else "Do you have any other questions?",
    }
    trace_event(interview.id, "candidate_qa.prompt", {
        "model": "gpt-4o-mini",
        "temperature": 0.2,
        "system_prompt": system_prompt,
        "user_prompt": user_prompt,
    })
    try:
        response = await async_client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.2,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(user_prompt, ensure_ascii=False)},
            ],
        )
        raw_content = response.choices[0].message.content or "{}"
        trace_event(interview.id, "candidate_qa.raw_response", {
            "model": "gpt-4o-mini",
            "content": raw_content,
        })
        payload = json.loads(raw_content)
        return _normalize_candidate_qa_response(payload, language, turn_count)
    except Exception as exc:
        fallback = _fallback_candidate_qa_response(candidate_questions, language, turn_count, str(exc))
        trace_event(interview.id, "candidate_qa.failed_fallback", {
            "error": str(exc),
            "candidate_questions": candidate_questions,
            "fallback": fallback,
        })
        return fallback

async def evaluate_answer_gate(
    interview: Interview,
    question: dict[str, Any],
    answer: str,
    state: dict[str, Any],
) -> dict[str, Any]:
    log_func("evaluate_answer_gate")
    
    # Temporarily bypass all strict evaluation logic as requested by USER.
    # Always return pass=True to proceed to the next question immediately.
    
    trace_event(interview.id, "answer_gate.bypassed", {
        "question": question,
        "answer": answer,
        "reason": "Evaluation bypassed to focus on flow continuity."
    })
    
    return {
        "pass": True,
        "reason": "Bypassed for flow testing.",
        "retry_prompt": "",
        "confidence": 1.0,
        "attempt_delta": 1,
        "max_retry_recommended": 0,
        "should_score_star": True,
    }

    lang_instruction = "Vietnamese" if interview.language == "vi" else "English"
    prompt = {
        "question": question.get("question", ""),
        "intent": question.get("intent", ""),
        "expected_signals": question.get("expected_signals", []),
        "candidate_answer": answer,
        "attempt": int(state.get("active_question_attempt", 0)) + 1,
        "phase": question.get("phase", ""),
        "retry_policy": {
            "default_max_retry": 1,
            "max_retry_for_core_cv_or_technical": 3,
            "candidate_questions_max_retry": 0,
            "clarification_request_max_retry": 1,
        },
        "answer_context": state.get("active_question_answer_context", [answer]),
        "language": lang_instruction,
    }
    system_prompt = """You are the Answer Gate AI.
Decide whether the candidate answered the current question enough to move on.
Do not evaluate STAR.
Gate policy:
- Pass if the answer is directly relevant enough to continue, even if it is imperfect.
- Do not repeat the original question verbatim. If retrying, ask about the specific missing slot.
- For project/CV answers, reason over these slots: Situation/problem, Task/role, Action/specific work, Result/metrics/impact.
- Recommend 0 retries for low-value or closing questions, 1 retry for most questions, up to 3 only for core CV/project/technical evidence.
- If the candidate asks for clarification, explain the term briefly in retry_prompt and ask a simpler version once.
- If the question is "Do you have any questions for us?", saying no is acceptable; pass it and add a coaching note instead of retrying.
- Do not mix English into Vietnamese output.
Return ONLY JSON:
{"pass": boolean, "reason": "short reason", "retry_prompt": "natural follow-up question", "confidence": 0-1, "attempt_delta": 1, "max_retry_recommended": 0-3, "coaching_note": "", "should_score_star": boolean, "missing_slots": []}"""
    try:
        trace_event(interview.id, "answer_gate.prompt", {
            "model": "gpt-4o-mini",
            "temperature": 0.1,
            "system_prompt": system_prompt,
            "user_prompt": prompt,
        })
        response = await async_client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.1,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(prompt, ensure_ascii=False)},
            ],
        )
        raw_content = response.choices[0].message.content or "{}"
        trace_event(interview.id, "answer_gate.raw_response", {
            "model": "gpt-4o-mini",
            "content": raw_content,
        })
        payload = json.loads(raw_content)
        return _localize_gate_for_language(
            _normalize_gate(payload, question, interview.language or "vi"),
            interview.language or "vi",
        )
    except Exception as exc:
        print(f"Answer gate failed: {exc}")
        result = _heuristic_gate(question, answer, interview.language or "vi")
        trace_event(interview.id, "answer_gate.failed_heuristic", {
            "error": str(exc),
            "question": question,
            "answer": answer,
            "result": result,
        })
        return result

def _select_next_question(interview: Interview, state: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    log_func("_select_next_question", level=2)
    language = interview.language or "vi"
    warmups = WARMUP_QUESTIONS.get(language, WARMUP_QUESTIONS["en"])
    plan = state.get("question_plan") if isinstance(state.get("question_plan"), list) else []
    bank = state.get("bank_questions") if isinstance(state.get("bank_questions"), list) else []
    
    warmup_index = int(state.get("warmup_index", 0))
    main_index = int(state.get("main_index", 0))
    bank_index = int(state.get("bank_index", 0))
    
    plan_ready = bool(plan) and state.get("question_plan_status") == "ready"
    max_count = int(state.get("max_question_count", 5) or 5)

    if warmup_index < len(warmups) and not (plan_ready and warmup_index >= 1):
        item = dict(warmups[warmup_index])
        state["warmup_index"] = warmup_index + 1
        return _activate_question(state, item, "warmup")

    total_asked = main_index + bank_index
    if total_asked < max_count:
        take_from_bank = False
        if bank_index < len(bank):
            if not plan_ready:
                take_from_bank = True
            elif bank_index <= main_index:
                take_from_bank = True
        
        if take_from_bank:
            item = dict(bank[bank_index])
            state["bank_index"] = bank_index + 1
            return _activate_question(state, item, "main")
        
        if plan_ready and main_index < len(plan):
            item = dict(plan[main_index])
            state["main_index"] = main_index + 1
            if _is_candidate_question(item):
                state["candidate_qa_status"] = "asking"
                return _activate_question(state, item, "candidate_qa")
            return _activate_question(state, item, "main")

    if state.get("question_plan_status") == "pending" and not state.get("bridge_used"):
        item = dict(BRIDGE_QUESTION.get(language, BRIDGE_QUESTION["en"]))
        state["bridge_used"] = True
        return _activate_question(state, item, "warmup")

    if not plan and state.get("question_plan_status") == "pending" and not bank:
        state["question_plan_status"] = "failed"
        state["question_plan"] = fallback_question_plan(language, interview.interview_type or "Behavioral")
        return _select_next_question(interview, state)

    if state.get("candidate_qa_status", "not_started") == "not_started":
        state["candidate_qa_status"] = "asking"
        return _activate_question(state, _default_candidate_qa_item(language), "candidate_qa")

    return _activate_question(state, _closing_item(language), "warmup")

def _activate_question(state: dict[str, Any], item: dict[str, Any], question_type: str) -> tuple[dict[str, Any], dict[str, Any]]:
    log_func("_activate_question", level=2)
    item["question_type"] = question_type
    state["active_question"] = item
    state["active_question_type"] = question_type
    state["active_question_attempt"] = 0
    state["active_question_answer_context"] = []
    return item, state

def _default_candidate_qa_item(language: str) -> dict[str, Any]:
    log_func("_default_candidate_qa_item", level=2)
    return _candidate_qa_prompt_item(
        "Bạn có câu hỏi nào cho chúng tôi không?" if language == "vi" else "Do you have any questions for us?",
        language,
        "candidate-qa-start",
    )

def _candidate_qa_prompt_item(question: str, language: str, item_id: str) -> dict[str, Any]:
    log_func("_candidate_qa_prompt_item", level=2)
    return {
        "id": item_id,
        "question": question,
        "tip": (
            "Bạn có thể hỏi về dự án, đội nhóm, quy trình làm việc, cơ hội phát triển hoặc kỳ vọng của vị trí."
            if language == "vi"
            else "You can ask about projects, team, workflow, growth opportunities, or role expectations."
        ),
        "phase": "Candidate Questions",
        "persona": "Ms. Linh",
        "evaluation_type": "candidate_question",
    }

def _closing_item(language: str) -> dict[str, Any]:
    log_func("_closing_item", level=2)
    return {
        "id": "closing",
        "question": (
            "Cảm ơn bạn. Chúng ta sẽ kết thúc buổi phỏng vấn và mình sẽ tổng hợp nhận xét cho bạn."
            if language == "vi"
            else "Thank you. We will wrap up the interview and prepare your feedback."
        ),
        "tip": "",
        "phase": "Closing",
        "persona": "Ms. Linh",
    }

def _localize_item_for_language(item: dict[str, Any], language: str) -> dict[str, Any]:
    if language != "vi":
        return item
    localized = dict(item)
    localized["question"] = _localize_text_for_language(str(localized.get("question", "")), language)
    localized["tip"] = _localize_text_for_language(str(localized.get("tip", "")), language)
    return localized

def _localize_gate_for_language(gate: dict[str, Any], language: str) -> dict[str, Any]:
    if language != "vi":
        return gate
    localized = dict(gate)
    localized["reason"] = _localize_text_for_language(str(localized.get("reason", "")), language)
    localized["retry_prompt"] = _localize_text_for_language(str(localized.get("retry_prompt", "")), language)
    localized["coaching_note"] = _localize_text_for_language(str(localized.get("coaching_note", "")), language)
    return localized

def _localize_text_for_language(text: str, language: str) -> str:
    if language != "vi" or not text:
        return text

    canonical_questions = {
        _strip_accents("Chao ban, minh la Ms. Linh. Ban da san sang bat dau buoi phong van chua?"):
            WARMUP_QUESTIONS["vi"][0]["question"],
        _strip_accents("Chào bạn, mình là Ms. Linh. Bạn đã sẵn sàng bắt đầu buổi phỏng vấn chưa?"):
            WARMUP_QUESTIONS["vi"][0]["question"],
        _strip_accents("Hom nay tam trang cua ban the nao?"):
            WARMUP_QUESTIONS["vi"][1]["question"],
        _strip_accents("Trong luc he thong hoan tat ke hoach cau hoi, ban hay chia se ngan gon ve muc tieu nghe nghiep gan nhat cua minh."):
            BRIDGE_QUESTION["vi"]["question"],
        _strip_accents("Cam on ban. Chung ta se ket thuc buoi phong van va minh se tong hop nhan xet cho ban."):
            "Cảm ơn bạn. Chúng ta sẽ kết thúc buổi phỏng vấn và mình sẽ tổng hợp nhận xét cho bạn.",
    }
    canonical = canonical_questions.get(_strip_accents(text))
    if canonical:
        return canonical

    replacements = {
        "Minh muon lam ro them mot chut.": "Mình muốn làm rõ thêm một chút.",
        "Answer is too short.": "Câu trả lời quá ngắn để đánh giá trọng tâm.",
        "Answer is too short": "Câu trả lời quá ngắn để đánh giá trọng tâm",
        "Ban co the tra loi truc tiep hon vao cau hoi nay:": "Bạn có thể trả lời trực tiếp hơn vào câu hỏi này:",
        "Tra loi ngan gon de lam quen voi phong phong van.": "Bạn chỉ cần trả lời ngắn để làm quen với phòng phỏng vấn.",
        "Chia se cach ban muon dieu chinh trai nghiem phong van.": "Chia sẻ ngắn về trạng thái của bạn để trải nghiệm phỏng vấn tự nhiên hơn.",
        "Noi ve vai tro ban dang huong toi va ly do ban quan tam.": "Nói về vai trò bạn đang hướng tới và lý do bạn quan tâm.",
        "Answer accepted.": "Câu trả lời được chấp nhận.",
        "Answer needs clarification.": "Câu trả lời cần làm rõ thêm.",
        "Answer is relevant enough to continue.": "Câu trả lời đủ liên quan để tiếp tục.",
        "Answer is still missing direct evidence for the question.": "Câu trả lời vẫn thiếu dẫn chứng trực tiếp cho câu hỏi.",
    }
    localized = text
    for source, target in replacements.items():
        localized = localized.replace(source, target)
    return localized

def _retry_question(active: dict[str, Any], gate: dict[str, Any], retry_count: int, language: str) -> dict[str, Any]:
    log_func("_retry_question", level=2)
    item = dict(active)
    item["id"] = f"{active.get('id', 'question')}-retry-{retry_count}"
    item["question"] = _localize_text_for_language(gate.get("retry_prompt") or active.get("question", ""), language)
    item["tip"] = _localize_text_for_language(gate.get("reason", ""), language)
    item["question_type"] = "main"
    item["is_retry"] = True
    return item

def _persist_ai_question(interview: Interview, item: dict[str, Any], state: dict[str, Any]) -> None:
    log_func("_persist_ai_question", level=2)
    localized_item = _localize_item_for_language(item, interview.language or "vi")
    item.clear()
    item.update(localized_item)
    state["active_question"] = item
    _append_transcript(interview, {
        "role": "ai",
        "content": item.get("question", ""),
        "tip": item.get("tip", ""),
        "phase": item.get("phase", ""),
        "question_type": item.get("question_type", "main"),
        "attempt": state.get("active_question_attempt", 0),
        "plan_status": state.get("question_plan_status", "pending"),
    })
    interview.pending_questions = state

def _persist_user_turn(
    interview: Interview,
    user_id: int,
    active: dict[str, Any],
    answer: str,
    question_type: str,
    state: dict[str, Any],
) -> InterviewTurn:
    log_func("_persist_user_turn", level=2)
    active = _localize_item_for_language(active, interview.language or "vi")
    existing_count = len(interview.turns or [])
    turn = InterviewTurn(
        interview_id=interview.id,
        user_id=user_id,
        turn_order=existing_count + 1,
        question=active.get("question", ""),
        answer=answer,
        tip=active.get("tip", ""),
        audio_meta={
            "question_id": active.get("id"),
            "question_type": question_type,
            "is_warmup": question_type == "warmup",
            "attempt": state.get("active_question_attempt", 0),
            "plan_status": state.get("question_plan_status", "pending"),
        },
    )
    interview.turns.append(turn)
    return turn

def _append_transcript(interview: Interview, message: dict[str, Any]) -> None:
    transcript = interview.transcript if isinstance(interview.transcript, list) else []
    interview.transcript = [*transcript, message]

def _metadata_event(
    interview: Interview,
    state: dict[str, Any],
    item: dict[str, Any],
    *,
    gate_result: dict[str, Any] | None = None,
    evaluations: list[dict[str, Any]] | None = None,
    evaluation_status: str | None = None,
) -> str:
    log_func("_metadata_event", level=2)
    item = _localize_item_for_language(item, interview.language or "vi")
    if gate_result:
        gate_result = _localize_gate_for_language(gate_result, interview.language or "vi")
    payload = {
        "type": "m",
        "tip": item.get("tip", ""),
        "phase": item.get("phase", ""),
        "question_type": item.get("question_type", state.get("active_question_type", "main")),
        "is_warmup": item.get("question_type") == "warmup",
        "attempt": state.get("active_question_attempt", 0),
        "plan_status": state.get("question_plan_status", "pending"),
        "gate_reason": gate_result.get("reason", "") if gate_result else state.get("last_gate_reason", ""),
        "gate_result": gate_result,
        "evaluations": evaluations or [],
        "evaluation_status": evaluation_status,
        "question_index": state.get("main_index", 0),
        "total_questions": interview.question_count or 5,
        "candidate_qa_turn_count": state.get("candidate_qa_turn_count", 0),
        "candidate_qa_limit": CANDIDATE_QA_LIMIT,
        "candidate_qa_status": state.get("candidate_qa_status", "not_started"),
        "should_end": item.get("phase") == "Closing",
    }
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"

async def _stream_question_audio(
    item: dict[str, Any],
    session_id: int,
    *,
    include_audio: bool = True,
) -> AsyncGenerator[str, None]:
    log_func("_stream_question_audio", level=2)
    question = item.get("question", "")
    if question:
        yield f"data: {json.dumps({'type': 't', 'c': question}, ensure_ascii=False)}\n\n"
    if not include_audio:
        yield "data: [DONE]\n\n"
        return

    character = item.get("persona") or character_from_phase(item.get("phase"))
    tts_text = _text_for_tts(question)
    audio_b64 = await generate_speech_base64_async(
        tts_text,
        character=character,
        trace_context={
            "session_id": session_id,
            "event": "tts.question_audio",
            "question_id": item.get("id"),
            "phase": item.get("phase"),
            "character": character,
            "display_text": question,
        },
    )
    if audio_b64:
        yield f"data: {json.dumps({'type': 'a', 'c': audio_b64, 'mime_type': WAV_MIME_TYPE, 'character': character}, ensure_ascii=False)}\n\n"
    yield "data: [DONE]\n\n"

def _text_for_tts(text: str) -> str:
    replacements = {
        "Ms. Linh": "Linh",
        "Ms Linh": "Linh",
        "Mr. Hung": "Hung",
        "Mr Hung": "Hung",
        "Mr. Tanaka": "Hung",
        "Mr Tanaka": "Hung",
        "Ms. Nguyen": "Nguyen",
        "Ms Nguyen": "Nguyen",
    }
    tts_text = text
    for source, target in replacements.items():
        tts_text = re.sub(rf"\b{re.escape(source)}\b", target, tts_text)
    return tts_text.strip()

def _split_sentences(text: str) -> list[str]:
    protected = text
    replacements = {"Ms.": "Ms<DOT>", "Mr.": "Mr<DOT>", "Dr.": "Dr<DOT>"}
    for source, target in replacements.items():
        protected = protected.replace(source, target)
    parts = re.split(r"(?<=[.!?\n])", protected)
    restored: list[str] = []
    for part in parts:
        sentence = part.strip()
        for source, target in replacements.items():
            sentence = sentence.replace(target, source)
        if sentence:
            restored.append(sentence)
    return restored

def _normalize_plan_item(item: dict[str, Any], index: int, interview_type: str) -> dict[str, Any]:
    log_func("_normalize_plan_item", level=2)
    phase = str(item.get("phase") or interview_type or "Behavioral").strip()
    persona = str(item.get("persona") or character_from_phase(phase)).strip()
    expected = item.get("expected_signals", [])
    if isinstance(expected, str):
        expected = [expected]
    if not isinstance(expected, list):
        expected = []
    return {
        "id": str(item.get("id") or f"q-{index}"),
        "question": _rewrite_question_wording(str(item.get("question", "")).strip()),
        "intent": str(item.get("intent", "")).strip(),
        "expected_signals": [str(signal).strip() for signal in expected if str(signal).strip()],
        "model_answer": str(item.get("model_answer", "")).strip(),
        "tip": str(item.get("tip", "")).strip(),
        "phase": phase,
        "evaluation_type": str(item.get("evaluation_type") or _infer_evaluation_type(phase, str(item.get("question", "")))).strip(),
        "persona": persona if persona in {"Ms. Linh", "Ms. Nguyen", "Mr. Hung"} else character_from_phase(phase),
    }

def _rewrite_question_wording(question: str) -> str:
    log_func("_rewrite_question_wording", level=2)
    text = _strip_accents(question)
    if "nhom da dang" in text:
        return (
            "Bạn đã từng làm việc trong một nhóm có nhiều thành viên khác nhau về chuyên môn, "
            "tính cách, kinh nghiệm hoặc cách làm việc chưa? Bạn đã học được gì từ trải nghiệm đó?"
        )
    return question

def _infer_evaluation_type(phase: str, question: str) -> str:
    log_func("_infer_evaluation_type", level=2)
    text = _strip_accents(f"{phase} {question}")
    if "candidate questions" in text or "co cau hoi nao" in text:
        return "candidate_question"
    if any(marker in text for marker in ("technical", "ky thuat", "model", "computer vision", "api", "database")):
        return "technical"
    if any(marker in text for marker in ("du an", "project", "cv deep", "vai tro", "kinh nghiem")):
        return "project"
    if any(marker in text for marker in ("dong luc", "motivation", "theo duoi")):
        return "motivation"
    return "behavioral"

def _normalize_gate(payload: dict[str, Any], question: dict[str, Any], language: str) -> dict[str, Any]:
    log_func("_normalize_gate", level=2)
    passed = bool(payload.get("pass"))
    reason = str(payload.get("reason", "")).strip()
    retry_prompt = str(payload.get("retry_prompt", "")).strip()
    try:
        confidence = max(0.0, min(1.0, float(payload.get("confidence", 0.5))))
    except (TypeError, ValueError):
        confidence = 0.5
    if not retry_prompt:
        retry_prompt = _retry_prompt(question, reason, language)
    try:
        max_retry_recommended = int(payload.get("max_retry_recommended", 1))
    except (TypeError, ValueError):
        max_retry_recommended = 1
    return {
        "pass": passed,
        "reason": reason or ("Answer accepted." if passed else "Answer needs clarification."),
        "retry_prompt": retry_prompt,
        "confidence": confidence,
        "attempt_delta": 1,
        "max_retry_recommended": max(0, min(MAX_RETRIES, max_retry_recommended)),
        "coaching_note": str(payload.get("coaching_note", "")).strip(),
        "should_score_star": bool(payload.get("should_score_star", True)),
        "missing_slots": payload.get("missing_slots", []) if isinstance(payload.get("missing_slots", []), list) else [],
    }

def _fallback_gate(
    passed: bool,
    reason: str,
    question: dict[str, Any],
    language: str,
    *,
    max_retry_recommended: int = 1,
    coaching_note: str = "",
    should_score_star: bool = True,
    retry_prompt: str | None = None,
) -> dict[str, Any]:
    log_func("_fallback_gate", level=2)
    return _localize_gate_for_language({
        "pass": passed,
        "reason": reason,
        "retry_prompt": retry_prompt or _retry_prompt(question, reason, language),
        "confidence": 0.45,
        "attempt_delta": 1,
        "max_retry_recommended": max(0, min(MAX_RETRIES, max_retry_recommended)),
        "coaching_note": coaching_note,
        "should_score_star": should_score_star,
    }, language)

def _heuristic_gate(question: dict[str, Any], answer: str, language: str) -> dict[str, Any]:
    log_func("_heuristic_gate", level=2)
    answer_words = set(re.findall(r"\w+", answer.lower()))
    signal_words = set()
    for signal in question.get("expected_signals", []):
        signal_words.update(re.findall(r"\w+", str(signal).lower()))
    overlap = len(answer_words & signal_words)
    passed = len(answer.strip()) >= 45 and (not signal_words or overlap >= 1)
    reason = "Answer is relevant enough to continue." if passed else "Answer is still missing direct evidence for the question."
    return _fallback_gate(passed, reason, question, language, max_retry_recommended=0 if passed else 1)

def _retry_prompt(question: dict[str, Any], reason: str, language: str) -> str:
    log_func("_retry_prompt", level=2)
    if language == "vi":
        return (
            "Mình muốn làm rõ thêm một chút. "
            f"{reason} Bạn có thể trả lời trực tiếp hơn vào câu hỏi này: {question.get('question', '')}"
        )
    return f"I want to clarify this a bit. {reason} Can you answer this question more directly: {question.get('question', '')}"

def _warmup_evaluation(answer: str, language: str) -> dict[str, Any]:
    log_func("_warmup_evaluation", level=2)
    length_score = 4 if len(answer.strip()) >= 20 else 3
    feedback = (
        "Phần khởi động tốt. Câu trả lời giúp thiết lập trạng thái giao tiếp ban đầu."
        if language == "vi"
        else "Good warm-up. The answer helps establish the initial communication baseline."
    )
    return {
        "scores": {
            **DEFAULT_SCORES.copy(),
            "clarity": length_score,
            "confidence": length_score,
        },
        "starAnalysis": DEFAULT_STAR.copy(),
        "feedback": feedback,
        "betterVersion": "",
        "questionType": "warmup",
        "weight": "light",
    }

def _light_interaction_evaluation(gate_result: dict[str, Any], answer: str, language: str) -> dict[str, Any]:
    log_func("_light_interaction_evaluation", level=2)
    feedback = gate_result.get("coaching_note") or gate_result.get("reason") or (
        "Tương tác này được ghi nhận như phần làm rõ câu hỏi, không chấm như một câu trả lời STAR."
        if language == "vi"
        else "This interaction is treated as clarification, not as a STAR answer."
    )
    return {
        "scores": {
            **DEFAULT_SCORES.copy(),
            "clarity": 3,
            "relevance": 3,
            "specificity": 2,
            "confidence": 3,
            "structure": 2,
        },
        "starAnalysis": DEFAULT_STAR.copy(),
        "feedback": feedback,
        "betterVersion": "",
        "questionType": "clarification" if not gate_result.get("pass") else "coaching",
        "evaluationMode": "light_interaction",
        "weight": "light",
    }

def _schedule_star_evaluation(interview_id: int, turn_id: int, question: dict[str, Any], answer: str) -> None:
    log_func("_schedule_star_evaluation", level=2)
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return
    task = loop.create_task(_star_job(interview_id, turn_id, question, answer))
    STAR_TASKS.setdefault(interview_id, set()).add(task)
    task.add_done_callback(lambda done_task: STAR_TASKS.get(interview_id, set()).discard(done_task))

async def _star_job(interview_id: int, turn_id: int, question: dict[str, Any], answer: str) -> None:
    log_func("_star_job", level=2)
    await asyncio.sleep(0.1)

    class Req:
        last_ai_msg = question.get("question", "")
        last_user_msg = answer
        language = "vi"
        model_answer = question.get("model_answer", "")

    db = SessionLocal()
    try:
        interview = db.query(Interview).filter(Interview.id == interview_id).first()
        turn = db.query(InterviewTurn).filter(InterviewTurn.id == turn_id).first()
        if not interview or not turn:
            trace_event(interview_id, "star.session_or_turn_missing", {"turn_id": turn_id})
            return
        Req.language = interview.language or "vi"
        trace_event(interview_id, "star.prompt", {
            "turn_id": turn_id,
            "question": question,
            "answer": answer,
            "language": Req.language,
            "model_answer": Req.model_answer,
        })
        evaluation = await evaluate_star_logic(Req)
        trace_event(interview_id, "star.result", {
            "turn_id": turn_id,
            "question": question,
            "answer": answer,
            "evaluation": evaluation,
        })
        evaluation["questionType"] = "main"
        turn.evaluation = evaluation
        turn.audio_meta = {
            **(turn.audio_meta or {}),
            "evaluation_status": "ready",
        }
        evaluations = interview.evaluations if isinstance(interview.evaluations, list) else []
        interview.evaluations = [*evaluations, evaluation]
        scored = [_score(item) for item in interview.evaluations if isinstance(item, dict)]
        scored = [score for score in scored if score is not None]
        if scored:
            interview.score = round(sum(scored) / len(scored))
        db.commit()
    except Exception as exc:
        db.rollback()
        print(f"STAR evaluation job failed: {exc}")
        trace_event(interview_id, "star.failed", {
            "turn_id": turn_id,
            "question": question,
            "answer": answer,
            "error": str(exc),
        })
    finally:
        db.close()

def _score(evaluation: dict[str, Any]) -> float | None:
    log_func("_score", level=2)
    scores = evaluation.get("scores")
    if not isinstance(scores, dict):
        return None
    values = []
    for key in ("relevance", "structure", "specificity", "clarity", "confidence"):
        try:
            values.append(float(scores.get(key, 0) or 0))
        except (TypeError, ValueError):
            values.append(0)
    return sum(values) / len(values) if values else None

def _fallback_active_question(interview: Interview) -> dict[str, Any]:
    log_func("_fallback_active_question", level=2)
    transcript = interview.transcript if isinstance(interview.transcript, list) else []
    for message in reversed(transcript):
        if isinstance(message, dict) and message.get("role") in ("ai", "model"):
            return {
                "id": "recovered",
                "question": message.get("content", ""),
                "tip": message.get("tip", ""),
                "phase": message.get("phase", interview.interview_type or "Behavioral"),
                "question_type": message.get("question_type", "main"),
            }
    return {
        "id": "recovered",
        "question": "",
        "tip": "",
        "phase": interview.interview_type or "Behavioral",
        "question_type": "main",
    }

def _last_transcript_message(interview: Interview) -> dict[str, Any] | None:
    transcript = interview.transcript if isinstance(interview.transcript, list) else []
    for message in reversed(transcript):
        if isinstance(message, dict):
            return message
    return None

def _is_unanswered_ai_message(message: dict[str, Any] | None) -> bool:
    return bool(message and message.get("role") in ("ai", "model"))

def _strip_accents(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value or "")
    stripped = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
    return stripped.replace("đ", "d").replace("Đ", "D").lower().strip()

def _is_candidate_question(question: dict[str, Any]) -> bool:
    phase = _strip_accents(str(question.get("phase", "")))
    text = _strip_accents(str(question.get("question", "")))
    evaluation_type = _strip_accents(str(question.get("evaluation_type", "")))
    return (
        evaluation_type == "candidate_question"
        or "candidate questions" in phase
        or "cau hoi nao cho" in text
        or "co cau hoi nao" in text
    )

def _is_no_question_answer(answer: str) -> bool:
    log_func("_is_no_question_answer", level=2)
    text = _strip_accents(answer)
    compact = re.sub(r"[^\w\s]", " ", text)
    compact = re.sub(r"\s+", " ", compact).strip()
    no_patterns = [
        "khong",
        "khong co",
        "khong co cau hoi",
        "toi khong co cau hoi",
        "minh khong co cau hoi",
        "k co",
        "ko co",
        "khong a",
    ]
    return (
        compact in no_patterns
        or "khong co cau hoi" in compact
        or "k co cau hoi" in compact
        or "ko co cau hoi" in compact
        or bool(re.search(r"\bkhong\b.*\b(cau hoi|hoi gi)\b", compact))
    )

def _answer_asks_for_clarification(answer: str) -> bool:
    log_func("_answer_asks_for_clarification", level=2)
    text = _strip_accents(answer)
    return any(pattern in text for pattern in ("la gi", "khong hieu", "chua hieu", "giai thich", "nghia la gi"))

def _candidate_qa_intent(answer: str) -> str:
    log_func("_candidate_qa_intent", level=2)
    text = _strip_accents(answer)
    compact = re.sub(r"[^\w\s?]", " ", text)
    compact = re.sub(r"\s+", " ", compact).strip()
    if _is_no_question_answer(answer) or compact in {"het roi", "khong con", "khong con cau hoi", "no", "no more"}:
        return "no_more"
    has_question_mark = "?" in answer or "？" in answer
    question_keywords = (
        "luong", "du an", "team", "cong ty", "quy trinh", "co hoi", "mentor", "remote",
        "thoi gian", "phuc loi", "benefit", "van hoa", "dao tao", "thu viec", "leader",
        "manager", "khach hang", "san pham",
    )
    question_starters = ("ai", "gi", "o dau", "khi nao", "bao nhieu", "nhu the nao", "tai sao", "co ", "duoc ")
    if has_question_mark or any(keyword in compact for keyword in question_keywords) or any(compact.startswith(starter) for starter in question_starters):
        return "has_questions"
    return "unclear"

def _candidate_question_gate(answer: str, language: str) -> dict[str, Any]:
    log_func("_candidate_question_gate", level=2)
    if language == "vi":
        if _is_no_question_answer(answer):
            return {
                "pass": True,
                "reason": "Ứng viên không có câu hỏi thêm; đây là câu trả lời hợp lệ cho phần kết.",
                "retry_prompt": "",
                "confidence": 0.9,
                "attempt_delta": 1,
                "max_retry_recommended": 0,
                "coaching_note": "Nên chuẩn bị 1-2 câu hỏi về dự án, quy trình làm việc hoặc kỳ vọng trong 90 ngày đầu để thể hiện sự quan tâm.",
                "should_score_star": False,
            }
        return {
            "pass": True,
            "reason": "Ứng viên đã đặt hoặc phản hồi câu hỏi cho nhà tuyển dụng.",
            "retry_prompt": "",
            "confidence": 0.85,
            "attempt_delta": 1,
            "max_retry_recommended": 0,
            "coaching_note": "Nếu câu hỏi chỉ xoay quanh lương, nên cân bằng thêm bằng một câu hỏi về dự án, đội nhóm hoặc cơ hội phát triển.",
            "should_score_star": False,
        }
    return {
        "pass": True,
        "reason": "Candidate questions section accepted.",
        "retry_prompt": "",
        "confidence": 0.85,
        "attempt_delta": 1,
        "max_retry_recommended": 0,
        "coaching_note": "Prepare one or two questions about projects, team expectations, or growth opportunities.",
        "should_score_star": False,
    }

def _normalize_candidate_qa_response(payload: dict[str, Any], language: str, turn_count: int) -> dict[str, Any]:
    log_func("_normalize_candidate_qa_response", level=2)
    answer = str(payload.get("answer", "")).strip()
    if not answer:
        answer = (
            "Mình chưa có đủ thông tin chính thức trong JD/session để trả lời chắc chắn. Theo kinh nghiệm chung, bạn nên hỏi HR thêm để xác nhận chi tiết."
            if language == "vi"
            else "I do not have enough official information in the JD/session to answer confidently. As general guidance, you should confirm details with HR."
        )
    answered = payload.get("answered_questions", [])
    if isinstance(answered, str):
        answered = [answered]
    if not isinstance(answered, list):
        answered = []
    unresolved = payload.get("unresolved_questions", [])
    if isinstance(unresolved, str):
        unresolved = [unresolved]
    if not isinstance(unresolved, list):
        unresolved = []
    sources = payload.get("sources_used", [])
    if isinstance(sources, str):
        sources = [sources]
    if not isinstance(sources, list):
        sources = []
    followup = str(payload.get("followup_prompt", "")).strip() or (
        "Bạn còn câu hỏi nào khác không?" if language == "vi" else "Do you have any other questions?"
    )
    return {
        "answer": answer,
        "answered_questions": [str(item) for item in answered if str(item).strip()],
        "unresolved_questions": [str(item) for item in unresolved if str(item).strip()],
        "sources_used": [str(item) for item in sources if str(item).strip()],
        "followup_prompt": followup,
        "should_close": bool(payload.get("should_close")) or turn_count >= CANDIDATE_QA_LIMIT,
    }

def _fallback_candidate_qa_response(candidate_questions: str, language: str, turn_count: int, error: str) -> dict[str, Any]:
    log_func("_fallback_candidate_qa_response", level=2)
    if language == "vi":
        answer = (
            "Mình chưa có đủ thông tin chính thức trong JD/session để trả lời chắc chắn câu hỏi này. "
            "Thông tin tham khảo: với các câu hỏi về dự án, đội nhóm, quy trình, lương hoặc phúc lợi, bạn nên hỏi HR hoặc hiring manager để xác nhận dữ liệu chính thức."
        )
        followup = "Bạn còn câu hỏi nào khác không?"
    else:
        answer = (
            "I do not have enough official information in the JD/session to answer this confidently. "
            "As general guidance, confirm project, team, process, salary, or benefits details with HR or the hiring manager."
        )
        followup = "Do you have any other questions?"
    return {
        "answer": answer,
        "answered_questions": [candidate_questions],
        "unresolved_questions": [candidate_questions],
        "sources_used": ["fallback_generic_guidance"],
        "followup_prompt": followup,
        "should_close": turn_count >= CANDIDATE_QA_LIMIT,
        "error": error,
    }

def _candidate_qa_evaluation(
    answer: str,
    language: str,
    *,
    intent: str,
    responder: dict[str, Any] | None = None,
) -> dict[str, Any]:
    log_func("_candidate_qa_evaluation", level=2)
    if language == "vi":
        if intent == "no_more":
            feedback = "Ứng viên không có câu hỏi thêm; đây là phản hồi hợp lệ. Lần sau nên chuẩn bị 1-2 câu hỏi về dự án, đội nhóm hoặc kỳ vọng 90 ngày đầu để thể hiện sự quan tâm."
        elif intent == "unclear":
            feedback = "Phản hồi chưa rõ ứng viên muốn hỏi thêm hay muốn kết thúc. Hệ thống đã hỏi lại để xác nhận."
        elif _salary_focused_question(answer):
            feedback = "Ứng viên có quan tâm đến đãi ngộ. Đây là câu hỏi hợp lệ, nhưng nên cân bằng thêm bằng câu hỏi về dự án, đội nhóm hoặc cơ hội phát triển."
        else:
            feedback = "Ứng viên đặt câu hỏi ở cuối buổi, thể hiện sự quan tâm đến vị trí hoặc công ty."
    else:
        feedback = "Candidate Q&A interaction recorded."
    return {
        "scores": {
            **DEFAULT_SCORES.copy(),
            "clarity": 3,
            "relevance": 3 if intent != "unclear" else 2,
            "specificity": 3 if intent == "has_questions" else 2,
            "confidence": 3,
            "structure": 2,
        },
        "starAnalysis": DEFAULT_STAR.copy(),
        "feedback": feedback,
        "betterVersion": "",
        "questionType": "candidate_qa",
        "evaluationMode": "candidate_question_qa",
        "weight": "light",
        "candidateQuestions": answer,
        "aiAnswer": (responder or {}).get("answer", ""),
        "unresolvedQuestions": (responder or {}).get("unresolved_questions", []),
    }

def _salary_focused_question(answer: str) -> bool:
    text = _strip_accents(answer)
    return any(marker in text for marker in ("luong", "salary", "thu nhap", "dai ngo", "phuc loi", "benefit"))

def _short_answer_gate(question: dict[str, Any], language: str) -> dict[str, Any]:
    log_func("_short_answer_gate", level=2)
    if language == "vi":
        if _is_project_question(question):
            return _fallback_gate(
                False,
                "Câu trả lời còn quá ngắn, chưa đủ thông tin về dự án.",
                question,
                language,
                max_retry_recommended=3,
                retry_prompt=(
                    "Bạn có thể nói rõ hơn dự án đó giải quyết bài toán gì không? "
                    "Ví dụ: nhận diện xe, quản lý dữ liệu xe, xử lý hình ảnh từ camera, hay một bài toán khác?"
                ),
            )
        return _fallback_gate(
            False,
            "Câu trả lời còn quá ngắn để đánh giá trọng tâm.",
            question,
            language,
            max_retry_recommended=1,
            retry_prompt="Bạn có thể chia sẻ cụ thể hơn một chút được không?",
        )
    return _fallback_gate(
        False,
        "Answer is too short to evaluate relevance.",
        question,
        language,
        max_retry_recommended=1,
    )

def _clarification_gate(question: dict[str, Any], answer: str, language: str) -> dict[str, Any]:
    log_func("_clarification_gate", level=2)
    if language == "vi":
        if _is_diverse_team_question(question):
            retry_prompt = (
                "Ý tôi là một nhóm có các thành viên khác nhau về chuyên môn, kinh nghiệm, tính cách hoặc cách làm việc. "
                "Ví dụ: có người phụ trách AI, có người phụ trách backend, có người phụ trách giao diện. "
                "Bạn đã từng làm trong nhóm như vậy chưa, và bạn học được gì từ trải nghiệm đó?"
            )
        else:
            retry_prompt = (
                "Mình giải thích ngắn nhé: ý của câu hỏi là muốn nghe một ví dụ cụ thể từ trải nghiệm của bạn. "
                f"Bạn có thể trả lời lại theo cách đơn giản hơn: {question.get('question', '')}"
            )
        return {
            "pass": False,
            "reason": "Ứng viên đang yêu cầu làm rõ câu hỏi; đây là tương tác hợp lệ, chưa nên chấm như câu trả lời sai.",
            "retry_prompt": retry_prompt,
            "confidence": 0.8,
            "attempt_delta": 1,
            "max_retry_recommended": 1,
            "coaching_note": "Khi chưa hiểu câu hỏi, ứng viên có thể yêu cầu giải thích; hệ thống chỉ nên làm rõ một lần rồi chuyển tiếp nếu vẫn chưa có câu trả lời.",
            "should_score_star": False,
        }
    return _fallback_gate(
        False,
        "Candidate asked for clarification.",
        question,
        language,
        max_retry_recommended=1,
        coaching_note="Clarify once, then move on if the candidate still cannot answer.",
        should_score_star=False,
    )

def _slot_gate_for_question(question: dict[str, Any], state: dict[str, Any], language: str) -> dict[str, Any] | None:
    log_func("_slot_gate_for_question", level=2)
    if language != "vi" or not _is_project_question(question):
        return None
    context = "\n".join(str(item) for item in state.get("active_question_answer_context", []) if str(item).strip())
    if not context.strip():
        return None

    slots = _project_answer_slots(context)
    missing = [slot for slot in ("situation", "task", "action", "result") if not slots.get(slot)]
    if not missing:
        return {
            "pass": True,
            "reason": "Câu trả lời đã có đủ bối cảnh, vai trò, hành động và kết quả chính để tiếp tục.",
            "retry_prompt": "",
            "confidence": 0.85,
            "attempt_delta": 1,
            "max_retry_recommended": 0,
            "coaching_note": "",
            "should_score_star": True,
            "missing_slots": [],
        }

    attempts_answered = len(state.get("active_question_answer_context", []))
    if attempts_answered >= MAX_RETRIES + 1:
        return {
            "pass": True,
            "reason": f"Câu trả lời vẫn thiếu {', '.join(missing)}, nhưng đã hỏi làm rõ đủ số lần nên chuyển tiếp.",
            "retry_prompt": "",
            "confidence": 0.55,
            "attempt_delta": 1,
            "max_retry_recommended": 0,
            "coaching_note": "Ứng viên cần bổ sung phần còn thiếu bằng thông tin thật, đặc biệt là hành động cụ thể và số liệu kết quả nếu có.",
            "should_score_star": True,
            "missing_slots": missing,
        }

    next_missing = missing[0]
    prompt_by_slot = {
        "situation": (
            "Bạn có thể nói rõ hơn dự án đó giải quyết bài toán gì không? "
            "Ví dụ: nhận diện xe, quản lý dữ liệu xe, xử lý hình ảnh từ camera, hay một bài toán khác?"
        ),
        "task": (
            "Trong dự án đó, vai trò cụ thể của bạn là gì? "
            "Bạn chịu trách nhiệm phần nào và quyết định nào thuộc về bạn?"
        ),
        "action": (
            "Trong vai trò đó, bạn đã trực tiếp làm những việc cụ thể nào? "
            "Ví dụ: chuẩn bị dữ liệu, huấn luyện model, phân công nhóm, đánh giá kết quả, hay triển khai demo?"
        ),
        "result": (
            "\"Nhận diện tốt\" hoặc \"kết quả tốt\" là khoảng bao nhiêu? "
            "Bạn có thể nói bằng một chỉ số thật không, ví dụ độ chính xác, mAP, FPS, số lượng ảnh/video test, hoặc kết quả demo?"
        ),
    }
    label_by_slot = {
        "situation": "bối cảnh/bài toán",
        "task": "vai trò cụ thể",
        "action": "hành động cụ thể",
        "result": "kết quả hoặc số liệu thật",
    }
    return {
        "pass": False,
        "reason": f"Câu trả lời đã có một phần thông tin, nhưng còn thiếu {label_by_slot[next_missing]}.",
        "retry_prompt": prompt_by_slot[next_missing],
        "confidence": 0.8,
        "attempt_delta": 1,
        "max_retry_recommended": 3,
        "coaching_note": "Follow-up đang hỏi đúng phần còn thiếu, không lặp lại toàn bộ câu hỏi.",
        "should_score_star": True,
        "missing_slots": missing,
    }

def _is_project_question(question: dict[str, Any]) -> bool:
    phase = _strip_accents(str(question.get("phase", "")))
    text = _strip_accents(str(question.get("question", "")))
    intent = _strip_accents(str(question.get("intent", "")))
    evaluation_type = _strip_accents(str(question.get("evaluation_type", "")))
    if evaluation_type in {"project", "technical"}:
        return True
    return any(
        marker in f"{phase} {text} {intent}"
        for marker in (
            "du an", "project", "cv deep", "technical", "kinh nghiem", "vai tro",
            "tham gia", "computer vision", "model", "he thong",
        )
    )

def _is_diverse_team_question(question: dict[str, Any]) -> bool:
    text = _strip_accents(f"{question.get('question', '')} {question.get('intent', '')}")
    return "nhom da dang" in text or "diverse team" in text

def _project_answer_slots(answer_context: str) -> dict[str, bool]:
    text = _strip_accents(answer_context)
    has_metric = bool(re.search(r"\d", text)) or any(
        marker in text
        for marker in ("do chinh xac", "accuracy", "map", "fps", "toc do", "so luong", "video test", "demo", "%")
    )
    return {
        "situation": any(
            marker in text
            for marker in (
                "nhan dien", "bien so", "cao toc", "quang ninh", "camera", "video",
                "hinh anh", "du lieu xe", "phat hien", "quan ly", "he thong",
            )
        ),
        "task": any(
            marker in text
            for marker in ("leader", "lead", "vai tro", "phu trach", "chiu trach nhiem", "quan ly", "dieu phoi", "phan cong")
        ),
        "action": any(
            marker in text
            for marker in (
                "computer vision", "xu ly", "huan luyen", "train", "model", "dataset",
                "du lieu", "gan nhan", "trien khai", "danh gia", "phan cong", "chon mo hinh",
                "yolo", "ocr",
            )
        ),
        "result": has_metric,
    }

def _max_retries_for_question(question: dict[str, Any], gate_result: dict[str, Any]) -> int:
    if gate_result.get("pass") or _is_candidate_question(question):
        return 0
    try:
        recommended = int(gate_result.get("max_retry_recommended", 1))
    except (TypeError, ValueError):
        recommended = 1
    phase = _strip_accents(str(question.get("phase", "")))
    if recommended > 1 and not (_is_project_question(question) or any(marker in phase for marker in ("cv deep", "technical", "job-fit", "job fit"))):
        recommended = 1
    return max(0, min(MAX_RETRIES, recommended))

def fallback_question_plan(language: str, interview_type: str) -> list[dict[str, Any]]:
    log_func("fallback_question_plan")
    raw = (
        [
            "Hãy giới thiệu ngắn gọn về kinh nghiệm gần đây nhất của bạn.",
            "Dự án nào trong CV thể hiện rõ nhất năng lực phù hợp với vị trí này?",
            "Bạn đã xử lý một tình huống khó trong công việc như thế nào?",
            "Điểm mạnh nào của bạn phù hợp nhất với vai trò này?",
            "Bạn muốn phát triển điều gì trong 1-2 năm tới?",
        ]
        if language == "vi"
        else [
            "Can you briefly introduce your most recent experience?",
            "Which project in your resume best demonstrates your fit for this role?",
            "How did you handle a difficult situation at work?",
            "Which strength best fits this role?",
            "What do you want to develop over the next 1-2 years?",
        ]
    )
    return [
        _normalize_plan_item(
            {
                "question": question,
                "intent": "Fallback interview coverage",
                "expected_signals": ["concrete example", "role fit", "clear impact"],
                "model_answer": "",
                "tip": "Use a concrete example.",
                "phase": "Technical" if interview_type == "Technical" and idx == 2 else "Behavioral",
            },
            idx + 1,
            interview_type,
        )
        for idx, question in enumerate(raw)
    ]

def _utcnow():
    return datetime.datetime.utcnow()

def _state_snapshot(state: dict[str, Any]) -> dict[str, Any]:
    return {
        "question_plan_status": state.get("question_plan_status"),
        "warmup_index": state.get("warmup_index"),
        "main_index": state.get("main_index"),
        "bridge_used": state.get("bridge_used"),
        "active_question_id": (state.get("active_question") or {}).get("id") if isinstance(state.get("active_question"), dict) else None,
        "active_question_type": state.get("active_question_type"),
        "active_question_attempt": state.get("active_question_attempt"),
        "answer_gate_count": len(state.get("answer_gate_results", [])) if isinstance(state.get("answer_gate_results"), list) else 0,
        "max_question_count": state.get("max_question_count"),
        "candidate_qa_status": state.get("candidate_qa_status"),
        "candidate_qa_turn_count": state.get("candidate_qa_turn_count"),
    }
