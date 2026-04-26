# Gemini Project Guide

Use Gemini for broad repository understanding, impact analysis, implementation support, and review on CareerPulse.

Begin every substantial task by reading `.agent/project_context.md` and `.gemini/context.md`, then retrieve the specific source files involved. Source code is the final authority.

## What This Project Is

CareerPulse is an AI interview coach. The React frontend handles authentication, onboarding, interview setup, live interview UI, dashboard, and profile management. The FastAPI backend verifies Firebase Auth, stores SQL profile/interview data, runs LangGraph interview orchestration, and calls OpenAI services. Django Admin provides an operations console over the same SQL tables.

## Gemini Strengths To Apply

- Build a repository map before recommending changes.
- Summarize feature flows from UI to persistence.
- Compare docs, code, and contracts for contradictions.
- Review diffs for regressions, auth/data risks, and missing validation.
- Help frame implementation plans for Codex/Claude-style editing.

## Ground Rules

- Do not hallucinate features; separate confirmed, inferred, and unclear.
- Always check whether a session/history/dashboard flow uses SQL, Firestore, or both.
- Keep API contracts synchronized across Pydantic schemas, FastAPI endpoints, TypeScript types, and React hooks.
- Treat secrets, database destruction, production deploys, and git history rewrites as confirmation-required.
- Do not commit `.ai-log/*.jsonl`; logging is automatic.

