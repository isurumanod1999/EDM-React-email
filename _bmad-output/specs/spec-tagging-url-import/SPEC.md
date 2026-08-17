---
id: SPEC-tagging-url-import
companions:
  - linkable-targets.md
  - tagging-sheet-contract.md
  - ../../planning-artifacts/architecture/architecture-tagging-url-import-2026-08-09/ARCHITECTURE-SPINE.md
sources:
  - docs/NEXT-PLANS.md
  - docs/CONFLUENCE-EDM-React-Email-Tool.md
  - docs/DEMO-PRESENTATION.md
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability only — consult them only if you need narrative rationale or prose color this contract intentionally omits.

# Fast URL / tagging import

## Why

**Pain to solve** for EDM builders: templates can be composed and exported as HTML + assets, but campaign **FINAL URLs**, **labels**, and **alt text** still get pasted by hand from the tagging spreadsheet. That blocks the ~1.5 h end-to-end target and risks missed or wrong links. The intended workflow is **compose the full template first** (without needing URLs while building components), then **upload the tagging Excel** afterward, map rows onto the right images / CTAs / logos / links, review in the UI, and ship them in the exported HTML before send QA.

## Capabilities

- **CAP-1**
  - **intent:** After the template layout is fully composed, user can upload a campaign tagging Excel into the builder for that open template so FINAL URL, label, alt, and match fields become structured rows in-session.
  - **success:** Given a valid tagging file (xlsx per production sheet) on a composed template, the tool shows a row list with FINAL URL and available label/alt/match columns; invalid/empty FINAL URL rows are flagged. Upload is available as a post-build step, not during block assembly.

- **CAP-2**
  - **intent:** System can propose which tagging row maps to which linkable target on the current template (image, CTA, logo, text link, or other registry URL field).
  - **success:** For a template with N linkable targets and a tagging sheet with matching rows, the UI shows proposed row→target pairs; unmatched rows and unmatched targets are both visible.

- **CAP-3**
  - **intent:** User can review, rematch, clear, or confirm proposed mappings before anything is written onto blocks.
  - **success:** User can change a row’s target, leave a row unapplied, and confirm; no block props change until confirm/apply.

- **CAP-4**
  - **intent:** User can apply confirmed mappings so FINAL URL, label, and alt update the matched block props on the saved template document.
  - **success:** After apply + save/reload, matched props hold the sheet values (URL on the target’s URL prop; alt on image/logo alt props; label per resolved label rule).

- **CAP-5**
  - **intent:** User can verify applied values in browser preview and in the exported HTML package (same href/alt/CTA text the props drive).
  - **success:** Exported HTML contains the applied FINAL URLs on the corresponding anchors/buttons and applied alt text on the corresponding images; preview matches those values.

- **CAP-6**
  - **intent:** User can walk an in-tool checklist of every applied URL and mark each checked in desktop and mobile preview contexts.
  - **success:** Checklist lists each applied target with its FINAL URL; user can mark pass/fail per item; incomplete checklist is visible before handoff.

## Constraints

- **Workflow order:** Compose the entire template first; upload tagging Excel only after build. Component assembly / Figma import MUST NOT require FINAL URLs (empty or placeholder link props are OK until tagging apply).
- Applied tagging values MUST write into existing registry block props that render/export already use (see `linkable-targets.md`) — not a side table that export ignores.
- Wrong auto-match MUST be correctable in UI before apply; apply without review is not acceptable as the only path.
- Stay inside the locked Epic 1–2 architecture baseline (ports/adapters, AD-1…AD-11); do not require F1–F4.
- Primary operator path is in-builder for the open template (not “run a script and paste results” as the main UX).
- Production input format is the campaign tagging spreadsheet (Excel/xlsx); column contract finalized in `tagging-sheet-contract.md` once Book1/production headers are confirmed.

## Non-goals

- Requiring or collecting campaign FINAL URLs while dragging/building/customizing components.
- Email-client / real-device render QA (Gmail, Outlook, iOS, etc.) — separate track.
- Authoring or inventing tracking/UTM strings when the sheet already supplies FINAL URL.
- Building carousel, colour selector, or hotspot components.
- Changing the Accelerator Handlebars + Gulp pipeline or injecting CRM Handlebars personalization tokens.
- Multi-template bulk tagging across the whole gallery in v1 (single open template).

## Success signal

A designer/dev finishes the full template layout without entering campaign URLs, uploads the tagging Excel, confirms row→target mappings in the UI, applies FINAL URL / label / alt, and downloads an HTML export where those URLs and alts are present on the right components — then ticks each link on the in-tool checklist in desk + mobile preview — without hand-editing every link in the property panel during build.

## Assumptions

- Book1 columns **FINAL URL**, **URL Label**, **Alt Text** are the production contract (see `tagging-sheet-contract.md`).
- v1 upload is xlsx via server exceljs; csv is optional stretch only if cheap.
- **URL Label** is the match key and reporting id — it does **not** overwrite visible CTA button text.
- FINAL URL is stored/exported literally, including CRM tokens such as `<%= message.delivery.internalName %>`.
- Unmatched/skipped rows warn; partial apply allowed; export not hard-blocked in v1.
- Optional manual URL edits in the property panel may still exist for fixes; they are not the primary tagging path.
- Architecture spine: `architecture-tagging-url-import-2026-08-09` (AD-12…AD-19).

## Open Questions

- Should export later hard-block when required image URL rows lack alt or remain unmatched? (Deferred in AD-18.)
- Should URL Label also be emitted as an analytics `_label` (or similar) on anchors in HTML? (Deferred.)
