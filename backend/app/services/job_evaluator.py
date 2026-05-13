import json
from typing import Any, Dict, List

from app.core.config import CHAT_MODEL, async_client
from app.core.logger import log_func


async def ai_evaluate_job_fit(
    cv_text: str,
    skills: List[str],
    current_position: str,
    jobs: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    AI Agent: evaluates each candidate job's fit against the user's profile in a
    single LLM call. Updates fit_score (0-100) and reason on each job in-place.
    """
    log_func("ai_evaluate_job_fit")
    if not jobs:
        return jobs

    user_profile = (
        f"Vị trí mục tiêu: {current_position or 'chưa xác định'}\n"
        f"Kỹ năng: {', '.join(skills[:15]) if skills else 'chưa có'}\n"
        f"Nội dung CV: {(cv_text or '')[:1500]}"
    )

    candidates = [
        {
            "id": i,
            "title": j.get("title", ""),
            "company": j.get("company", ""),
            "description": (j.get("description", "") or j.get("reason", ""))[:500],
            "skills": j.get("skills", []),
        }
        for i, j in enumerate(jobs)
    ]

    prompt = f"""Bạn là chuyên gia tuyển dụng IT tại Việt Nam. Đánh giá mức độ phù hợp giữa hồ sơ ứng viên và từng vị trí công việc dưới đây.

Hồ sơ ứng viên:
{user_profile}

Danh sách vị trí cần đánh giá:
{json.dumps(candidates, ensure_ascii=False, indent=2)}

Yêu cầu đánh giá cho mỗi vị trí:
- fit_score: số nguyên 0-100. Đánh giá nghiêm túc, dựa trên mức độ trùng khớp kỹ năng, kinh nghiệm và vị trí mục tiêu. Không cho điểm cao chung chung.
- reason: 1-2 câu cụ thể bằng tiếng Việt. Đề cập đến kỹ năng hoặc kinh nghiệm cụ thể của ứng viên khớp hoặc không khớp với yêu cầu.

Trả về ONLY JSON:
{{"evaluations": [{{"id": 0, "fit_score": 85, "reason": "..."}}]}}"""

    try:
        resp = await async_client.chat.completions.create(
            model=CHAT_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "Bạn là chuyên gia tuyển dụng IT Việt Nam. Trả về ONLY valid JSON.",
                },
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
        )
        data = json.loads(resp.choices[0].message.content)
        ev_map = {e["id"]: e for e in data.get("evaluations", [])}
        for i, job in enumerate(jobs):
            ev = ev_map.get(i, {})
            job["fit_score"] = int(ev.get("fit_score", job.get("fit_score", 70)))
            job["reason"] = ev.get("reason") or job.get("reason") or "Phù hợp với hồ sơ của bạn."
    except Exception as e:
        print(f"[job_evaluator] ai_evaluate_job_fit error: {e}")

    return jobs


async def generate_llm_jobs(
    cv_text: str,
    skills: List[str],
    current_position: str,
    count: int = 5,
) -> List[Dict[str, Any]]:
    """
    Fallback generator: asks the LLM to produce realistic Vietnamese IT job
    listings when ChromaDB returns too few candidates.
    Generated jobs have no real URL — frontend falls back to platform search links.
    """
    log_func("generate_llm_jobs")
    if count <= 0:
        return []

    prompt = f"""Bạn là chuyên gia tuyển dụng IT tại Việt Nam. Tạo {count} tin tuyển dụng thực tế và phù hợp nhất cho ứng viên dưới đây.

Hồ sơ ứng viên:
- Vị trí mục tiêu: {current_position or 'chưa xác định'}
- Kỹ năng: {', '.join(skills[:15]) if skills else 'chưa có'}
- CV (tóm tắt): {(cv_text or '')[:1000]}

Yêu cầu:
- Mỗi vị trí phải phù hợp với kỹ năng và mức kinh nghiệm của ứng viên
- Tên công ty thực tế hoặc kiểu hình thực tế tại Việt Nam (startup, outsourcing, product company, fintech, cybersec firm, v.v.)
- Địa điểm: Hà Nội, TP.HCM, hoặc Đà Nẵng
- Mức lương thực tế thị trường VN (triệu VND/tháng)

Trả về ONLY JSON:
{{
  "jobs": [
    {{
      "title": "tên vị trí",
      "company": "tên công ty",
      "industry": "lĩnh vực",
      "description": "mô tả công việc 2-3 câu",
      "skills": ["kỹ năng 1", "kỹ năng 2"],
      "location": "địa điểm",
      "salary": "mức lương"
    }}
  ]
}}"""

    try:
        resp = await async_client.chat.completions.create(
            model=CHAT_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "Bạn là chuyên gia tuyển dụng IT Việt Nam. Trả về ONLY valid JSON.",
                },
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.5,
        )
        data = json.loads(resp.choices[0].message.content)
        return data.get("jobs", [])
    except Exception as e:
        print(f"[job_evaluator] generate_llm_jobs error: {e}")
        return []
