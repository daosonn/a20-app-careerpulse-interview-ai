# Validation Rules

- Frontend change: run `cd frontend && npm run lint`.
- Contract/UI route change: also run `cd frontend && npm run build`.
- Django Admin change: run `cd backend/django_admin && python manage.py check`.
- Backend API change: run an import/dev-server check when dependencies/env allow it.
- If validation cannot run, record why and what risk remains.

