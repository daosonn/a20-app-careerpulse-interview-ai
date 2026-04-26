# Skill: Bug Investigation

Use when debugging a symptom.

Process:
1. Trace from user action to data source.
2. Compare expected contract to actual response/render.
3. Check auth/ownership and persistence store.
4. Patch the smallest cause.
5. Re-run focused validation.

Common traps:
- Dashboard/session summary Firestore reads while backend writes SQL.
- Evaluation schema mismatch.
- Missing Firebase ID token.

