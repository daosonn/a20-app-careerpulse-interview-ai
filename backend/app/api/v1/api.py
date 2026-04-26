from fastapi import APIRouter
from app.api.v1.endpoints import dashboard, history, interview, tts, user

api_router = APIRouter()

api_router.include_router(interview.router, prefix="/interview", tags=["interview"])
api_router.include_router(history.router, prefix="/history", tags=["history"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(tts.router, prefix="/tts", tags=["tts"])
api_router.include_router(user.router, prefix="/user", tags=["user"])
