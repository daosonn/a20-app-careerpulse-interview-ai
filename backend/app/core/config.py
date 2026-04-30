import os
import base64
import httpx
import json
import re
from pathlib import Path
from dotenv import load_dotenv

from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.embeddings import DashScopeEmbeddings, JinaEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from openai import AsyncOpenAI
from google import genai
from google.genai import types

# ==========================================
# 0. PATH CONFIGURATION
# ==========================================
# This file is in backend/app/core/config.py
# ROOT_DIR is the root of the entire repository
CORE_DIR = Path(__file__).resolve().parent
APP_DIR = CORE_DIR.parent
BACKEND_DIR = APP_DIR.parent
PROJECT_ROOT = BACKEND_DIR.parent

# Common Data Directories
DATA_DIR = PROJECT_ROOT / "raw_data"
LOGS_DIR = BACKEND_DIR / "logs"

# Ensure directories exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
LOGS_DIR.mkdir(parents=True, exist_ok=True)

# 1. Load môi trường
load_dotenv()

# Thêm cấu hình chọn loại embedding model
EMBEDDING_PROVIDER = os.getenv("EMBEDDING_PROVIDER", "jina").lower() # Có thể chọn 'jina', 'openai', hoặc 'gemini'

if EMBEDDING_PROVIDER == "openai":
    # Embedding model cho RAG dùng OpenAI
    embedding_model = OpenAIEmbeddings(
        model="text-embedding-3-small",
        api_key=os.getenv("OPENAI_API_KEY")
    )
elif EMBEDDING_PROVIDER == "gemini":
    # Embedding model cho RAG dùng Google Gemini
    embedding_model = GoogleGenerativeAIEmbeddings(
        model="text-embedding-004",
        google_api_key=os.getenv("GEMINI_API_KEY")
    )
else:
    # Mặc định: Embedding model cho RAG dùng Jina AI
    EMBEDDING_PROVIDER = "jina"
    embedding_model = JinaEmbeddings(
        jina_api_key=os.getenv("JINA_API_KEY"),
        model_name="jina-embeddings-v4"
    )

# ==========================================
# 1. OPENAI CONFIGURATION
# ==========================================

# class LLMFactory:
#     @staticmethod
#     def get_llm(model_name: str = "gpt-4o-mini", temperature: float = 0.7):
#         return ChatOpenAI(
#             model=model_name,
#             temperature=temperature,
#             api_key=os.getenv("OPENAI_API_KEY"),
#             streaming=True
#         )

# # 1. LLM Initializations
# CHAT_MODEL = "gpt-4o-mini"
# interviewer_llm = LLMFactory.get_llm(CHAT_MODEL, 0.7).with_config({"tags": ["interviewer"]})
# evaluator_llm = LLMFactory.get_llm(CHAT_MODEL, 0.2)

# # 2. Raw Async Client
# openai_async_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
# async_client = openai_async_client

# # 3. STT (Speech-to-Text) Centralized Helper
# async def transcribe_audio_async(file_path: str) -> str:
#     """Helper for Whisper transcription."""
#     with open(file_path, "rb") as audio_file:
#         transcript = await async_client.audio.transcriptions.create(
#             model="whisper-1",
#             file=audio_file
#         )
#     return transcript.text

# # 4. TTS (Text-to-Speech) Centralized Helper
# async def generate_speech_base64_async(
#     text: str,
#     model: str = "gpt-4o-mini-tts",
#     character: str | None = None,
#     provider: str | None = None,
#     trace_context: dict | None = None,
# ) -> str:
#     """Helper for interview TTS conversion to Base64 WAV."""
#     if not text:
#         return ""
#     try:
#         response = await async_client.audio.speech.create(
#             model=model,
#             voice="nova",
#             input=text
#         )
#         return base64.b64encode(response.content).decode('utf-8')
#         from app.services.tts_service import synthesize_interview_tts_base64

#         result = await synthesize_interview_tts_base64(
#             character or "Ms. Linh",
#             text,
#             provider=provider or os.getenv("INTERVIEW_TTS_PROVIDER", "auto"),
#             openai_model=model,
#         )
#         if trace_context:
#             from app.services.trace_logger import trace_event

#             trace_event(trace_context.get("session_id"), trace_context.get("event", "tts.generated"), {
#                 **trace_context,
#                 "text": text,
#                 "provider": result.provider,
#                 "model": result.model,
#                 "voice": result.voice,
#                 "character": result.character,
#                 "mime_type": result.mime_type,
#                 "fallback_reason": result.fallback_reason,
#                 "audio_base64_length": len(result.audio_base64),
#             })
#         return result.audio_base64
#     except Exception as e:
#         if trace_context:
#             from app.services.trace_logger import trace_event

#             trace_event(trace_context.get("session_id"), trace_context.get("event", "tts.failed"), {
#                 **trace_context,
#                 "text": text,
#                 "character": character or "Ms. Linh",
#                 "model": model,
#                 "error": str(e),
#             })
#         print(f"TTS Error: {e}")
#         return ""


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

# # Async Client theo mẫu chuẩn
# alibaba_async_client = AsyncOpenAI(
#     api_key=DASHSCOPE_API_KEY,
#     base_url=DASHSCOPE_COMPATIBLE_BASE_URL
# )
# async_client = alibaba_async_client

# # Mấy model âm thanh của alibaba này không dùng được cho tiếng việt lắm.
# async def transcribe_audio_async(file_path: str, model: str = "qwen3-asr-flash-2025-09-08") -> str:
#     """
#     Sử dụng model Qwen3-ASR mới nhất qua Multimodal Generation API.
#     """
#     url = f"{DASHSCOPE_API_BASE_URL}/services/aigc/multimodal-generation/generation"
#     headers = {
#         "Authorization": f"Bearer {DASHSCOPE_API_KEY}",
#         "Content-Type": "application/json"
#     }
    
#     try:
#         with open(file_path, "rb") as f:
#             audio_base64 = base64.b64encode(f.read()).decode('utf-8')
        
#         ext = os.path.splitext(file_path)[1].replace(".", "") or "wav"
#         payload = {
#             "model": model,
#             "input": {
#                 "messages": [
#                     {
#                         "role": "user",
#                         "content": [
#                             {"audio": f"data:audio/{ext};base64,{audio_base64}"},
#                             {"text": "Transcribe this audio."}
#                         ]
#                     }
#                 ]
#             }
#         }
        
#         async with httpx.AsyncClient() as client:
#             response = await client.post(url, headers=headers, json=payload, timeout=60.0)
#             if response.status_code == 200:
#                 result = response.json()
#                 try:
#                     return result["output"]["choices"][0]["message"]["content"][0]["text"]
#                 except (KeyError, IndexError):
#                     return str(result)
#             else:
#                 print(f"Alibaba STT Error: {response.status_code} - {response.text}")
#                 return ""
#     except Exception as e:
#         print(f"STT Exception: {e}")
#         return ""

# async def generate_speech_base64_async(text: str, model: str = "qwen3-tts-flash") -> str:
#     """
#     Sử dụng model Qwen3-TTS mới nhất qua Multimodal Generation API.
#     """
#     # Clean text: remove markdown separators and symbols that might upset TTS
#     clean_text = re.sub(r'[-*#_~`>]+', ' ', text).strip()
#     # Remove multiple spaces
#     clean_text = re.sub(r'\s+', ' ', clean_text)
    
#     if not clean_text or len(clean_text) < 2: return ""
    
#     url = f"{DASHSCOPE_API_BASE_URL}/services/aigc/multimodal-generation/generation"
#     headers = {
#         "Authorization": f"Bearer {DASHSCOPE_API_KEY}",
#         "Content-Type": "application/json"
#     }
    
#     # Cấu trúc payload theo tài liệu Qwen3-TTS
#     payload = {
#         "model": model,
#         "input": {
#             "text": clean_text,
#             "voice": "Genny" # Các voice phổ biến: Cherry, Genny, Longxiaochun
#         },
#         "parameters": {
#             "format": "mp3"
#         }
#     }
    
#     try:
#         async with httpx.AsyncClient() as client:
#             response = await client.post(url, headers=headers, json=payload, timeout=30.0)
#             if response.status_code == 200:
#                 # Nếu API trả về binary trực tiếp (tùy theo model và header)
#                 if response.headers.get("Content-Type") == "audio/mpeg":
#                     return base64.b64encode(response.content).decode('utf-8')
                
#                 result = response.json()
#                 try:
#                     # 1. Thử trích xuất từ cấu trúc output.audio (Mẫu mới Qwen3-TTS)
#                     audio_info = result.get("output", {}).get("audio", {})
#                     audio_data = audio_info.get("data")
#                     audio_url = audio_info.get("url")

#                     if audio_data:
#                         if "," in audio_data:
#                             return audio_data.split(",")[1]
#                         return audio_data
                    
#                     if audio_url:
#                         # Download audio từ URL nếu data rỗng
#                         audio_resp = await client.get(audio_url)
#                         if audio_resp.status_code == 200:
#                             return base64.b64encode(audio_resp.content).decode('utf-8')
                    
#                     # 2. Thử trích xuất từ cấu trúc multimodal choices (Mẫu cũ/tương thích)
#                     choices = result.get("output", {}).get("choices")
#                     if choices and len(choices) > 0:
#                         content = choices[0].get("message", {}).get("content", [])
#                         if content and isinstance(content, list) and len(content) > 0:
#                             audio_item = content[0].get("audio")
#                             if audio_item:
#                                 if "," in audio_item:
#                                     return audio_item.split(",")[1]
#                                 return audio_item

#                     print(f"Alibaba TTS Parse Error: No audio found in response structure. Result: {result}")
#                     return ""
#                 except Exception as e:
#                     print(f"Alibaba TTS Parse Exception: {e} - Result: {result}")
#                     return ""
#             else:
#                 try:
#                     error_json = response.json()
#                     if error_json.get("code") == "InvalidParameter":
#                         print(f"Alibaba TTS Error: 400 - Invalid text or characters for model {model}. Text: '{text[:100]}...'")
#                     else:
#                         print(f"Alibaba TTS Error: {response.status_code} - {response.text}")
#                 except:
#                     print(f"Alibaba TTS Error: {response.status_code} - {response.text}")
#                 return ""
#     except Exception as e:
#         print(f"Alibaba TTS Exception: {e}")
#         return ""