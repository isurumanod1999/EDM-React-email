---
status: done
story_key: 4-1-preview-selection-identity
---

# Story 4-1 — Preview selection identity helpers

## Story

As a builder, I need a single identity contract so preview clicks can name any visual node without a second protocol.

## Acceptance Criteria

1. `fieldPath(key)` returns `field:{key}` and `parseFieldPath` round-trips registry field keys.
2. `editorSelectAttrs(editable, blockId, nodePath)` returns `data-block-id` and `data-node-path` only when `editable` is true; otherwise `{}`.
3. AST numeric paths are unchanged (`0.1.2`).

## Tasks

- [x] Add `src/lib/preview/selectionIdentity.ts` and unit tests
- [x] Add `PreviewEditContext` + `useSelectable(fieldKey)` in `src/builder/preview/PreviewEditContext.tsx`
- [x] Wrap built-in blocks in `PreviewEditScope` from `DynamicEmailTemplate` when `editable`

## File List

- `src/lib/preview/selectionIdentity.ts`
- `src/lib/preview/selectionIdentity.test.ts`
- `src/builder/preview/PreviewEditContext.tsx`
- `src/lib/render/DynamicEmailTemplate.tsx`

## Dev Notes

Do not import filesystem or Next from `lib/preview`. Context default is null so catalogue emails without the provider emit no attrs.
