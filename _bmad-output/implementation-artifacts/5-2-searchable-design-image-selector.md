---
status: review
story_key: 5-2-searchable-design-image-selector
baseline_commit: d61f1fc
---

# Story 5-2 — Searchable Design/Image layer selector

## Story

As an email builder, I want to browse and search Figma layers and switch selected subtrees from Design to Image so composite banners can retain pixel fidelity while surrounding content remains editable.

## Acceptance Criteria

1. Design mode shows all eligible non-root source layers, not only detected/selected icons.
2. Search matches layer name, type, node ID, and text preview.
3. Rows show hierarchy indentation, name, type, dimensions, node ID, and optional text preview.
4. Checked rows visibly mean Image; unchecked rows mean Design; auto-detected rows are marked.
5. Help text warns that a selected parent includes descendants and flattened content is no longer text-editable.
6. Reset/close/reopen does not leak a prior session’s manual-override authority.

## Tasks / Subtasks

- [x] Render full searchable source outline in `FigmaBuildModal`
- [x] Track whether a user explicitly changed a layer mode
- [x] Preserve auto-detection toggle and AI suggestions
- [x] Add accessible labels and compact responsive styling

## Dev Notes

- Governed by architecture AD-3 and AD-4.
- Reuse `collectImageNodeOutline`; do not create a second traversal in the component.
- Maximum list size remains 400.
- Keep existing `selectedImageIds` payload semantics.

## Dev Agent Record

### Implementation Plan

Reuse `collectImageNodeOutline`, filter it locally by a normalized query, and preserve `selectedImageIds` as the effective checked set while tracking explicit authority separately.

### Completion Notes

Design mode now exposes a searchable hierarchical list of all source layers. Rows clearly show Design/Image, type, dimensions, ID, child count, text preview, auto status, and accessible mode labels.

## File List

- `src/builder/components/FigmaBuildModal.tsx`
- `src/builder/builder.css`

## Change Log

- 2026-08-31: Story created.
- 2026-08-31: Implemented the searchable Design/Image source-layer selector; ready for review.
