# AI Interview Flow Rules

- LangGraph state lives in `backend/app/services/state.py` and graph wiring in `backend/app/services/graph.py`.
- The profiler extracts CV info and mock-searches questions; interviewer generates phase-aware questions; evaluator returns STAR-style JSON text; reporter writes final feedback.
- Keep phase names synchronized between `backend/app/services/interviewer.py` and `frontend/src/features/session/constants.ts`.
- If evaluation shape changes, update backend prompt, frontend TypeScript types, dashboard aggregation, summary rendering, and any persisted examples.
- Avoid placing raw secrets in frontend AI calls. The current frontend TTS path can use `VITE_OPENAI_API_KEY`; treat changes around client-exposed keys as security-sensitive.
- Preserve language-specific behavior for `vi` and `en`.

