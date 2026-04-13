import os
import base64
import httpx
from openai import OpenAI
from sqlalchemy.orm import Session
from src.core.database import User as DbUser
from src.services.profiler.rag_logic import extract_cv_info_logic

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
async def onboard_user_logic(req, db: Session):
    """Xử lý onboarding: Trích xuất thông tin CV và lưu vào DB"""
    try:
        # 1. Trích xuất thông tin bằng logic từ Profiler
        info = extract_cv_info_logic(req.cv_text)
        skills = info.get("skills", ["Kỹ năng chung"])
        full_name = info.get("full_name") or req.name
        dob = info.get("dob")
        position = info.get("current_position")
        
        # 2. Tìm hoặc tạo User trong SQLite
        db_user = db.query(DbUser).filter(DbUser.email == req.email).first()
        if not db_user:
            db_user = DbUser(
                email=req.email,
                name=full_name,
                avatar=req.avatar,
                cv_text=req.cv_text,
                skills=skills,
                full_name=full_name,
                dob=dob,
                current_position=position,
                is_onboarded=True
            )
            db.add(db_user)
        else:
            db_user.cv_text = req.cv_text
            db_user.skills = skills
            db_user.full_name = full_name
            db_user.dob = dob
            db_user.current_position = position
            db_user.is_onboarded = True
        
        db.commit()
        db.refresh(db_user)
        return {"status": "success", "skills": skills, "user_id": db_user.id, "info": info}
    except Exception as e:
        print(f"[ERROR] Onboarding Logic: {e}")
        return {"status": "error", "message": str(e)}
