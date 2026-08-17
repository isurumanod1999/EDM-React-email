---
title: 'Build Figma footers from design only'
type: 'bugfix'
created: '2026-08-10'
status: 'done'
baseline_commit: 'a9f86a0560bbab38f42fa915755e2253fe011718'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Figma frames named Footer can be mapped to the prebuilt registry Footer, whose fixed layout and default content can introduce or reorder elements that are not visible in the selected Figma design.

**Approach:** Prevent every Figma footer match from selecting the prebuilt Footer. Build footer frames through the design-derived React Email AST so only visible Figma nodes, styles, text, links, and images determine the output.

## Boundaries & Constraints

**Always:** Apply the rule to footer matches by normalized name and Figma master component ID; preserve the manual prebuilt Footer for users who add it directly from the builder registry; ignore hidden or fully clipped Figma layers in design context and generated output.

**Ask First:** Any proposal to disable registry matching for non-footer components or remove the manual Footer component from the builder.

**Never:** Merge registry `defaultProps` into Figma footer output; synthesize social headings, social icons, links, copyright, logos, or legal copy; rasterize the entire footer when the existing AST path can represent it.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|---------------------------|----------------|
| Named footer | Visible frame named `Footer` or `🟢 Footer` | One `figma-react-email` AST block; no registry `footer` block | Fall back to existing AST build |
| Master-ID footer | Generic instance with a known Footer component ID | One design-derived AST block | Fall back to existing AST build |
| Full email | Registry-linkable sections plus a Footer child | Other eligible sections may use registry blocks; Footer does not | Footer remains AST-derived |
| Hidden social group | Footer component instance contains hidden/clipped social layers | Social layers are absent from context and output | Skip hidden/clipped descendants |
| Manual builder footer | User adds Footer from registry | Existing prebuilt Footer remains available | No behavior change |

</frozen-after-approval>

## Code Map

- `src/lib/figma/componentLinks.ts` -- defines automatic Figma-to-registry links, including Footer name and component-ID matches.
- `src/lib/figma/figmaToRegistryBlocks.ts` -- resolves registry matches before AST fallback.
- `src/lib/figma/buildFigmaDesign.ts` -- routes unmatched frames to `figmaToReactEmailTree`.
- `src/lib/figma/extractDesignContext.ts` -- summarizes raw Figma structure and must exclude non-visible/clipped nodes.
- `src/lib/figma/parseFigmaNode.ts` -- canonical visibility and clipping behavior for parsed nodes.
- `src/lib/figma/figmaToRegistryBlocks.test.ts` -- registry routing regression coverage.
- `src/lib/figma/figmaRegistryDefaults.test.ts` -- current Footer-specific registry tests to replace.

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/figma/figmaToRegistryBlocks.ts` -- make Footer an unconditional non-registry match while retaining registry behavior for other components.
- [x] `src/lib/figma/extractDesignContext.ts` -- align structure summaries with parser visibility/clipping rules so hidden social variants cannot appear in context.
- [x] `src/lib/figma/figmaToRegistryBlocks.test.ts` and `src/lib/figma/figmaRegistryDefaults.test.ts` -- prove name, emoji-name, component-ID, and mixed-email Footer cases never produce a registry Footer.
- [x] Add focused design-context visibility tests -- prove hidden and fully clipped social layers are omitted.

**Acceptance Criteria:**
- Given any Figma node resolving to registry component `footer`, when registry matching runs, then it returns no Footer registry block.
- Given the supplied Nissan Footer frame, when it is built, then the output uses `figma-react-email` and follows the visible Figma order and content.
- Given hidden or clipped social layers inside a Figma component instance, when design context and output are generated, then those layers and their content are absent.
- Given a manually added registry Footer, when it renders, then existing manual builder behavior remains available.
- Given all verification commands run, then typecheck, lint, boundaries, secret checks, and tests pass.

## Spec Change Log

- **2026-08-10 — patch (adversarial review, iteration 1).** Three-reviewer pass converged on a content-loss regression: footer AST injection only ran on the flat direct-children decompose path, so an email whose sections are nested under a wrapper took the nested-walk path (`figmaToRegistryBlocks.ts` instance-walk branch) and dropped the footer entirely (previously it appeared, wrongly, as a registry block). Fixed by injecting the design-derived footer in the walk path via `buildMixedDecomposedResult` in source order; added a nested-wrapper regression test. Rejected as noise: "map key vs unwrap mismatch" (`match.node` is already the unwrapped target) and "unconditional return of acceptDecomposedMatches" (re-selects and returns non-null when `selected` was non-null). Deferred: clip-tolerance (`TOL=2`) hiding 1–2px-visible layers is pre-existing and out of scope. KEEP: registry-match-boundary bypass (`REGISTRY_MATCH_BYPASS`) as the single chokepoint covering name/emoji/ID/override routes; `visibleDocumentChildren` as the one canonical visibility rule shared by parser and context.

## Design Notes

The bypass belongs at the registry-match boundary, not only in `componentLinks.ts`: a centralized rejection also covers component-ID overrides and future Footer aliases. AST fallback already produces a `figma-react-email` block from parsed visible nodes, so no new footer template should be introduced.

## Verification

**Commands:**
- `npx vitest run src/lib/figma/figmaToRegistryBlocks.test.ts src/lib/figma/figmaRegistryDefaults.test.ts` -- expected: Footer routing regressions pass.
- `npm run verify` -- expected: all project checks pass.
