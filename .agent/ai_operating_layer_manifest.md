# AI Operating Layer Manifest

This manifest lists the project-specific AI operating files generated for CareerPulse. The full content lives in each file.

## Shared

- `.agent/project_context.md`: shared source of truth for all AI assistants.
- `scripts/setup_hooks.sh`: root-level hook setup command required by `AGENTS.md`.
- `scripts/log_hook.py`: root wrapper for `backend/scripts/log_hook.py`.
- `scripts/submit_log.py`: root wrapper for `backend/scripts/submit_log.py`.

## Claude

- `.claude/CLAUDE.md`: Claude entrypoint and project behavior instructions.
- `.claude/context.md`: Claude-oriented stable project context.
- `.claude/settings.json`: Claude hooks plus broad-but-safe permissions.
- `.claude/rules/*.md`: modular source, architecture, backend, frontend, data/auth, AI-flow, validation, and safety rules.
- `.claude/skills/*/SKILL.md`: reusable project skills for onboarding, interview tracing, API changes, frontend work, AI-flow changes, and review.
- `.claude/commands/*.md`: repeatable workflows for feature work, bug investigation, API tracing, validation, and PR review.
- `.claude/agents/*.md`: specialized Claude subagent briefs for architecture, backend, frontend, and safety review.

## Codex

- `.codex/README.md`: Codex entrypoint optimized for implementation.
- `.codex/context.md`: concise Codex project context.
- `.codex/settings.json`: Codex automation and safety policy.
- `.codex/rules/*.md`: patch-oriented coding, architecture, backend, frontend, data/auth, AI-flow, validation, and safety rules.
- `.codex/skills/*.md`: reusable implementation, bug, API contract, AI-flow, and review guides.
- `.codex/commands/*.md`: quick command workflows for common coding tasks.
- `.codex/hooks.json`: prompt logging hook configuration.

## Gemini

- `.gemini/GEMINI.md`: Gemini entrypoint optimized for repository analysis and review.
- `.gemini/context.md`: Gemini-oriented stable project context.
- `.gemini/settings.json`: Gemini hook config plus safe automation guidance.
- `.gemini/rules/*.md`: analysis, architecture, contract, data/auth, review/safety, and validation rules.
- `.gemini/skills/*.md`: repository mapping, impact analysis, API flow summary, PR review, and implementation support guides.
- `.gemini/commands/*.md`: analysis and review workflows.

