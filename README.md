# CareerPulse — AI Interview Coach

An AI-powered interview practice platform. Users upload a CV, provide a job description, configure an interview session (type, language, stress-test mode), conduct a live text or voice interview with an AI coach, and review structured STAR-based feedback.

## Features

- **LangGraph state machine** — profiler, interviewer, and evaluator run in a coordinated graph; evaluator and interviewer execute in parallel to minimize response latency.
- **Context-aware sessions** — CV and JD are analysed to generate phase-aware questions across Introduction, CV Deep-dive, Job-fit Assessment, Behavioral, Motivation, and Closing phases.
- **STAR evaluation** — every answer receives rubric-based scoring and model-answer comparison.
- **Voice interaction** — OpenAI Whisper for speech-to-text, OpenAI TTS for question read-back.
- **RAG question bank** — ChromaDB + Jina embeddings back a retrieval layer for supplementary interview questions.
- **Stress-test mode** — intentionally challenging follow-up questions to simulate high-pressure interviews.
- **Bilingual** — full `vi` / `en` support throughout setup, interview room, and feedback.
- **Operations portal** — Django Admin provides a read/write view over users, interviews, and activity logs.

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS v4 |
| Backend | FastAPI, SQLAlchemy, LangGraph, LangChain |
| AI / Audio | OpenAI (chat, Whisper STT, TTS), Jina Embeddings |
| Vector DB | ChromaDB |
| Auth | Firebase Authentication (Google sign-in) |
| Persistence | Firebase Firestore (dashboard/summary), SQLite or Postgres (sessions, users) |
| Admin | Django Admin (unmanaged models, same DB) |
| Deployment | Vercel (two projects: frontend + backend) |

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- A Firebase project with Google sign-in and Firestore enabled
- OpenAI API key
- Jina API key (for embeddings)

### 1. Clone and configure

```bash
git clone <repo-url>
cd <repo-name>
```

Copy `firebase-applet-config.json` into `frontend/` (download from Firebase Console → Project Settings → Your apps → Config).

Create `backend/.env`:

```env
# Required
OPENAI_API_KEY=sk-...
JINA_API_KEY=jina_...
FIREBASE_PROJECT_ID=your-project-id

# Optional — defaults shown
DATABASE_URL=                        # omit for local SQLite
CORS_ALLOW_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
INTERVIEW_TTS_PROVIDER=auto          # auto | openai | google
OPENAI_TTS_MODEL=gpt-4o-mini-tts
```

Create `frontend/.env`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

### 2. Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The database tables are created automatically on first startup. Health check: `http://127.0.0.1:8000/`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
```

### 4. Django Admin (optional)

```bash
cd backend/django_admin
pip install django psycopg2-binary
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 127.0.0.1:8080
```

### 5. AI agent hooks (for contributors using AI coding tools)

```bash
bash scripts/setup_hooks.sh
```

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Yes | Chat completions, Whisper STT, TTS |
| `JINA_API_KEY` | Yes | Jina v4 embeddings for the RAG question bank |
| `FIREBASE_PROJECT_ID` | Yes | Firebase project for token verification |
| `DATABASE_URL` | No | Postgres URL; omit to use local SQLite |
| `CORS_ALLOW_ORIGINS` | No | Comma-separated allowed origins |
| `INTERVIEW_TTS_PROVIDER` | No | `auto`, `openai`, or `google` |
| `GOOGLE_API_KEY` | No | Google TTS provider (if `INTERVIEW_TTS_PROVIDER=google`) |
| `INTERVIEW_TRACE_LOG_PATH` | No | Path for session trace JSONL logs |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE_URL` | Yes | Base URL of the FastAPI backend |

Firebase config is read from `frontend/firebase-applet-config.json` (not an env var).

## Project Structure

```
├── frontend/              # React + Vite app
│   └── src/
│       ├── features/      # auth, dashboard, landing, onboarding, profile, session
│       ├── components/    # shared UI primitives and layout
│       └── lib/           # api.ts, firebase.ts, fileParser.ts
├── backend/
│   ├── app/
│   │   ├── api/v1/        # FastAPI route handlers
│   │   ├── services/      # LangGraph graph, state, interviewer, evaluator, reporter
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic request/response shapes
│   │   ├── core/          # auth, database, config, logger
│   │   └── rag_service/   # ChromaDB ingestion and retrieval
│   └── django_admin/      # Operations portal
└── database/              # Local SQLite, LangGraph checkpoints, ChromaDB, logs
```

## Deployment (Vercel)

Deploy as two separate Vercel projects from the same repository.

**Backend project** — Root Directory: `backend`

| Variable | Value |
|---|---|
| `OPENAI_API_KEY` | your key |
| `JINA_API_KEY` | your key |
| `FIREBASE_PROJECT_ID` | your project id |
| `DATABASE_URL` | managed Postgres URL (Neon / Supabase / Vercel Postgres) |
| `CORS_ALLOW_ORIGINS` | `https://<your-frontend-domain>` |

> SQLite on Vercel is ephemeral (`/tmp`). Use a managed Postgres database for production.

**Frontend project** — Root Directory: `frontend`

| Variable | Value |
|---|---|
| `VITE_API_BASE_URL` | `https://<your-backend-domain>` |

Also add your frontend domain to **Firebase Console → Authentication → Authorized Domains**.

### Verify after deploy

1. `GET https://<backend>/` → `{"status": "ok"}`
2. Sign in with Google on the frontend.
3. Network tab: `GET /api/v1/user/profile` should return `200`.
4. If `401`: check `FIREBASE_PROJECT_ID`, Firebase Authorized Domains, and `VITE_API_BASE_URL`.
