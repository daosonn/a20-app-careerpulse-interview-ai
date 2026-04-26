# Frontend Rules

- Use shared UI primitives from `frontend/src/components/ui/`.
- Use `apiUrl()` for API paths and `authenticatedFetch()` for protected FastAPI calls.
- Keep Firestore reads/writes explicit; do not accidentally move a SQL-backed flow to Firestore or the reverse.
- Preserve route layout rules: interview room is full viewport; dashboard/setup/profile use sidebar layout.
- Run `cd frontend && npm run lint` after TS/React edits.

