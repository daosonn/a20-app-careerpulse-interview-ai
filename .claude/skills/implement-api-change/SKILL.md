# Skill: Implement API Change

## Purpose
Safely change a FastAPI endpoint or contract.

## Inputs
- Endpoint or flow to change
- New request/response fields
- Frontend caller expectations

## Process
1. Inspect endpoint, schema, model, and frontend call sites.
2. Update Pydantic schemas before endpoint logic.
3. Update service/model logic with backward-compatible defaults where possible.
4. Update TypeScript types and UI consumers.
5. Run frontend typecheck/build and backend import/check commands.

## Pitfalls
- Adding fields to SQLAlchemy but not Django unmanaged models.
- Returning snake_case while frontend expects camelCase, or the reverse.
- Forgetting auth and ownership filters on user data.

