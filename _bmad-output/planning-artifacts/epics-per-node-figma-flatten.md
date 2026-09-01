---
title: Per-node Figma Flatten Selection
project: EDM react email tool
status: active
created: 2026-08-31
inputDocuments:
  - _bmad-output/implementation-artifacts/investigations/per-node-figma-flatten-selection-investigation.md
  - _bmad-output/planning-artifacts/architecture/architecture-per-node-figma-flatten-2026-08-31/ARCHITECTURE-SPINE.md
---

# Epics — Per-node Figma Flatten Selection

## Functional Requirements

FR1: While building a Figma frame as Design, the user can inspect all eligible non-root source layers rather than only auto-detected icons.
FR2: The user can mark any eligible source subtree as Image so the subtree becomes one flattened PNG.
FR3: Unmarked siblings remain structured React Email elements, including headings, text, images, and buttons.
FR4: Parent and child Image selections resolve to the outermost selected subtree without duplicate assets or content.
FR5: Explicit manual Image choices cannot be discarded by registry-component inference.
FR6: The generated email persists ordinary local image assets and does not depend on Figma during preview or export.

## Non-Functional Requirements

NFR1: No new runtime dependency.
NFR2: Existing whole-component Image mode and automatic icon detection remain available.
NFR3: The selector remains usable with up to 400 outlined nodes through search and compact metadata.
NFR4: Invalid, root, hidden, and unknown node IDs are not exported as arbitrary images.
NFR5: Full `npm run verify` remains green.

## Additional Requirements

- Render choices use Figma `nodeId`, never generated AST dotted paths.
- Selected subtrees export at the existing 2× scale and render at 1× layout dimensions.
- Explicit layer choices force the primitive AST path; automatic icon suggestions alone keep existing registry-link behavior.
- Missing PNG exports produce a warning and no partial duplicate subtree.

## UX Design Requirements

UX-DR1: The Design build modal contains a searchable “Choose layers to flatten” list.
UX-DR2: Each row shows layer name, Figma type, dimensions, source node ID, hierarchy indentation, and a short text preview when available.
UX-DR3: Checked is clearly labeled Image; unchecked is Design; auto-detected entries are marked auto.
UX-DR4: Help text explains that selecting a parent includes its children and the exported result is no longer text-editable.

## Epic 5 — Per-node Figma flatten selection

Builders can preserve semantic content where email HTML is reliable while flattening selected composite design regions that require exact Figma fidelity.

Stories:

- 5-1 Source-layer outline and outermost-selection normalization
- 5-2 Searchable Design/Image layer selector
- 5-3 Explicit override authority through the build pipeline
- 5-4 Mixed-output regression coverage and handoff
