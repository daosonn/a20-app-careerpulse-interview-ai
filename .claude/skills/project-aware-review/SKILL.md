# Skill: Project-Aware Review

## Purpose
Review changes for bugs, regressions, data risks, auth gaps, and missing validation.

## Process
1. Identify touched feature areas and contracts.
2. Check auth/ownership on data access.
3. Check SQL and Firestore paths for divergence.
4. Check frontend type expectations and backend response shape.
5. Check admin unmanaged model compatibility for DB changes.
6. Report findings first, with file/line references.

## High-Risk Areas
- Session history/dashboard/summary data path.
- Firebase token verification and local user creation.
- Evaluation schema and phase names.
- Client-exposed API keys.
- Database migration behavior.

