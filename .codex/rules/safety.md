# Safety Rules

Allowed:
- repository search/read
- source edits
- local lint/build/check/dev commands
- non-destructive git inspection

Confirm first:
- `.env` or credential edits
- database destructive actions
- mass file deletion
- production deploys
- git history rewrites
- deletion of `backend/data`, `chroma`, uploads, or migration history

Never commit `.ai-log/*.jsonl`.

