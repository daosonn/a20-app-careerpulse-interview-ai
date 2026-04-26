# Backend API Rules

- Protected endpoints should use `CurrentUser` and `SessionDep` when they need identity and SQL persistence.
- Keep Firebase token verification in `backend/app/core/auth.py`; do not bypass auth in production-facing routes.
- Keep Pydantic request/response shapes in `backend/app/schemas/` aligned with frontend payloads.
- For interview changes, update `SetupReq`, `ChatReq`, endpoint handlers, LangGraph state, and frontend `useInterviewSession` together as needed.
- Log meaningful user events with `UserActivity` when adding important profile/interview actions.
- Do not block session setup on optional AI pre-analysis unless the product explicitly requires it; current setup falls back to default questions.
- Handle OpenAI failures gracefully where the user can still proceed.

