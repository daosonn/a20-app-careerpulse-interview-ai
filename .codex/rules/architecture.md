# Architecture Rules

- Current backend is FastAPI, not Node/Express.
- Current AI orchestration is LangGraph in process, not separate microservices.
- Current primary LLM paths use OpenAI, not Gemini.
- Django Admin is an operations surface over the same SQL tables; keep unmanaged models aligned.
- Vercel deployment is split by root directory: `backend` and `frontend`.

