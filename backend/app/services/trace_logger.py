from __future__ import annotations
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any

from app.core.config import LOGS_DIR
from app.core.logger import log_func

DEFAULT_TRACE_PATH = LOGS_DIR / "interview-ai-trace.jsonl"
TRACE_PATH = Path(os.getenv("INTERVIEW_TRACE_LOG_PATH", str(DEFAULT_TRACE_PATH)))
MAX_TEXT_CHARS = int(os.getenv("INTERVIEW_TRACE_MAX_TEXT_CHARS", "6000"))


def trace_event(
    session_id: int | str | None,
    event: str,
    payload: dict[str, Any] | None = None,
) -> None:
    log_func("trace_event", level=2)
    """Append one JSONL trace event for interview debugging.

    Secrets are not logged. Long text fields are truncated to keep the file usable.
    """
    record = {
        "ts": datetime.utcnow().isoformat(timespec="milliseconds") + "Z",
        "session_id": str(session_id) if session_id is not None else None,
        "event": event,
        "payload": _sanitize(payload or {}),
    }
    try:
        TRACE_PATH.parent.mkdir(parents=True, exist_ok=True)
        with TRACE_PATH.open("a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False, default=str) + "\n")
    except Exception as exc:
        print(f"Trace logging failed: {exc}")


def trace_path() -> str:
    log_func("trace_path", level=2)
    return str(TRACE_PATH)


def _sanitize(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            str(key): _sanitize(val)
            for key, val in value.items()
            if not _looks_secret(str(key))
        }
    if isinstance(value, list):
        return [_sanitize(item) for item in value]
    if isinstance(value, tuple):
        return [_sanitize(item) for item in value]
    if isinstance(value, str):
        return _truncate(value)
    return value


def _truncate(text: str) -> str:
    if len(text) <= MAX_TEXT_CHARS:
        return text
    return text[:MAX_TEXT_CHARS] + f"...[truncated {len(text) - MAX_TEXT_CHARS} chars]"


def _looks_secret(key: str) -> bool:
    normalized = key.lower()
    return any(marker in normalized for marker in ("api_key", "apikey", "token", "secret", "password", "authorization"))
