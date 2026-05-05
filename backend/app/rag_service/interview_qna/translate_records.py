import argparse
import importlib
import json
import re
from pathlib import Path
from typing import Any, Dict, Iterable, Iterator, List, Optional

from .storage import NORMALIZED_DIR


GLOSSARY_TERMS = [
    "API",
    "ACID",
    "AI",
    "AWS",
    "backpressure",
    "cache",
    "caching",
    "candidate level",
    "CI/CD",
    "class",
    "clean code",
    "context window",
    "cross encoder",
    "database",
    "debugging",
    "deployment",
    "deserialization",
    "distributed systems",
    "Docker",
    "embedding",
    "event loop",
    "FastAPI",
    "frontend",
    "garbage collection",
    "GraphQL",
    "high availability",
    "high-availability",
    "idempotency",
    "index",
    "invalidation",
    "Java",
    "JavaScript",
    "JWT",
    "Kubernetes",
    "latency",
    "load balancing",
    "load balancer",
    "LLM",
    "logging",
    "machine learning",
    "memory leak",
    "message queue",
    "middleware",
    "microservice",
    "microservices",
    "MongoDB",
    "nginx",
    "observability",
    "OAuth",
    "OpenTelemetry",
    "pipeline",
    "PostgreSQL",
    "prompt engineering",
    "Python",
    "query",
    "rate limiting",
    "React",
    "Redis",
    "replication",
    "REST",
    "RAG",
    "RBAC",
    "S3",
    "scalability",
    "schema",
    "search",
    "security",
    "semantic search",
    "serialization",
    "sharding",
    "SQL",
    "Spring Boot",
    "system design",
    "throughput",
    "transaction",
    "transactions",
    "TTL",
    "typescript",
    "vector database",
    "vector DB",
    "virtual DOM",
    "web security",
    "XSS",
    "CSRF",
]

TECH_TERMS = sorted(set(GLOSSARY_TERMS), key=len, reverse=True)


def protect_terms(text: str) -> tuple[str, Dict[str, str]]:
    placeholders: Dict[str, str] = {}
    protected = text
    for index, term in enumerate(sorted(TECH_TERMS, key=len, reverse=True)):
        token = f"__TERM_{index}__"
        pattern = re.compile(re.escape(term), re.IGNORECASE)
        if pattern.search(protected):
            placeholders[token] = term
            protected = pattern.sub(token, protected)
    return protected, placeholders


def restore_terms(text: str, placeholders: Dict[str, str]) -> str:
    restored = text
    for token, term in placeholders.items():
        restored = restored.replace(token, term)
    return restored


def split_text_chunks(text: str, limit: int = 4500) -> List[str]:
    paragraphs = [part.strip() for part in re.split(r"\n\s*\n", text.strip()) if part.strip()]
    chunks: List[str] = []
    current = ""

    def flush() -> None:
        nonlocal current
        if current.strip():
            chunks.append(current.strip())
        current = ""

    for paragraph in paragraphs:
        if len(paragraph) > limit:
            flush()
            sentence_buffer = ""
            sentences = re.split(r"(?<=[.!?])\s+", paragraph)
            for sentence in sentences:
                if not sentence:
                    continue
                if len(sentence) > limit:
                    words = sentence.split()
                    word_buffer = ""
                    for word in words:
                        candidate = f"{word_buffer} {word}".strip()
                        if len(candidate) > limit and word_buffer:
                            chunks.append(word_buffer)
                            word_buffer = word
                        else:
                            word_buffer = candidate
                    if word_buffer:
                        chunks.append(word_buffer)
                else:
                    candidate = f"{sentence_buffer} {sentence}".strip()
                    if len(candidate) > limit and sentence_buffer:
                        chunks.append(sentence_buffer)
                        sentence_buffer = sentence
                    else:
                        sentence_buffer = candidate
            if sentence_buffer:
                chunks.append(sentence_buffer)
            continue

        candidate = f"{current}\n\n{paragraph}".strip() if current else paragraph
        if len(candidate) > limit and current:
            flush()
            current = paragraph
        else:
            current = candidate

    flush()
    return chunks or [text.strip()]


def translate_large_text(text: str, target: str = "vi") -> str:
    if not text:
        return ""
    parts = []
    for chunk in split_text_chunks(text):
        parts.append(translate_text(chunk, target=target))
    return "\n\n".join(parts)


def translate_text(text: str, target: str = "vi") -> str:
    if not text:
        return ""
    try:
        translator_module = importlib.import_module("deep_translator")
    except Exception as exc:
        raise RuntimeError(
            "Install deep-translator or wire Google Cloud Translate before running translation."
        ) from exc
    protected, placeholders = protect_terms(text)
    translated = translator_module.GoogleTranslator(source="auto", target=target).translate(protected)
    return restore_terms(translated, placeholders)


def iter_records(path: Path) -> Iterator[Dict[str, Any]]:
    raw = path.read_text(encoding="utf-8")
    if not raw.strip():
        return

    stripped = raw.lstrip()
    if stripped.startswith("["):
        loaded = json.loads(raw)
        for record in loaded:
            yield record
        return

    try:
        first = json.loads(raw)
    except json.JSONDecodeError:
        first = None
    if isinstance(first, dict):
        yield first
        return

    jsonl_records: List[Dict[str, Any]] = []
    jsonl_failed = False
    for line in raw.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            jsonl_records.append(json.loads(line))
        except json.JSONDecodeError:
            jsonl_failed = True
            break
    if not jsonl_failed and jsonl_records:
        for record in jsonl_records:
            yield record
        return

    start = None
    in_string = False
    escape = False
    depth = 0
    for index, char in enumerate(raw):
        if start is None:
            if char == "{":
                start = index
                depth = 1
                in_string = False
                escape = False
            continue
        if escape:
            escape = False
            continue
        if char == "\\":
            escape = True
            continue
        if char == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                yield json.loads(raw[start:index + 1])
                start = None


def write_jsonl(records: Iterable[Dict[str, Any]], output_path: Path) -> int:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    with output_path.open("w", encoding="utf-8") as dst:
        for record in records:
            dst.write(json.dumps(record, ensure_ascii=False, sort_keys=True))
            dst.write("\n")
            count += 1
    return count


def localize_record(record: Dict[str, Any], target: str = "vi") -> Dict[str, Any]:
    localized = dict(record)
    question = dict(localized.get("question", {}))
    answer = dict(localized.get("answer", {}))
    question[f"text_{target}"] = translate_large_text(question.get("text", ""), target=target)
    answer[f"short_{target}"] = translate_large_text(answer.get("short", ""), target=target)
    answer[f"detailed_{target}"] = translate_large_text(answer.get("detailed", ""), target=target)
    localized["localization"] = {
        "source_language": question.get("language", "en"),
        "target_language": target,
        "translator": "deep-translator/GoogleTranslator",
    }
    localized["question"] = question
    localized["answer"] = answer
    return localized


def normalize_partition(input_path: Path, output_path: Optional[Path] = None) -> int:
    output_path = output_path or input_path.with_suffix(".jsonl")
    return write_jsonl(iter_records(input_path), output_path)


def localize_jsonl(input_path: Path, output_path: Path, target: str = "vi") -> int:
    return write_jsonl((localize_record(record, target=target) for record in iter_records(input_path)), output_path)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Normalize and translate interview Q&A partitions.")
    parser.add_argument("--input", required=True, help="Input partition file (.json, .jsonl, or object stream)")
    parser.add_argument("--output", help="Output file path. Defaults depend on mode.")
    parser.add_argument("--target", default="vi", help="Target language code for localization")
    parser.add_argument("--normalize-only", action="store_true", help="Only rewrite input as standard JSONL")
    return parser


def main() -> int:
    args = build_parser().parse_args()
    input_path = Path(args.input)
    output_path = Path(args.output) if args.output else None
    if args.normalize_only:
        output = output_path or input_path.with_suffix(".jsonl")
        count = normalize_partition(input_path, output)
        print(f"Wrote {count} normalized records to {output}")
        return 0
    output = output_path or (NORMALIZED_DIR / f"{input_path.stem}.{args.target}.jsonl")
    count = localize_jsonl(input_path, output, target=args.target)
    print(f"Wrote {count} localized records to {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

