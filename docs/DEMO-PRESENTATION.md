# Demo Presentation Pack — EDM React Email Tool

**Audience:** stakeholders / team demo  
**Demo date:** Tuesday, Aug 4, 2026  
**Branch:** `bmad-2` · **Verify:** `npm run verify` (26 tests)

> **Best visuals:** open [`demo-diagrams.html`](./demo-diagrams.html) in Chrome/Edge → press **F11** for fullscreen. Arrow keys / PageUp·Down move between slides. Print → Save as PDF for PowerPoint.
>
> Mermaid source for editing also lives below. Talking points: [`DEMO-PRESENTATION.md`](./DEMO-PRESENTATION.md) (this file).

---

## 0. Elevator pitch (15 seconds)

> We have a **prebuilt React Email component library** you drag onto a canvas. When Figma has a **new** component, paste **desktop + mobile** frame URLs, fetch design context, and **build with React Email** ([react.email/components](https://react.email/components)). Add the result to the canvas, **customize styles** in the tool, and — when email clients can’t handle the CSS — choose **image flatten** instead of a React rebuild. **Batch** lets you build many Figma links in one go.

---

## 1. What the product is

| Capability | Status |
|------------|--------|
| Gallery + drag-and-drop editor | ✅ |
| Component registry (Header, Hero, 2UP, Footer, …) | ✅ |
| Live HTML preview (React Email) | ✅ |
| Figma fetch / build / batch import | ✅ |
| Figma → **registry component links** (editable blocks) | ✅ |
| Screenshot / AI import (Ollama or Gemini) | ✅ |
| Export ZIP + Resend test send | ✅ |
| Architecture ports (ready for Postgres/S3/auth) | ✅ ports · ⏸ adapters deferred |
| Production authentication | ⏸ Deferred (Epic F4) |

---

## 2. Timeline (4-week narrative + full git arc)

First commit: **2026-06-03**. Intensive productization: **last ~4 weeks** (late July → Aug 3).

### Week-by-week (demo narrative)

```mermaid
gantt
    title EDM React Email Tool — Delivery Timeline
    dateFormat  YYYY-MM-DD
    axisFormat  %b %d

    section Foundation
    Bootstrap Next.js + React Email     :done, w0a, 2026-06-03, 2026-06-08
    Export ZIP + Figma PNG fidelity     :done, w0b, 2026-06-03, 2026-06-08

    section Build out
    Feature iteration + mobile          :done, w1, 2026-06-08, 2026-06-30
    Multi-component builder             :done, w2, 2026-07-26, 2026-07-27

    section Last week
    BMAD PRD + Architecture             :done, w3a, 2026-08-01, 2026-08-01
    Epic 1 ports/adapters               :done, w3b, 2026-08-02, 2026-08-02
    Epic 2 hardening + verify            :done, w3c, 2026-08-02, 2026-08-02
    Builder polish (14 stories)         :done, w3d, 2026-08-02, 2026-08-02

    section This week
    Figma → registry accuracy           :done, w4a, 2026-08-03, 2026-08-03
    Demo day                            :crit, milestone, m1, 2026-08-04, 0d
```

### Day-by-day (last week + this week)

| Day | Date | What shipped |
|-----|------|----------------|
| Fri | Aug 1 | BMAD planning integration — PRD, architecture spine, epics |
| Sat | Aug 2 AM | **Epic 1** — config, ports, filesystem adapters, TemplateService, errors, logging, boundaries |
| Sat | Aug 2 PM | **Epic 2** — lint/test verify, access gate, rate limits, secrets, exposure gate |
| Sat | Aug 2 Eve | **Builder polish** — mobile, toasts, unsaved guard, import menu, a11y, gallery search, docs |
| Sun/Mon | Aug 3 | **Figma accuracy** — component links, master IDs, 2UP disambiguation, hybrid decompose |
| Tue | Aug 4 | **DEMO** |

### Earlier foundation (mention briefly)

| When | What |
|------|------|
| Jun 3 | First commit, source, image upload API, Figma AI path |
| Jun 4 | Figma PNG exports for pixel-accurate builds |
| Jun–Jul | Continuous UI/component iteration |
| Jul 26–27 | Multiple component feature; image & design feature |

---

## 3. Architecture diagram

```mermaid
flowchart TB
    subgraph Client["Browser — Builder UI"]
        Gallery["/builder Gallery"]
        Editor["/builder/:id Editor"]
        Store["Zustand builderStore"]
        Preview["Live Preview iframe"]
        Gallery --> Editor
        Editor --> Store
        Store --> Preview
    end

    subgraph API["Next.js App Router — /api"]
        Tpl["/api/templates"]
        Ren["/api/email/render · export · send"]
        Fig["/api/figma/*"]
        AI["/api/ai/*"]
        Ast["/api/assets/upload"]
        Reg["/api/registry"]
    end

    subgraph Core["Application core"]
        Svc["TemplateService"]
        Cfg["config.ts — Zod env"]
        Ctr["container.ts — composition root"]
        Mid["middleware — correlation · rate limit · access"]
    end

    subgraph Ports["Ports (interfaces)"]
        TR["TemplateRepository"]
        AS["AssetStore"]
        EL["EventLog"]
        JQ["JobQueue"]
    end

    subgraph Adapters["Adapters — current phase"]
        FS["Filesystem — data/templates/"]
        Local["Local uploads — public/images/uploads/"]
    end

    subgraph External["External services"]
        FigmaAPI["Figma REST API"]
        Ollama["Ollama / Gemini"]
        Resend["Resend"]
    end

    Editor --> Tpl & Ren & Fig & AI & Ast & Reg
    Tpl --> Svc
    Svc --> Ctr
    Ctr --> TR & AS
    TR --> FS
    AS --> Local
    Fig --> FigmaAPI
    AI --> Ollama
    Ren --> Resend
    Mid -.-> API
    Cfg -.-> Ctr
```

### Ports & adapters (future-ready)

```mermaid
flowchart LR
    Svc["TemplateService / routes"] --> Port["Port interface"]
    Port --> Now["NOW: filesystem / local"]
    Port -.-> Later["LATER: Postgres / S3 — Epics F1–F2"]
```

---

## 4. User workflow — day-to-day builder

```mermaid
flowchart LR
    A[Open Gallery] --> B[Create / open template]
    B --> C[Add blocks]
    C --> D{Source?}
    D -->|Palette| E[Drag registry component]
    D -->|Figma| F[Fetch → Build]
    D -->|Screenshot| G[AI analyze]
    E --> H[Edit properties]
    F --> H
    G --> H
    H --> I[Live preview]
    I --> J{Happy?}
    J -->|No| H
    J -->|Yes| K[Save]
    K --> L[Export ZIP or Send test]
```

---

## 5. Figma → React Email pipeline (accuracy story)

```mermaid
flowchart TB
    URL["Figma frame URL"] --> Fetch["importFromFigma\nAPI + PNG exports"]
    Fetch --> Tree["ParsedFigmaNode tree"]
    Tree --> Build["buildFigmaDesign"]

    Build --> R{useRegistryLinks?}
    R -->|yes| Link["resolveComponentLink\n1. overrides\n2. layer name\n3. master component ID\n4. structure disambiguation"]
    Link --> Ext["Prop extractors\nheadline · images · CTAs · columns"]
    Ext --> Score{"Confidence\n≥ thresholds?"}
    Score -->|yes| RegBlocks["Editable registry blocks\nheader · hero-banner · 2UP · footer…"]
    Score -->|partial| Hybrid["Keep strong sections\ndecompose hybrid"]
    Score -->|no| Prim["React Email AST primitives\nor image flatten"]
    R -->|image mode| Img["Full-frame PNG block"]

    RegBlocks --> Editor["Builder canvas + property panel"]
    Hybrid --> Editor
    Prim --> Editor
    Img --> Editor
```

### Mapping modes (what to show on Import Result)

| Mode | Meaning | Demo message |
|------|---------|--------------|
| `registry` | Matched design-system sections | “Editable components — not just an image” |
| `primitives` | AST Section/Row/Text/Button | “Still editable structure; polish in customizer” |
| `image` | Flattened frame PNG | “Pixel-perfect when layout can’t map” |

---

## 6. Request path — save template

```mermaid
sequenceDiagram
    participant UI as Builder UI
    participant API as PUT /api/templates/:id
    participant Svc as TemplateService
    participant Port as TemplateRepository
    participant Disk as data/templates/*.json

    UI->>API: JSON document + correlation id
    API->>API: Zod validate
    API->>Svc: update()
    Svc->>Port: save()
    Port->>Disk: write file
    Disk-->>Port: ok
    Port-->>Svc: template
    Svc-->>API: result
    API-->>UI: 200 + template
```

---

## 7. Security posture (Epic 2 — 30-second slide)

```mermaid
flowchart TB
    Req["Incoming request"] --> Mid["middleware.ts"]
    Mid --> Corr["Stamp x-correlation-id"]
    Mid --> Auth["Access gate AUTH_MODE=open"]
    Mid --> Rate["Rate limit expensive routes"]
    Mid --> Size["Body size limits"]
    Mid --> Legacy["Legacy /preview lockdown"]
    Boot["Server start"] --> Exp["exposureGate — refuse public bind when open"]
    CI["npm run verify"] --> Sec["typecheck · lint · boundaries · secrets · tests"]
```

---

## 8. Progress scoreboard

```mermaid
pie title Delivery status (story / epic view)
    "Epic 1 API & storage" : 9
    "Epic 2 Hardening" : 8
    "Builder polish" : 14
    "Figma registry accuracy" : 1
    "Deferred F1–F4" : 4
```

| Phase | Stories | Status |
|-------|---------|--------|
| Epic 1 Consistent API & storage | 1.1–1.9 | ✅ Complete |
| Epic 2 Internal hardening | 2.1–2.8 | ✅ Complete |
| Builder polish | #1–#14 | ✅ Complete |
| Figma component-link accuracy | — | ✅ Shipped Aug 3 |
| F1 Postgres · F2 S3 · F3 Worker · F4 Auth | — | ⏸ Deferred |

---

## 9. Live demo script (8–10 minutes)

1. **Gallery** (`/builder`) — search, create template  
2. **Editor** — show 3-column layout; drag a block; edit props; show toast / auto-save  
3. **Import ▾** — Fetch Figma URL (have a known good Header/Hero/Footer frame ready)  
4. **Build** — point to `mappingMode: registry` / reasoning text  
5. **Edit** imported headline / CTA in property panel  
6. **Preview** desktop/mobile feel  
7. **Export** ZIP download  
8. **(Optional)** Send test if Resend configured  
9. **Close** with architecture: ports ready, cloud/auth not blocking today’s value  

### Backup if Figma token fails

- Use an already-imported template from gallery  
- Or Screenshot Upload with Ollama/Gemini  
- Or pure palette drag-and-drop path  

---

## 10. Likely Q&A

| Question | Answer |
|----------|--------|
| Is this production SaaS? | Internal tool; `AUTH_MODE=open`. Auth/Postgres/S3 designed as ports, not built yet. |
| How accurate is Figma import? | Best on Nissan DS names/IDs (Header, Hero, 2UP, call-out…). Unmatched → primitives/image. Accuracy improved Aug 3 with name-first links + ID table. |
| Why React Email? | Component model + email-safe HTML; maintainable vs sliced Handlebars-only. |
| What’s next? | Stakeholder choice: more Figma IDs, or F1–F4 infrastructure. |

---

## 11. Files to open during Q&A

| Topic | Path |
|-------|------|
| Architecture summary | `docs/ARCHITECTURE.md` |
| Builder how-to | `docs/BUILDER.md` |
| Component links | `src/lib/figma/componentLinks.ts` |
| Master IDs | `src/lib/figma/figmaComponentIds.ts` |
| Handoff / status | `_bmad-output/planning-artifacts/HANDOFF.md` |

---

*Generated for demo day · Update this file after major milestones.*
