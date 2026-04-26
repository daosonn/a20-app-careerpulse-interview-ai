# Architecture Rules

- Preserve the current architecture unless explicitly asked to redesign it.
- Current backend: FastAPI under `backend/app`.
- Current AI flow: LangGraph in `backend/app/services/graph.py`.
- Current persistence: SQLAlchemy plus some direct Firestore frontend paths.
- Current admin: Django Admin unmanaged models over SQL tables.
- Current deployment: separate Vercel projects for backend and frontend.

