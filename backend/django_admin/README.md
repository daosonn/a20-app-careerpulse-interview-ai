# Django Admin Portal

This directory contains an operations-focused Django Admin portal for the existing FastAPI + SQLAlchemy backend.

## Why this exists
- Keep FastAPI API architecture unchanged.
- Reuse the same database tables.
- Provide practical operator tooling with rich admin pages.

## Setup
1. Install dependencies from backend requirements (includes Django).
2. Create Django auth/session tables:

```bash
cd backend/django_admin
python manage.py migrate
```

3. Create an admin account:

```bash
python manage.py createsuperuser
```

4. Start the admin server:

```bash
python manage.py runserver 127.0.0.1:8080
```

5. Open:
- http://127.0.0.1:8080/admin/

## Notes
- The app uses unmanaged Django models mapped to SQLAlchemy tables (`users`, `interviews`, `educations`, etc.).
- On startup, Django triggers SQLAlchemy `init_db()` to ensure operational tables are present.
