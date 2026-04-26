# Data And Auth Rules

- Firebase Auth provides identity; FastAPI verifies tokens.
- Frontend Firestore user docs are not the same as backend SQL users.
- SQL user ID is used for backend ownership; Firebase UID is used for Firestore ownership.
- Do not expose or edit secrets without permission.
- Treat client-exposed OpenAI key paths as sensitive and prefer backend-mediated secrets for new work.

