# Gemini Context

CareerPulse is organized as a monorepo with a React/Vite frontend, FastAPI backend, and Django Admin operations portal.

## Repository Structure

- `frontend/`: React 19, Vite, TypeScript, Tailwind v4.
- `frontend/src/features/auth/`: Firebase Auth context and login flow.
- `frontend/src/features/onboarding/`: CV upload and onboarding submission.
- `frontend/src/features/session/`: setup screen, interview room, audio recorder, speech/TTS hook, session detail.
- `frontend/src/features/dashboard/`: Firestore-backed dashboard metrics.
- `frontend/src/features/profile/`: profile, education, jobs, preferences, settings.
- `backend/app/`: FastAPI API, auth, SQLAlchemy models, LangGraph services.
- `backend/django_admin/`: Django Admin portal over unmanaged models mapped to SQL tables.
- `docs/`: product and deployment docs; some architecture docs are stale.
- `.agent/project_context.md`: shared AI operating context.

## Runtime Flow

1. User signs in with Firebase Google Auth.
2. Frontend creates/reads a Firestore user doc and fetches backend `/api/v1/user/profile`.
3. If not onboarded, user uploads a CV; frontend extracts text and posts to `/api/v1/user/onboard`.
4. Setup posts CV/JD/interview settings to `/api/v1/interview/setup`.
5. Interview room starts and chats through FastAPI, which invokes LangGraph nodes.
6. Backend writes SQL interviews and activity logs.
7. Dashboard and summary screens currently query Firestore collections directly, which may not reflect SQL interviews.
8. Operations users can inspect SQL data in Django Admin.

## Analysis Warnings

- Do not rely on old docs claiming Node/Express as the backend.
- OpenAI is the current provider in active backend code.
- Evaluation schema and dashboard metric assumptions need verification.
- Some UI strings are encoding-damaged; treat copy cleanup as a separate task.
- Tests are not established; validation is command-based and manual.

