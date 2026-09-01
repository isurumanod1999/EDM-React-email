# Dependency Upgrade Maintenance Track

> Story 2.8 / AR18 — deliberate upgrade path for framework and datastore versions.

Last reviewed: 2026-08-02

## Current pins

| Component | Current | Notes |
|-----------|---------|-------|
| Next.js | 14.2.x | App Router, middleware, instrumentation |
| React | 18.2.x | Matches Next 14 peer range |
| TypeScript | 5.3.x | |
| ESLint | 8.57.x | Required for `next lint` on Next 14 (ESLint 9 flat config not supported) |
| PostgreSQL | *not in use* | Deferred to Epic F1 |

## Next.js 14 → 16 upgrade path

**Why:** Next 14 is in maintenance; security fixes and tooling improvements land on current majors.

**Recommended sequence:**

1. Run the full baseline before starting: `npm run verify`
2. Upgrade Next.js one major at a time (14 → 15 → 16), reading each release's breaking-change notes
3. After each major bump:
   - Fix App Router / middleware API deprecations
   - Re-run `npm run verify` and `npm run build`
   - Run `npm run check:secrets` after build
4. Migrate ESLint to flat config once on Next 15+ (drop ESLint 8 pin)
5. Smoke-test builder flows: template CRUD, preview render, export ZIP, asset upload, Figma import

**Known touch points in this repo:**

- `src/middleware.ts` — matcher and edge runtime APIs
- `src/instrumentation.ts` — startup hook for exposure gate
- `src/app/api/**/route.ts` — async `params` pattern (already on Promise-based params)
- `eslint` / `eslint-config-next` devDependency versions

## PostgreSQL version policy (Epic F1)

When shared template storage is added:

- **Do not use PostgreSQL 14** — EOL 2026-11-12
- Target **PostgreSQL 16 or 17** for new deployments
- Pin the server version in infrastructure docs / docker-compose at implementation time
- Run migrations through the adapter layer only (`src/lib/adapters/postgres/**`)

## Security dependency review

Before any tagged release or shared deployment:

1. `npm audit` — triage high/critical findings
2. `npm run verify`
3. `npm run build && npm run check:secrets`
4. Confirm `AUTH_MODE=enforced` if binding beyond localhost (Story 2.7)

## Scheduling

| Window | Action |
|--------|--------|
| Before shared/internal LAN deploy | Complete Epic 2; consider Next 15 bump |
| Before Epic F1 (Postgres) | Next 15+ stable; PostgreSQL 16+ provisioned |
| Before Epic F4 (auth) | Next 16 LTS line; security audit on auth dependencies |
