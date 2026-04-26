# Workflow: Validate Before Final

Use the relevant commands:

- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- `cd backend/django_admin && python manage.py check`
- `cd backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000`

Explain any skipped validation.

