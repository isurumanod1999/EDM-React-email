---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
status: complete
validatedAt: 2026-08-09
completedAt: 2026-08-09
inputDocuments:
  - _bmad-output/specs/spec-tagging-url-import/SPEC.md
  - _bmad-output/specs/spec-tagging-url-import/linkable-targets.md
  - _bmad-output/specs/spec-tagging-url-import/tagging-sheet-contract.md
  - _bmad-output/planning-artifacts/architecture/architecture-tagging-url-import-2026-08-09/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/architecture/architecture-edm-react-email-tool-2026-07-28/ARCHITECTURE-SPINE.md
outputFile: _bmad-output/planning-artifacts/epics-tagging-url-import.md
---

# EDM react email tool - Epic Breakdown (Tagging URL import)

## Overview

This document provides the epic and story breakdown for **post-compose tagging Excel import** (FINAL URL, URL Label, Alt Text), decomposing the feature SPEC and architecture spine into implementable stories. Baseline Epic 1–2 / F1–F4 remain in `epics.md` and are out of scope here.

## Requirements Inventory

### Functional Requirements

FR1: After a template is fully composed, the user can upload a campaign tagging `.xlsx` for that open template and see structured rows with FINAL URL, URL Label, and Alt Text (CAP-1).
FR2: Rows without a usable FINAL URL (missing or CRM include-only such as Mirror/Unsubscribe) are flagged as skipped/invalid and are not treated as applied (CAP-1, AD-13/18).
FR3: The system discovers linkable targets on the open template from registry URL fields (and paired alt props) and proposes row→target mappings using URL Label as the primary match key (CAP-2, AD-14/15).
FR4: The UI shows proposed matches plus unmatched rows and unmatched targets (CAP-2).
FR5: The user can rematch, clear, or leave rows unapplied; block props do not change until explicit apply (CAP-3, AD-14).
FR6: On apply, confirmed FINAL URLs write to the target’s registry URL props and Alt Text writes to paired alt props; URL Label does not overwrite CTA/button visible text (CAP-4, AD-15).
FR7: Applied FINAL URLs are stored and exported literally, including CRM tokens such as `<%= message.delivery.internalName %>` (CAP-4/5, AD-16).
FR8: After apply + save/reload, preview and exported HTML show the same href/alt values driven by those props (CAP-5, AD-6/15).
FR9: The user can walk an in-tool checklist of applied URLs, mark pass/fail in desktop and mobile preview contexts, and see incomplete checklist status before handoff (CAP-6, AD-19).
FR10: Tagging is post-compose only — component assembly / Figma import must not require FINAL URLs (AD-12).
FR11: Partial apply is allowed with warnings; unmatched rows do not hard-block HTML export in v1 (AD-18).

### NonFunctional Requirements

NFR1: Excel parsing runs server-side only (exceljs); browser must not load the workbook parser for apply (AD-17).
NFR2: Tagging APIs are thin Next.js route handlers — validate with Zod, call `src/lib/tagging` service, return uniform error envelope (AD-1/8/9/17).
NFR3: Feature stays within Epic 1–2 ports/adapters baseline; no F1–F4 (Postgres/S3/worker/auth) required.
NFR4: Applied values persist only via existing template document + `TemplateRepository` (no parallel URL store) (AD-2/4/15).
NFR5: `npm run verify` remains green (typecheck, lint, boundaries, secrets, tests) for new tagging code.

### Additional Requirements

- Add dependency **exceljs 4.4.x** for server parse.
- Module layout: `src/lib/tagging/{types,parseWorkbook,discoverTargets,matchRows,applyMappings,service}.ts`; routes `src/app/api/tagging/parse`, `.../apply`; UI `src/builder/components/tagging/TaggingPanel.tsx`.
- Target id convention: `{blockId}:{propKey}` (social: `{blockId}:social:N:url`).
- Mapping status enum: `proposed | confirmed | unmatched | skipped | applied`.
- Header matching tolerant of whitespace/newlines in Book1-style headers (**FINAL URL**, **URL Label**, **Alt Text**).
- Inherit parent AD-1…AD-11; feature AD-12…AD-19 bind implementation.
- Non-goals: email-client QA, UTM authoring, carousel/colour/hotspot, Handlebars Accelerator changes, multi-template bulk tagging, overwriting CTA copy from URL Label.

### UX Design Requirements

No UX design contract exists for this feature. UX work is implied by SPEC/architecture only (builder Tagging panel: upload, mapping table, rematch, apply, warnings, checklist). No separate UX-DR list.

### FR Coverage Map

FR1: Epic 1 — Upload xlsx → structured rows  
FR2: Epic 1 — Skip/flag non-usable FINAL URL rows  
FR3: Epic 1 — Discover targets + match by URL Label  
FR4: Epic 1 — Show proposed / unmatched in UI  
FR5: Epic 1 — Rematch / confirm before write  
FR6: Epic 1 — Apply URL + alt to registry props  
FR7: Epic 1 — Preserve literal FINAL URL / CRM tokens  
FR8: Epic 1 — Preview + export HTML fidelity  
FR9: Epic 1 — Click checklist desk + mobile  
FR10: Epic 1 — Post-compose only (no URL required at build)  
FR11: Epic 1 — Partial apply + warnings; export not hard-blocked  

## Epic List

### Epic 1: Post-compose tagging URLs from Excel

After the template is built, the user uploads the campaign tagging sheet, reviews URL Label → target matches, applies FINAL URL / Alt Text onto blocks, sees them in preview/export, and click-checks links in-tool.

**FRs covered:** FR1–FR11  
**NFRs:** NFR1–NFR5

---

## Epic 1: Post-compose tagging URLs from Excel

Builders finish layout without campaign URLs, then import Book1-style tagging Excel, map by URL Label, apply into existing block props, and verify links before handoff.

### Story 1.1: Parse tagging Excel to structured rows

As an EDM builder,  
I want to upload a campaign tagging `.xlsx` after my template is composed and see FINAL URL, URL Label, and Alt Text rows,  
So that I can work from the tagging sheet inside the tool without pasting cell-by-cell yet.

**Acceptance Criteria:**

**Given** an open composed template and a Book1-style `.xlsx` with FINAL URL / URL Label / Alt Text headers  
**When** I upload the file via the tagging flow  
**Then** the server parses it with exceljs and returns `TaggingRow[]` (`finalUrl`, `urlLabel`, `altText`, `raw`)  
**And** header matching tolerates whitespace/newlines in header cells  
**And** rows with missing FINAL URL or CRM-include-only URLs (e.g. MirrorPage / unsubscribe includes) are marked `skipped` with a reason (FR1, FR2)  
**And** parse runs only on the server through a thin Zod-validated `/api/tagging/parse` route; the browser does not load exceljs (NFR1, NFR2)  
**And** adding/editing blocks still does not require FINAL URLs (FR10)  
**And** unit tests cover happy-path headers and skipped special rows; `npm run verify` passes for touched code (NFR5)

### Story 1.2: Discover linkable targets and propose URL Label matches

As an EDM builder,  
I want the tool to list clickable targets on my template and propose which tagging row maps to which target using URL Label,  
So that I do not have to guess destinations from FINAL URL alone.

**Acceptance Criteria:**

**Given** a template with blocks that have registry `url`-type props (and paired alt props where defined) and a parsed `TaggingRow[]`  
**When** match runs  
**Then** linkable targets are discovered with stable ids `{blockId}:{propKey}` (social items `{blockId}:social:N:url`) (FR3)  
**And** primary matching uses `urlLabel` (normalized equality); ambiguous or zero matches remain `unmatched`  
**And** the proposal payload includes row status `proposed | unmatched | skipped` and optional `targetId` (FR3, FR4)  
**And** no template block props are mutated in this story (FR5)  
**And** tests cover exact label match, unmatched label, and skipped rows excluded from apply candidates

### Story 1.3: Tagging panel — review, rematch, and confirm

As an EDM builder,  
I want a builder UI to review proposed mappings, rematch or clear rows, and confirm before any write,  
So that wrong auto-matches cannot silently land on the wrong CTA or image.

**Acceptance Criteria:**

**Given** parse + match results for the open template  
**When** I open the Tagging panel (post-compose entry point)  
**Then** I see rows with FINAL URL, URL Label, Alt Text, status, and proposed target  
**And** unmatched rows and unmatched targets are both visible (FR4)  
**And** I can rematch a row to another target, clear a mapping, or leave it unapplied (FR5)  
**And** confirming selections only marks mappings `confirmed` in UI/session state — block props still unchanged until apply (FR5, AD-14)  
**And** warnings explain skipped rows; assembly/palette flows are unchanged and still do not require URLs (FR10)

### Story 1.4: Apply confirmed mappings to block props and save

As an EDM builder,  
I want confirmed FINAL URLs and Alt Text written onto the matched block props and saved on the template,  
So that preview/export use the real campaign links without a side URL table.

**Acceptance Criteria:**

**Given** one or more `confirmed` row→target mappings  
**When** I apply  
**Then** `/api/tagging/apply` (or equivalent thin route + service) writes `finalUrl` to the target URL prop and `altText` to the paired alt prop when present (FR6)  
**And** URL Label does **not** overwrite CTA/button visible text props (FR6)  
**And** FINAL URL strings are stored literally, including CRM tokens such as `<%= message.delivery.internalName %>` (FR7)  
**And** changes persist via existing TemplateService / TemplateRepository and reload shows the same props (NFR4)  
**And** unconfirmed/unmatched rows are left unchanged; partial apply succeeds with warnings (FR11)  
**And** tests assert prop writes, no CTA text clobber, and literal token preservation

### Story 1.5: Prove applied URLs in preview and exported HTML

As an EDM builder,  
I want browser preview and HTML export to show the applied hrefs and alts from block props,  
So that the handoff package matches what I tagged.

**Acceptance Criteria:**

**Given** a template with applied tagging props from Story 1.4  
**When** I preview and export HTML + assets  
**Then** exported anchors/buttons include the applied FINAL URL strings (including CRM tokens) and images include applied alt text where set (FR7, FR8)  
**And** preview matches those same prop-driven values (no separate export-only rewrite) (FR8, AD-6)  
**And** unmatched tagging rows do not hard-block export in v1; warnings remain available in the tagging UI (FR11)  
**And** a regression test or fixture asserts at least one CTA URL and one image alt appear in rendered/export HTML after apply

### Story 1.6: In-tool click checklist (desktop + mobile)

As an EDM builder,  
I want a checklist of every applied URL I can mark pass/fail in desktop and mobile preview contexts,  
So that I can confirm clicks before handoff without a separate spreadsheet.

**Acceptance Criteria:**

**Given** applied linkable targets on the open template  
**When** I open the tagging checklist  
**Then** each applied target lists its FINAL URL and allows pass/fail marking for desktop and mobile preview contexts (FR9)  
**And** incomplete checklist state is visible before handoff (FR9)  
**And** checklist state is UI/session verification only — href source of truth remains block props (AD-19)  
**And** checklist does not invent or rewrite URLs

---

**Story count:** 6 · **FR coverage:** FR1–FR11 all mapped · **UX-DRs:** n/a
