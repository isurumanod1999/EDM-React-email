# Builder Polish Backlog

> **Phase:** Builder Polish — next active work after Epic 1–2 baseline.  
> **Scope:** UI/UX polish only. No infrastructure (F1–F4).  
> Last updated: 2026-08-02

---

## 1. Builder Architecture Summary

### Entry points

- `src/app/builder/page.tsx` — renders `BuilderGallery` (template list)
- `src/app/builder/[id]/page.tsx` — renders `BuilderEditor` for a single template

### Main components (layout)

```
BuilderEditor
├── BuilderToolbar          (save, export, Figma/AI modals, duplicate)
├── ComponentPalette        (left — draggable registry items)
├── BlockCanvas + LivePreview   (center — DnD canvas + iframe preview)
├── PropertyPanel           (right — template meta + block props)
└── ComponentCustomizer     (overlay drawer — Figma React Email AST only)
```

### State flow

- **Central store:** `src/builder/store/builderStore.ts` (Zustand)
  - Template document, registry, selection (`selectedBlockId`, `selectedNodePath`), dirty/save flags, Figma session
  - Mutations: block CRUD/reorder, node tree edits, meta updates, `save()` → `PUT /api/templates/:id`
- **Hooks:**
  - `src/builder/hooks/useAutoSave.ts` — 45s interval save when dirty
  - `src/builder/hooks/useTemplatePreview.ts` — debounced `POST /api/email/render`
- **DnD:** `@dnd-kit` in `BuilderEditor.tsx` — palette → canvas drop, block reorder
- **Preview click-to-edit:** `LivePreview.tsx` ↔ iframe via `postMessage` (`figma-customizer` / `figma-customizer-parent`)
- **Figma AST editing:** `ComponentCustomizer.tsx` + `builder/lib/treeEdit.ts`

### API usage (client)

| Consumer | Endpoint |
|---|---|
| `builderStore` | `/api/registry`, `/api/templates/:id` |
| `BuilderGallery` | `/api/templates`, duplicate, delete |
| `useTemplatePreview` | `/api/email/render` |
| `BuilderToolbar` | `/api/email/export` |
| Modals | `/api/figma/*`, `/api/ai/*`, `/api/assets/upload`, `/api/email/send` |

---

## 2. Top UX/UI Pain Points (from code)

| Area | Issue | Status |
|---|---|---|
| **Mobile/tablet** | At `max-width: 900px`, palette/properties hidden with no fallback | ✅ Fixed (#1) — `BuilderMobileNav` + slide-over drawers |
| **Toolbar** | 10+ actions in one row, no overflow/menu | ✅ Fixed (#9) — Import dropdown + quick Build when session loaded |
| **Unsaved work** | No `beforeunload` or route-leave guard | ✅ Fixed (#2) — `useUnsavedChangesGuard` |
| **Errors** | Export `alert()`; gallery failures silent | ✅ Fixed (#5, #11) — toasts + gallery retry banner |
| **Loading** | Plain text; preview stale during re-render | ✅ Fixed (#10) — spinner, stale overlay, retry |
| **Empty states** | Gallery empty state minimal | ✅ Improved (#5) — richer empty state + CTA |
| **Destructive actions** | Block delete one-click with no confirm | ✅ Fixed (#3) — confirm before remove |
| **Modals** | No Escape/focus trap | ✅ Fixed (#13) — `useModalA11y` on all modals |
| **Auto-save** | Silent success | ✅ Fixed (#2) — "Auto-saved" toast |
| **Duplicate UX** | Template name in toolbar **and** property panel | ⏸ Defer (#4) |
| **AI status** | `OllamaStatusBanner` never imported | ✅ Fixed (#7) — wired in screenshot + Figma build |
| **Send test** | Hardcoded default recipient | ✅ Fixed (#12) — env default + validation |
| **a11y** | Missing `aria-label`, focus management | ✅ Fixed (#13); #14 keyboard nav deferred |

---

## 3. Known Lint / Issues

| File | Issue |
|---|---|
| `src/builder/components/customizer/RichTextEditor.tsx:39` | Intentional `eslint-disable` for mount-only seed effect |
| `ImageUploadField.tsx`, `FigmaReviewPanel.tsx` | `@next/next/no-img-element` suppressions (expected for uploads/previews) |

---

## 4. Polish Stories (14)

### Core Editor

#### 1. Mobile-friendly editor layout ✅

- **User value:** Usable builder on tablet/small laptop, not canvas-only.
- **Files:** `builder.css`, `BuilderEditor.tsx`, new `BuilderMobileNav.tsx` (or similar)
- **Effort:** L
- **Acceptance:**
  - Below 900px, palette and properties reachable via tabs or slide-over drawers
  - ComponentCustomizer drawer remains usable on narrow screens
  - Canvas + preview remain primary viewport

#### 2. Unsaved changes protection ✅

- **User value:** Avoid losing edits on navigation/tab close.
- **Files:** `BuilderEditor.tsx`, `useAutoSave.ts`, optionally `BuilderToolbar.tsx`
- **Effort:** S
- **Acceptance:**
  - Browser warns when leaving with `isDirty`
  - Navigating to `/builder` shows confirm if dirty
  - Auto-save success shows brief non-blocking feedback

#### 3. Safe block deletion with confirm ✅

- **User value:** Prevent accidental canvas data loss.
- **Files:** `BlockItem.tsx`, optionally shared `ConfirmDialog.tsx`
- **Effort:** S
- **Acceptance:**
  - Delete block requires confirmation (or undo snackbar within 5s)
  - Matches gallery delete pattern

#### 4. Consolidate template name editing ✅

- **User value:** One obvious place to rename templates.
- **Files:** `BuilderToolbar.tsx`, `PropertyPanel.tsx`
- **Effort:** S
- **Acceptance:**
  - Single editable name field (toolbar **or** properties, not both)
  - Changes still sync to store and save correctly

### Gallery

#### 5. Gallery action feedback and error handling ✅

- **User value:** Duplicate/delete failures are visible and recoverable.
- **Files:** `BuilderGallery.tsx`, `builder.css`
- **Effort:** S
- **Acceptance:**
  - Failed duplicate/delete shows inline error with retry
  - Successful duplicate navigates or shows toast
  - Loading state disables action buttons

#### 6. Gallery search, sort, and richer empty state ✅

- **User value:** Find templates quickly as the list grows.
- **Files:** `BuilderGallery.tsx`, `builder.css`
- **Effort:** M
- **Acceptance:**
  - Filter by name; sort by updated date / name
  - Empty state includes prominent “Create first template” CTA
  - Category shown as filter chip (optional)

### Figma / AI Import

#### 7. Fix FigmaBuildModal hook deps + wire AI status banner ✅

- **User value:** Stable image-node seeding; users know if AI/Ollama is down before import.
- **Files:** `FigmaBuildModal.tsx`, `AiImportModal.tsx`, `FigmaFetchModal.tsx`, `figma/OllamaStatusBanner.tsx`
- **Effort:** S
- **Acceptance:**
  - ESLint clean on `FigmaBuildModal.tsx`
  - `OllamaStatusBanner` shown in Screenshot Upload and Figma build flows
  - Image checklist re-seeds correctly when session changes

#### 8. Long-running import progress UX ✅

- **User value:** Clear feedback during 30–60s Figma builds and batch imports.
- **Files:** `FigmaBuildModal.tsx`, `FigmaBatchModal.tsx`, `FigmaFetchModal.tsx`, `AiImportModal.tsx`, `builder.css`
- **Effort:** M
- **Acceptance:**
  - Spinner/progress bar during fetch, build, analyze, batch run
  - Modal cannot dismiss mid-operation (batch already blocks close)
  - Timeout/server errors show actionable message

#### 9. Group toolbar import actions ✅

- **User value:** Less cluttered toolbar; clearer import workflow.
- **Files:** `BuilderToolbar.tsx`, `builder.css`, optionally `ImportMenu.tsx`
- **Effort:** M
- **Acceptance:**
  - Figma + Screenshot actions grouped under “Import” dropdown
  - Fetch → Build flow still one click away when session exists
  - Primary Save/Export remain visible

### Preview / Export / Send

#### 10. Live preview loading and stale-state handling ✅

- **User value:** Preview feels responsive; no flicker of outdated HTML.
- **Files:** `LivePreview.tsx`, `useTemplatePreview.ts`, `builder.css`
- **Effort:** S
- **Acceptance:**
  - Subtle overlay/spinner while `loading`
  - Optional dim/stale indicator during debounce
  - Preview errors offer “Retry render”

#### 11. Replace `alert()` with inline toast/banner system ✅

- **User value:** Consistent, non-blocking feedback across builder.
- **Files:** `BuilderToolbar.tsx`, shared `Toast.tsx` or extend status badges, `builder.css`
- **Effort:** S
- **Acceptance:**
  - Export errors/success use toast or toolbar banner, not `alert()`
  - Save/export/send share same feedback pattern

#### 12. Send test modal polish ✅

- **User value:** Safer, clearer test sends without hardcoded email.
- **Files:** `SendTestModal.tsx`, `builder.css`
- **Effort:** S
- **Acceptance:**
  - Default recipient from env/config or empty with validation
  - Email format validation before send
  - Resend domain limitation explained inline (already partially there)

### Polish / Accessibility

#### 13. Modal accessibility (Escape, focus trap) ✅

- **User value:** Keyboard and screen-reader friendly modals.
- **Files:** All `*Modal.tsx` in `components/`, shared `useModalA11y.ts`
- **Effort:** M
- **Acceptance:**
  - Escape closes modal (when not busy)
  - Focus trapped inside dialog; restored on close
  - Close buttons have `aria-label`

#### 14. Canvas and palette keyboard / a11y labels ✅

- **User value:** Basic keyboard access for block actions.
- **Files:** `BlockItem.tsx`, `ComponentPalette.tsx`, `BlockCanvas.tsx`
- **Effort:** M
- **Acceptance:**
  - Drag handle, duplicate, remove have `aria-label`
  - Palette items activatable via Enter (double-click already adds)
  - Selected block has visible focus ring

---

## 5. Recommended Sequence (1–2 weeks, max impact)

### Week 1 — Fix what blocks daily use ✅ COMPLETE

| Priority | Story | Status |
|---|---|---|
| 1 | **#1 Mobile layout** | ✅ Done |
| 2 | **#11 Toast/banner system** | ✅ Done |
| 3 | **#2 Unsaved guard + auto-save feedback** | ✅ Done |
| 4 | **#10 Preview loading polish** | ✅ Done |
| 5 | **#5 Gallery error handling** | ✅ Done |

### Week 2 — Workflow polish and import UX ✅ COMPLETE

| Priority | Story | Status |
|---|---|---|
| 6 | **#9 Import menu grouping** | ✅ Done |
| 7 | **#3 Block delete confirm** | ✅ Done |
| 8 | **#7 FigmaBuildModal lint + Ollama banner** | ✅ Done |
| 9 | **#8 Import progress UX** | ✅ Done |
| 10 | **#13 Modal a11y** | ✅ Done |
| 11 | **#12 Send test polish** | ✅ Done |
| 12 | **#6 Gallery search/sort** | ✅ Done |

**Defer unless extra capacity:** ~~#4 (name dedup), #14 (full keyboard nav)~~ — ✅ Done.

### Optional follow-up (Week 3+)

Builder polish backlog is **complete**. Next phases: deferred infrastructure (F1–F4) only if requested.

---

## Out of scope

Postgres, S3, auth, worker — none of the above stories touch infrastructure epics F1–F4.
