# Codex Context

CareerPulse is an AI interview practice platform. The UI is a Vite React app. The backend is a unified FastAPI service with SQLAlchemy persistence and LangGraph-based AI orchestration. Firebase Auth handles sign-in; FastAPI verifies Firebase ID tokens and maps the authenticated email to a local SQL user. A separate Django Admin portal provides operations views over the same SQL tables.

## Confirmed Code Behavior

- `frontend/src/App.tsx` defines public routes, full-viewport interview routes, and sidebar-authenticated routes.
- `AuthContext.tsx` creates/reads a Firestore `users/{uid}` document, fetches backend profile data, and provides `authenticatedFetch()`.
- Session setup posts to `/api/v1/interview/setup`; interview room uses `/start`, `/chat`, `/transcribe`, and `/end`.
- Backend interview setup persists an `Interview` SQL row and logs `UserActivity`.
- LangGraph uses in-memory checkpointing with thread IDs shaped like `user_{current_user.id}_{session_id}`.
- Dashboard and session detail still read Firestore `interview_sessions` and `interview_turns`.
- Django Admin unmanaged models map to SQLAlchemy tables and should stay compatible with DB schema changes.

## Known Risks To Check

- SQL and Firestore session stores are not unified.
- Evaluation fields differ between backend prompt and frontend expectations.
- Some Vietnamese copy appears encoding-corrupted.
- No conventional test suite exists.
- Client-side OpenAI TTS key usage is security-sensitive.

## Validation Commands

- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- `cd backend/django_admin && python manage.py check`
- `cd backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000`
- `bash scripts/setup_hooks.sh`

