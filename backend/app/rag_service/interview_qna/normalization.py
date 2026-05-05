import hashlib
import html
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Optional

try:
    from bs4 import BeautifulSoup
except Exception:  # pragma: no cover - fallback for minimal environments
    BeautifulSoup = None


STOPWORDS = {
    "about", "after", "again", "also", "and", "any", "are", "because", "been",
    "before", "being", "between", "both", "but", "can", "could", "does", "each",
    "from", "have", "how", "into", "its", "more", "most", "not", "only", "or",
    "other", "should", "such", "than", "that", "the", "their", "then", "there",
    "these", "this", "those", "through", "use", "used", "using", "was", "what",
    "when", "where", "which", "while", "with", "would", "you", "your",
}

TECH_KEYWORDS = {
    "api", "async", "cache", "class", "concurrency", "database", "deadlock",
    "dependency", "docker", "embedding", "exception", "index", "inheritance",
    "interface", "java", "kubernetes", "latency", "memory", "microservice",
    "object", "pipeline", "python", "query", "rag", "redis", "retrieval",
    "security", "serialization", "sql", "thread", "transaction", "vector",
}


def stable_id(*parts: str) -> str:
    payload = "|".join(part or "" for part in parts)
    return str(uuid.uuid5(uuid.NAMESPACE_URL, payload))


def content_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def strip_html(value: Optional[str]) -> str:
    if not value:
        return ""
    if BeautifulSoup is not None and "<" in value and ">" in value:
        text = BeautifulSoup(value, "html.parser").get_text(" ")
    else:
        text = re.sub(r"<[^>]+>", " ", value)
    text = html.unescape(text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def compact_text(value: str, limit: int = 800) -> str:
    value = re.sub(r"\s+", " ", value or "").strip()
    if len(value) <= limit:
        return value
    return value[: limit - 3].rsplit(" ", 1)[0] + "..."


def classify_difficulty(score: int = 0, view_count: int = 0, answer_count: int = 0) -> str:
    signal = 0
    if score >= 50:
        signal += 2
    elif score >= 10:
        signal += 1
    if view_count >= 50000:
        signal += 2
    elif view_count >= 5000:
        signal += 1
    if answer_count >= 8:
        signal += 1
    if signal >= 4:
        return "hard"
    if signal >= 2:
        return "medium"
    return "easy"


def infer_question_kind(skill_name: str, title: str, tags: Iterable[str]) -> str:
    joined = " ".join([skill_name, title, *list(tags)]).lower()
    if any(token in joined for token in ("system design", "scalability", "distributed", "load balancer")):
        return "system_design"
    if any(token in joined for token in ("debug", "error", "exception", "traceback", "fix")):
        return "debugging"
    if any(token in joined for token in ("algorithm", "complexity", "leetcode", "array", "tree", "graph")):
        return "coding"
    if any(token in joined for token in ("behavioral", "leadership", "conflict", "teamwork")):
        return "behavioral"
    return "concept"


def extract_keywords(text: str, skill_keywords: Optional[Iterable[str]] = None, limit: int = 8) -> List[str]:
    words = re.findall(r"[A-Za-z][A-Za-z0-9_+#.-]{2,}", text.lower())
    candidates: Dict[str, int] = {}
    preferred = {item.lower() for item in (skill_keywords or [])} | TECH_KEYWORDS
    for word in words:
        normalized = word.strip(".,;:()[]{}")
        if normalized in STOPWORDS or len(normalized) < 3:
            continue
        weight = 3 if normalized in preferred else 1
        candidates[normalized] = candidates.get(normalized, 0) + weight
    return [
        word for word, _ in sorted(candidates.items(), key=lambda item: (-item[1], item[0]))[:limit]
    ]


def build_rubric(answer_text: str, skill_keywords: Optional[Iterable[str]] = None) -> List[str]:
    keywords = extract_keywords(answer_text, skill_keywords=skill_keywords, limit=6)
    rubric = []
    for keyword in keywords:
        rubric.append(f"Explains the role of {keyword} accurately.")
    rubric.append("Mentions at least one trade-off, edge case, or limitation.")
    rubric.append("Uses a concrete example when the concept is implementation-oriented.")
    return rubric[:8]


def make_qna_record(
    *,
    source_name: str,
    source_url: str,
    source_type: str,
    license_name: str,
    skill_name: str,
    skill_secondary: List[str],
    role_families: List[str],
    level: str,
    question_text: str,
    answer_text: str,
    tags: List[str],
    score: int = 0,
    view_count: int = 0,
    answer_count: int = 0,
    source_item_id: Optional[str] = None,
    retrieved_at: Optional[str] = None,
    attribution: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    clean_question = strip_html(question_text)
    clean_answer = strip_html(answer_text)
    question_id = source_item_id or stable_id(source_name, source_url, clean_question)
    retrieved = retrieved_at or utc_now_iso()
    difficulty = classify_difficulty(score=score, view_count=view_count, answer_count=answer_count)
    kind = infer_question_kind(skill_name, clean_question, tags)
    skill_keywords = [skill_name, *skill_secondary, *tags]

    return {
        "id": stable_id(source_name, str(question_id), skill_name),
        "type": "interview_qna",
        "skill": {
            "primary": skill_name,
            "secondary": skill_secondary,
            "role_families": role_families,
            "level": level,
        },
        "question": {
            "text": clean_question,
            "language": "en",
            "kind": kind,
            "difficulty": difficulty,
        },
        "answer": {
            "short": compact_text(clean_answer, limit=360),
            "detailed": clean_answer,
            "code_examples": [],
            "rubric": build_rubric(clean_answer, skill_keywords=skill_keywords),
            "common_mistakes": [],
            "followups": [],
        },
        "metadata": {
            "source_name": source_name,
            "source_type": source_type,
            "source_url": source_url,
            "source_item_id": str(question_id),
            "license": license_name,
            "retrieved_at": retrieved,
            "tags": tags,
            "score": score,
            "view_count": view_count,
            "answer_count": answer_count,
            "quality_score": quality_score(score=score, view_count=view_count, answer_count=answer_count),
            "content_hash": content_hash(clean_question + "\n" + clean_answer),
            "attribution": attribution or {},
        },
    }


def quality_score(score: int = 0, view_count: int = 0, answer_count: int = 0) -> float:
    score_component = min(max(score, 0), 100) / 100
    view_component = min(max(view_count, 0), 100000) / 100000
    answer_component = min(max(answer_count, 0), 10) / 10
    return round((score_component * 0.5) + (view_component * 0.3) + (answer_component * 0.2), 4)
