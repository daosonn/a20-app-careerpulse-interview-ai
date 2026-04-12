from fastapi import FastAPI
from .models import EvaluatorRequest, EvaluatorResponse
from .logic import evaluate_star

app = FastAPI(title="Evaluator Service")

@app.post("/evaluate", response_model=EvaluatorResponse)
async def evaluate(req: EvaluatorRequest):
    eval_text = evaluate_star(req)
    return {"evaluation": eval_text}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8003)
