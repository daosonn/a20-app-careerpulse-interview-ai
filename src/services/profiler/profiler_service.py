from fastapi import FastAPI
from .models import ProfilerRequest, ProfilerResponse
from .rag_logic import extract_skills_logic, search_questions_logic

app = FastAPI(title="Profiler Service")

@app.post("/process", response_model=ProfilerResponse)
async def process_profiler(req: ProfilerRequest):
    skills = extract_skills_logic(req.cv_content)
    questions = search_questions_logic(skills)
    return {
        "skills_extracted": skills,
        "question_bank": questions
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)
