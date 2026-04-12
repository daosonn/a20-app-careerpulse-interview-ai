from fastapi import FastAPI
from .models import ReporterRequest, ReporterResponse
from .logic import generate_report_logic

app = FastAPI(title="Reporter Service")

@app.post("/generate-report", response_model=ReporterResponse)
async def generate_report(req: ReporterRequest):
    report = generate_report_logic(req)
    return {"final_report": report}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8004)
