from fastapi import APIRouter
from app.api.v1.endpoints import interview, history, user

api_router = APIRouter()

api_router.include_router(interview.router, prefix="/interview", tags=["interview"])
api_router.include_router(history.router, prefix="/history", tags=["history"])
api_router.include_router(user.router, prefix="/user", tags=["user"])
