from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.core.auth import CurrentUser
from app.services.tts_service import (
    Provider,
    normalize_character,
    synthesize_interview_tts_base64,
)
from app.services.trace_logger import trace_event


router = APIRouter()


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=4000)
    language: str | None = None
    persona_id: str | None = None
    character: str | None = None
    provider: Provider = "auto"


@router.post("/speak")
async def speak(req: TTSRequest, current_user: CurrentUser):
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text is required.")

    try:
        character = normalize_character(req.character, req.persona_id)
        trace_event(None, "tts.endpoint_request", {
            "user_id": current_user.id,
            "character": character,
            "persona_id": req.persona_id,
            "provider": req.provider,
            "language": req.language,
            "text": text,
        })
        result = await synthesize_interview_tts_base64(
            character,
            text,
            provider=req.provider,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        trace_event(None, "tts.endpoint_failed", {
            "user_id": current_user.id,
            "character": req.character,
            "persona_id": req.persona_id,
            "provider": req.provider,
            "language": req.language,
            "text": text,
            "error": str(exc),
        })
        raise HTTPException(status_code=502, detail=f"Unable to generate speech audio: {exc}") from exc

    trace_event(None, "tts.endpoint_result", {
        "user_id": current_user.id,
        "character": result.character,
        "provider": result.provider,
        "model": result.model,
        "voice": result.voice,
        "mime_type": result.mime_type,
        "fallback_reason": result.fallback_reason,
        "audio_base64_length": len(result.audio_base64),
    })

    return {
        "audio_base64": result.audio_base64,
        "mime_type": result.mime_type,
        "provider": result.provider,
        "model": result.model,
        "voice": result.voice,
        "character": result.character,
        "fallback_reason": result.fallback_reason,
    }
