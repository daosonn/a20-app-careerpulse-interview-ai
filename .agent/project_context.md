# Project Context: CareerPulse / AI Interview Coach

Source code is the final authority. This file is a stable operating summary for AI coding agents; update it when the architecture or product behavior changes.

## Product Purpose

This project is an AI interview practice platform branded in the UI as CareerPulse. It helps authenticated users upload or paste CV content, provide a job description, configure an interview, conduct a text/voice interview with an AI coach, and review profile, session, and operational data.

## Confirmed Runtime Architecture

- Frontend: React 19 + Vite + TypeScript + Tailwind CSS v4 in `frontend/`.
- Auth: Firebase Authentication with Google sign-in on the frontend; FastAPI verifies Firebase ID tokens on protected backend routes.
- Frontend direct persistence: some dashboard, onboarding, and summary code still reads/writes Firestore collections directly.
- Backend API: unified FastAPI app in `backend/app/`, mounted under `/api/v1`.
- Backend persistence: SQLAlchemy models write to `users`, `interviews`, `educations`, `resume_uploads`, `suggested_jobs`, and `user_activities`. Local default is SQLite at `backend/data/interview_coach.db`; `DATABASE_URL` can override it.
- AI orchestration: LangGraph in `backend/app/services/graph.py` coordinates profiler, interviewer, and evaluator nodes in process.
- LLM and audio providers: OpenAI is used for chat completions, CV extraction, predicted questions, Whisper transcription, and TTS. `anthropic` is installed but not used by the current source paths.
- Admin portal: `backend/django_admin/` is a Django Admin operations portal using unmanaged Django models mapped to the same SQLAlchemy tables.
- Deployment: docs describe two Vercel projects, one rooted at `backend/` and one at `frontend/`.

## Main User Flows

- Public user lands on `/`, signs in at `/login` with Google, and is gated through onboarding if the backend profile is not onboarded.
- Onboarding uploads a PDF/DOCX/TXT CV, extracts text client-side, posts to `/api/v1/user/onboard`, and also updates a Firestore user document.
- Setup creates an interview from CV text, job description, interview type (`Behavioral`, `Technical`, `HR`), language (`vi`, `en`), and stress-test mode through `/api/v1/interview/setup`.
- Interview room starts a backend LangGraph thread through `/api/v1/interview/start`, submits answers through `/api/v1/interview/chat`, can transcribe uploaded audio through `/api/v1/interview/transcribe`, and ends through `/api/v1/interview/end`.
- Profile supports CV updates, personal fields, education CRUD, deterministic suggested jobs, preferences, and account settings through `/api/v1/user/*`.
- Dashboard and session summary currently query Firestore `interview_sessions` and `interview_turns`; verify this carefully before changing history behavior because the backend also stores interviews in SQL.
- Django Admin exposes users, interviews, resume uploads, suggested jobs, education, and activity logs for operations and support.

## Important Modules

- `frontend/src/App.tsx`: route map and layout split.
- `frontend/src/features/auth/context/AuthContext.tsx`: Firebase auth, profile fetch, authenticated fetch wrapper.
- `frontend/src/features/session/`: setup, interview room, audio recorder, TTS, session API hook, summary UI.
- `frontend/src/features/dashboard/`: Firestore-backed dashboard metrics and charts.
- `frontend/src/features/profile/`: profile, jobs, preferences, settings UI.
- `frontend/src/lib/fileParser.ts`: client-side PDF/DOCX/TXT extraction.
- `backend/app/main.py`: FastAPI app, CORS, startup DB init.
- `backend/app/api/v1/endpoints/`: interview, history, and user routes.
- `backend/app/core/auth.py`: Firebase token verification and local user provisioning.
- `backend/app/core/database.py`: SQLAlchemy engine, session dependency, create_all, lightweight ALTER migrations.
- `backend/app/models/models.py`: SQLAlchemy data model.
- `backend/app/services/`: LangGraph state machine, prompts, LLM logic, reporting, profiler.
- `backend/django_admin/ops_admin/`: unmanaged admin models and customized operations admin.

## Known Ambiguities / Mismatches

- Some product docs are stale and mention Node/Express or Gemini as the main backend. The current source uses FastAPI, SQLAlchemy, LangGraph, and OpenAI.
- Frontend session setup uses FastAPI SQL persistence, but dashboard and summary read Firestore collections. This is a confirmed code mismatch, not a business rule.
- Evaluation schema differs between backend prompt output (`technical_depth`) and frontend TypeScript expectations (`specificity`). Verify the contract before relying on metrics.
- Several Vietnamese UI strings appear mojibake/encoding-corrupted in source. Do not bulk-normalize copy unless explicitly tasked; encoding fixes should be reviewed across the UI.
- There is no conventional test suite discovered in the repository. Validation is currently typecheck/build/manual API checks.

## Development Commands

- Frontend install: `cd frontend && npm install`
- Frontend dev: `cd frontend && npm run dev`
- Frontend typecheck: `cd frontend && npm run lint`
- Frontend build: `cd frontend && npm run build`
- Backend dev: `cd backend && python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000`
- Django admin migrate: `cd backend/django_admin && python manage.py migrate`
- Django admin dev: `cd backend/django_admin && python manage.py runserver 127.0.0.1:8080`
- AI logging hook setup: `bash scripts/setup_hooks.sh`

## Safety Boundaries

AI agents may read, search, edit source files, run local build/typecheck/dev commands, and inspect generated logs. They must not expose secrets, commit `.ai-log/*.jsonl`, edit `.env` or credential files without explicit permission, drop or truncate databases, wipe storage/uploads, mass-delete directories, run destructive production deployments, or rewrite git history without explicit confirmation.

