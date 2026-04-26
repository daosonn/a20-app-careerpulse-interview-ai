# Skill: Project Onboarding

## Purpose
Build a fast, accurate mental model of CareerPulse before implementation.

## When To Use
Use at the start of unfamiliar tasks, broad refactors, or when docs/source disagree.

## Inputs
- User request
- Relevant feature area
- Files or symptoms, if provided

## Process
1. Read `.agent/project_context.md` and `.claude/context.md`.
2. Inspect route/component/API entrypoints for the feature.
3. Identify persistence path: FastAPI SQL, Firestore, or both.
4. Note confirmed facts, high-confidence inferences, and unclear areas.
5. Choose the smallest edit path.

## Expected Output
- Short architecture summary for the task.
- Files that matter.
- Risks or unknowns.
- Validation plan.

## Common Pitfalls
- Trusting stale Node/Express/Gemini docs.
- Missing the Firestore/SQL split.
- Changing generated/static admin files instead of source admin assets.

