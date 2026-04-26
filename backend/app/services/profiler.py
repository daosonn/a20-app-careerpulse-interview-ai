import os
import hashlib
from typing import List, Dict, Any, AsyncGenerator
import json
from app.core.config import async_client, CHAT_MODEL

# Simple in-memory cache for the session (optional, but good for speed)
_cv_cache = {}

async def extract_cv_info_logic(cv_text: str, use_cache: bool = True) -> Dict[str, Any]:
    """Sử dụng LLM bóc tách thông tin CV với Prompt tối ưu và Caching."""
    if not cv_text:
        return {}

    # 1. Check Cache
    cv_hash = hashlib.md5(cv_text.encode('utf-8')).hexdigest()
    if use_cache and cv_hash in _cv_cache:
        print(f"Cache hit for CV hash: {cv_hash}")
        return _cv_cache[cv_hash]

    # 2. Optimized Prompt (Shorter, clearer for faster response)
    prompt = f"""Extract JSON from CV:
- full_name
- skills (list)
- tools (list)
- projects (list of objects: {{name, tech}})
- current_position

CV: {cv_text[:4000]}  # Limit text to avoid token bloat
"""
    
    try:
        completion = await async_client.chat.completions.create(
            model=CHAT_MODEL,
            messages=[
                {"role": "system", "content": "You are a specialized CV parser. Return ONLY valid JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0, # Faster and more deterministic
        )
        result = json.loads(completion.choices[0].message.content)
        
        # Save to cache
        _cv_cache[cv_hash] = result
        return result
    except Exception as e:
        print(f"Error extracting CV info: {e}")
        return {"skills": ["Kỹ năng chung"], "full_name": "Unknown"}

async def extract_cv_info_stream(cv_text: str) -> AsyncGenerator[str, None]:
    """Stream progress events for UI to show what's happening."""
    yield json.dumps({"status": "analyzing", "message": "🔍 Đang đọc hiểu CV của bạn..."})
    
    cv_hash = hashlib.md5(cv_text.encode('utf-8')).hexdigest()
    if cv_hash in _cv_cache:
        yield json.dumps({"status": "cache_hit", "message": "🚀 Lấy dữ liệu từ bộ nhớ đệm..."})
        yield json.dumps({"status": "completed", "data": _cv_cache[cv_hash]})
        return

    yield json.dumps({"status": "extracting", "message": "🧠 AI đang bóc tách kỹ năng và kinh nghiệm..."})
    
    result = await extract_cv_info_logic(cv_text)
    
    yield json.dumps({"status": "completed", "message": "✅ Đã xử lý xong!", "data": result})

def search_questions_logic(skills: List[str]) -> str:
    """Mock search trong Vector DB."""
    return f"Câu hỏi liên quan đến: {', '.join(skills)}"

