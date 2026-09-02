---
title: 'Director Demo Home, App Flow, and Theme'
type: 'feature'
created: '2026-09-02'
status: 'in-progress'
baseline_commit: 'd9647f6'
context:
  - '_bmad-output/planning-artifacts/builder-polish.md'
  - 'docs/DEMO-PRESENTATION.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The current homepage distracts from the product with legacy demo previews, a duplicated template list, hardcoded component inventory, and repeated links to the same destination. The application is also dark-only, which limits presentation flexibility for the director demo.

**Approach:** Rebuild `/` as a concise product overview that leads directly into the proven Workspace → Editor → Import → Customize → Export journey. Add a persistent light/dark switch to the top chrome of home, workspace, and editor, while keeping rendered email designs independent of the application theme.

## Boundaries & Constraints

**Always:** Use existing capabilities and honest product language; keep `/builder` as the template workspace and `/builder/[id]` as the editing surface; make one action visually primary per screen; remove legacy demo/component content and duplicate template fetching from the homepage; preserve keyboard focus, responsive behavior, theme contrast, and the white email-preview canvas; persist the selected theme across routes and reloads without a visible wrong-theme flash.

**Ask First:** Deleting legacy `/preview/*`, legacy email renderer code, static email examples, or changing API contracts; adding dependencies; materially hiding or removing editor capabilities instead of reorganizing their presentation.

**Never:** Present deferred authentication, database/storage, or real-inbox QA as complete; theme production email markup, Figma brand colors, or preview iframe contents; duplicate registry/template data in hardcoded homepage arrays; break existing builder URLs or Vercel route limits.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|---------------------------|----------------|
| First visit | No stored theme | Apply the OS preference, falling back to dark | Theme initializer must not block page use if storage/media APIs fail |
| Returning visit | `edm.ui.theme` is `light` or `dark` | Apply it before first paint and expose the opposite mode in the toggle label | Ignore invalid values and resolve as a first visit |
| Theme change | Toggle used on any app surface | Update `<html>`, persist preference, and retain it through navigation | UI remains usable when persistence is unavailable |
| Narrow viewport | Home, workspace, or editor on mobile/tablet | Primary journey and theme control remain reachable without toolbar overflow | Existing mobile drawers remain operational |

</frozen-after-approval>

## Code Map

- `src/components/home/HomePage.tsx` -- current marketing/demo hub; replace with focused product overview and workflow.
- `src/app/home.css` -- responsive homepage presentation and theme-aware visual treatments.
- `src/app/globals.css` -- dark defaults, light token overrides, semantic status tokens, and native color scheme.
- `src/app/layout.tsx` -- pre-hydration theme initialization and provider boundary.
- `src/components/theme/*` -- shared theme state and accessible toggle.
- `src/builder/components/BuilderGallery.tsx` -- workspace header and clearer entry action.
- `src/builder/components/BuilderToolbar.tsx` -- editor top-bar theme control.
- `src/builder/builder.css` -- theme-aware workspace/editor chrome and semantic feedback colors.
- `src/builder/components/code/CodeMirrorEditor.tsx` -- code editor palette follows application theme.
- `src/lib/theme/*` -- storage key, preference resolution, initializer, and unit tests.

## Tasks & Acceptance

**Execution:**
- [ ] `src/components/home/HomePage.tsx`, `src/app/home.css` -- remove demos, component chips, live stats/template duplication, and repeated CTAs; create a polished value proposition, capability proof, four-step workflow, and single primary Workspace path.
- [ ] `src/lib/theme/*`, `src/components/theme/*`, `src/app/layout.tsx` -- implement dependency-free, accessible, persistent light/dark behavior with synchronous first-paint initialization.
- [ ] `src/app/globals.css`, `src/builder/builder.css` -- add light and semantic tokens, replace dark-only chrome colors, and retain intentionally white preview surfaces.
- [ ] `src/builder/components/BuilderGallery.tsx`, `src/builder/components/BuilderToolbar.tsx` -- clarify Overview → Workspace → Editor navigation and place the shared theme control in each top bar without disrupting existing actions.
- [ ] `src/builder/components/code/CodeMirrorEditor.tsx` -- keep code readable in both themes.
- [ ] `src/lib/theme/theme.test.ts` -- cover stored, system, invalid, and unavailable-preference resolution.

**Acceptance Criteria:**
- Given a visitor opens `/`, when the page renders, then no legacy demo cards, component catalog, demo count, duplicated template cards, or duplicate-destination CTAs appear.
- Given a visitor follows the primary action, when navigation completes, then the journey is Overview → Workspace → Editor, with Figma import, customization, preview, and export still available.
- Given either theme is active, when home, workspace, editor, dialogs, feedback states, and code view are inspected, then application chrome is readable and email output remains visually unchanged.
- Given the editor is used at its responsive breakpoints, when the toggle and toolbar actions are used, then no primary control becomes inaccessible.

## Spec Change Log

## Design Notes

Use a restrained internal-product aesthetic rather than a public marketing site. Lead with “Figma to production-ready email,” show the journey as Import → Customize → Preview → Export, and use capability cards only for features that can be demonstrated now. Keep advanced editor tools available for Q&A; do not delete them.

## Verification

**Commands:**
- `npm run test -- src/lib/theme/theme.test.ts` -- theme resolution tests pass.
- `npm run typecheck` -- changed TypeScript compiles.
- `npm run lint` -- changed UI code is lint-clean.
- `npm run build` -- Next.js production build succeeds within the current route structure.

**Manual checks:**
- Review `/`, `/builder`, and `/builder/[id]` at desktop and narrow widths in both themes; reload and navigate between routes to verify persistence and no theme flash.
- Confirm preview iframe/email HTML colors do not change with application theme.
