import os
import base64
import httpx
import json
from langchain_openai import ChatOpenAI
from openai import AsyncOpenAI
from dotenv import load_dotenv

# Load .env from backend/ directory
load_dotenv()

# ==========================================
# 1. OPENAI CONFIGURATION (COMMENTED OUT)
# ==========================================
'''
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
interviewer_llm = LLMFactory.get_llm("gpt-4o-mini", 0.7)
evaluator_llm = LLMFactory.get_llm("gpt-4o-mini", 0.2)

# 2. Raw Async Client
async_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# 3. STT (Speech-to-Text) Centralized Helper
async def transcribe_audio_async(file_path: str) -> str:
    """Helper for Whisper transcription."""
    with open(file_path, "rb") as audio_file:
        transcript = await async_client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file
        )
    return transcript.text

# 4. TTS (Text-to-Speech) Centralized Helper
async def generate_speech_base64_async(text: str, model: str = "tts-1") -> str:
    """Helper for OpenAI TTS conversion to Base64."""
    if not text: return ""
    try:
        response = await async_client.audio.speech.create(
            model=model,
            voice="nova",
            input=text
        )
        return base64.b64encode(response.content).decode('utf-8')
    except Exception as e:
        print(f"TTS Error: {e}")
        return ""
'''

# ==========================================
# 2. ALIBABA DASHSCOPE CONFIGURATION (ACTIVE)
# ==========================================

DASHSCOPE_API_KEY = os.getenv("DASHSCOPE_API_KEY")
DASHSCOPE_COMPATIBLE_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
DASHSCOPE_API_BASE_URL = "https://dashscope-intl.aliyuncs.com/api/v1"

class LLMFactory:
    @staticmethod
    def get_llm(model_name: str = "qwen-plus", temperature: float = 0.7):
        """Khởi tạo LangChain ChatOpenAI tương thích với Alibaba Qwen."""
        return ChatOpenAI(
            model=model_name, 
            temperature=temperature, 
            api_key=DASHSCOPE_API_KEY,
            base_url=DASHSCOPE_COMPATIBLE_BASE_URL,
            streaming=True
        )

# --- [LLM Tasks] ---
interviewer_llm = LLMFactory.get_llm("qwen-plus", 0.7)
evaluator_llm = LLMFactory.get_llm("qwen-plus", 0.2)

# --- [Async Client Task] ---
async_client = AsyncOpenAI(
    api_key=DASHSCOPE_API_KEY,
    base_url=DASHSCOPE_COMPATIBLE_BASE_URL
)

# --- [STT Task] ---
async def transcribe_audio_async(file_path: str, model: str = "qwen3-asr-flash-2025-09-08") -> str:
    """
    Sử dụng model qwen3-asr-flash của Alibaba qua REST API.
    Model này yêu cầu gọi qua endpoint multimodal-generation.
    """
    url = f"{DASHSCOPE_API_BASE_URL}/services/aigc/multimodal-generation/generation"
    headers = {
        "Authorization": f"Bearer {DASHSCOPE_API_KEY}",
        "Content-Type": "application/json"
    }
    
    try:
        # 1. Đọc và chuyển file sang base64
        with open(file_path, "rb") as f:
            audio_base64 = base64.b64encode(f.read()).decode('utf-8')
        
        # Xác định định dạng file (ví dụ: wav, mp3)
        ext = os.path.splitext(file_path)[1].replace(".", "") or "wav"
        
        payload = {
            "model": model,
            "input": {
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"audio": f"data:audio/{ext};base64,{audio_base64}"},
                            {"text": "Transcribe this audio."}
                        ]
                    }
                ]
            }
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=payload, timeout=60.0)
            if response.status_code == 200:
                result = response.json()
                # Trích xuất văn bản từ phản hồi multimodal
                try:
                    return result["output"]["choices"][0]["message"]["content"][0]["text"]
                except (KeyError, IndexError):
                    return str(result)
            else:
                print(f"Alibaba STT Error: {response.status_code} - {response.text}")
                return ""
    except Exception as e:
        print(f"STT Exception: {e}")
        return ""


# --- [TTS Task] ---
async def generate_speech_base64_async(text: str, model: str = "qwen3-tts-vd-2026-01-26") -> str:
    """
    Sử dụng model qwen3-tts-vd của Alibaba qua REST API.
    """
    if not text: return ""
    url = f"{DASHSCOPE_API_BASE_URL}/services/audio/tts/inference"
    headers = {
        "Authorization": f"Bearer {DASHSCOPE_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": model,
        "input": {"text": text},
        "parameters": {
            "voice": "cherry", 
            "format": "mp3"
        }
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=payload, timeout=30.0)
            if response.status_code == 200:
                return base64.b64encode(response.content).decode('utf-8')
            else:
                print(f"Alibaba TTS Error: {response.status_code} - {response.text}")
                return ""
    except Exception as e:
        print(f"Alibaba TTS Exception: {e}")
        return ""
