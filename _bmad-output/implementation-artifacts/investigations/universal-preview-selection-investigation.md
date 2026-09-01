# Investigation: Universal Preview Selection

## Hand-off Brief

1. **What happened.** Confirmed: Figma AST nodes receive per-node selection metadata, while built-in components receive only one block-level wrapper, so their individual images, headings, text, buttons, and nested HTML cannot be selected.
2. **Where the case stands.** Active; the preview bridge and render boundary are identified, but node identity, property-editing scope, and coverage across all registered components still require mapping.
3. **What's needed next.** Inventory rendered component structures and mutation capabilities, then define one editor-only node identity contract shared by built-in and Figma blocks.

## Case Info

| Field | Value |
| --- | --- |
| Ticket | N/A |
| Date opened | 2026-08-31 |
| Status | Active |
| System | Windows 10; Next.js 14; React 18; React Email |
| Evidence sources | User report, source code, existing selection bridge, builder store |

## Problem Statement

User report: every component visible in the editable preview must be selectable, including every image, heading, button, text node, and other rendered HTML element. Large components currently contain elements that cannot be individually selected, preventing direct editing.

## Evidence Inventory

| Source | Status | Notes |
| --- | --- | --- |
| `src/app/api/email/render/route.ts` | Available | Click bridge selects only elements carrying `data-node-path`, otherwise falls back to `data-block-id`. |
| `src/components/email/FigmaReactEmailBlock.tsx` | Available | Figma AST renderer emits `data-node-path` per rendered AST node when editable. |
| `src/lib/render/DynamicEmailTemplate.tsx` | Available | Built-in components receive only an editor wrapper with `data-block-root`; descendants have no selection identity. |
| `src/builder/hooks/usePreviewSelectionBridge.ts` | Available | Store bridge already transports `{blockId, nodePath}`. |
| Runtime reproduction across all registry components | Missing | Required to quantify unselectable elements and overlay/click edge cases. |

## Investigation Backlog

| # | Path to Explore | Priority | Status | Notes |
| - | --- | --- | --- | --- |
| 1 | Registry and built-in component render structures | High | In Progress | Enumerate selectable element types and nesting. |
| 2 | Builder mutation/store model | High | Open | Determine whether non-Figma descendants can map to editable props or need a separate HTML-node model. |
| 3 | Preview bridge event targeting | High | Open | Validate nested click precedence, text-node clicks, links/buttons, images, empty containers, and overlays. |
| 4 | Property panel/customizer routing | High | Open | Define editor shown for each node category. |
| 5 | Export isolation and accessibility | Medium | Open | Selection metadata must remain editor-only and keyboard selection must be supported. |
| 6 | Automated coverage | High | Open | Unit/integration/browser tests for all supported node kinds. |

## Timeline of Events

| Time | Event | Source | Confidence |
| --- | --- | --- | --- |
| 2026-08-31 | User reported that descendants of large preview components cannot all be selected. | User report | Confirmed |
| 2026-08-31 | Source trace showed Figma nodes have paths but built-in descendants have only block-level identity. | Render and bridge source | Confirmed |

## Confirmed Findings

### Finding 1: Selection metadata coverage differs by component type

**Evidence:** `src/lib/render/DynamicEmailTemplate.tsx:84-117`; `src/components/email/FigmaReactEmailBlock.tsx:78-88`

**Detail:** Figma AST nodes are annotated individually. Built-in components are rendered inside one block wrapper, so every descendant click resolves to the same block-level selection.

### Finding 2: The iframe bridge cannot select unidentified descendants

**Evidence:** `src/app/api/email/render/route.ts:53-69`

**Detail:** Click handling searches for the closest `data-node-path`; when none exists it selects the closest `data-block-id`. It does not create identities for ordinary descendant HTML.

### Finding 3: The parent/store protocol can already carry node-level selection

**Evidence:** `src/builder/hooks/usePreviewSelectionBridge.ts:12-38`

**Detail:** Selection messages and store state already support a block ID plus node path, reducing the required protocol change.

## Deduced Conclusions

### Deduction 1: Event delegation alone cannot satisfy the request

**Based on:** Findings 1–3.

**Reasoning:** The bridge can discover any DOM element at click time, but editing requires a stable identity that maps the rendered element back to source data. Built-in component descendants currently have no such mapping.

**Conclusion:** Universal selection needs an editor-only identity model and a mutation mapping, not only a broader CSS selector.

## Hypothesized Paths

### Hypothesis 1: A shared editor-node descriptor can cover both component families

**Status:** Open

**Theory:** Built-in components can expose stable semantic node keys while Figma blocks retain AST paths; both can travel through one selection protocol.

**Supporting indicators:** Existing protocol already transports opaque path strings.

**Would confirm:** Every registry component can assign stable keys to its editable descendants and route them to existing or extended property mutations.

**Would refute:** Components contain generated/raw HTML descendants with no stable source mapping.

**Resolution:** Pending component inventory.

## Missing Evidence

| Gap | Impact | How to Obtain |
| --- | --- | --- |
| Complete registry/component inventory | Cannot define quantitative selection coverage | Trace registry definitions and component JSX. |
| Current property schemas per built-in component | Cannot determine what selecting a descendant can edit | Inspect registry schemas and property panel. |
| Runtime DOM behavior | Cannot validate overlays, nested links, or empty elements | Render all-components fixture and run browser interaction tests. |

## Source Code Trace

| Element | Detail |
| --- | --- |
| Error origin | `DynamicEmailTemplate`: built-in descendants are rendered without node-level metadata |
| Trigger | User clicks an image/text/heading/button inside a built-in preview block |
| Condition | No ancestor below the block root carries `data-node-path` |
| Related files | Render route bridge, Figma renderer, builder store, property/customizer panels, registry definitions |

## Conclusion

**Confidence:** High

The coverage gap is confirmed: Figma AST descendants support node selection, while built-in descendants collapse to block-level selection. The precise source-to-property mapping for universal built-in descendant selection remains open pending the component/schema inventory.

## Recommended Next Steps

### Fix direction

Define one editor-only selection identity contract, annotate every supported rendered element, and route selection to a node-aware editor without adding metadata to exported email HTML.

### Diagnostic

Render the complete component catalogue in editable mode, enumerate meaningful rendered elements lacking identity, and verify selection/highlight behavior for nested interactive and table-based email markup.

## Reproduction Plan

1. Open the all-components template in the builder.
2. Click nested image, heading, body text, link/button, table row/cell, and container elements.
3. Observe whether the selected outline targets the clicked element and whether an appropriate editor opens.
4. Repeat for a Figma AST block and compare behavior.

## Side Findings

- No project-level `project-context.md` is present, so repository conventions must be derived from code and BMad artifacts.
