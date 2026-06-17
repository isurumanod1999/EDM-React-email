# Codebase Overview — react-email-nextjs (EDM Email Tool)

> Technical reference for demos and onboarding.  
> Last reviewed: June 11, 2026

---

## 1. Executive Summary

**react-email-nextjs** is a **visual email template builder** built on [Next.js 14](https://nextjs.org/), [React Email v6](https://react.email/), and TypeScript. It lets marketers and developers compose production-ready HTML emails without hand-writing every section.

### What makes it special

| Capability | What it does |
|------------|--------------|
| **Visual builder** | Drag-and-drop canvas, property panel, live desktop/mobile preview |
| **Screenshot Upload** | Upload Figma/desktop/mobile PNGs → vision AI maps them to registered email components |
| **Figma Import** | Paste a Figma frame URL → fetch design tree → deterministic React Email AST on canvas |
| **Component registry** | 19 typed, schema-driven blocks with defaults and editable fields |
| **Template storage** | JSON documents on disk — create, save, duplicate, auto-save |
| **ZIP export** | Self-contained HTML + `img/` folder, responsive CSS injected |
| **Legacy demos** | Five hand-written Nissan/showcase emails still previewable at `/preview/[slug]` |

The project evolved from a **code-first** email system (compose in `src/emails/`) into a **builder-first** workflow (`/builder`) while keeping both paths alive.

---

## 2. Demo Quick Start

```bash
# 1. Install and run the app
npm install
cp .env.example .env.local   # configure AI/Figma as needed
npm run dev                  # http://localhost:3000

# 2. Open the builder
#    Homepage → "Open Builder" → /builder
#    Or edit seed template → /builder/seed-nissan-promo

# 3. Optional — Screenshot Upload (local AI, no API key)
ollama pull llava
ollama serve                 # default http://localhost:11434

# 4. Optional — Send via React Email CLI (separate app)
npm run email:dev            # http://localhost:3005
```

### Suggested demo flow (10–15 min)

1. **Homepage** (`/`) — show saved templates, component count, legacy Nissan demo link.
2. **Builder gallery** (`/builder`) — create or open a template.
3. **Compose** — drag Header + HeroBanner + TwoColStacked from palette; edit props in the right panel.
4. **Live preview** — toggle desktop/mobile; changes debounce to server render.
5. **Screenshot Upload** — upload a desktop PNG from Figma; review AI-mapped blocks; "Add to canvas".
6. **Figma Import** (if token configured) — Fetch from Figma → Build from Figma → one `figma-react-email` block.
7. **Export** — download ZIP with HTML + images.
8. **Save** — manual save or wait for 45s auto-save.

---

## 3. Architecture

### Stack

| Layer | Technology | Role |
|-------|------------|------|
| Web app | Next.js 14 App Router | Pages, builder UI, 13 API routes |
| Email rendering | React Email v6 | `@react-email/components` + `@react-email/render` |
| Builder state | Zustand | Template, selection, dirty/save, Figma session |
| Drag-and-drop | @dnd-kit/core + sortable | Palette → canvas, block reorder |
| Validation | Zod | Template documents + API request bodies |
| Vision AI | Ollama (default) or Gemini | Screenshot Upload analysis |
| Figma | Figma REST API + local parsers | Frame fetch, asset download, AST build |
| Images | sharp | Downscale screenshots for Ollama (768px max) |
| Export | jszip | Bundle HTML + referenced images |
| Storage | JSON files | `data/templates/*.json` |

### High-level diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Next.js (port 3000)                                                      │
│  /                  HomePage — demos + saved template links               │
│  /builder           BuilderGallery — template CRUD                        │
│  /builder/[id]      BuilderEditor — visual builder                          │
│  /preview/[slug]    Legacy static demo iframe preview                     │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │
        ┌───────────────────────┼────────────────────────┐
        ▼                       ▼                        ▼
  /api/templates/*        /api/email/render         /api/ai/*, /api/figma/*
  JSON on disk            DynamicEmailTemplate      Vision + Figma pipelines
        │                       │
        └───────────┬───────────┘
                    ▼
         Component Registry (19 defs) → src/components/email/*
                    ▼
         @react-email/render → HTML (preview, export, legacy demos)

┌──────────────────────────────────────────────────────────────────────────┐
│  React Email CLI (optional, port 3005)                                    │
│  npm run email:dev — preview/send for src/emails/ static templates      │
└──────────────────────────────────────────────────────────────────────────┘
```

### Two parallel email systems

| System | Source | Renderer | Use case |
|--------|--------|----------|----------|
| **Dynamic builder** | `data/templates/*.json` | `DynamicEmailTemplate` + registry | Primary product — visual builder |
| **Legacy static** | `src/emails/*.tsx` | Hardcoded registry in API route | Nissan demos, component showcase |

---

## 4. Major Features (Technical Detail)

### 4.1 Visual Builder

**Routes:** `/builder`, `/builder/[id]`

| UI area | File | Behaviour |
|---------|------|-----------|
| Gallery | `BuilderGallery.tsx` | List/create/duplicate/delete templates via `/api/templates` |
| Editor shell | `BuilderEditor.tsx` | Three-column layout: palette, canvas, properties + preview |
| Palette | `ComponentPalette.tsx` | Loads registry from `/api/registry`; drag or double-click to add |
| Canvas | `BlockCanvas.tsx`, `BlockItem.tsx` | Sortable blocks; select, duplicate, remove |
| Properties | `PropertyPanel.tsx`, `FieldRenderer.tsx` | Schema-driven fields per component; template meta |
| Live preview | `LivePreview.tsx`, `useTemplatePreview.ts` | Debounced POST `/api/email/render`; desktop/mobile iframe |
| Toolbar | `BuilderToolbar.tsx` | Save, duplicate, export, Screenshot Upload, Figma, Send link |

**State:** `src/builder/store/builderStore.ts` (Zustand)

- `template` — full `EmailTemplateDocument`
- `selectedBlockId`, `viewMode` (`desktop` | `mobile`)
- `isDirty`, `isSaving`, auto-save every **45 seconds**
- `figmaSession` — cached Figma import data between fetch and build steps
- `addBlock`, `updateBlockProp`, `reorderBlocks`, `addBlocksFromAi`

**Template document shape** (`src/lib/schema/template.ts`):

```typescript
{
  id, name, category, meta: { previewText, backgroundColor, containerWidth },
  blocks: [{ id, componentId, componentVersion, props, label? }],
  createdAt, updatedAt
}
```

### 4.2 Screenshot Upload (Vision AI)

> UI label: **Screenshot Upload**. Internal modal file is still `AiImportModal.tsx`.

**Flow:**

```
User uploads desktop (+ optional mobile) PNG
  → POST /api/assets/upload → public/images/uploads/
  → POST /api/ai/analyze-component { desktopUrl, mobileUrl?, hint? }
  → Vision model returns { confidence, blocks[], reasoning, previewHtml }
  → User reviews ImportResultPanel → "Add to canvas"
  → addBlocksFromAi() merges blocks into template
```

**AI provider** (`src/lib/ai/provider.ts`):

| Provider | Config | Notes |
|----------|--------|-------|
| **Ollama** (default) | `AI_PROVIDER=ollama`, `OLLAMA_BASE_URL`, `OLLAMA_VISION_MODEL=llava` | Free, local; images downscaled via sharp |
| **Gemini** | `AI_PROVIDER=gemini`, `GEMINI_API_KEY` | Cloud; auto-fallback to Ollama on 429/quota |

**Prompt engineering:** `src/lib/ai/prompts/analyzeComponent.ts` — model sees the full component catalog (`registryCatalog.ts`) and must return valid `componentId` values from `VALID_COMPONENT_IDS`.

**Fallback:** If confidence is low or no components match, creates an `image-block` labeled **Screenshot Upload (Image)** using the uploaded screenshot as `imgSrc`.

**Health check:** `GET /api/ai/status` — Ollama reachability (banner component exists but is not wired to UI yet).

### 4.3 Figma Import (Two-Step Pipeline)

**Step 1 — Fetch from Figma** (`FigmaFetchModal` → `POST /api/figma/import`)

- Parses Figma URL (`parseUrl.ts`)
- Calls Figma REST API (`client.ts`)
- Downloads rendered frame images and assets to `public/images/uploads/`
- Extracts design context text (`extractDesignContext.ts`)
- Stores **Figma session** in Zustand for step 2

**Step 2 — Build from Figma** (`FigmaBuildModal` → `POST /api/figma/build-email`)

- Deterministic conversion — **not** vision AI in the UI path
- `figmaToReactEmail.ts` → React Email AST (`ReactEmailNode`)
- Modes: `primitives` (default in UI), `fidelity` (available server-side)
- Produces one `figma-react-email` block with serialized tree in props
- Rendered at runtime by `FigmaReactEmailBlock.tsx` (Section, Text, Heading, Button, Img, Row, Column, etc.)

**Requires:** `FIGMA_ACCESS_TOKEN` in `.env.local`

> Note: `POST /api/ai/build-react-email` exists for an AI-assisted Figma build path but is **not connected** to any builder button today.

### 4.4 Component Registry

**Source of truth:** `src/lib/registry/definitions.ts`

19 registered components (18 visible in palette; `figma-react-email` is import-only):

| ID | Category | Purpose |
|----|----------|---------|
| `header` | layout | Logo header |
| `hero-banner` | promotional | Hero image + CTA |
| `section-title` | layout | Section heading |
| `intro-copy` | newsletter | Greeting + body |
| `text-block` | newsletter | Rich text |
| `promo-block` | promotional | Promo banner |
| `image-block` | layout | Standalone image |
| `button-row` | layout | Dual CTA buttons |
| `cta-banner` | promotional | Full-width CTA |
| `stats-row` | promotional | 3-column statistics |
| `testimonial` | newsletter | Customer quote |
| `divider` | layout | Line separator |
| `spacer` | layout | Vertical space |
| `footer` | layout | Email footer |
| `order-card` | transactional | Order/enquiry details |
| `two-col-dual-cta` | product-showcase | 2-col dual CTAs |
| `two-col-stacked` | product-showcase | 2-col products |
| `one-col-product` | product-showcase | Featured product |
| `three-col-icon` | product-showcase | 3-col features |
| `figma-react-email` | layout | Figma AST block (hidden from palette) |

Each definition includes `defaultProps`, typed `fields` (text, color, image, url, number, boolean, select, textarea), and `category` for palette grouping.

**API:** `GET /api/registry` — grouped categories + field schemas for the property panel.

**Runtime:** `DynamicEmailTemplate.tsx` maps `blocks[]` → React components via registry lookup.

### 4.5 Responsive Email Patterns

Email clients do not support modern CSS well. This project uses battle-tested patterns:

- **Shared CSS classes** — `EDM_CLASS` + `EMAIL_RESPONSIVE_CSS` in `src/lib/email/responsive.ts`
- **Injected in `<Head>`** — `EmailResponsiveHead.tsx` in dynamic templates
- **Desktop/mobile image swap** — `.edm-desk-img` / `.edm-mob-img` with media queries
- **Column stacking** — `.edm-col-drop`, `.edm-stack-row` for mobile
- **Fluid images** — `fluidImgStyle()` + `ResponsiveImg.tsx` wrapper around `<Img>`
- **Export enhancement** — `enhanceEmailHtml.ts` adds viewport meta, client resets, inlined responsive CSS

### 4.6 Template Storage

| Concern | Detail |
|---------|--------|
| Location | `data/templates/*.json` |
| Seed | `seed-nissan-promo.json` — pre-built Nissan campaign |
| Create | `POST /api/templates` with `{ useDefaults: true }` |
| Read/Update/Delete | `/api/templates/[id]` |
| Duplicate | `POST /api/templates/[id]/duplicate` |
| Validation | Zod schemas in `src/lib/schema/validators.ts` |
| File I/O | `src/lib/templates/fileStorage.ts` |

### 4.7 Export

**In-builder (primary):**

```
Toolbar "Export" → POST /api/email/export { template }
  → render(DynamicEmailTemplate)
  → enhanceEmailHtml (responsive CSS, meta)
  → bundleImagesInHtml (collect /images/ refs)
  → createExportZip (HTML + img/ folder)
  → browser download .zip
```

**Batch CLI:**

```bash
npm run export              # all saved templates → out/exports/
npm run export:template     # direct tsx script
npx tsx scripts/export-templates.ts [template-id]
```

**Legacy static emails:**

```bash
npm run email:export        # src/emails/*.tsx → out/emails/*.html
```

### 4.8 Preview Systems

| System | URL / API | What it shows |
|--------|-----------|---------------|
| Builder live preview | POST `/api/email/render` | Current canvas blocks |
| Legacy demo preview | `/preview/[slug]` → GET `/api/email/[slug]` | 5 static TSX templates |
| Import modals | `previewHtml` in analyze/build API responses | Pre-add review |
| React Email CLI | `npm run email:dev` → port **3005** | All `src/emails/` files |

### 4.9 Send Email

Sending is **not built into the Next.js app**. The toolbar links to `http://localhost:3005` (React Email dev server). Users run `npm run email:dev` separately. Resend integration is external to this repo.

---

## 5. API Routes Reference

| Method | Route | Purpose |
|--------|-------|---------|
| GET, POST | `/api/templates` | List / create templates |
| GET, PUT, DELETE | `/api/templates/[id]` | Read / update / delete |
| POST | `/api/templates/[id]/duplicate` | Duplicate template |
| GET | `/api/registry` | Component registry metadata |
| POST | `/api/email/render` | Render dynamic template → HTML |
| POST | `/api/email/export` | Render + ZIP export |
| GET | `/api/email/[template]` | Legacy static template render |
| POST | `/api/assets/upload` | Upload screenshot/image |
| POST | `/api/ai/analyze-component` | Screenshot Upload vision analysis |
| GET | `/api/ai/status` | AI provider health |
| POST | `/api/ai/build-react-email` | AI Figma build (server only, no UI) |
| POST | `/api/figma/import` | Fetch Figma frame + assets |
| POST | `/api/figma/build-email` | Figma tree → React Email AST |

---

## 6. Builder Workflow (End-to-End)

```
1. /builder
   └─ GET /api/templates → gallery

2. "New Template"
   └─ POST /api/templates { useDefaults: true }
   └─ redirect /builder/[id]

3. BuilderEditor loads
   ├─ GET /api/registry  → palette
   └─ GET /api/templates/[id] → Zustand store

4. Compose
   ├─ Drag/double-click palette → addBlock(defaultProps)
   ├─ Reorder canvas → reorderBlocks()
   ├─ Select block → PropertyPanel → updateBlockProp()
   └─ Live preview → debounced POST /api/email/render

5. Optional imports
   ├─ Screenshot Upload → upload → analyze → addBlocksFromAi()
   └─ Figma → fetch → build → addBlocksFromAi()

6. Persist
   ├─ Manual Save → PUT /api/templates/[id]
   └─ Auto-save every 45s when dirty

7. Export → POST /api/email/export → download .zip
```

---

## 7. Key File Paths

### Pages

| Route | File |
|-------|------|
| `/` | `src/app/page.tsx` → `src/components/home/HomePage.tsx` |
| `/builder` | `src/app/builder/page.tsx` → `BuilderGallery.tsx` |
| `/builder/[id]` | `src/app/builder/[id]/page.tsx` → `BuilderEditor.tsx` |
| `/preview/[template]` | `src/app/preview/[template]/page.tsx` |

### Builder

| Concern | Path |
|---------|------|
| Editor | `src/builder/components/BuilderEditor.tsx` |
| Toolbar | `src/builder/components/BuilderToolbar.tsx` |
| Screenshot Upload modal | `src/builder/components/AiImportModal.tsx` |
| Figma modals | `FigmaFetchModal.tsx`, `FigmaBuildModal.tsx` |
| Store | `src/builder/store/builderStore.ts` |
| Styles | `src/builder/builder.css` |

### Core libraries

| Concern | Path |
|---------|------|
| Registry | `src/lib/registry/definitions.ts`, `index.ts` |
| Template schema | `src/lib/schema/template.ts`, `validators.ts` |
| File storage | `src/lib/templates/fileStorage.ts` |
| Dynamic renderer | `src/lib/render/DynamicEmailTemplate.tsx` |
| Export pipeline | `src/lib/export/` |
| Vision AI | `src/lib/ai/` |
| Figma pipeline | `src/lib/figma/` |
| Responsive CSS | `src/lib/email/responsive.ts` |
| Email components | `src/components/email/` |
| Static demo emails | `src/emails/` |
| Uploaded assets | `public/images/uploads/` |

---

## 8. Environment Variables

Copy `.env.example` → `.env.local`:

```env
# Screenshot Upload — Ollama (default, free, local)
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_VISION_MODEL=llava

# Screenshot Upload — Gemini (optional cloud)
# AI_PROVIDER=gemini
# GEMINI_API_KEY=your_key_here
# GEMINI_MODEL=gemini-2.0-flash

# Figma Import
FIGMA_ACCESS_TOKEN=your_figma_personal_access_token
```

| Feature | Required env |
|---------|--------------|
| Builder, preview, export | None |
| Screenshot Upload (Ollama) | Ollama running locally |
| Screenshot Upload (Gemini) | `AI_PROVIDER=gemini`, `GEMINI_API_KEY` |
| Figma Import | `FIGMA_ACCESS_TOKEN` |

---

## 9. Scripts Reference

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `next dev -p 3000` | Next.js app (builder + APIs) |
| `build` | `next build` | Production build |
| `start` | `next start -p 3000` | Production server |
| `lint` | `next lint` | ESLint |
| `email:dev` | `email dev --dir src/emails --port 3005` | React Email preview/send UI |
| `email:export` | `email export --dir src/emails --outDir out/emails` | Static TSX → HTML |
| `export` | `gulp exportTemplates` | Batch-export all builder templates |
| `export:clean` | `gulp clean` | Clean `out/exports/` |
| `export:build` | `gulp build` | Clean + export all |
| `export:template` | `npx tsx scripts/export-templates.ts` | Direct export script |
| `seed:templates` | `npx tsx scripts/seed-templates.ts` | Verify seed files |
| `clean` | rm `.next` | Clear Next build cache |

---

## 10. Legacy Static Demo Templates

Still available at `/preview/[slug]` via `src/app/api/email/[template]/route.ts`:

| Slug | Component |
|------|-----------|
| `nissan` | `NissanEmail` |
| `all-components` | `AllComponentsEmail` |
| `complete-email` | `CompleteEmail` |
| `two-col-dual-cta` | `TwoColDualCtaEmail` |
| `two-col-stacked` | `TwoColStackedEmail` |

These are independent from builder-saved templates in `data/templates/`.

---

## 11. Email Component Coding Patterns

Section components in `src/components/email/` follow consistent conventions:

```
1. imports (react, @react-email/components)
2. TYPES — exported prop interfaces
3. STYLES — defaultStyles (React.CSSProperties)
4. SUB-COMPONENTS (optional, file-private)
5. MAIN COMPONENT — React.FC with registry-compatible props
6. default export
```

- **600px container width** — email client safe zone
- **Table-based layout** — `<table role="presentation">` nesting
- **Inline styles only** in email output — no Tailwind in components
- **Style override pattern** — `styles?: { ... }` merges over defaults
- **Rich text** — `dangerouslySetInnerHTML` where HTML is allowed
- **Path alias** — `@/*` → `./src/*`

---

## 12. Demo Talking Points

Use these when presenting technically:

1. **Registry-driven architecture** — Adding a component means one definition + one React file; the palette, property panel, AI catalog, and renderer all read the same schema.
2. **Server-side rendering** — Preview and export always go through `@react-email/render` on the server, so output matches what email clients receive.
3. **Two import strategies** — Screenshot Upload is *interpretive* (AI guesses component mapping); Figma Import is *deterministic* (parses the design tree into a React Email AST).
4. **Responsive without media-query hell** — Shared `EDM_CLASS` CSS handles desktop/mobile image swap and column stacking in a way Outlook and Gmail tolerate.
5. **Portable export** — ZIP bundles HTML + local images so templates work offline or in any ESP.
6. **JSON templates** — No database required; templates are versionable files suitable for git or CMS integration later.

---

## 13. Known Gaps

| Gap | Detail |
|-----|--------|
| Send email | External React Email CLI only; no in-app SMTP/Resend |
| `email:resend:setup` | Referenced in UI comments but not in `package.json` |
| Ollama status banner | `OllamaStatusBanner.tsx` exists but is not mounted |
| AI Figma build route | `/api/ai/build-react-email` has no UI entry point |
| No automated tests | No Jest/Vitest/Playwright in repo |
| Image URLs in production | Builder uses `/images/...` paths; production may need CDN absolutization |

---

## 14. Quick Reference — "Where is X?"

| Concern | File |
|---------|------|
| Render builder template → HTML | `src/app/api/email/render/route.ts` |
| Screenshot Upload API | `src/app/api/ai/analyze-component/route.ts` |
| Figma fetch | `src/app/api/figma/import/route.ts` |
| Figma build | `src/app/api/figma/build-email/route.ts` |
| Component definitions | `src/lib/registry/definitions.ts` |
| Dynamic email renderer | `src/lib/render/DynamicEmailTemplate.tsx` |
| Export ZIP pipeline | `src/lib/export/index.ts` |
| Builder Zustand store | `src/builder/store/builderStore.ts` |
| Template JSON storage | `src/lib/templates/fileStorage.ts` |
| Responsive email CSS | `src/lib/email/responsive.ts` |
| Legacy static render | `src/app/api/email/[template]/route.ts` |

---

*End of codebase overview.*
