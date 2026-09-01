---
status: done
story_key: 4-5-export-isolation
---

# Story 4-5 — Export isolation and coverage

## Acceptance Criteria

1. `editable: false` / omitted render contains no `data-node-path`, `__fc-bridge`, or `__fc-style`.
2. Existing Figma customizer selection still works.
3. Full verify passes.

## Tasks

- [x] Render-route / template render test
- [x] Pointer-events CSS so images under links remain the hit target

## File List

- `src/app/api/email/render/route.ts`
- `src/lib/render/previewSelection.test.ts`
