import os
import base64
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def generate_speech_base64(text: str) -> str:
    """Chuyển văn bản thành giọng nói (Base64)"""
    try:
        response = client.audio.speech.create(
            model="tts-1-hd",
            voice="nova",
            input=text
        )
        return base64.b64encode(response.content).decode('utf-8')
    except Exception as e:
        print("Error generating speech:", e)
        return ""

async def transcribe_logic(file):
    """Xử lý Whisper transcription"""
    try:
        temp_filename = f"temp_{file.filename}"
        with open(temp_filename, "wb") as buffer:
            buffer.write(await file.read())
        
        with open(temp_filename, "rb") as audio_file:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file
            )
        
        os.remove(temp_filename)
        return transcript.text
    except Exception as e:
        return str(e)
