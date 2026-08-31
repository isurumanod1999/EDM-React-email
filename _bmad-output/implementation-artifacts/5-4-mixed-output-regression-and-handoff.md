---
status: review
story_key: 5-4-mixed-output-regression-and-handoff
baseline_commit: d61f1fc
---

# Story 5-4 — Mixed-output regression coverage and handoff

## Story

As an email builder, I need proof that one component can combine semantic headings, normal imagery, flattened promotional banners, and a structured CTA without regressing existing imports.

## Acceptance Criteria

1. A representative tree keeps heading/subheading semantic, keeps its normal image, flattens two selected Tag containers, and keeps the button structured.
2. Parent/child selection does not create duplicate exports or duplicate AST nodes.
3. Existing selection, whole-image mode, auto-icon detection, and export isolation tests pass.
4. Full verification passes.
5. BMad investigation, architecture, epic, stories, and sprint status reflect the delivered behavior.

## Tasks / Subtasks

- [x] Add end-to-end service-level mixed-output regression test
- [x] Run `npm run verify`
- [x] Live-check the supplied Figma node through import/build and resulting AST
- [x] Update BMad artifacts and story statuses

## Dev Notes

- Use node IDs and shape similar to Figma `284:1347`; do not require a live Figma call in tests.
- Browser verification may require a fresh fetch of the supplied Figma node.
- Mobile-paired subtree mapping is deferred by architecture.

## Dev Agent Record

### Implementation Plan

Use a live-shaped parsed Figma fixture around node `284:1347`, then exercise `buildFigmaDesign` with explicit Tag IDs while registry linking is enabled to prove override authority.

### Completion Notes

Service-level coverage proves ARIYA/ALL-ELECTRIC remain semantic, the vehicle stays a normal image, two Tag roots become images, and SEE OFFERS remains a button. The live Figma import located nodes `284:1387` and `284:1478`; the live build produced two local flattened PNGs with semantic alt text while preserving ARIYA, ALL-ELECTRIC., and SEE OFFERS as structured nodes. Browser automation was unavailable, so validation exercised the same live import/build APIs directly. Full verification passes.

## File List

- `src/lib/figma/flattenSelection.test.ts`
- `docs/EDM-REACT-EMAIL-TOOL-A-TO-Z.md`
- `_bmad-output/implementation-artifacts/investigations/per-node-figma-flatten-selection-investigation.md`
- `_bmad-output/planning-artifacts/architecture/architecture-per-node-figma-flatten-2026-08-31/ARCHITECTURE-SPINE.md`
- `_bmad-output/planning-artifacts/epics-per-node-figma-flatten.md`
- `_bmad-output/implementation-artifacts/5-1-source-layer-outline-and-normalization.md`
- `_bmad-output/implementation-artifacts/5-2-searchable-design-image-selector.md`
- `_bmad-output/implementation-artifacts/5-3-explicit-flatten-build-authority.md`
- `_bmad-output/implementation-artifacts/5-4-mixed-output-regression-and-handoff.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-08-31: Story created.
- 2026-08-31: Added mixed-output coverage and validated the supplied Figma node through the live import/build APIs; ready for review.
