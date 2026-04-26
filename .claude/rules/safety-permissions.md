# Safety And Permission Rules

Allowed by default:

- Read, search, and inspect repository files.
- Edit project source, docs, and AI operating files.
- Run local lint, build, typecheck, dev servers, and non-destructive inspection commands.
- Read generated reports and local logs.

Require explicit confirmation:

- Edit `.env`, credentials, service account files, API keys, tokens, or production URLs.
- Drop/truncate/flush databases or rollback migrations destructively.
- Recursive deletion outside clearly generated temporary artifacts.
- Delete storage/uploads/chroma/data directories.
- Production deploys or irreversible infra changes.
- Force push, rewrite git history, reset hard, or clean untracked files.

Never commit `.ai-log/*.jsonl`.

