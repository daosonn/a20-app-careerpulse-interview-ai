from pydantic import BaseModel

class EvaluatorRequest(BaseModel):
    last_ai_msg: str
    last_user_msg: str
    language: str

class EvaluatorResponse(BaseModel):
    evaluation: str
