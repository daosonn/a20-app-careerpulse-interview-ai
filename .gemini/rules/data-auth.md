# Data And Auth Rules

- Firebase UID owns Firestore documents.
- SQL user ID owns backend rows.
- FastAPI user creation is keyed by verified Firebase email.
- Firestore and SQL session data are not guaranteed to be synchronized.
- Never recommend exposing secrets in the frontend.
- Require confirmation before secrets, destructive DB actions, or production infra changes.

