# Project Handoff & Continuation Guide

> Purpose: let a **new Cursor agent (new account)** resume this exact plan without the previous chat's memory. Everything needed is in the repo `.md` files listed below plus this status.

Last updated: 2026-08-02

---

## 1. Planning artifacts (read these first, in order)

1. **PRD** — `_bmad-output/planning-artifacts/prds/prd-edm-react-email-tool-2026-07-28/prd.md`
   (Authentication PRD. Implementation is **deferred** — see Epic F4.)
2. **Architecture Spine** — `_bmad-output/planning-artifacts/architecture/architecture-edm-react-email-tool-2026-07-28/ARCHITECTURE-SPINE.md`
   (The invariants AD-1…AD-11. This is the source of truth for design rules.)
3. **Solution Design** — `_bmad-output/planning-artifacts/architecture/architecture-edm-react-email-tool-2026-07-28/solution-design.md`
4. **Epics & Stories** — `_bmad-output/planning-artifacts/epics.md`
   (Full story list with acceptance criteria. This is the work backlog.)

---

## 2. Architectural rules being followed (do not violate)

- **AD-1 / AR1:** Next.js route handlers only validate → call a service → shape response. No business logic or storage in handlers.
- **AD-2 / AR2:** Persistence only through ports (`TemplateRepository`, `AssetStore`, `EventLog`, `JobQueue`). No `fs`/DB/SDK calls outside `src/lib/adapters/**` (legacy figma/export fs usage is allowlisted in `scripts/check-boundaries.mjs` until refactored).
- **AD-3 / AR3:** One composition root — `src/lib/container.ts` — binds adapters by `STORAGE_DRIVER` / `ASSET_DRIVER`.
- **AD-8:** Zod-validate input before any side effect.
- **AD-9:** Uniform error envelope + correlation-id logging (see deviation note in §5).
- **AD-10:** Access gate in `src/middleware.ts` + `src/lib/auth/accessContext.ts`; `AUTH_MODE=open` now, `enforced` later (Epic F4).
- **AD-11:** Secrets are server-only; verified by `npm run check:secrets`.
- **Current phase binds ONLY** the filesystem template adapter and local-asset adapter. **No database, no S3, no worker.** Postgres/S3/worker/auth are deferred (Epics F1–F4) — do not build them unless the user asks.

---

## 3. Progress status

### Epic 1 — Consistent API & Storage Foundation — ✅ COMPLETE (Stories 1.1–1.9)

See git history / prior handoff entries for file map.

### Epic 2 — Internal Hardening & External-Exposure Gate — ✅ COMPLETE (Stories 2.1–2.8)

- **2.1** Test/lint/format baseline — ESLint 8 + Prettier + Vitest; `npm run verify` green.
- **2.2** Enforced import-boundary rule — ESLint `no-restricted-imports` on `src/app/**`; extended `scripts/check-boundaries.mjs` for lib/ fs usage with documented allowlist.
- **2.3** Pass-through access gate — `src/lib/auth/accessContext.ts` + middleware stamps anonymous actor in `AUTH_MODE=open`; enforced mode fails closed (503) until Epic F4.
- **2.4** Legacy demo route lockdown — `/preview/*` and `/api/email/[template]` blocked unless `ENABLE_LEGACY_DEMOS=true` or `NODE_ENV=development`.
- **2.5** Request hardening — body-size limits (5MB/10MB) and in-process rate limiting (30/min) on expensive routes in middleware.
- **2.6** Server-only secret verification — `scripts/check-secrets.mjs` wired into `verify`.
- **2.7** External-exposure gate — `src/instrumentation.ts` + `src/lib/security/exposureGate.ts` refuse non-local bind with `AUTH_MODE=open`.
- **2.8** Dependency-upgrade maintenance track — `docs/maintenance-upgrades.md`.

### Builder Polish — Week 1 — ✅ COMPLETE (Stories #1, #2, #5, #10, #11)

| Story | Deliverable |
|-------|-------------|
| #1 Mobile layout | `BuilderMobileNav.tsx`, slide-over drawers ≤900px |
| #11 Toast system | `toastStore.ts`, `BuilderToastContainer.tsx`; export uses toasts not `alert()` |
| #2 Unsaved guard | `useUnsavedChangesGuard.ts`, `beforeunload`, link intercept, auto-save toasts |
| #10 Preview loading | `useTemplatePreview.ts` — stale overlay, spinner, retry in `LivePreview` |
| #5 Gallery feedback | `BuilderGallery.tsx` — error banner + retry, action toasts, loading states |

Details: [builder-polish.md](./builder-polish.md) · [docs/PHASE-HISTORY.md](../../docs/PHASE-HISTORY.md)

### Builder Polish — Week 2 — ✅ COMPLETE (Stories #3, #6, #7, #8, #9, #12, #13)

| Story | Deliverable |
|-------|-------------|
| #9 Import menu | `ImportMenu.tsx` — Import dropdown; quick Build when Figma session loaded |
| #3 Block delete confirm | `BlockItem.tsx` — confirm() before remove |
| #7 Lint + Ollama banner | `FigmaBuildModal.tsx` hook fix; `OllamaStatusBanner` in build + screenshot flows |
| #8 Import progress | `ImportProgressBanner.tsx`; spinners + no-dismiss-while-busy in all import modals |
| #13 Modal a11y | `useModalA11y.ts` applied to all `*Modal.tsx` |
| #12 Send test polish | `SendTestModal.tsx` — `NEXT_PUBLIC_TEST_EMAIL_DEFAULT`, email validation |
| #6 Gallery search/sort | `BuilderGallery.tsx` — filter by name, sort by updated/name |
| #4 Name editing | Toolbar-only rename; removed duplicate field from `PropertyPanel` |
| #14 Keyboard/a11y | Block/palette `aria-label`, Enter-to-add, focus rings |

Details: [builder-polish.md](./builder-polish.md) · [docs/PHASE-HISTORY.md](../../docs/PHASE-HISTORY.md)

**Builder polish backlog: ✅ COMPLETE** (all 14 stories done or N/A for optional category chips).

### Deferred — DO NOT build unless asked

- **Epic F1** PostgreSQL repository, **Epic F2** S3 asset store, **Epic F3** background worker/JobQueue, **Epic F4** authentication (`AUTH_MODE=enforced`).

---

## 4. How to verify at any point

```bash
npm run verify   # typecheck + lint + check:boundaries + check:secrets + test
npm run build && npm run check:secrets   # also scan built static chunks
```

Individually: `npm run typecheck`, `npm run lint`, `npm run check:boundaries`, `npm run check:secrets`, `npm run test`.

Environment note: **Windows / PowerShell**; Python is `py -3`.

### Useful env vars

| Variable | Default | Purpose |
|----------|---------|---------|
| `AUTH_MODE` | `open` | Access gate posture |
| `HOST` | `localhost` | Bind address for exposure gate (Story 2.7) |
| `ENABLE_LEGACY_DEMOS` | `true` in dev, `false` in prod | Legacy `/preview` and `/api/email/[template]` routes |
| `STORAGE_DRIVER` | `filesystem` | Template storage adapter |
| `ASSET_DRIVER` | `local` | Asset storage adapter |

---

## 5. Recorded deviations from the architecture (intentional)

- **AD-9 error envelope shape:** Flat `{ error: <string>, code }` for client compatibility (see `src/lib/api/response.ts`).
- **ESLint 8 pin:** Required for Next 14 `next lint`.
- **Legacy fs in lib/figma and lib/export:** Allowlisted in boundary check until moved behind ports.

---

## 6. Next steps (when user is ready)

### Architecture baseline (locked)

**Epic 1** and **Epic 2** are the **FINAL baseline** — do not redesign ports, adapters, access gate, or verify pipeline unless the user explicitly requests it.

### Deferred infrastructure (do not build unless asked)

- **Epic F1** — PostgreSQL `TemplateRepository` adapter
- **Epic F2** — S3 `AssetStore` adapter
- **Epic F3** — Background worker + `JobQueue`
- **Epic F4** — Authentication + flip `AUTH_MODE=enforced`

### Next active phase

**Builder polish is complete.** Next work is user-directed:

- **Epic F1–F4** (Postgres, S3, worker, auth) — only if explicitly requested
- Optional hardening: refactor figma/export fs behind `AssetStore`; nested error envelope; Next.js upgrade per `docs/maintenance-upgrades.md`

User-facing docs: [docs/BUILDER.md](../../docs/BUILDER.md) · [docs/README.md](../../docs/README.md)

---

## 7. Working conventions

- After each story: run `npm run verify`. Keep behavior identical unless the story says otherwise.
- Do NOT commit unless the user explicitly asks.
- Update this HANDOFF file when starting new epics.
