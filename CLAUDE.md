# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

CareerPulse — an AI interview practice platform. Users upload a CV, configure an interview (type, language, stress-test mode), conduct a live text/voice interview with an AI coach, and review session feedback.

## Development Commands

```bash
# Frontend
cd frontend && npm install          # install deps
cd frontend && npm run dev          # dev server on :3000
cd frontend && npm run lint         # TypeScript type-check (tsc --noEmit)
cd frontend && npm run build        # production build

# Backend
cd backend && python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# Django Admin (ops portal)
cd backend/django_admin && python manage.py check
cd backend/django_admin && python manage.py migrate
cd backend/django_admin && python manage.py runserver 127.0.0.1:8080

# AI logging hooks
bash scripts/setup_hooks.sh
```

`npm run lint` runs `tsc --noEmit`, not ESLint — it type-checks but does not enforce style.

## Architecture

### Monorepo layout

| Directory | Purpose |
|---|---|
| `frontend/` | React 19 + Vite + TypeScript + Tailwind CSS v4 |
| `backend/app/` | FastAPI + SQLAlchemy + LangGraph |
| `backend/django_admin/` | Django Admin ops portal (unmanaged models, same DB) |
| `database/` | Local SQLite files and Chroma vector DB |

### Auth and identity

Firebase Authentication handles sign-in (Google). The frontend sends a Firebase ID token in the `Authorization` header. `backend/app/core/auth.py` verifies the token (with a 15-min in-memory cache) and provisions a SQL `User` row keyed by email. The `CurrentUser` dependency resolves to that SQL row.

### Persistence — two stores, one split

**SQL (SQLAlchemy):** `users`, `interviews`, `interview_turns`, `educations`, `resume_uploads`, `suggested_jobs`, `user_activities`. Defined in `backend/app/models/models.py`. Local default is SQLite at `database/sql/interview_coach.db`; `DATABASE_URL` env var overrides to Postgres.

Schema migrations happen via `ALTER TABLE ADD COLUMN` inside `init_db()` on startup — there is no Alembic or migration framework. Larger schema changes need a deliberate plan.

**Firestore (direct frontend reads):** The dashboard and session summary features read from Firestore `interview_sessions` and `interview_turns` collections directly in the browser. The backend writes sessions to SQL, not Firestore. This mismatch is confirmed and load-bearing — verify which store a UI feature reads before modifying session history or dashboard data.

### LangGraph interview state machine

`backend/app/services/graph.py` compiles the graph:

```
START → route_next → profiler (first turn only) → unified → END
```

`unified_node` parallelizes `evaluator_node` and `interviewer_node` with `asyncio.gather` to minimize latency. LangGraph checkpoints are stored in `database/sql/langgraph_checkpoints.sqlite` (SQLite) or a Postgres table.

`InterviewState` (defined in `state.py`) carries: cv/jd content, extracted skills, chat history, pending question queue, phase, evaluation list, and model answer for the current question.

### Interview phases

Phase names flow from `backend/app/services/interviewer.py` → `InterviewState.current_phase` → frontend `frontend/src/features/session/constants.ts`. Keep them synchronized: `Introduction`, `CV Deep-dive`, `Job-fit Assessment`, `Behavioral`, `Motivation`, `Candidate Questions`, `Closing`.

### Frontend API access pattern

- `apiUrl(path)` — constructs the FastAPI base URL from `VITE_API_URL`
- `authenticatedFetch(url, options)` — attaches the Firebase ID token; use this for all protected endpoints
- Both helpers live in `frontend/src/lib/api.ts`

Session hooks (`useInterviewSession`) in `frontend/src/features/session/hooks/` manage setup/chat/end calls and hold local interview state between turns.

### Key schema contract

`SetupReq` → `/api/v1/interview/setup` → returns interview ID and predicted questions.  
`ChatReq` → `/api/v1/interview/chat` → returns next AI question + tip + evaluation for the previous answer.  
If the evaluation shape changes (e.g., field `technical_depth` vs `specificity`), update the backend evaluator prompt, Pydantic schema, frontend TypeScript types, dashboard aggregation, and summary rendering together.

### Visual system

Navy dark surfaces, gold accents, cream light sections, serif headings, Lucide icons, Tailwind utilities. Full-viewport interview routes (`/session/:id`) live outside the sidebar layout — keep it that way.

## Known Ambiguities

- Evaluation field names differ between backend prompt output and frontend TypeScript (`technical_depth` vs `specificity`). Verify the contract before relying on score metrics.
- `anthropic` is installed as a package but is not used in current code paths.
- Several Vietnamese UI strings contain mojibake encoding in source. Do not bulk-normalize unless that is the explicit task.
- There is no test suite. Validation is typecheck + build + manual API inspection.
