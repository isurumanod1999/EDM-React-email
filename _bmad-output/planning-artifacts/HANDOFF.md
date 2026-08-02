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

Current-phase epics 1–2 are **done**. Next work is deferred epics only if the user requests:

1. **Epic F1** — PostgreSQL `TemplateRepository` adapter
2. **Epic F2** — S3 `AssetStore` adapter
3. **Epic F3** — Background worker + `JobQueue`
4. **Epic F4** — Authentication + flip `AUTH_MODE=enforced`

Other optional hardening (not in epics): refactor figma/export fs usage behind `AssetStore`; migrate error envelope to nested shape + update client; upgrade Next.js per `docs/maintenance-upgrades.md`.

---

## 7. Working conventions

- After each story: run `npm run verify`. Keep behavior identical unless the story says otherwise.
- Do NOT commit unless the user explicitly asks.
- Update this HANDOFF file when starting new epics.
