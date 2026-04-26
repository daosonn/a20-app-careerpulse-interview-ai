# Data, Auth, And Persistence Rules

- Firebase Auth is the identity provider. FastAPI verifies ID tokens and maps users by email to SQL rows.
- SQL tables are defined in `backend/app/models/models.py`; Django Admin models in `backend/django_admin/ops_admin/models.py` must stay table-compatible.
- The app currently has both SQL-backed and Firestore-backed session data paths. Before changing session history, dashboard metrics, or summaries, identify which store the UI reads and which store the API writes.
- Do not edit `.env`, service account JSON, Firebase credentials, API keys, or production database URLs without explicit permission.
- Do not drop, truncate, flush, or destructively migrate databases without explicit confirmation.
- Lightweight SQL migrations currently happen inside `init_db()` through `ALTER TABLE ADD COLUMN`; larger schema changes need a deliberate migration plan.

