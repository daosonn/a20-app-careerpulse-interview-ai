from fastapi import FastAPI
from .models import InterviewerRequest, InterviewerResponse
from .logic import generate_question

app = FastAPI(title="Interviewer Service")

@app.post("/next-question", response_model=InterviewerResponse)
async def next_question(req: InterviewerRequest):
    ai_text, phase, count = generate_question(req)
    return {
        "ai_response": ai_text,
        "current_phase": phase,
        "current_question_count": count
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8002)
