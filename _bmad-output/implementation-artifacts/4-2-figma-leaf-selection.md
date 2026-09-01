---
status: done
story_key: 4-2-figma-leaf-selection
---

# Story 4-2 — Figma AST leaves are selectable

## Acceptance Criteria

1. Editable Figma `Img` nodes (including linked and dual desk/mob renders) carry `data-node-path`.
2. `Spacer` and `Hr` carry selection attrs.
3. Text/Heading/Link/Button already annotated remain annotated, including dual variants.

## Tasks

- [x] Fix `FigmaReactEmailBlock` so `sel` is not dropped on images
- [x] Annotate Spacer/Hr/CodeInline/Markdown/CodeBlock
- [x] Unit-test via render of a small tree with `editable` + `blockId`

## File List

- `src/components/email/FigmaReactEmailBlock.tsx`
- `src/app/api/email/render/route.ts`
- `src/lib/render/previewSelection.test.ts`
