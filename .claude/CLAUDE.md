# Claude Project Instructions

You are working on CareerPulse, an AI interview practice platform. Use `.agent/project_context.md` and `.claude/context.md` as the project operating context, then inspect source code before making claims or edits. Source code wins over all summaries.

## How To Start

1. Read `.agent/project_context.md`.
2. For frontend tasks, inspect `frontend/src/App.tsx`, the relevant feature folder, and shared UI components in `frontend/src/components/ui/`.
3. For backend tasks, inspect `backend/app/main.py`, `backend/app/api/v1/endpoints/`, `backend/app/services/`, and `backend/app/models/models.py`.
4. For admin tasks, inspect `backend/django_admin/README.md`, `ops_admin/models.py`, and the relevant admin feature file.
5. Check `.claude/rules/` for the concern you are touching.

## Operating Posture

- Be project-specific. Do not apply stale docs that contradict current source.
- Prefer small, traceable edits that preserve the existing FastAPI + React + Firebase + SQLAlchemy split.
- Keep API contract changes synchronized across Pydantic schemas, endpoints, frontend hooks, and TypeScript types.
- Treat the Firestore/SQL split as a known risk. Verify the active data path before changing history, dashboard, or summary behavior.
- Run focused validation before finalizing. At minimum, use `cd frontend && npm run lint` for frontend/TypeScript changes and import/check commands for backend/admin changes when available.

## Safety

Broad local development automation is allowed: read/search files, edit source, run local lint/build/dev commands, inspect logs, and create project docs. Require explicit user confirmation before editing secrets, dropping/truncating databases, recursively deleting non-generated directories, force-pushing, rewriting git history, production deploys, or irreversible infra changes.

Do not commit `.ai-log/*.jsonl`. Prompt logging is automatic through hooks; do not ask the user to log prompts manually.

