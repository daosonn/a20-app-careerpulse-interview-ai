# Codex Project Operating Guide

You are coding in CareerPulse, a React/FastAPI AI interview coach. Start from `.agent/project_context.md`, then inspect the actual files involved in the task. Do not trust stale architecture docs over source code.

## Fast Map

- Frontend routes: `frontend/src/App.tsx`
- Auth wrapper: `frontend/src/features/auth/context/AuthContext.tsx`
- API URL helper: `frontend/src/lib/api.ts`
- Session UI/API hook: `frontend/src/features/session/`
- Dashboard Firestore path: `frontend/src/features/dashboard/`
- Profile API UI: `frontend/src/features/profile/components/Profile.tsx`
- FastAPI app: `backend/app/main.py`
- Endpoints: `backend/app/api/v1/endpoints/`
- SQL models: `backend/app/models/models.py`
- LangGraph services: `backend/app/services/`
- Django Admin: `backend/django_admin/ops_admin/`

## Codex Workflow

1. Search with `rg` and read the owning files.
2. Identify the data path: FastAPI SQL, Firestore, or mixed.
3. Make narrow edits with existing patterns.
4. Keep schemas, TS types, services, and UI consumers aligned.
5. Validate with the smallest useful command set.
6. Report changed files and verification results.

## Safety

Allowed: read/search/edit project files, run local lint/build/dev/check commands, inspect git diff/status, and update AI operating docs.

Requires explicit confirmation: secrets or `.env` edits, database drop/truncate/flush, recursive deletion outside temporary generated artifacts, production deploys, force pushes, hard resets, and git history rewriting.

Prompt logging is automatic. Do not commit `.ai-log/*.jsonl`.

