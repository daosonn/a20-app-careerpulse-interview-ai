# Source Of Truth Rules

- Source code is final authority over README or docs.
- `.agent/project_context.md` is the shared AI summary; update it when major behavior changes.
- Treat `docs/03_architecture.md` and some feature docs as potentially stale because they mention Node/Express/Gemini while current source uses FastAPI/OpenAI/LangGraph.
- When behavior matters, trace from route/component to hook/API endpoint/service/model.
- Mark uncertain areas explicitly, especially the Firestore vs SQL persistence split.

