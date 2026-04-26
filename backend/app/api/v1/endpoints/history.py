from fastapi import APIRouter, HTTPException
from app.core.database import SessionDep
from app.core.auth import CurrentUser
from app.models.models import Interview, InterviewTurn, User

router = APIRouter()

def _turns_from_transcript(transcript, evaluations):
    if not isinstance(transcript, list):
        return []
    evaluations = evaluations if isinstance(evaluations, list) else []
    turns = []
    evaluation_index = 0
    index = 0
    while index < len(transcript):
        message = transcript[index]
        if not isinstance(message, dict) or message.get("role") not in ("ai", "model"):
            index += 1
            continue

        next_message = transcript[index + 1] if index + 1 < len(transcript) else None
        if not isinstance(next_message, dict) or next_message.get("role") != "user":
            index += 1
            continue

        evaluation = evaluations[evaluation_index] if evaluation_index < len(evaluations) else None
        turns.append({
            "id": f"transcript-{index}",
            "turnOrder": len(turns) + 1,
            "question": message.get("content", ""),
            "answer": next_message.get("content", ""),
            "tip": message.get("tip", ""),
            "evaluation": evaluation,
            "questionType": message.get("question_type", "main"),
            "isWarmup": message.get("question_type") == "warmup",
            "evaluationStatus": "ready" if evaluation else "missing",
            "createdAt": None,
        })
        evaluation_index += 1
        index += 2
    return turns

@router.get("/")
async def get_history(db: SessionDep, current_user: CurrentUser):
    if not current_user.is_onboarded:
        raise HTTPException(status_code=403, detail="Onboarding required")
        
    interviews = db.query(Interview).filter(Interview.user_id == current_user.id).order_by(Interview.created_at.desc()).all()
    return [{"id": i.id, "interview_type": i.interview_type, "created_at": i.created_at.isoformat(), "score": i.score, "language": i.language} for i in interviews]

@router.get("/{interview_id}")
async def get_interview_detail(interview_id: int, current_user: CurrentUser, db: SessionDep):
    hist = db.query(Interview).filter(Interview.id == interview_id, Interview.user_id == current_user.id).first()
    if not hist: raise HTTPException(status_code=404, detail="Interview not found or unauthorized")
    turns = (
        db.query(InterviewTurn)
        .filter(InterviewTurn.interview_id == hist.id, InterviewTurn.user_id == current_user.id)
        .order_by(InterviewTurn.turn_order.asc())
        .all()
    )
    serialized_turns = [
        (lambda meta: {
            "id": str(turn.id),
            "turnOrder": turn.turn_order,
            "question": turn.question or "",
            "answer": turn.answer or "",
            "tip": turn.tip or "",
            "evaluation": turn.evaluation,
            "questionType": meta.get("question_type", "main"),
            "isWarmup": bool(meta.get("is_warmup")),
            "attempt": meta.get("attempt", 0),
            "gateResult": meta.get("gate"),
            "evaluationStatus": meta.get("evaluation_status") or ("ready" if turn.evaluation else "pending"),
            "skippedAfterRetries": bool(meta.get("skipped_after_retries")),
            "createdAt": turn.created_at.isoformat(),
        })(turn.audio_meta if isinstance(turn.audio_meta, dict) else {})
        for turn in turns
    ]
    if not serialized_turns:
        serialized_turns = _turns_from_transcript(hist.transcript, hist.evaluations)

    flow_state = hist.pending_questions if isinstance(hist.pending_questions, dict) else {}

    return {
        "id": hist.id, "cv_text": hist.cv_text, "jd_text": hist.jd_text, "interview_type": hist.interview_type,
        "language": hist.language, "transcript": hist.transcript, "evaluations": hist.evaluations,
        "final_report": hist.final_report, "score": hist.score, "status": hist.status,
        "created_at": hist.created_at.isoformat(),
        "ended_at": hist.ended_at.isoformat() if hist.ended_at else None,
        "jobDescription": hist.jd_text or "",
        "cvText": hist.cv_text or "",
        "interviewType": hist.interview_type or "",
        "isStressTest": bool(hist.is_stress_test),
        "questionCount": hist.question_count or 5,
        "createdAt": hist.created_at.isoformat(),
        "endedAt": hist.ended_at.isoformat() if hist.ended_at else None,
        "predictedQuestions": hist.predicted_questions or [],
        "planStatus": flow_state.get("question_plan_status"),
        "questionPlan": flow_state.get("question_plan", []),
        "answerGateResults": flow_state.get("answer_gate_results", []),
        "summary": hist.final_report or "",
        "keyTakeaways": [],
        "turns": serialized_turns,
    }
