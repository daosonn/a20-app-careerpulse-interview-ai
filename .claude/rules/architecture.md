# Architecture Rules

- Preserve the current monorepo boundaries: `frontend/`, `backend/app/`, and `backend/django_admin/`.
- Keep frontend route ownership in `frontend/src/App.tsx` and feature folders.
- Keep backend API routes under `backend/app/api/v1/endpoints/` and service logic under `backend/app/services/`.
- Keep Django Admin operational and mapped to existing SQLAlchemy table names; admin models are unmanaged.
- Do not reintroduce a Node/Express backend without explicit direction.
- Do not split the LangGraph service into separate microservices unless the user asks for that architecture change.

