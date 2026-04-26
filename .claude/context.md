# Claude Context

CareerPulse is a React/FastAPI AI interview coach. The frontend authenticates users with Firebase Google sign-in, gates onboarding, lets users upload/paste CV text and job descriptions, runs interview sessions with voice/text controls, and displays dashboard/profile/summary screens. The backend verifies Firebase ID tokens, provisions local SQL users, stores profile/interview data through SQLAlchemy, and uses LangGraph plus OpenAI for CV extraction, question generation, answer evaluation, transcription, and TTS.

## Architecture Snapshot

- `frontend/`: Vite React app with feature folders for landing, auth, onboarding, dashboard, session, and profile.
- `backend/app/`: FastAPI API under `/api/v1`; SQLAlchemy data model; LangGraph services.
- `backend/django_admin/`: operations-focused Django Admin mapped to the same SQL tables through unmanaged models.
- `backend/firestore.rules` and `backend/firebase-blueprint.json`: Firestore validation model used by direct frontend Firestore paths.
- `.agent/project_context.md`: shared AI source of truth for all AI assistants.

## Product Vocabulary

- Interview types: `Behavioral`, `Technical`, `HR`.
- Languages: `vi`, `en`.
- Session statuses: `setup`, `in_progress`, `completed`.
- Interview phases: `Introduction`, `CV Deep-dive`, `Job-fit Assessment`, `Behavioral`, `Motivation`, `Candidate Questions`, `Closing`.
- Evaluation concepts: STAR, clarity, relevance, technical depth / specificity, confidence, better version.

## Confirmed Constraints

- Protected API calls require `Authorization: Bearer <Firebase ID token>`.
- FastAPI auto-creates a local SQL user by email after token verification.
- Onboarding must complete before protected routes with `AuthGate`/`Layout`.
- Local SQLite is default; Vercel without `DATABASE_URL` uses temporary `/tmp` SQLite and is not persistent.
- Dashboard and summary still read Firestore collections directly; backend history reads SQL interviews. Treat this as a live mismatch.
- Current code has no conventional test suite. Validation relies on typecheck/build/manual API checks.

## Ground Truth Rule

If this context conflicts with code, inspect and follow the code. If the behavior is unclear, say so and trace the request/data flow instead of guessing.

