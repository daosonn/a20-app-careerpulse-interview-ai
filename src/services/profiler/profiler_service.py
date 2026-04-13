from fastapi import FastAPI
from .models import ProfilerRequest, ProfilerResponse
from .rag_logic import extract_cv_info_logic, search_questions_logic

app = FastAPI(title="Profiler Service")

@app.post("/process", response_model=ProfilerResponse)
async def process_profiler(req: ProfilerRequest):
    info = extract_cv_info_logic(req.cv_content)
    skills = info.get("skills", ["Kỹ năng chung"])
    questions = search_questions_logic(skills)
    
    return {
        "skills_extracted": skills,
        "question_bank": questions,
        "full_name": info.get("full_name"),
        "dob": info.get("dob"),
        "current_position": info.get("current_position")
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)
