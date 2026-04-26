# Skill: AI Flow Change

## Purpose
Modify prompts, LangGraph state, interview phases, evaluations, or reports.

## Process
1. Inspect `state.py`, `graph.py`, and the specific service.
2. Identify persisted and returned fields.
3. Keep phase/evaluation shapes synchronized with frontend constants and types.
4. Add graceful fallback behavior for LLM/provider failure.
5. Validate with a minimal mocked or manual request path where possible.

## Pitfalls
- Returning non-JSON evaluator output when UI expects parsed fields.
- Changing phase labels without updating frontend display.
- Increasing OpenAI dependence in setup where current behavior intentionally falls back.

