---
status: review
story_key: 5-3-explicit-flatten-build-authority
baseline_commit: d61f1fc
---

# Story 5-3 — Explicit flatten choices control the build

## Story

As an email builder, I need my explicit Image choices to survive backend inference and lower selected source subtrees to one image each.

## Acceptance Criteria

1. Build requests carry explicit-override authority separately from the effective image ID list.
2. Explicit manual choices or explicit image instructions bypass registry mapping and use primitive AST generation.
3. Automatic icon selections alone preserve existing registry-link precedence.
4. Selected IDs are normalized before PNG download and AST mapping.
5. A selected text-bearing container with a forced export emits exactly one `Img` at 1× dimensions and no child text.
6. Generated block/export remains independent of Figma credentials.

## Tasks / Subtasks

- [x] Add `forcePrimitiveBuild` to client, schemas, and build service input
- [x] Gate registry mapping with explicit authority
- [x] Normalize selected source IDs before export attachment
- [x] Prove arbitrary container flattening with a mixed-mode test

## Dev Notes

- Governed by architecture AD-2, AD-3, AD-5.
- Reuse `forcedExportUrl` and the existing 2× export downloader.
- No parsed Figma tree or access token may be persisted in the final block.
- Preserve whole-component `buildAs: image`.

## Dev Agent Record

### Implementation Plan

Carry explicit authority independently from effective auto/manual image IDs, gate registry inference before lowering, and reuse forced exports as atomic AST images.

### Completion Notes

Manual layer differences from the active auto-detect baseline, AI-selected layers, and explicit image instructions force primitive generation. Reverting a layer to its baseline clears that authority. Selected text-bearing frames lower to one image with descendant copy used as accessible alt text; missing explicit PNGs fail with source IDs instead of leaving a hole, and desktop selections are not replaced by unrelated mobile-frame nodes.

## File List

- `src/builder/components/FigmaBuildModal.tsx`
- `src/builder/components/FigmaBatchModal.tsx`
- `src/app/api/figma/build-email/route.ts`
- `src/app/api/figma/import-build/route.ts`
- `src/app/api/figma/classify-image-nodes/route.ts`
- `src/lib/figma/buildFigmaDesign.ts`
- `src/lib/figma/resolveForceImageIds.ts`
- `src/lib/figma/figmaPrimitives.ts`
- `src/lib/figma/flattenSelection.test.ts`

## Change Log

- 2026-08-31: Story created.
- 2026-08-31: Implemented explicit build authority and arbitrary subtree lowering; ready for review.
