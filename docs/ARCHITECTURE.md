# Architecture Overview

Summary of the current application architecture. The authoritative design rules live in the [Architecture Spine](../_bmad-output/planning-artifacts/architecture/architecture-edm-react-email-tool-2026-07-28/ARCHITECTURE-SPINE.md).

## Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| UI | React 18, TypeScript |
| Email rendering | `@react-email/components`, `@react-email/render` |
| Client state | Zustand (`src/builder/store/`) |
| Validation | Zod |
| Tests | Vitest |

## Design paradigm

**Modular monolith** with **ports and adapters**:

```
HTTP routes (src/app/api/**)
    → services (e.g. TemplateService)
        → ports (interfaces in src/lib/ports/)
            → adapters (src/lib/adapters/**)
                → filesystem / local disk (current phase)
```

Composition root: `src/lib/container.ts` — binds adapters from `STORAGE_DRIVER` / `ASSET_DRIVER`.

## Key modules

| Path | Role |
|------|------|
| `src/lib/config.ts` | Typed env validation at startup |
| `src/lib/container.ts` | Dependency injection / adapter binding |
| `src/lib/ports/*` | `TemplateRepository`, `AssetStore`, `EventLog`, `JobQueue` interfaces |
| `src/lib/adapters/filesystem/` | Template JSON files in `data/templates/` |
| `src/lib/adapters/local-assets/` | Uploads in `public/images/uploads/` |
| `src/lib/templates/service.ts` | Template CRUD business logic |
| `src/lib/api/response.ts` | Uniform API error envelope |
| `src/lib/auth/accessContext.ts` | Access gate seam (open mode now) |
| `src/middleware.ts` | Correlation id, access gate, rate limits, legacy lockdown |
| `src/instrumentation.ts` | Startup exposure gate |
| `src/lib/registry/` | Component registry (source of truth for builder blocks) |
| `src/lib/render/DynamicEmailTemplate.tsx` | Server-side HTML rendering |
| `src/builder/` | Drag-and-drop editor UI |

## Request flow (template save)

```
PUT /api/templates/:id
  → getTemplateService().update()
    → container.templateRepository.save()
      → FilesystemTemplateRepository (validates Zod schema, writes JSON)
```

## Security posture (Epic 2)

- **`AUTH_MODE=open`** — all requests allowed; anonymous actor stamped (internal team).
- **`AUTH_MODE=enforced`** — fails closed (503) until Epic F4 identity adapter exists.
- **Exposure gate** — refuses non-local bind with `AUTH_MODE=open`.
- **Legacy demos** — `/preview/*` and static `/api/email/[template]` disabled in production by default.
- **Rate limiting** — 30 req/min on render/export/figma/ai routes.
- **Body limits** — 5 MB (templates/render/export), 10 MB (figma/ai), 10 MB uploads.
- **Secrets** — server-only; checked by `npm run check:secrets`.

## Error responses

API errors return:

```json
{ "error": "Human-readable message", "code": "machine_code", "correlationId": "..." }
```

See AD-9 deviation note in [HANDOFF.md](../_bmad-output/planning-artifacts/HANDOFF.md) — flat `error` string kept for client compatibility.

## Deferred (do not implement unless requested)

| Epic | Capability |
|------|------------|
| F1 | PostgreSQL `TemplateRepository` |
| F2 | S3 `AssetStore` |
| F3 | Background worker + `JobQueue` |
| F4 | Authentication, `AUTH_MODE=enforced` |

## Quality gates

```bash
npm run verify   # typecheck + lint + boundaries + secrets + tests
```

Boundary rules enforced by `scripts/check-boundaries.mjs` and ESLint `no-restricted-imports` on route handlers.

## Further reading

- [Solution design](../_bmad-output/planning-artifacts/architecture/architecture-edm-react-email-tool-2026-07-28/solution-design.md)
- [Epics & stories](../_bmad-output/planning-artifacts/epics.md)
- [Maintenance upgrades](./maintenance-upgrades.md)
