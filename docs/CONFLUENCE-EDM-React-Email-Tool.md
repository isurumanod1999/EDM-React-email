# EDM React Email Tool: Fast EDM Building with React Email

> **Live Confluence:** https://akqa.atlassian.net/wiki/spaces/COLOMBO/pages/2109865986/EDM+React+Email+Tool+Fast+EDM+Building+with+React+Email  
> **Sync this file into Confluence** when sharing — local markdown is the source of truth for the latest status.

**Date:** 11 August 2026  
**Start Date:** 3 June 2026  
**Progress update:** 11 August 2026  
**Repo:** EDM React Email Tool  
**Project Lead:** EDM Squad (React Email path)

---

**August 2026 status — First live campaign built in the tool and handed to QA; QA in progress.**  
The React Email builder can assemble a full EDM **template layout** and **export HTML + an assets (img) folder**. An **ongoing campaign** has been **completed** in the tool and **handed over to QA**. **QA is still in progress** (rendering / inbox proof). Single sections are much faster; full-template layout time is moving from ~**4.5–6 hours** toward ~**1.5 hours**. **Tagging-doc URL import** was tried on a real sheet and is **on hold** for now (needs more hardening before we treat it as production-ready). The tool can still **struggle on some complex layouts** (especially **2-column** and **3-column** components). **Carousels, colour selector, and hotspot** components are still **pending**.

| At a glance | Status |
| --- | --- |
| Build template with React Email | **Live** |
| Export HTML + img / assets | **Live** |
| Live campaign build in tool | **Done** — handed to QA |
| Campaign QA (inbox / clients) | **In progress** |
| Single component speed (simpler sections) | **Improved** (~30–45 min → often under 5 min) |
| Complex multi-column (2-col / 3-col) | **Struggles sometimes** — fix soon |
| Carousel / colour selector / hotspot | **Pending** |
| Full template layout speed | **Improving** (~4.5–6 h → target ~1.5 h) |
| Fast URL adding from tagging doc | **On hold** (built; needs more work) |
| Email client / real-device testing | **In progress** via campaign QA |

---

## 1. Executive Summary

This document covers the **React Email** track for faster EDM production — a parallel path to the existing Handlebars + Gulp Accelerator. Same business goal, different stack.

| | **Accelerator** | **This tool** |
| --- | --- | --- |
| Build model | Figma → Handlebars partials | Canvas + Figma → **React Email** |
| Ship HTML | **Gulp** compile | **Export HTML + img/assets** from the builder |
| Focus | Handlebars-based EDM builds | **Fast, editable React templates** |

**What “done” means today:** a designer/dev can compose the email in the tool and hand off an HTML package with images for QA.  

**What “in progress” means:** campaign **QA** (real clients / devices) after the first live campaign handoff.  

**What “not done / on hold” means:** (1) tagging-doc URL import hardened for production use, (2) complex **2-col / 3-col** reliability, and (3) **carousel**, **colour selector**, and **hotspot** components.

---

## 2. Old process vs now vs next

| Feature | Before | Now (this tool) | Next |
| --- | --- | --- | --- |
| Assembly | Hand HTML / Handlebars + Gulp | Drag library or Figma → React Email (or image flatten); 2-col / 3-col can struggle | Fix complex multi-column builds soon |
| Single component | ~30–45 min | Often under 5 min (sometimes 2–3 min) | Keep this baseline |
| Full template (layout) | ~4.5–6 hours | Layout build toward ~1.5 hours | Hold ~1.5 h end-to-end |
| URLs / tracking | Paste from tagging sheet | Still largely manual; in-tool tagging on hold | Resume tagging after QA / harden match |
| Check quality | Manual / limited clients | Browser preview; campaign QA in progress | Finish Gmail, Outlook, iOS + devices |
| Export | Gulp → HTML (Accelerator path) | HTML + img / assets folder | + production CDN / hosting process |

---

## 3. Progress update (11 August 2026)

### 3.0 Latest (11 August)

| Item | Status | Notes |
| --- | --- | --- |
| Ongoing campaign build in React Email tool | **Done** | Template composed / exported from the tool |
| Handover to QA | **Done** | Package handed over for client / device checks |
| Campaign QA | **In progress** | Waiting on QA feedback / defects |
| Tagging-doc URL import | **On hold** | Tried on a real sheet; not reliable enough yet — pause further tagging work |

### 3.1 Completed / in use

| Item | Status | Notes |
| --- | --- | --- |
| React Email builder (drag-and-drop) | Done | Header, Hero, 2UP, Footer, CTA, text, … |
| Figma import (single + batch) | Done | Desktop + mobile frame URLs |
| React vs image flatten | Done | Image when CSS will not survive clients |
| Customize in tool | Done | Copy, spacing, type, images |
| Browser preview | Done | Not inbox proof by itself |
| Export HTML + img/assets | Done | Package ready to hand off |
| Template layout without URLs | Done | Structure first; URLs still mainly manual while tagging is on hold |
| First live campaign build + QA handover | Done | Build complete; **QA in progress** |
| BMAD + architecture restructure | Done | July (last 2 weeks) |
| Figma accuracy + content guard | Done | July last week → now |
| Fast URL adding from tagging doc | **On hold** | Feature exists; paused until match/UI issues are fixed |
| Complex 2-col / 3-col components | Partial | Works for many cases; **still struggles** on some complex multi-column layouts — **fix soon** |
| Carousel component | **Pending** | Not supported yet |
| Colour selector component | **Pending** | Not supported yet |
| Hotspot component | **Pending** | Not supported yet |

### 3.2 Roadmap

| When | Milestone | Status |
| --- | --- | --- |
| Early June | Foundation (React Email, export, early Figma) | Done |
| June – early July | Builder iteration (components, mobile) | Done |
| July weeks 1–2 | Multi-component (batch; image vs editable) | Done |
| July last 2 weeks | BMAD integration; architecture restructure / polish | Done |
| July last week → now | Accuracy + content guard | Done |
| **11 August** | First live campaign build → QA handover | **Done** (QA **in progress**) |
| **Now** | Campaign / email client QA feedback | **In progress** |
| **Soon** | Harden complex **2-col / 3-col** component builds | **In progress / fix soon** |
| **On hold** | Fast URL adding from tagging document | **On hold** |
| **Pending** | **Carousel**, **colour selector**, **hotspot** components | **Pending** |

---

## 4. Next work (gaps)

### 4.1 Campaign QA — in progress

First live campaign from the React Email path has been **handed to QA**. Focus now is defect triage from real-client / device checks (at least **Gmail, Outlook, iOS**), then fix or flatten where HTML cannot win.

### 4.2 Complex multi-column components — fix soon

For many simpler sections the tool is fast and reliable. On some **complex components** — especially **2-column** and **3-column** layouts — Figma → React Email can still **struggle** (layout / mapping accuracy). Workaround today: extra manual customize, or image flatten for that block. **This needs to be fixed soon** so multi-column modules are trustworthy without heavy rework.

### 4.3 Special interactive / rich components — pending

These component types are **not supported yet** in the React Email builder path:

| Component | Status |
| --- | --- |
| **Carousel** | **Pending** |
| **Colour selector** | **Pending** |
| **Hotspot** | **Pending** |

Until these land, campaigns that need them must use a workaround (e.g. image flatten for that section, or the existing Handlebars path where applicable).

### 4.4 Fast URL adding — on hold

In-tool tagging (Book1 `.xlsx` → URL Label match → Apply FINAL URL / Alt Text) was built and tried on a real campaign sheet. Matching / panel reliability was **not good enough** for production use, so further tagging work is **on hold**. URLs remain **manual** for campaigns until we resume and harden this path.

---

## 5. Workflow (today)

1. Create / open template  
2. Add blocks (library and/or Figma desk + mobile; batch OK)  
3. Choose React Email or image flatten  
4. Customize copy and styles  
5. Browser preview  
6. Export **HTML + img/assets**  
7. Add URLs (manual for now — tagging **on hold**)  
8. Hand to **QA** → inbox/device testing (**in progress** for current campaign)

```
Library / Figma → React Email canvas → Preview → Export (HTML + img) → QA
                                                              → Next: QA feedback · fix 2/3-col · carousel/colour/hotspot · resume tagging later
```

---

## 6. Success metrics

| Metric | Before | Now / target | Notes |
| --- | --- | --- | --- |
| Single component (simpler) | ~30–45 min | Often under 5 min (sometimes 2–3 min) | Per section — not a full email |
| Complex 2-col / 3-col | Slow / error-prone by hand | Sometimes struggles in the tool | Fix soon — accuracy on multi-column layouts |
| Carousel / colour selector / hotspot | Built elsewhere / hand | Pending in this tool | Not supported yet |
| Full template (layout) | ~4.5–6 hours | Target ~1.5 hours | Layout/compose in the tool |
| Full template + URLs | Included in long manual build | URLs still manual while tagging is on hold | Resume tagging after harden |
| Live campaign → QA | N/A | Handover done; QA in progress | First production-path proof |
| Export | Gulp / hand package | HTML + img/assets | Achieved |
| Inbox reliability | Ad hoc | QA in progress | Gmail, Outlook, iOS, devices |
| Maintainability | Slices / one-off HTML | Editable React Email | Core value of this path |

---

## 7. Open considerations

- Complete **campaign QA** and log / fix client defects  
- Freeze the **client/device list** for testing (min: Gmail, Outlook, iOS)  
- **Fix complex 2-col / 3-col** Figma → React Email mapping soon  
- Add **carousel**, **colour selector**, and **hotspot** component support  
- Resume **tagging-doc** URL import only after match/UI hardening  
- Local `img` folder vs production CDN after export  
- When to use **this React path** vs **Handlebars + Gulp** builds  

---

## IMPORTANT

- **Under 5 minutes = one simpler component**, not the whole template — and not every **2-col / 3-col** case yet.  
- **Full template layout:** ~**4.5–6 h → ~1.5 h** target; **tagging URLs are on hold** (manual for now).  
- **Browser preview ≠ Gmail / Outlook / iOS** — campaign **QA is the proof path**, and it is **in progress**.  
- This path exports **HTML + img** from React Email; Accelerator still uses **Gulp → Handlebars HTML**.

**TIP**  
Compose in React Email → preview → export HTML + assets → hand to QA → fix from QA feedback → resume tagging later when ready.
