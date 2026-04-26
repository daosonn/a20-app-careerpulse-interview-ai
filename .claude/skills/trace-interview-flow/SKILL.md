# Skill: Trace Interview Flow

## Purpose
Trace interview setup, start, chat, transcription, and completion end to end.

## Related Files
- `frontend/src/features/session/`
- `frontend/src/features/auth/context/AuthContext.tsx`
- `backend/app/api/v1/endpoints/interview.py`
- `backend/app/services/graph.py`
- `backend/app/services/interviewer.py`
- `backend/app/services/evaluator.py`
- `backend/app/models/models.py`

## Process
1. Start from the UI action and payload.
2. Follow `authenticatedFetch()` to the FastAPI endpoint.
3. Follow endpoint state construction into LangGraph.
4. Check model writes and returned response fields.
5. Verify frontend state updates and navigation.

## Validation Checklist
- Auth token is sent.
- `session_id` type is handled consistently.
- Phase names match frontend constants.
- Evaluations match frontend expectations.
- SQL/Firestore target is explicit.

