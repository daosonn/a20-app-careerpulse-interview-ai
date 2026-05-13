from __future__ import annotations
import asyncio
import base64
import io
import os
import wave
from dataclasses import dataclass
from typing import Literal

from dotenv import load_dotenv
from openai import OpenAI

from app.core.logger import log_func

Provider = Literal["auto", "gemini", "openai"]
TTSProvider = Literal["gemini", "openai"]

DEFAULT_GEMINI_MODEL = os.getenv("GEMINI_TTS_MODEL", "gemini-3.1-flash-tts-preview")
DEFAULT_OPENAI_MODEL = os.getenv("OPENAI_TTS_MODEL", "gpt-4o-mini-tts")
WAV_CHANNELS = 1
WAV_RATE = 24000
WAV_SAMPLE_WIDTH = 2
WAV_MIME_TYPE = "audio/wav"


@dataclass(frozen=True)
class VoiceProfile:
    gemini_voice: str
    openai_voice: str
    style: str


@dataclass(frozen=True)
class TTSResult:
    audio_base64: str
    mime_type: str
    provider: TTSProvider
    model: str
    voice: str
    character: str
    fallback_reason: str | None = None


CHARACTER_VOICES: dict[str, VoiceProfile] = {
    "Ms. Linh": VoiceProfile(
        gemini_voice="Aoede",
        openai_voice="coral",
        style="friendly, cheerful, professional female interview host",
    ),
    "Ms. Nguyen": VoiceProfile(
        gemini_voice="Sulafat",
        openai_voice="nova",
        style="warm, natural, smiling female interview guest",
    ),
    "Mr. Hung": VoiceProfile(
        gemini_voice="Puck",
        openai_voice="echo",
        style="upbeat, conversational adult male interview voice",
    ),
}

PERSONA_TO_CHARACTER = {
    "hr": "Ms. Linh",
    "linh": "Ms. Linh",
    "ms_linh": "Ms. Linh",
    "ms. linh": "Ms. Linh",
    "tech": "Ms. Nguyen",
    "nguyen": "Ms. Nguyen",
    "ms_nguyen": "Ms. Nguyen",
    "ms. nguyen": "Ms. Nguyen",
    "lead": "Mr. Hung",
    "manager": "Mr. Hung",
    "hung": "Mr. Hung",
    "mr_hung": "Mr. Hung",
    "mr. hung": "Mr. Hung",
    "tanaka": "Mr. Hung",
    "mr_tanaka": "Mr. Hung",
    "mr. tanaka": "Mr. Hung",
}


def normalize_character(character: str | None = None, persona_id: str | None = None) -> str:
    log_func("normalize_character", level=2)
    raw = (character or persona_id or "Ms. Linh").strip()
    if raw in CHARACTER_VOICES:
        return raw

    normalized = raw.lower().replace("-", "_")
    if normalized in PERSONA_TO_CHARACTER:
        return PERSONA_TO_CHARACTER[normalized]

    names = ", ".join(CHARACTER_VOICES)
    raise ValueError(f"Unsupported character '{raw}'. Use one of: {names}.")


def character_from_phase(phase: str | int | None) -> str:
    log_func("character_from_phase", level=2)
    phase_text = str(phase or "")
    if any(keyword in phase_text for keyword in ("Introduction", "Motivation", "HR")):
        return "Ms. Linh"
    if "Technical" in phase_text:
        return "Ms. Nguyen"
    return "Mr. Hung"


async def synthesize_interview_tts_base64(
    character: str,
    text: str,
    *,
    provider: Provider = "auto",
    gemini_model: str = DEFAULT_GEMINI_MODEL,
    openai_model: str = DEFAULT_OPENAI_MODEL,
    load_env: bool = True,
) -> TTSResult:
    log_func("synthesize_interview_tts_base64")
    if load_env:
        load_dotenv()

    clean_text = text.strip()
    if not clean_text:
        raise ValueError("Text is required.")

    profile = _get_voice_profile(character)

    if provider == "openai":
        audio = await asyncio.to_thread(_generate_openai_wav_bytes, clean_text, profile, openai_model)
        return _result(audio, "openai", openai_model, profile.openai_voice, character)

    try:
        audio = await asyncio.to_thread(_generate_gemini_wav_bytes, clean_text, profile, gemini_model)
        return _result(audio, "gemini", gemini_model, profile.gemini_voice, character)
    except Exception as exc:
        if provider == "gemini":
            raise

        audio = await asyncio.to_thread(_generate_openai_wav_bytes, clean_text, profile, openai_model)
        return _result(
            audio,
            "openai",
            openai_model,
            profile.openai_voice,
            character,
            fallback_reason=str(exc),
        )


def _get_voice_profile(character: str) -> VoiceProfile:
    log_func("_get_voice_profile", level=2)
    try:
        return CHARACTER_VOICES[character]
    except KeyError as exc:
        names = ", ".join(CHARACTER_VOICES)
        raise ValueError(f"Unsupported character '{character}'. Use one of: {names}.") from exc


def _generate_gemini_wav_bytes(text: str, profile: VoiceProfile, model: str) -> bytes:
    log_func("_generate_gemini_wav_bytes", level=2)
    if not os.getenv("GEMINI_API_KEY") and not os.getenv("GOOGLE_API_KEY"):
        raise RuntimeError("Missing GEMINI_API_KEY or GOOGLE_API_KEY.")

    from google import genai
    from google.genai import types

    client = genai.Client()
    response = client.models.generate_content(
        model=model,
        contents=f"[{profile.style}] {text}",
        config=types.GenerateContentConfig(
            response_modalities=["AUDIO"],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name=profile.gemini_voice,
                    )
                )
            ),
        ),
    )
    return _wave_bytes(_first_gemini_audio_bytes(response))


def _generate_openai_wav_bytes(text: str, profile: VoiceProfile, model: str) -> bytes:
    log_func("_generate_openai_wav_bytes", level=2)
    if not os.getenv("OPENAI_API_KEY"):
        raise RuntimeError("Missing OPENAI_API_KEY.")

    client = OpenAI()
    with client.audio.speech.with_streaming_response.create(
        model=model,
        voice=profile.openai_voice,
        input=text,
        instructions=f"Speak with this style: {profile.style}.",
        response_format="pcm",
    ) as response:
        return _wave_bytes(response.read())


def _first_gemini_audio_bytes(response) -> bytes:
    log_func("_first_gemini_audio_bytes", level=2)
    for candidate in response.candidates or []:
        if not candidate.content:
            continue
        for part in candidate.content.parts or []:
            inline_data = getattr(part, "inline_data", None)
            if inline_data and inline_data.data:
                data = inline_data.data
                return base64.b64decode(data) if isinstance(data, str) else data
    raise RuntimeError("Gemini did not return inline audio data.")


def _wave_bytes(pcm: bytes) -> bytes:
    log_func("_wave_bytes", level=2)
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wf:
        wf.setnchannels(WAV_CHANNELS)
        wf.setsampwidth(WAV_SAMPLE_WIDTH)
        wf.setframerate(WAV_RATE)
        wf.writeframes(pcm)
    return buffer.getvalue()


def _result(
    audio: bytes,
    provider: TTSProvider,
    model: str,
    voice: str,
    character: str,
    fallback_reason: str | None = None,
) -> TTSResult:
    log_func("_result", level=2)
    return TTSResult(
        audio_base64=base64.b64encode(audio).decode("utf-8"),
        mime_type=WAV_MIME_TYPE,
        provider=provider,
        model=model,
        voice=voice,
        character=character,
        fallback_reason=fallback_reason,
    )
