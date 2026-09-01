---
title: Universal Preview Selection
project: EDM react email tool
status: active
created: 2026-08-31
inputDocuments:
  - _bmad-output/implementation-artifacts/investigations/universal-preview-selection-investigation.md
  - _bmad-output/planning-artifacts/architecture/architecture-universal-preview-selection-2026-08-31/ARCHITECTURE-SPINE.md
---

# Epics — Universal Preview Selection

## Functional Requirements

FR1: In the editable live preview, every meaningful visual element (image, heading, body/rich text, button/link, divider, icon) is individually clickable and shows a selection outline on the clicked element.
FR2: Built-in registry components annotate descendants with `field:{key}` paths that map to PropertyPanel fields.
FR3: Figma AST blocks annotate every rendered visual node (including Img, Spacer, Hr, dual desktop/mobile variants) with `data-node-path`.
FR4: Clicks on nested content select the nested identity, not only the outer block wrapper.
FR5: Exported / non-editable HTML contains no selection attributes or bridge script.
FR6: Selecting a built-in descendant highlights the corresponding property field; selecting a Figma node still opens the Figma customizer.

## Non-Functional Requirements

NFR1: No new runtime dependencies.
NFR2: Existing Figma node selection and code-panel span mapping continue to work for AST paths.
NFR3: `npm run verify` stays green.

## Additional Requirements

- Reuse `selectedNodePath` and the existing iframe postMessage protocol.
- Do not wrap exported markup in editor divs.

## UX Design Requirements

UX-DR1: Hover dashed outline and selected solid outline remain the existing `__fc-hover` / `__fc-selected` styles.
UX-DR2: Property fields that match the current `field:` path receive a visible selected state and scroll into view.

## Epic 4 — Universal preview selection

Builders can click any image, heading, text, button, or similar visual in the preview and land on the right editor control.

Stories:

- 4-1 Identity helpers and protocol
- 4-2 Figma renderer leaf coverage
- 4-3 Built-in component annotation
- 4-4 Property panel routing
- 4-5 Export isolation and regression coverage
