# Frontend UI Rules

- Use existing feature folders and shared UI primitives from `frontend/src/components/ui/`.
- Use `apiUrl()` and `authenticatedFetch()` for FastAPI calls that require auth.
- Keep Firebase direct access isolated and verify whether the target feature currently uses Firestore or SQL-backed API data.
- Preserve the established visual system: navy dark surfaces, gold accents, cream light sections, serif headings, Lucide icons, Tailwind utilities.
- Do not bulk-normalize mojibake Vietnamese strings unless the task is explicitly copy/encoding cleanup.
- For file uploads, keep client-side extraction through `frontend/src/lib/fileParser.ts` unless changing the product flow intentionally.
- Keep full-viewport interview routes outside the sidebar layout.

