"""
cv_guard.py — Input security layer for CV and JD text.

Two protections:
1. Prompt injection detection — blocks LLM manipulation patterns before they reach any model.
2. PII scrubbing — replaces personal identifiers with placeholders before text enters the LLM.

Usage:
    from app.services.cv_guard import detect_injection, scrub_pii, GuardResult

    result = detect_injection(cv_text)
    if result.is_malicious:
        raise HTTPException(422, detail=f"CV bị từ chối: {result.reason}")

    safe_text = scrub_pii(cv_text)   # send safe_text to LLM
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional


# ── Prompt injection patterns ──────────────────────────────────────────────
# Each entry: (human-readable label, compiled pattern)
# Patterns cover instruction override, persona hijacking, jailbreak keywords,
# LLM framework boundary markers, and data exfiltration attempts.

_INJECTION_RULES: list[tuple[str, re.Pattern]] = [
    ("instruction override", re.compile(
        r"ignore\s+(all\s+)?(previous|prior|above|earlier)\s+"
        r"(instructions?|prompts?|rules?|context|constraints?)",
        re.I,
    )),
    ("instruction override", re.compile(
        r"disregard\s+(all\s+)?(previous|prior|above|earlier)\s+"
        r"(instructions?|prompts?|rules?|constraints?)",
        re.I,
    )),
    ("instruction override", re.compile(
        r"forget\s+(all\s+)?(previous|prior|above|your)\s+"
        r"(instructions?|prompts?|training|rules?|constraints?)",
        re.I,
    )),
    ("system override", re.compile(
        r"override\s+(the\s+)?(system|all)\s+(prompt|instructions?|rules?)",
        re.I,
    )),
    ("persona hijack", re.compile(r"\byou\s+are\s+now\s+(a|an|the)\b", re.I)),
    ("persona hijack", re.compile(r"\bpretend\s+(you\s+are|to\s+be)\b", re.I)),
    ("persona hijack", re.compile(
        r"\bact\s+as\s+(a|an|the)\s+\w+(\s+\w+)?\s+"
        r"(without|ignoring|that\s+ignores?|who\s+ignores?|that\s+disregards?)",
        re.I,
    )),
    ("role reassign", re.compile(
        r"\byour\s+new\s+(role|persona|identity|instructions?|task)\s+(is|are)\b",
        re.I,
    )),
    ("DAN jailbreak", re.compile(r"\bdo\s+anything\s+now\b", re.I)),
    ("DAN jailbreak", re.compile(r"\bdan\s+mode\b", re.I)),
    ("jailbreak keyword", re.compile(r"\bjailbreak\b", re.I)),
    # LLM framework boundary markers (ChatML, Llama, Mistral, etc.)
    ("LLM boundary marker", re.compile(r"<\|im_(start|end|sep)\|>")),
    ("LLM boundary marker", re.compile(r"\[INST\]|\[/INST\]|\[SYS\]|\[/SYS\]")),
    ("LLM boundary marker", re.compile(r"<\|system\|>|<\|user\|>|<\|assistant\|>")),
    ("prompt header", re.compile(r"###\s*(system|instruction|prompt)\b", re.I)),
    # Exfiltration / prompt-reading attempts
    ("exfiltration", re.compile(
        r"(print|reveal|show|output|repeat|display)\s+(your\s+)?"
        r"(system\s+prompt|instructions?|api\s+key|secret\s+key|internal\s+prompt)",
        re.I,
    )),
    ("new instructions block", re.compile(r"\bnew\s+instructions?\s*:\s*\n", re.I)),
]


@dataclass
class GuardResult:
    is_malicious: bool
    reason: Optional[str] = None
    matched_text: Optional[str] = None


def detect_injection(text: str) -> GuardResult:
    """
    Scan text for prompt injection patterns.

    Returns GuardResult with is_malicious=True and details on the first match found.
    Returns is_malicious=False if no patterns match.
    """
    for label, pattern in _INJECTION_RULES:
        m = pattern.search(text)
        if m:
            return GuardResult(
                is_malicious=True,
                reason=label,
                matched_text=m.group(0)[:100],
            )
    return GuardResult(is_malicious=False)


# ── PII scrubbing ──────────────────────────────────────────────────────────
# Rules are applied in order. More specific patterns (longer IDs) come first
# to avoid partial matches swallowing digits needed by a later pattern.

_PII_RULES: list[tuple[re.Pattern, str]] = [
    # Email addresses
    (
        re.compile(r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b"),
        "[EMAIL]",
    ),
    # Vietnamese mobile: 0xx or +84xx + 7 digits
    (
        re.compile(
            r"(?<!\d)(\+84|0)(3[2-9]|5[6-9]|7[06-9]|8[0-9]|9[0-9])\d{7}(?!\d)"
        ),
        "[SĐT]",
    ),
    # Generic international phone: +CC NNN NNNN or similar
    (
        re.compile(r"\+\d{1,3}[\s.\-]?\(?\d{2,4}\)?[\s.\-]?\d{3,4}[\s.\-]?\d{3,4}"),
        "[SĐT]",
    ),
    # Vietnamese CCCD (12 digits) — must precede 9-digit rule to avoid partial match
    (re.compile(r"(?<!\d)\d{12}(?!\d)"), "[SỐ ID]"),
    # Vietnamese CMND (9 digits)
    (re.compile(r"(?<!\d)\d{9}(?!\d)"), "[SỐ ID]"),
    # Passport: 1-2 capital letters + 6-8 digits
    (re.compile(r"\b[A-Z]{1,2}\d{6,8}\b"), "[HỘ CHIẾU]"),
]


def scrub_pii(text: str) -> str:
    """
    Replace PII tokens with placeholder labels.

    Covers: email, Vietnamese and international phone numbers,
    Vietnamese national ID (CCCD/CMND), and passport numbers.

    Returns the sanitised text. Does not mutate the original string.
    """
    for pattern, placeholder in _PII_RULES:
        text = pattern.sub(placeholder, text)
    return text
