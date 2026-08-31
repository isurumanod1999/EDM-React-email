---
status: review
story_key: 5-1-source-layer-outline-and-normalization
baseline_commit: d61f1fc
---

# Story 5-1 — Source-layer outline and selection normalization

## Story

As an email builder, I need a complete source-layer outline and deterministic parent/child selection behavior so any meaningful Figma subtree can be chosen for flattening without duplicate exports.

## Acceptance Criteria

1. The outline returns every visible non-root container and graphic candidate with `id`, name, type, dimensions, hierarchy depth, child count, and optional text preview.
2. Text-bearing containers such as the supplied Figma Tag nodes are included.
3. Normalization removes root, hidden, unknown, and selected-descendant IDs while preserving source-tree order.
4. Existing icon auto-detection behavior is unchanged.

## Tasks / Subtasks

- [x] Extend `ImageNodeOutlineEntry` with hierarchy metadata
- [x] Include all visible source nodes and text-bearing containers in the outline
- [x] Add outermost source-selection normalization
- [x] Add focused unit tests for outline and normalization

## Dev Notes

- Governed by architecture AD-1, AD-2, AD-4.
- Use `node.nodeId ?? node.id`, but API-fetched nodes should expose Figma `nodeId`.
- Root flattening remains owned by `buildAs: image`.
- Do not add dependencies.

## Dev Agent Record

### Implementation Plan

Extend the existing source traversal, then normalize choices against that same tree so UI and backend share Figma node identity and source order.

### Completion Notes

The outline now carries depth and child count, derives a useful descendant text preview, and includes every visible non-root layer. Normalization rejects root/hidden/unknown IDs and removes selected descendants.

## File List

- `src/lib/figma/detectImageNodes.ts`
- `src/lib/figma/resolveForceImageIds.ts`
- `src/lib/figma/flattenSelection.test.ts`

## Change Log

- 2026-08-31: Story created.
- 2026-08-31: Implemented source outline metadata and outermost normalization; ready for review.
