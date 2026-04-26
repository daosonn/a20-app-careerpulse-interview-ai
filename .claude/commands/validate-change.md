# Command: Validate Change

Use the smallest useful command set:

- Frontend: `cd frontend && npm run lint`
- Frontend build: `cd frontend && npm run build`
- Backend app import/dev: `cd backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000`
- Django Admin: `cd backend/django_admin && python manage.py check`
- Hook setup: `bash scripts/setup_hooks.sh`

If validation cannot run, record the blocker and residual risk.

