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
- **AD-2 / AR2:** Persistence only through ports (`TemplateRepository`, `AssetStore`, `EventLog`, `JobQueue`). No `fs`/DB/SDK calls outside `src/lib/adapters/**`.
- **AD-3 / AR3:** One composition root — `src/lib/container.ts` — binds adapters by `STORAGE_DRIVER` / `ASSET_DRIVER`.
- **AD-8:** Zod-validate input before any side effect.
- **AD-9:** Uniform error envelope + correlation-id logging (see deviation note in §5).
- **AD-10:** Reserved access-gate seam; `AUTH_MODE=open` now, `enforced` later (Epic F4).
- **AD-11:** Secrets are server-only.
- **Current phase binds ONLY** the filesystem template adapter and local-asset adapter. **No database, no S3, no worker.** Postgres/S3/worker/auth are deferred (Epics F1–F4) — do not build them unless the user asks.

---

## 3. Progress status

### Epic 1 — Consistent API & Storage Foundation — ✅ COMPLETE (Stories 1.1–1.9)

- 1.1 `src/lib/config.ts` — typed, validated env config (Zod, fails fast).
- 1.2 `src/lib/ports/*` — `TemplateRepository`, `AssetStore`, `EventLog`, `JobQueue` interfaces + barrel `index.ts`.
- 1.3 `src/lib/adapters/filesystem/templateRepository.ts` — filesystem repo; `src/lib/templates/fileStorage.ts` delegates to it (public API unchanged).
- 1.4 `src/lib/adapters/local-assets/assetStore.ts` — local asset store; `src/app/api/assets/upload/route.ts` uses it.
- 1.5 `src/lib/container.ts` — composition root; fails fast on `postgres`/`s3` with "not available in this phase".
- 1.6 `src/lib/templates/service.ts` — `TemplateService` over the repo port; template CRUD routes (`src/app/api/templates/**`) route through it.
- 1.7 `src/lib/api/response.ts` — uniform error helper (`errorResponse`, `notFound`, `handleRouteError`, `ApiError`). Adopted across templates, email render/export/send, email/[template], assets/upload, ai/*, figma/* routes.
- 1.8 `src/lib/observability/logger.ts` + `correlation.ts` + `src/middleware.ts` — structured logging + correlation id on every `/api/*` request/response; template routes log with it.
- 1.9 `scripts/check-boundaries.mjs` — boundary check (routes must not import `fs`/`path`; ports must not import adapters/app). Wired as `npm run check:boundaries`. Currently PASSES.

### Epic 2 — Internal Hardening & External-Exposure Gate — 🚧 IN PROGRESS

- **2.1 Test/lint/format baseline — ~90% done, NEEDS FINAL VERIFY.**
  - Installed dev deps: `vitest`, `prettier`, `eslint@^8.57.1`, `eslint-config-next@14.2.0` (ESLint pinned to 8 because Next 14 `next lint` is incompatible with ESLint 9).
  - Added configs: `.eslintrc.json`, `.prettierrc.json`, `.prettierignore`, `vitest.config.mts`.
  - Added scripts: `typecheck`, `test`, `test:watch`, `format`, `format:check`, `check:boundaries`, `verify`.
  - Added first smoke test: `src/lib/templates/service.test.ts` (6 tests, PASS).
  - Lint fixes applied: escaped apostrophes in `src/emails/TwoColDualCtaEmail.tsx` & `TwoColStackedEmail.tsx`; removed a stale `@typescript-eslint/no-explicit-any` disable comment in `src/lib/registry/types.ts`.
  - ⚠️ The final `npm run lint` confirmation run was interrupted. **First action for the new agent: run `npm run verify` and confirm all green** (only a known non-blocking `react-hooks/exhaustive-deps` warning in `FigmaBuildModal.tsx` is expected). Fix anything that errors, then mark 2.1 done.
- **2.2** Enforced import-boundary lint rule — pending (either an ESLint `no-restricted-imports` rule for `fs`/SDKs outside adapters, or wire `check:boundaries` into `verify`/CI as the enforcement — the script already exists from 1.9).
- **2.3** Pass-through access gate in `AUTH_MODE=open` — pending (extend `src/middleware.ts`: stamp anonymous actor, cover `/builder/**` + `/api/**` except public endpoints; allow all in open mode).
- **2.4** Legacy demo route lockdown — pending (`/preview/[template]`, `/api/email/[template]` disabled/protected outside local mode; opt-in locally).
- **2.5** Request hardening — pending (upload content-type allowlist + size limit already partly in assets route; add body-size limits + basic rate limiting on render/export/figma/ai).
- **2.6** Server-only secret verification — pending (verify no Figma/AI/Resend/infra secret in client bundle or responses; repeatable check).
- **2.7** External-exposure gate — pending (refuse non-local bind when `AUTH_MODE=open`; fail closed).
- **2.8** Dependency-upgrade maintenance track — pending (document Next 14→16 path + PostgreSQL version policy; likely a `docs/` markdown).

### Deferred — DO NOT build unless asked

- **Epic F1** PostgreSQL repository, **Epic F2** S3 asset store, **Epic F3** background worker/JobQueue, **Epic F4** authentication (`AUTH_MODE=enforced`).

---

## 4. How to verify at any point

```bash
npm run verify   # runs: typecheck + lint + check:boundaries + test
```

Individually: `npm run typecheck`, `npm run lint`, `npm run check:boundaries`, `npm run test`.

Environment note: this is a **Windows / PowerShell** machine. Python is invoked as `py -3` (not `python3`). BMad skills live in `.agents/skills/`.

---

## 5. Recorded deviations from the architecture (intentional)

- **AD-9 error envelope shape:** The spine specifies `{ error: { code, message } }`. The existing client reads `data.error` as a **string** in ~10 call sites, so we kept a **flat, non-breaking** shape `{ error: <message>, code: <code> }` (plus optional `correlationId`). Full nested-shape migration + coordinated client update is deferred to preserve the working tool. See `src/lib/api/response.ts` header comment.
- **ESLint 8 pin:** Required for Next 14 `next lint` compatibility (ESLint 9 flat-config is not supported by Next 14's lint CLI).

---

## 6. Working conventions

- After each story: run `npm run typecheck` (and `npm run verify` before marking a story done). Keep behavior identical unless the story says otherwise.
- Do NOT commit unless the user explicitly asks.
- Keep handlers thin; put logic in services; touch storage only through adapters via the container.
- Update this HANDOFF file's status section as stories complete.
