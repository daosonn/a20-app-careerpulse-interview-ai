import json
import re
import unicodedata
from typing import Any

from app.core.config import evaluator_llm
from app.core.logger import log_func

DEFAULT_SCORES = {
    "clarity": 3,
    "relevance": 3,
    "specificity": 3,
    "confidence": 3,
    "structure": 3,
}

DEFAULT_STAR = {
    "situation": "",
    "task": "",
    "action": "",
    "result": "",
}


def _clamp_score(value: Any, default: int) -> int:
    log_func("_clamp_score", level=2)
    try:
        return max(1, min(5, int(round(float(value)))))
    except (TypeError, ValueError):
        return default


def _parse_json(raw_content: str) -> dict[str, Any] | None:
    log_func("_parse_json", level=2)
    content = raw_content.strip()
    if content.startswith("```"):
        parts = content.split("```")
        content = parts[1] if len(parts) > 1 else content
        if content.lstrip().startswith("json"):
            content = content.lstrip()[4:].strip()
    try:
        payload = json.loads(content)
    except json.JSONDecodeError:
        return None
    return payload if isinstance(payload, dict) else None


def _normalize_evaluation(raw_content: str) -> dict[str, Any]:
    log_func("_normalize_evaluation", level=2)
    payload = _parse_json(raw_content)
    if payload is None:
        return {
            "scores": DEFAULT_SCORES.copy(),
            "starAnalysis": DEFAULT_STAR.copy(),
            "feedback": raw_content,
            "betterVersion": "",
        }

    scores = payload.get("scores")
    if not isinstance(scores, dict):
        scores = {}

    specificity = scores.get("specificity", scores.get("technical_depth", DEFAULT_SCORES["specificity"]))

    normalized_scores = {
        "clarity": _clamp_score(scores.get("clarity"), DEFAULT_SCORES["clarity"]),
        "relevance": _clamp_score(scores.get("relevance"), DEFAULT_SCORES["relevance"]),
        "specificity": _clamp_score(specificity, DEFAULT_SCORES["specificity"]),
        "confidence": _clamp_score(scores.get("confidence"), DEFAULT_SCORES["confidence"]),
        "structure": _clamp_score(scores.get("structure"), DEFAULT_SCORES["structure"]),
    }

    star_analysis = payload.get("starAnalysis") or payload.get("star_analysis")
    if not isinstance(star_analysis, dict):
        star_analysis = {}

    return {
        **payload,
        "scores": normalized_scores,
        "starAnalysis": {
            "situation": str(star_analysis.get("situation", "")),
            "task": str(star_analysis.get("task", "")),
            "action": str(star_analysis.get("action", "")),
            "result": str(star_analysis.get("result", "")),
        },
        "feedback": str(payload.get("feedback", "")),
        "betterVersion": str(payload.get("betterVersion", payload.get("better_version", ""))),
    }


def _strip_accents(value: str) -> str:
    log_func("_strip_accents", level=2)
    normalized = unicodedata.normalize("NFD", value or "")
    stripped = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
    return stripped.replace("đ", "d").replace("Đ", "D").lower().strip()


def _is_candidate_question(question: str) -> bool:
    log_func("_is_candidate_question", level=2)
    text = _strip_accents(question)
    return "co cau hoi nao" in text or "cau hoi nao cho" in text or "questions for us" in text


def _is_no_question_answer(answer: str) -> bool:
    log_func("_is_no_question_answer", level=2)
    text = re.sub(r"[^\w\s]", " ", _strip_accents(answer))
    text = re.sub(r"\s+", " ", text).strip()
    return (
        text in {"khong", "khong co", "khong co cau hoi", "toi khong co cau hoi", "k co", "ko co"}
        or "khong co cau hoi" in text
        or "k co cau hoi" in text
        or "ko co cau hoi" in text
        or bool(re.search(r"\bkhong\b.*\b(cau hoi|hoi gi)\b", text))
    )


def _candidate_question_evaluation(answer: str, language: str) -> dict[str, Any]:
    log_func("_candidate_question_evaluation", level=2)
    if language == "vi":
        if _is_no_question_answer(answer):
            feedback = (
                "Câu trả lời 'không có câu hỏi' là hợp lệ ở phần kết. Tuy nhiên, trong phỏng vấn thật, "
                "ứng viên nên chuẩn bị 1-2 câu hỏi về dự án, đội nhóm, kỳ vọng 90 ngày đầu hoặc cơ hội phát triển "
                "để thể hiện sự quan tâm chủ động hơn."
            )
            better = "Hiện tại tôi chưa có thêm câu hỏi. Nếu được, tôi muốn biết thêm về dự án ưu tiên của đội trong 3 tháng tới và tiêu chí đánh giá thành công cho vị trí này."
        else:
            feedback = (
                "Ứng viên đã phản hồi phần câu hỏi cho nhà tuyển dụng. Nếu câu hỏi chỉ tập trung vào lương, "
                "nên cân bằng thêm bằng một câu hỏi về công việc, dự án hoặc lộ trình phát triển để tạo ấn tượng chuyên nghiệp hơn."
            )
            better = "Tôi muốn biết thêm về dự án chính của đội, kỳ vọng dành cho người mới trong 90 ngày đầu và sau đó có thể trao đổi thêm về khung đãi ngộ phù hợp."
    else:
        feedback = "Candidate question section accepted. Coach the candidate to prepare one or two role/team-focused questions."
        better = "I do not have more questions right now, but I would like to understand the team's priority projects and success expectations for the first 90 days."
    return {
        "scores": {
            "clarity": 3,
            "relevance": 3,
            "specificity": 2,
            "confidence": 3,
            "structure": 2,
        },
        "starAnalysis": DEFAULT_STAR.copy(),
        "feedback": feedback,
        "betterVersion": better,
        "evaluationMode": "candidate_question_coaching",
    }


def _answer_asks_for_clarification(answer: str) -> bool:
    log_func("_answer_asks_for_clarification", level=2)
    text = _strip_accents(answer)
    return any(pattern in text for pattern in ("la gi", "khong hieu", "chua hieu", "giai thich", "nghia la gi"))


def _evaluation_mode(question: str) -> str:
    log_func("_evaluation_mode", level=2)
    text = _strip_accents(question)
    if _is_candidate_question(question):
        return "candidate_question"
    if any(marker in text for marker in ("hom nay", "san sang", "tam trang", "ready")):
        return "warmup"
    if any(marker in text for marker in ("dong luc", "theo duoi", "vi sao", "why ai", "motivation")):
        return "motivation"
    if any(marker in text for marker in ("du an", "project", "vai tro", "computer vision", "model", "ky thuat", "technical")):
        return "project_or_technical"
    return "behavioral_star"


def _clarification_evaluation(answer: str, language: str) -> dict[str, Any]:
    log_func("_clarification_evaluation", level=2)
    feedback = (
        "Ứng viên đang yêu cầu làm rõ câu hỏi. Đây là hành vi giao tiếp hợp lệ, chưa nên chấm như một câu trả lời sai. "
        "Sau khi được giải thích bằng ngôn ngữ đơn giản hơn, ứng viên cần trả lời lại bằng ví dụ cụ thể."
        if language == "vi"
        else "The candidate is asking for clarification. This should not be graded as a failed answer before the question is clarified."
    )
    return {
        "scores": {
            "clarity": 3,
            "relevance": 3,
            "specificity": 2,
            "confidence": 3,
            "structure": 2,
        },
        "starAnalysis": DEFAULT_STAR.copy(),
        "feedback": feedback,
        "betterVersion": "",
        "evaluationMode": "clarification_request",
    }


async def evaluate_star_logic(req_data: Any) -> dict[str, Any]:
    log_func("evaluate_star_logic")
    if _is_candidate_question(req_data.last_ai_msg):
        return _candidate_question_evaluation(req_data.last_user_msg, req_data.language)
    if _answer_asks_for_clarification(req_data.last_user_msg):
        return _clarification_evaluation(req_data.last_user_msg, req_data.language)

    lang_instruction = "Respond in Vietnamese" if req_data.language == "vi" else "Respond in English"
    model_answer_context = f"\n- Sample Ideal Answer (Model): {req_data.model_answer}" if hasattr(req_data, "model_answer") and req_data.model_answer else ""
    evaluation_mode = _evaluation_mode(req_data.last_ai_msg)

    prompt = f"""Evaluate the candidate's last response for an interview coaching product.
    
    Context:
    - Question asked: {req_data.last_ai_msg}{model_answer_context}
    - Candidate answer: {req_data.last_user_msg}
    - Evaluation mode: {evaluation_mode}
    
    Guidelines:
    1. Use the evaluation mode:
       - warmup: evaluate friendliness, naturalness, and readiness only.
       - motivation: evaluate reason depth, career fit, sincerity, and specificity. Do not force STAR.
       - project_or_technical: evaluate problem context, candidate role, concrete technical actions, tradeoffs, and real results/metrics.
       - behavioral_star: evaluate Situation, Task, Action, Result.
       - candidate_question: do not force STAR; coach the candidate to ask better role/company questions.
    2. Compare against the Sample Ideal Answer only as guidance. Do not assume facts that the candidate did not say.
    3. Never fabricate metrics, deadlines, accuracy, FPS, mAP, dataset size, company names, or impact in "betterVersion".
    4. If a metric is missing, say the candidate should add a real metric, using placeholder wording such as "nếu có số liệu thật như độ chính xác/FPS/số lượng dữ liệu, tôi sẽ bổ sung".
    5. If the candidate asked for clarification instead of answering, evaluate lightly and explain what information is still needed; do not invent missing STAR details.
    6. Provide evaluation in JSON:
       - "scores": {{ "clarity": 1-5, "relevance": 1-5, "specificity": 1-5, "confidence": 1-5, "structure": 1-5 }}
       - "starAnalysis": {{ "situation": "...", "task": "...", "action": "...", "result": "..." }}
       - "feedback": "Short constructive critique"
       - "betterVersion": "A more professional version"
       - "evaluationMode": "{evaluation_mode}"
    
    {lang_instruction}. Return ONLY pure JSON."""
    
    try:
        eval_res = await evaluator_llm.ainvoke(prompt)
        return _normalize_evaluation(eval_res.content)
    except Exception as e:
        return {
            "scores": DEFAULT_SCORES.copy(),
            "starAnalysis": DEFAULT_STAR.copy(),
            "feedback": f"Error: {str(e)}",
            "betterVersion": "",
        }
