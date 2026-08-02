# EDM React Email Tool

A **Next.js drag-and-drop email builder** for internal developer teams. Compose emails from a component registry, preview live HTML, import from Figma, export ZIP packages, and send test emails via Resend.

> **Current phase:** filesystem template storage, local image uploads, no authentication. Architecture baseline (Epic 1–2) is **locked**; Postgres, S3, worker, and auth are **deferred**.

## Quick start

```bash
npm install
cp .env.example .env.local   # optional: Figma, AI, Resend keys
npm run dev
```

Open [http://localhost:3000/builder](http://localhost:3000/builder).

### Optional services

| Feature | Setup |
|---------|--------|
| Figma import | `FIGMA_ACCESS_TOKEN` in `.env.local` |
| Local AI | [Ollama](https://ollama.com) + `ollama pull llava` |
| Test send | [Resend](https://resend.com) API key |

See [.env.example](./.env.example) for all variables.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (port 3000) |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run verify` | typecheck + lint + boundaries + secrets + tests |
| `npm run test` | Vitest unit tests |
| `npm run lint` | ESLint (Next.js) |
| `npm run format` | Prettier write |
| `npm run email:dev` | React Email preview (port 3005) |

---

## Project structure

```
src/
├── app/
│   ├── builder/              # Gallery + editor pages
│   ├── api/                  # REST routes (thin handlers)
│   └── preview/              # Legacy static demo previews
├── builder/                  # Editor UI (Zustand, DnD, modals)
├── components/email/         # Registry-backed email blocks
├── emails/                   # Legacy static demo templates
└── lib/
    ├── adapters/             # Filesystem + local asset implementations
    ├── ports/                # Storage interfaces
    ├── templates/service.ts  # Template business logic
    ├── container.ts          # Composition root
    ├── config.ts             # Validated env config
    ├── middleware.ts         # (via src/middleware.ts)
    └── registry/             # Component definitions

data/templates/               # Saved template JSON files
public/images/uploads/        # Uploaded assets
```

---

## Documentation

| Doc | Description |
|-----|-------------|
| [docs/README.md](./docs/README.md) | **Documentation index** |
| [docs/BUILDER.md](./docs/BUILDER.md) | How to use the builder |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Architecture summary |
| [docs/API.md](./docs/API.md) | API routes reference |
| [docs/maintenance-upgrades.md](./docs/maintenance-upgrades.md) | Upgrade track |
| [_bmad-output/planning-artifacts/HANDOFF.md](./_bmad-output/planning-artifacts/HANDOFF.md) | Status, handoff, next steps |

Planning artifacts (PRD, epics, architecture spine) live under `_bmad-output/planning-artifacts/`.

---

## Tech stack

- **Next.js 14** App Router · **React 18** · **TypeScript**
- **React Email** for HTML rendering
- **Zustand** builder state · **Zod** validation · **Vitest** tests
- **@dnd-kit** drag-and-drop

---

## Internal use only

- `AUTH_MODE=open` — no login (developer team).
- Do not bind to `0.0.0.0` or a public host without authentication (startup exposure gate blocks this).
- Run `npm run verify` before sharing builds.

---

## Legacy demos

Pre-builder static templates (`/preview/*`, `/api/email/two-col-dual-cta`, etc.) remain for reference. Disabled in production unless `ENABLE_LEGACY_DEMOS=true`. Prefer `/builder` for new work.

---

## License

MIT
