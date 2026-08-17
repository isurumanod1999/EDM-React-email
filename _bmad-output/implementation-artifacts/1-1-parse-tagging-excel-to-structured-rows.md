---
baseline_commit: a9f86a0560bbab38f42fa915755e2253fe011718
---

# Story 1.1: Parse tagging Excel to structured rows

Status: done

<!-- Ultimate context engine analysis completed - comprehensive developer guide created -->

## Story

As an EDM builder,  
I want to upload a campaign tagging `.xlsx` after my template is composed and see FINAL URL, URL Label, and Alt Text rows,  
so that I can work from the tagging sheet inside the tool without pasting cell-by-cell yet.

## Acceptance Criteria

1. **Given** a Book1-style `.xlsx` with headers that normalize to FINAL URL / URL Label / Alt Text (whitespace/newlines in header cells OK)  
   **When** `POST /api/tagging/parse` receives multipart field `file`  
   **Then** response includes rows shaped as `TaggingRow`: `{ finalUrl, urlLabel, altText?, raw, status, skipReason? }` (or equivalent where status is on a wrapper)

2. **Given** rows with missing FINAL URL, empty FINAL URL, or CRM-include-only values (e.g. contains `<%@ include` / MirrorPage / `nmaLCUnsubsciptionURL` / non-http include strings)  
   **When** parse completes  
   **Then** those rows are `status: "skipped"` with a human-readable `skipReason` and are never treated as apply-ready

3. **Given** normal https FINAL URL rows (including CRM tokens like `<%= message.delivery.internalName %>` inside the URL string)  
   **When** parse completes  
   **Then** `finalUrl` is the **literal** sheet string (do not strip tokens); `urlLabel` and `altText` come from URL Label / Alt Text columns

4. **Given** the parse route  
   **When** implemented  
   **Then** exceljs runs **only on the server** in `src/lib/tagging/`; the route is thin (validate → service → JSON); browser must not import exceljs

5. **Given** builder block assembly / Figma import  
   **When** this story ships  
   **Then** no new requirement to enter FINAL URLs while building components (post-compose only; this story does not gate palette/add-block)

6. **Given** unit tests for header normalization + skipped special rows + happy-path row  
   **When** `npm run verify` runs  
   **Then** it passes for the changed code

## Tasks / Subtasks

- [x] Add dependency `exceljs@^4.4.0` (server-only usage) (AC: #4, #6)
- [x] Create `src/lib/tagging/types.ts` — `TaggingRow`, row status union including `skipped`, header normalize helpers (AC: #1–#3)
- [x] Create `src/lib/tagging/parseWorkbook.ts` — exceljs load buffer → first sheet → map headers → rows; classify skipped (AC: #1–#3)
- [x] Create `src/lib/tagging/service.ts` — `parseTaggingWorkbook(buffer)` / `getTaggingService()` pattern mirroring `getTemplateService()` (AC: #4)
- [x] Create `src/app/api/tagging/parse/route.ts` — multipart `file` like assets upload; Zod/presence checks; `handleRouteError` with code `tagging_parse_failed` (AC: #1, #4)
- [x] Middleware: if JSON body-size limiter would block multipart, exempt `/api/tagging/parse` the same way as `/api/assets/upload` (AC: #1)
- [x] Minimal builder entry: file input that `FormData` POSTs to `/api/tagging/parse` and displays returned rows (table or JSON dump OK for 1.1; full TaggingPanel is Story 1.3) (AC: #1, #5)
- [x] Tests: `src/lib/tagging/parseWorkbook.test.ts` with fixture buffer or synthetic workbook (happy path + skip Mirror/Unsubscribe + messy headers) (AC: #2, #6)
- [x] Run `npm run verify` (AC: #6)

## Dev Notes

### Scope boundary (do NOT do in 1.1)

- No URL Label → target matching (Story 1.2)
- No rematch/confirm UI beyond showing parse results (Story 1.3)
- No apply to block props / TemplateService save (Story 1.4)
- No export HTML assertions (Story 1.5)
- No click checklist (Story 1.6)

### Architecture compliance

- **AD-12:** Post-compose only — upload exists for open template; do not require URLs on assemble
- **AD-13:** Canonical row = `finalUrl`, `urlLabel`, `altText`, `raw`
- **AD-16:** Keep FINAL URL literal (CRM tokens intact)
- **AD-17:** `src/lib/tagging/*` + thin `/api/tagging/parse`; exceljs server-only
- **AD-18:** Skip non-usable FINAL URL rows with reason
- Inherit **AD-1, AD-8, AD-9:** thin route, Zod/validation, `{ error, code, correlationId? }` via `handleRouteError` / `errorResponse`

[Source: `_bmad-output/planning-artifacts/architecture/architecture-tagging-url-import-2026-08-09/ARCHITECTURE-SPINE.md`]

### Sheet contract (Book1)

| Logical header | Field |
| --- | --- |
| FINAL URL | `finalUrl` |
| URL Label | `urlLabel` |
| Alt Text | `altText` |

Normalize headers: collapse whitespace/newlines, case-insensitive match containing or equaling these names (Book1 headers are multi-line).

Skip when `finalUrl` empty OR looks like CRM include (e.g. includes `<%@`, `MirrorPageUrl`, `nmaLCUnsubsciptionURL`) rather than an http(s) URL. Rows that are section titles only (no FINAL URL) → skipped.

[Source: `_bmad-output/specs/spec-tagging-url-import/tagging-sheet-contract.md`]

### Library

- **exceljs `^4.4.0`**. MIT. Import only from server modules / route.

## Dev Agent Record

### Agent Model Used

Amelia / bmad-dev-story (Cursor Grok)

### Debug Log References

### Completion Notes List

- exceljs added; parse + classify in `src/lib/tagging`
- `POST /api/tagging/parse` multipart; middleware exempt for xlsx
- Toolbar **Tagging…** button shows parse table (proposed/skipped)
- 6 unit tests green; `npm run verify` green (39 tests)

### File List

- package.json
- package-lock.json
- src/lib/tagging/types.ts
- src/lib/tagging/parseWorkbook.ts
- src/lib/tagging/parseWorkbook.test.ts
- src/lib/tagging/service.ts
- src/app/api/tagging/parse/route.ts
- src/middleware.ts
- src/builder/components/tagging/TaggingUpload.tsx
- src/builder/components/BuilderToolbar.tsx
- _bmad-output/implementation-artifacts/1-1-parse-tagging-excel-to-structured-rows.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

### Change Log

- 2026-08-10: Implemented Story 1.1 parse tagging Excel end-to-end
