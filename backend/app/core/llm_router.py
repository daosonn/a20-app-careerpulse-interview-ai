"""
LLM Router — Fallback Ladder for real-time interview sessions.

Tier 1  gpt-4o-mini          20 s timeout  (primary)
Tier 2  gpt-4o-mini retry     12 s timeout  (1.5 s backoff, transient faults)
Tier 3  claude-haiku-4-5      25 s timeout  (cross-provider last resort)

Usage:
    from app.core.llm_router import chat_with_fallback
    text = await chat_with_fallback(messages, require_json=True)
"""
from __future__ import annotations

import asyncio
import os
from typing import Any, Dict, List

import openai
from openai import AsyncOpenAI

from app.core.logger import log_func

_openai = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

_RETRYABLE = (
    openai.RateLimitError,
    openai.APITimeoutError,
    openai.APIConnectionError,
    openai.InternalServerError,
)


def _retryable(exc: Exception) -> bool:
    return isinstance(exc, _RETRYABLE)


async def _openai_call(
    messages: List[Dict[str, Any]],
    model: str,
    temperature: float,
    timeout: float,
    require_json: bool,
) -> str:
    kwargs: Dict[str, Any] = dict(
        model=model, messages=messages, temperature=temperature, timeout=timeout
    )
    if require_json:
        kwargs["response_format"] = {"type": "json_object"}
    resp = await _openai.chat.completions.create(**kwargs)
    return resp.choices[0].message.content or ""


async def _claude_call(
    messages: List[Dict[str, Any]],
    temperature: float,
    timeout: float,
) -> str:
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY not configured")

    from anthropic import AsyncAnthropic

    system = ""
    user_msgs: List[Dict[str, str]] = []
    for m in messages:
        if m["role"] == "system":
            system = str(m["content"])
        else:
            user_msgs.append({"role": m["role"], "content": str(m["content"])})
    if not user_msgs:
        user_msgs = [{"role": "user", "content": "Please respond."}]

    client = AsyncAnthropic(api_key=api_key)
    resp = await asyncio.wait_for(
        client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2048,
            temperature=min(temperature, 1.0),
            system=system or "You are a helpful assistant. Return valid JSON when asked.",
            messages=user_msgs,
        ),
        timeout=timeout,
    )
    return resp.content[0].text if resp.content else ""


async def chat_with_fallback(
    messages: List[Dict[str, Any]],
    *,
    temperature: float = 0.7,
    require_json: bool = False,
    primary_model: str = "gpt-4o-mini",
    primary_timeout: float = 20.0,
    retry_timeout: float = 12.0,
    fallback_timeout: float = 25.0,
) -> str:
    """
    Try gpt-4o-mini → retry gpt-4o-mini → Claude Haiku.
    Re-raises the last exception only if all three tiers fail.
    """
    log_func("chat_with_fallback")
    last_exc: Exception | None = None

    # Tier 1
    try:
        return await _openai_call(messages, primary_model, temperature, primary_timeout, require_json)
    except Exception as exc:
        print(f"[llm_router] tier1 ({primary_model}) failed: {type(exc).__name__}: {exc}")
        last_exc = exc

    # Tier 2 — only for transient errors
    if _retryable(last_exc):
        await asyncio.sleep(1.5)
        try:
            return await _openai_call(messages, primary_model, temperature, retry_timeout, require_json)
        except Exception as exc2:
            print(f"[llm_router] tier2 retry failed: {type(exc2).__name__}: {exc2}")
            last_exc = exc2

    # Tier 3 — Claude Haiku
    try:
        print("[llm_router] escalating to Claude Haiku (tier3)")
        return await _claude_call(messages, temperature, fallback_timeout)
    except Exception as exc3:
        print(f"[llm_router] tier3 (Claude Haiku) failed: {type(exc3).__name__}: {exc3}")
        raise last_exc or exc3


async def transcribe_with_retry(
    file_path: str,
    *,
    max_attempts: int = 2,
    timeout: float = 30.0,
) -> str:
    """
    Whisper transcription with retry. Returns empty string on full failure
    so the interview session is never hard-crashed by a single STT hiccup.
    """
    log_func("transcribe_with_retry")
    last_exc: Exception | None = None

    for attempt in range(1, max_attempts + 1):
        try:
            with open(file_path, "rb") as f:
                resp = await asyncio.wait_for(
                    _openai.audio.transcriptions.create(model="whisper-1", file=f),
                    timeout=timeout,
                )
            return resp.text
        except Exception as exc:
            print(f"[llm_router] STT attempt {attempt}/{max_attempts} failed: {exc}")
            last_exc = exc
            if attempt < max_attempts:
                await asyncio.sleep(1.0)

    print(f"[llm_router] STT exhausted — returning empty string")
    return ""
