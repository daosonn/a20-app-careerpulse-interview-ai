import base64
import httpx
import json
import os
import re
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types
from langchain_community.embeddings import JinaEmbeddings
from langchain_openai import ChatOpenAI
from openai import AsyncOpenAI

from app.core.logger import log_func

# ==========================================
# 0. PATH CONFIGURATION
# ==========================================
CORE_DIR = Path(__file__).resolve().parent
APP_DIR = CORE_DIR.parent
BACKEND_DIR = APP_DIR.parent
PROJECT_ROOT = BACKEND_DIR.parent

# Unified Storage Directory at Root
GLOBAL_DATA_DIR = PROJECT_ROOT / "database"
SQL_DATA_DIR = GLOBAL_DATA_DIR / "sql"
VECTOR_DATA_DIR = GLOBAL_DATA_DIR / "vector"
LOGS_DIR = GLOBAL_DATA_DIR / "logs"
RAW_DATA_DIR = GLOBAL_DATA_DIR / "raw"

# Ensure all storage directories exist
for directory in [SQL_DATA_DIR, VECTOR_DATA_DIR, LOGS_DIR, RAW_DATA_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

# Compatibility aliases
DATA_DIR = RAW_DATA_DIR 

# 1. Load môi trường
load_dotenv()

# Initialize Jina as the ONLY embedding model
jina_embedding = JinaEmbeddings(
    jina_api_key=os.getenv("JINA_API_KEY"),
    model_name="jina-embeddings-v4"
)

# Defaults
EMBEDDING_PROVIDER = "jina"
embedding_model = jina_embedding

# ==========================================
# 1. OPENAI CONFIGURATION
# ==========================================

class LLMFactory:
    @staticmethod
    def get_llm(model_name: str = "gpt-4o-mini", temperature: float = 0.7):
        log_func("LLMFactory.get_llm", level=2)
        return ChatOpenAI(
            model=model_name,
            temperature=temperature,
            api_key=os.getenv("OPENAI_API_KEY"),
            streaming=True
        )

# 1. LLM Initializations
CHAT_MODEL = "gpt-4o-mini"
interviewer_llm = LLMFactory.get_llm(CHAT_MODEL, 0.7).with_config({"tags": ["interviewer"]})
evaluator_llm = LLMFactory.get_llm(CHAT_MODEL, 0.2)

# 2. Raw Async Client
openai_async_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
async_client = openai_async_client

# 3. STT (Speech-to-Text) Centralized Helper
async def transcribe_audio_async(file_path: str) -> str:
    log_func("transcribe_audio_async")
    """Helper for Whisper transcription."""
    with open(file_path, "rb") as audio_file:
        transcript = await async_client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file
        )
    return transcript.text

# 4. TTS (Text-to-Speech) Centralized Helper
async def generate_speech_base64_async(
    text: str,
    model: str = "gpt-4o-mini-tts",
    character: str | None = None,
    provider: str | None = None,
    trace_context: dict | None = None,
) -> str:
    log_func("generate_speech_base64_async")
    """Helper for interview TTS conversion to Base64 WAV."""
    if not text:
        return ""
    try:
        from app.services.tts_service import synthesize_interview_tts_base64

        result = await synthesize_interview_tts_base64(
            character or "Ms. Linh",
            text,
            provider=provider or os.getenv("INTERVIEW_TTS_PROVIDER", "auto"),
            openai_model=model,
        )
        if trace_context:
            from app.services.trace_logger import trace_event

            trace_event(trace_context.get("session_id"), trace_context.get("event", "tts.generated"), {
                **trace_context,
                "text": text,
                "provider": result.provider,
                "model": result.model,
                "voice": result.voice,
                "character": result.character,
                "mime_type": result.mime_type,
                "fallback_reason": result.fallback_reason,
                "audio_base64_length": len(result.audio_base64),
            })
        return result.audio_base64
    except Exception as e:
        if trace_context:
            from app.services.trace_logger import trace_event

            trace_event(trace_context.get("session_id"), trace_context.get("event", "tts.failed"), {
                **trace_context,
                "text": text,
                "character": character or "Ms. Linh",
                "model": model,
                "error": str(e),
            })
        print(f"TTS Error: {e}")
        return ""

# ==========================================
# 2. LLM & EMBEDDING INITIALIZATION - GEMINI (NATIVE)
# ==========================================

# GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
# gemini_client = genai.Client(api_key=GEMINI_API_KEY)
# CHAT_MODEL = "gemini-1.5-flash"

# class LLMFactory:
#     @staticmethod
#     def get_llm(model_name: str = "gemini-1.5-flash", temperature: float = 0.7):
#         return ChatGoogleGenerativeAI(
#             model=model_name,
#             temperature=temperature,
#             google_api_key=GEMINI_API_KEY,
#             streaming=True
#         )

# interviewer_llm = LLMFactory.get_llm(CHAT_MODEL, 0.7).with_config({"tags": ["interviewer"]})
# evaluator_llm = LLMFactory.get_llm(CHAT_MODEL, 0.2)

# # 2. Async Client (Native Wrapper or None)
# async_client = gemini_client

# # 3. STT (Speech-to-Text) Centralized Helper
# async def transcribe_audio_async(file_path: str, model_name: str = "gemini-1.5-flash") -> str:
#     """Sử dụng Gemini Multimodal để chuyển đổi âm thanh sang văn bản."""
#     try:
#         with open(file_path, "rb") as f:
#             audio_data = f.read()
            
#         # Sử dụng API generate_content trực tiếp với byte dữ liệu
#         response = await client.aio.models.generate_content(
#             model=model_name,
#             contents=[
#                 types.Part.from_bytes(data=audio_data, mime_type="audio/wav"), # Hoặc audio/mpeg
#                 """Hãy chuyển đổi đoạn âm thanh này thành văn bản chính xác nhất có thể.
#                 Audio là dạng nói tiếng việt xem lẫn 1 chút các từ nói bằng tiếng anh chuyên ngành IT, Data, AI, Computer Science nên bạn hãy để nguyên được các từ tiếng anh trong văn bản output
#                 """
#             ]
#         )
#         return response.text
#     except Exception as e:
#         print(f"Gemini STT Error: {e}")
#         return ""

# # 4. TTS (Text-to-Speech) - Gemini Speech Generation
# async def generate_speech_base64_async(text: str, model_name: str = "gemini-1.5-flash") -> str:
#     """
#     Sử dụng tính năng Speech Generation (TTS) mới của Gemini 1.5.
#     Trả về chuỗi Base64 của file âm thanh.
#     """
#     if not text:
#         return ""
#     try:
#         # Cấu hình cấu trúc phản hồi để yêu cầu Audio output
#         response = await client.aio.models.generate_content(
#             model=model_name,
#             contents=text,
#             config=types.GenerateContentConfig(
#                 response_mime_type="audio/wav", # Yêu cầu đầu ra là âm thanh
#             )
#         )
        
#         # Trích xuất dữ liệu audio từ các part trong response
#         for part in response.candidates[0].content.parts:
#             if part.inline_data:
#                 # Trả về base64 trực tiếp từ dữ liệu inline
#                 return base64.b64encode(part.inline_data.data).decode('utf-8')
                
#         return ""
#     except Exception as e:
#         print(f"Gemini TTS Error: {e}")
#         return ""

# ==========================================
# 3. LLM & EMBEDDING INITIALIZATION - ALIBABA
# ==========================================

# DASHSCOPE_API_KEY = os.getenv("DASHSCOPE_API_KEY")
# # Base URL cho cổng tương thích OpenAI (Dùng cho Chat, LLM)
# DASHSCOPE_COMPATIBLE_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
# # Base URL cho các dịch vụ gốc (Dùng cho STT, TTS, Embedding)
# DASHSCOPE_API_BASE_URL = "https://dashscope-intl.aliyuncs.com/api/v1"

# class LLMFactory:
#     @staticmethod
#     def get_llm(model_name: str = "qwen-plus", temperature: float = 0.7):
#         """Khởi tạo LangChain ChatOpenAI tương thích với Alibaba Qwen."""
#         return ChatOpenAI(
#             model=model_name, 
#             temperature=temperature, 
#             api_key=DASHSCOPE_API_KEY,
#             base_url=DASHSCOPE_COMPATIBLE_BASE_URL,
#             streaming=True
#         )

# # Khởi tạo các instance chính
# CHAT_MODEL = "qwen-plus"
# interviewer_llm = LLMFactory.get_llm(CHAT_MODEL, 0.7).with_config({"tags": ["interviewer"]})
# evaluator_llm = LLMFactory.get_llm("qwen-turbo", 0.2)
