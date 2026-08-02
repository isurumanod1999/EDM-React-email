# Phase History — What Was Built

Chronological record of completed work. For current status see [HANDOFF.md](../_bmad-output/planning-artifacts/HANDOFF.md).

Last updated: 2026-08-02

---

## Epic 1: Consistent API & Storage Foundation ✅

| Story | Deliverable |
|-------|-------------|
| 1.1 | `src/lib/config.ts` — Zod-validated env |
| 1.2 | `src/lib/ports/*` — TemplateRepository, AssetStore, EventLog, JobQueue |
| 1.3 | Filesystem template adapter + `fileStorage.ts` delegation |
| 1.4 | Local asset store adapter + upload route refactor |
| 1.5 | `src/lib/container.ts` composition root |
| 1.6 | `TemplateService` + template API routes |
| 1.7 | `src/lib/api/response.ts` uniform errors |
| 1.8 | Correlation id middleware + structured logger |
| 1.9 | `scripts/check-boundaries.mjs` |

---

## Epic 2: Internal Hardening & External-Exposure Gate ✅

| Story | Deliverable |
|-------|-------------|
| 2.1 | ESLint 8, Prettier, Vitest, `npm run verify` |
| 2.2 | ESLint fs restriction + extended boundary check |
| 2.3 | `accessContext.ts` + open-mode access gate in middleware |
| 2.4 | Legacy demo route lockdown |
| 2.5 | Body size limits + rate limiting in middleware |
| 2.6 | `scripts/check-secrets.mjs` |
| 2.7 | `exposureGate.ts` + `instrumentation.ts` |
| 2.8 | `docs/maintenance-upgrades.md` |

---

## Builder Polish — Week 1 ✅

| Story | Deliverable |
|-------|-------------|
| #1 Mobile layout | `BuilderMobileNav.tsx`, slide-over drawers ≤900px |
| #11 Toast system | `toastStore.ts`, `BuilderToastContainer.tsx` |
| #2 Unsaved guard | `useUnsavedChangesGuard.ts`, auto-save toasts |
| #10 Preview loading | Spinner, stale overlay, retry in `LivePreview` |
| #5 Gallery feedback | Error banner + retry, action toasts, loading states |

### Week 2 (pending)

See [builder-polish.md](../_bmad-output/planning-artifacts/builder-polish.md) — import menu, Figma lint/banner, import progress, block delete confirm, modal a11y, etc.

---

## Deferred (not started)

- **F1** PostgreSQL template storage  
- **F2** S3 asset storage  
- **F3** Background worker / JobQueue  
- **F4** Authentication (`AUTH_MODE=enforced`)

---

## Git reference

Branch `bmad-1` contains Epic 1–2 commits. Builder polish Week 1 may be uncommitted locally — run `git status` before handoff.
