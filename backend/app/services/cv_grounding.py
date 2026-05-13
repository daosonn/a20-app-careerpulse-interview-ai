"""
Grounding check for CV Deep-dive interview questions.

After generate_ai_batch returns a question batch, this verifier ensures every
question tagged phase="CV Deep-dive" actually references something present in
the candidate's CV.  Hallucinated project names, companies, roles, or
technologies are rewritten so each question anchors to real CV content.

Fail-open: if the LLM call fails for any reason the original questions are
returned unchanged so the interview is never blocked.
"""
import json
from typing import Any, Dict, List

from app.core.logger import log_func
from app.core.llm_router import chat_with_fallback

_CV_DIVE_PHASE = "CV Deep-dive"


async def ground_cv_dive_questions(
    questions: List[Dict[str, Any]],
    cv_text: str,
    language: str = "vi",
) -> List[Dict[str, Any]]:
    """
    Verify and rewrite hallucinated CV Deep-dive questions.

    Non-CV-Deep-dive questions are never touched.
    Returns the original list unchanged when:
    - there are no CV Deep-dive questions in the batch
    - cv_text is empty
    - the LLM call fails (fail-open)
    """
    log_func("ground_cv_dive_questions")

    targets = [
        (i, q) for i, q in enumerate(questions)
        if q.get("phase") == _CV_DIVE_PHASE
    ]
    if not targets or not cv_text.strip():
        return questions

    lang = "Vietnamese" if language == "vi" else "English"
    candidates = [{"id": i, "question": q["question"]} for i, q in targets]

    prompt = f"""You are a grounding verifier for interview questions.

Candidate CV:
{cv_text[:4000]}

CV Deep-dive questions to verify (JSON list):
{json.dumps(candidates, ensure_ascii=False)}

Your task for each question:
1. If the question references a specific project, company, role, or technology that does NOT appear in the CV above, REWRITE it so it asks about something that IS explicitly in the CV.
2. If the question is already grounded (references real CV content) or is generic enough to apply to any candidate, keep the text unchanged and set changed=false.
3. Never fabricate experience or add content not in the CV.
4. Rewritten questions must be natural, conversational interview questions in {lang}.

Return ONLY valid JSON — no prose, no markdown:
{{"verified": [{{"id": <int>, "question": "<question text>", "changed": <bool>}}]}}"""

    try:
        raw = await chat_with_fallback(
            messages=[
                {
                    "role": "system",
                    "content": "You are a grounding verifier for interview questions. Return ONLY valid JSON.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
            require_json=True,
        )
        data = json.loads(raw or "{}")

        corrections: Dict[int, str] = {
            item["id"]: item["question"].strip()
            for item in data.get("verified", [])
            if isinstance(item.get("question"), str) and item["question"].strip()
        }

        result = [dict(q) for q in questions]
        for idx, original in targets:
            new_text = corrections.get(idx)
            if new_text and new_text != original["question"]:
                print(
                    f"[cv_grounding] grounded[{idx}]: "
                    f"'{original['question']}' → '{new_text}'"
                )
                result[idx]["question"] = new_text

        return result

    except Exception as exc:
        print(f"[cv_grounding] grounding check failed (fail-open): {exc}")
        return questions
