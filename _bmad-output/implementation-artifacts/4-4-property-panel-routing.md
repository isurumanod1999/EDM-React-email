---
status: done
story_key: 4-4-property-panel-routing
---

# Story 4-4 — Property panel follows field selection

## Acceptance Criteria

1. When `selectedNodePath` is `field:{key}`, the matching FieldRenderer is marked selected and scrolled into view.
2. Numeric Figma paths do not highlight property fields.

## Tasks

- [x] Pass selected field key into FieldRenderer
- [x] CSS `.field--selected`
- [x] scrollIntoView on change

## File List

- `src/builder/components/PropertyPanel.tsx`
- `src/builder/components/FieldRenderer.tsx`
- `src/builder/builder.css`
