import os
import base64
import httpx
import json
import re
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.embeddings import DashScopeEmbeddings, JinaEmbeddings
from openai import AsyncOpenAI
from dotenv import load_dotenv

# 1. Load môi trường
load_dotenv()

# ==========================================
# 1. OPENAI CONFIGURATION
# ==========================================

class LLMFactory:
    @staticmethod
    def get_llm(model_name: str = "gpt-4o-mini", temperature: float = 0.7):
        return ChatOpenAI(
            model=model_name, 
            temperature=temperature, 
            api_key=os.getenv("OPENAI_API_KEY"),
            streaming=True
        )

# 1. LLM Initializations
interviewer_llm = LLMFactory.get_llm("gpt-4o-mini", 0.7).with_config({"tags": ["interviewer"]})
evaluator_llm = LLMFactory.get_llm("gpt-4o-mini", 0.2)

# 2. Raw Async Client
async_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
openai_async_client = async_client

# 3. STT (Speech-to-Text) Centralized Helper
async def transcribe_audio_async(file_path: str) -> str:
    """Helper for Whisper transcription."""
    with open(file_path, "rb") as audio_file:
        transcript = await openai_async_client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file
        )
    return transcript.text

# 4. TTS (Text-to-Speech) Centralized Helper
async def generate_speech_base64_async(text: str, model: str = "tts-1") -> str:
    """Helper for OpenAI TTS conversion to Base64."""
    if not text: return ""
    try:
        response = await openai_async_client.audio.speech.create(
            model=model,
            voice="nova",
            input=text
        )
        return base64.b64encode(response.content).decode('utf-8')
    except Exception as e:
        print(f"TTS Error: {e}")
        return ""


# DASHSCOPE_API_KEY = os.getenv("DASHSCOPE_API_KEY")
# Base URL cho cổng tương thích OpenAI (Dùng cho Chat, LLM)
# DASHSCOPE_COMPATIBLE_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
# Base URL cho các dịch vụ gốc (Dùng cho STT, TTS, Embedding)
# DASHSCOPE_API_BASE_URL = "https://dashscope-intl.aliyuncs.com/api/v1"

# ==========================================
# 2. LLM & EMBEDDING INITIALIZATION (ALIBABA COMMENTED OUT)
# ==========================================

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

# Khởi tạo các instance chính
# interviewer_llm = LLMFactory.get_llm("qwen-plus", 0.7).with_config({"tags": ["interviewer"]})
# evaluator_llm = LLMFactory.get_llm("qwen-turbo", 0.2)

# Embedding model cho RAG
# embedding_model = OpenAIEmbeddings(
#     model="text-embedding-3-small",
#     api_key=os.getenv("OPENAI_API_KEY")
# )

# Jina AI Embedding Configuration (Sử dụng Model v3 mới nhất)
embedding_model = JinaEmbeddings(
    jina_api_key=os.getenv("JINA_API_KEY"),
    model_name="jina-embeddings-v3"
)

# Async Client theo mẫu chuẩn
# alibaba_async_client = AsyncOpenAI(
#     api_key=DASHSCOPE_API_KEY,
#     base_url=DASHSCOPE_COMPATIBLE_BASE_URL
# )
# async_client = alibaba_async_client


# ==========================================
# 3. STT & TTS HELPERS (QWEN3 SERIES - COMMENTED OUT)
# ==========================================
# async def transcribe_audio_async(file_path: str, model: str = "qwen3-asr-flash-2025-09-08") -> str:
#     """
#     Sử dụng model Qwen3-ASR mới nhất qua Multimodal Generation API.
#     """
#     url = f"{DASHSCOPE_API_BASE_URL}/services/aigc/multimodal-generation/generation"
#     headers = {
#         "Authorization": f"Bearer {DASHSCOPE_API_KEY}",
#         "Content-Type": "application/json"
#     }
#     
#     try:
#         with open(file_path, "rb") as f:
#             audio_base64 = base64.b64encode(f.read()).decode('utf-8')
#         
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
#         
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
# 
# async def generate_speech_base64_async(text: str, model: str = "qwen3-tts-flash") -> str:
#     """
#     Sử dụng model Qwen3-TTS mới nhất qua Multimodal Generation API.
#     """
#     # Clean text: remove markdown separators and symbols that might upset TTS
#     clean_text = re.sub(r'[-*#_~`>]+', ' ', text).strip()
#     # Remove multiple spaces
#     clean_text = re.sub(r'\s+', ' ', clean_text)
#     
#     if not clean_text or len(clean_text) < 2: return ""
#     
#     url = f"{DASHSCOPE_API_BASE_URL}/services/aigc/multimodal-generation/generation"
#     headers = {
#         "Authorization": f"Bearer {DASHSCOPE_API_KEY}",
#         "Content-Type": "application/json"
#     }
#     
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
#     
#     try:
#         async with httpx.AsyncClient() as client:
#             response = await client.post(url, headers=headers, json=payload, timeout=30.0)
#             if response.status_code == 200:
#                 # Nếu API trả về binary trực tiếp (tùy theo model và header)
#                 if response.headers.get("Content-Type") == "audio/mpeg":
#                     return base64.b64encode(response.content).decode('utf-8')
#                 
#                 result = response.json()
#                 try:
#                     # 1. Thử trích xuất từ cấu trúc output.audio (Mẫu mới Qwen3-TTS)
#                     audio_info = result.get("output", {}).get("audio", {})
#                     audio_data = audio_info.get("data")
#                     audio_url = audio_info.get("url")
# 
#                     if audio_data:
#                         if "," in audio_data:
#                             return audio_data.split(",")[1]
#                         return audio_data
#                     
#                     if audio_url:
#                         # Download audio từ URL nếu data rỗng
#                         audio_resp = await client.get(audio_url)
#                         if audio_resp.status_code == 200:
#                             return base64.b64encode(audio_resp.content).decode('utf-8')
#                     
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
# 
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


