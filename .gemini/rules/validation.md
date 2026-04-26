# Validation Rules

Recommend validation based on touched area:

- Frontend: `cd frontend && npm run lint`
- Frontend build/contract: `cd frontend && npm run build`
- Django Admin: `cd backend/django_admin && python manage.py check`
- Backend API: import or local uvicorn startup check
- Hooks: `bash scripts/setup_hooks.sh`

If validation is not possible, state the blocker and residual risk.

