# Backend Rules

- Use `CurrentUser` for protected user data.
- Filter user-owned rows by `current_user.id`.
- Keep `backend/app/schemas/` aligned with endpoint payloads.
- Keep `backend/app/models/models.py` and Django unmanaged models aligned for schema changes.
- Preserve fallback behavior around optional LLM work where current code has it.
- Roll back SQL sessions on caught write errors when needed.

