# Investigation: Per-node Figma flatten selection

## Hand-off Brief

1. **What happened.** The referenced Figma component intentionally mixes semantic text with offer-banner subtrees whose exact typography, icon, border, and background should be preserved as raster images.
2. **Where the case stands.** The design confirms this is a mixed-mode import problem, not whole-component flattening: `ARIYA` and `ALL-ELECTRIC.` should remain editable text, while nodes `284:1387` and `284:1478` are candidate flattened image regions.
3. **What's needed next.** Extend the existing import-time `imageNodeIds` mechanism into an explicit per-node selection UX and persist the chosen rendering result in the generated React Email AST.

## Case Info

| Field | Value |
| --- | --- |
| Ticket | N/A |
| Date opened | 2026-08-31 |
| Status | Concluded |
| System | Next.js 14, React Email, Figma REST/MCP import pipeline |
| Evidence sources | Figma node `284:1347`, source code, tests, git history |

## Problem Statement

The user needs one imported Figma component to contain both structured, editable email elements and selectively flattened image regions. In the supplied example, the top heading and subheading remain semantic, the vehicle remains an image, the two promotional tags must be selectable for flattening as images, and the CTA remains a design element.

## Evidence Inventory

| Source | Status | Notes |
| --- | --- | --- |
| Figma design context, node `284:1347` | Available | Confirms semantic headings, vehicle image, two composite Tag subtrees, and CTA |
| Existing mixed-mode importer | Available | `imageNodeIds` and `forcedExportUrl` already support caller-forced subtree rasterization |
| Current editor/customizer | Available | Selects generated AST paths, but generated AST has no source-Figma export identity |
| Browser reproduction | Missing | To be performed after implementation |

## Investigation Backlog

| # | Path to Explore | Priority | Status | Notes |
| --- | --- | --- | --- | --- |
| 1 | Trace `imageNodeIds` from import UI through export download and AST build | High | Done | Existing transport and downloader are reusable |
| 2 | Determine where users can select individual source Figma nodes | High | Done | Build modal owns parsed source metadata |
| 3 | Confirm forced subtree build precedence and dimensions | High | Done | Forced mapper branch runs first and emits one 1× `Img` |
| 4 | Define re-import/edit behavior | Medium | Done | Deferred; generated AST materializes the result |

## Timeline of Events

| Time | Event | Source | Confidence |
| --- | --- | --- | --- |
| 2026-08-31 | User requested mixed semantic/raster output per component | User report | Confirmed |
| 2026-08-31 | Figma node inspection exposed Tag roots `284:1387` and `284:1478` | Figma design context | Confirmed |
| 2026-08-31 | Source scan found existing `imageNodeIds` → `forcedExportUrl` pipeline | Source code | Confirmed |

## Confirmed Findings

### Finding 1: The design has explicit subtree boundaries suitable for flattening

**Evidence:** Figma node `284:1347` contains Tag roots `284:1387` and `284:1478`, each wrapping its own visual treatment and text.

**Detail:** Flattening those roots preserves each promotional banner as one image while leaving sibling nodes semantic.

### Finding 2: The backend already accepts explicit source-node flatten choices

**Evidence:** `src/app/api/figma/import-build/route.ts`, `src/lib/figma/buildFigmaDesign.ts`, `src/lib/figma/resolveForceImageIds.ts`, and `src/lib/figma/attachMissingForcedExports.ts`.

**Detail:** `imageNodeIds` is already carried into forced PNG export retrieval and attached as `forcedExportUrl`.

### Finding 3: Whole-component image mode is too coarse

**Evidence:** `src/builder/components/FigmaBuildModal.tsx` exposes `Image — flatten whole component to one PNG`.

**Detail:** Whole-image mode would also flatten `ARIYA`, `ALL-ELECTRIC.`, and the CTA, contradicting the requested mixed output.

## Deduced Conclusions

### Deduction 1: This should extend the import flow rather than mutate an already-built AST

**Based on:** Findings 1–3.

**Reasoning:** Figma source node IDs and export URLs exist before/during build; the customizer later operates on generated React Email AST paths. Exporting an arbitrary customizer node later would require persisting the original Figma document and credentials or adding a separate render service.

**Conclusion:** The first implementation should let the user mark source Figma subtrees as `Design` or `Image` before build, then generate a normal mixed AST.

## Hypothesized Paths

### Hypothesis 1: Existing `forcedExportUrl` precedence can render an arbitrary selected container as one `Img`

**Status:** Confirmed

**Theory:** If a selected frame/group has `forcedExportUrl`, `figmaPrimitives` will replace that subtree with one image before semantic child mapping.

**Supporting indicators:** Explicit comments describe mixed-mode forced export as opt-in rasterization.

**Would confirm:** A focused unit test selecting a text-bearing Tag container produces one `Img` and no child `Text`.

**Would refute:** The builder only reads forced exports for nodes already classified as graphic/image clusters.

**Resolution:** `src/lib/figma/flattenSelection.test.ts` proves a text-bearing 520px Tag frame emits one image and no descendant text. `figmaPrimitives.mapNode` applies the forced branch before all semantic mapping.

## Missing Evidence

| Gap | Impact | How to Obtain |
| --- | --- | --- |
| Exact pre-build node-selection UI state | Determines UX location and payload | Inspect Figma fetch/build modal flow |
| Arbitrary container forced-export test | Confirms backend reuse | Add red test around `buildPrimitivesFromFigma` |
| Mobile-frame node correspondence | Affects desktop/mobile flatten parity | Trace current force-ID resolution |

## Source Code Trace

| Element | Detail |
| --- | --- |
| Entry point | Figma fetch/build modal submits source frame plus `imageNodeIds` |
| Trigger | User imports a Figma frame in Design mode |
| Condition | Selected source node ID is included in the forced-image set |
| Related files | `FigmaBuildModal.tsx`, `resolveForceImageIds.ts`, `attachMissingForcedExports.ts`, `figmaPrimitives.ts`, build/import API routes |

## Conclusion

**Confidence:** High

The requested behavior fits the existing mixed-mode architecture. The root cause was discoverability and authority: the modal only displayed detected/selected image candidates, and registry inference ran before mixed-mode directives. The delivered direction exposes every visible source layer, normalizes outermost choices, and lets explicit user modes force atomic primitive lowering.

## Recommended Next Steps

### Fix direction

Add a source-node tree to the Figma import flow with a per-node `Design`/`Image` mode, submit selected IDs through the existing `imageNodeIds` contract, and guarantee selected containers short-circuit into one generated `Img`.

### Diagnostic

Prove forced export precedence with a text-bearing Tag fixture, then test request payload and mixed AST output.

## Reproduction Plan

Import node `284:1347`, mark `284:1387` and `284:1478` as Image, build in Design mode, and verify the top headings remain `Heading`/`Text`, the vehicle remains an image, each tag becomes exactly one `Img`, and the CTA remains structured.

## Side Findings

- The current whole-component Image option remains useful but cannot satisfy mixed-mode imports.
