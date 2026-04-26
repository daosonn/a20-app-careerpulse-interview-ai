# Testing And Validation Rules

- No conventional test suite is currently present. Use focused validation and report any gaps.
- Frontend changes: run `cd frontend && npm run lint`; run `cd frontend && npm run build` for UI/API contract changes.
- Backend changes: run import checks or `cd backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000` when practical; inspect OpenAPI route signatures if needed.
- Django Admin changes: run `cd backend/django_admin && python manage.py check`; use `python manage.py migrate --plan` before migrations.
- If a command fails because dependencies/env are missing, capture the failure and state what remains unverified.

