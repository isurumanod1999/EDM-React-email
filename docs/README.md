# Documentation Index

Last updated: 2026-08-02

This folder and the planning artifacts describe the **EDM React Email Tool** as it exists today: a Next.js drag-and-drop email builder for an internal developer team.

## Start here

| Document | Audience | Contents |
|----------|----------|----------|
| [../README.md](../README.md) | Everyone | Quick start, scripts, repo layout |
| [BUILDER.md](./BUILDER.md) | Developers using the tool | Gallery, editor, Figma/AI, export, send |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Developers extending the app | Ports/adapters, middleware, key modules |
| [API.md](./API.md) | API consumers | Route list, error shape, limits |
| [maintenance-upgrades.md](./maintenance-upgrades.md) | Maintainers | Next.js / PostgreSQL upgrade track |
| [PHASE-HISTORY.md](./PHASE-HISTORY.md) | Handoff | Epic 1–2 and builder polish completion log |

## Stakeholder / process docs

| Document | Audience | Contents |
|----------|----------|----------|
| [template-building-comparison.md](./template-building-comparison.md) | Design, dev, marketing | Handlebars vs React Email vs this tool |
| [template-building-explained-simple.md](./template-building-explained-simple.md) | Non-technical stakeholders | Plain-language version of the comparison |

## Planning & handoff (BMAD artifacts)

| Document | Contents |
|----------|----------|
| [_bmad-output/planning-artifacts/HANDOFF.md](../_bmad-output/planning-artifacts/HANDOFF.md) | **Current status**, env vars, verify commands, what’s next |
| [_bmad-output/planning-artifacts/epics.md](../_bmad-output/planning-artifacts/epics.md) | Full epic/story backlog with acceptance criteria |
| [_bmad-output/planning-artifacts/builder-polish.md](../_bmad-output/planning-artifacts/builder-polish.md) | Builder UX polish backlog |
| [_bmad-output/planning-artifacts/architecture/.../ARCHITECTURE-SPINE.md](../_bmad-output/planning-artifacts/architecture/architecture-edm-react-email-tool-2026-07-28/ARCHITECTURE-SPINE.md) | Design invariants (AD-1…AD-11) |
| [_bmad-output/planning-artifacts/architecture/.../solution-design.md](../_bmad-output/planning-artifacts/architecture/architecture-edm-react-email-tool-2026-07-28/solution-design.md) | Implementation design |
| [_bmad-output/planning-artifacts/prds/.../prd.md](../_bmad-output/planning-artifacts/prds/prd-edm-react-email-tool-2026-07-28/prd.md) | Auth PRD (**deferred** — Epic F4) |

## Phase summary

| Phase | Status | Scope |
|-------|--------|--------|
| Epic 1 — API & storage foundation | ✅ Complete | Ports/adapters, template service, errors, logging |
| Epic 2 — Internal hardening | ✅ Complete | Access gate, boundaries, verify pipeline, exposure gate |
| Builder polish Week 1 | ✅ Complete | Mobile layout, toasts, unsaved guard, preview, gallery |
| Builder polish Week 2 | 🚧 Pending | Import menu, Figma lint/banner, modal a11y, etc. |
| Epics F1–F4 | ⏸ Deferred | Postgres, S3, worker, authentication |

## Verify before release or handoff

```bash
npm run verify
npm run build && npm run check:secrets
```
