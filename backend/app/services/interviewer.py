import json
from typing import Any, List, Tuple

from app.core.config import async_client


async def astream_ai_batch(req_data: Any):
    """Reserved for a future structured streaming implementation."""
    return


def _get_value(req_data: Any, key: str, default=None):
    if isinstance(req_data, dict):
        return req_data.get(key, default)
    return getattr(req_data, key, default)


def _type_guidance(interview_type: str) -> str:
    guidance = {
        "Technical": (
            "Focus on technical depth, trade-offs, debugging, architecture, "
            "implementation detail, and evidence from real projects."
        ),
        "Behavioral": (
            "Focus on STAR-based behavior, ownership, conflict, ambiguity, "
            "collaboration, and measurable outcomes."
        ),
        "HR": (
            "Focus on motivation, culture fit, strengths, compensation or role "
            "expectations, career direction, and communication maturity."
        ),
    }
    return guidance.get(interview_type, "Balance behavioral evidence, job fit, and communication clarity.")


async def generate_ai_batch(req_data: Any) -> List[dict]:
    """Generate the next structured question batch as pure JSON."""
    language = _get_value(req_data, "language", "vi")
    is_stress_test = bool(_get_value(req_data, "is_stress_test", False))
    interview_type = _get_value(req_data, "interview_type", "Behavioral")
    cv_content = _get_value(req_data, "cv_content", "") or ""
    jd_content = _get_value(req_data, "jd_content", "") or ""
    chat_history = _get_value(req_data, "chat_history", []) or []
    total_question_count = int(_get_value(req_data, "total_question_count", 0) or 0)
    max_question_count = int(_get_value(req_data, "max_question_count", 5) or 5)
    remaining = max(1, min(3, max_question_count - total_question_count))

    lang_instruction = "Vietnamese" if language == "vi" else "English"
    stress_instruction = (
        "Be strict, challenging, and probe weak or vague claims."
        if is_stress_test
        else "Be professional, polite, and encouraging."
    )

    system_prompt = f"""You are a senior panel interviewer running a {interview_type} interview.
Conduct the interview in {lang_instruction}.

Interview style:
- {_type_guidance(interview_type)}
- {stress_instruction}
- Ask one concise question at a time.
- Do not repeat questions already covered in chat history.
- Each model_answer should be a strong sample answer, not advice.

Return ONLY a JSON object with this exact shape:
{{
  "questions": [
    {{
      "question": "question text",
      "tip": "short preparation tip",
      "model_answer": "sample strong answer",
      "phase": "Introduction | CV Deep-dive | Job-fit Assessment | Behavioral | Motivation | Candidate Questions | Closing"
    }}
  ]
}}"""

    user_prompt = {
        "cv": cv_content[:5000],
        "jd": jd_content[:3000],
        "previous_chat_tail": chat_history[-6:] if isinstance(chat_history, list) else [],
        "questions_to_generate": remaining,
        "question_index_start": total_question_count + 1,
        "max_question_count": max_question_count,
    }

    try:
        response = await async_client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.7,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(user_prompt, ensure_ascii=False)},
            ],
        )
        content = response.choices[0].message.content or "{}"
        payload = json.loads(content)
        questions = payload.get("questions", [])
        if not isinstance(questions, list):
            raise ValueError("questions must be a list")

        normalized: List[dict] = []
        for item in questions[:remaining]:
            if not isinstance(item, dict):
                continue
            question = str(item.get("question", "")).strip()
            if not question:
                continue
            normalized.append({
                "question": question,
                "tip": str(item.get("tip", "")).strip(),
                "model_answer": str(item.get("model_answer", "")).strip(),
                "phase": str(item.get("phase", interview_type)).strip() or interview_type,
            })

        if normalized:
            return normalized
        raise ValueError("no valid questions returned")

    except Exception as e:
        print(f"Error generating batch: {e}")
        fallback = [
            {
                "question": "Can you introduce yourself?",
                "tip": "Mention key achievements",
                "model_answer": "I would summarize my relevant experience, strongest achievements, and why they fit this role.",
                "phase": "Introduction",
            },
            {
                "question": "Which project best demonstrates your fit for this role?",
                "tip": "Use a concrete project",
                "model_answer": "I would describe the context, my responsibility, the technical or business challenge, my actions, and measurable outcome.",
                "phase": "CV Deep-dive",
            },
            {
                "question": "Why do you want this job?",
                "tip": "Align with role needs",
                "model_answer": "I would connect the role requirements to my strengths, motivation, and growth direction.",
                "phase": "Motivation",
            },
        ]
        return fallback[:remaining]


def generate_question_logic(req_data: Any) -> Tuple[str, str, int, str]:
    """Wrapper mainly for backward compatibility."""
    return "", "", req_data.current_question_count, ""
