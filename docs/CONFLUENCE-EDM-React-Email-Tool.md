# EDM React Email Tool: Fast EDM Building with React Email

> **Live Confluence:** https://akqa.atlassian.net/wiki/spaces/COLOMBO/pages/2109865986/EDM+React+Email+Tool+Fast+EDM+Building+with+React+Email  
> **Sync this file into Confluence** when sharing — local markdown is the source of truth for the latest status.

**Date:** 24 August 2026  
**Start Date:** 3 June 2026  
**Progress update:** 24 August 2026  
**Repo:** EDM React Email Tool  
**Project Lead:** EDM Squad (React Email path)

---

**August 2026 status — First template built, handed to QA; Email on Acid + first-round QA show inbox rendering gaps.**  
A full EDM **template** was composed in the React Email builder and **exported (HTML + img/assets)** for handover. The same template was tested across **mobile and desktop inboxes** in Email on Acid ([open the shareable results](https://app.emailonacid.com/app/acidtest/CmzIgLgYBesG5ffJbfGDIHmG8sKFAEudltxEgXogdoZjz/list) — *Proof – Retail Offer – June Owners 2026 3*, 18 August 2026). **The email looks correct in Apple Mail and Gmail on the web, and Gmail on Android works for most of the email.** It does **not** look correct in Outlook on Windows. These are React Email / HTML-email limits, not a broken export button. **Outlook on Windows is the main blocker** before this path matches the existing Handlebars master template. Speed gains remain valid for drafting; **inbox sign-off needs an Email on Acid / QA pass, or an agreed workaround.**

| At a glance | Status |
| --- | --- |
| Build template with React Email | **Live** |
| Export HTML + img / assets | **Live** |
| First template build + QA handover | **Done** |
| First-round QA (client / device) | **Done** — defects logged |
| **Inbox rendering (Email on Acid)** | **Outlook on Windows is the main issue** — Gmail Android works for most of the email; see §8 |
| QA fix round / re-test | **Next** |
| Single component speed (simpler sections) | **Improved** (~2–2.5 h for new components → **25–30 min**) |
| Complex multi-column (2-col / 3-col) | **Struggles sometimes** — fix soon |
| Carousel / colour selector / hotspot | **React Email does not support these features** |
| Full template layout speed | **Improving** (~4.5–6 h → target **2–3 h**) |
| Fast URL adding from tagging doc | **On hold** (built; needs more work) |

---

## 1. Executive Summary

This document covers the **React Email** track for faster EDM production — a parallel path to the existing Handlebars + Gulp Accelerator. Same business goal, different stack.

| | **Accelerator** | **This tool** |
| --- | --- | --- |
| Build model | Figma → Handlebars partials | Canvas + Figma → **React Email** |
| Ship HTML | **Gulp** compile | **Export HTML + img/assets** from the builder |
| Focus | Handlebars-based EDM builds | **Fast, editable React templates** |

**What “done” means today:** a designer/dev can compose the email in the tool and hand off an HTML package with images for QA.  

**What “in progress” means:** **QA fix round** — addressing first-round defects (especially **Outlook desktop**), then re-test.

**What “not done / on hold” means:** (1) **Production sign-off on React Email path** until Outlook issue is resolved or workaround agreed, (2) tagging-doc URL import hardened for production use, (3) complex **2-col / 3-col** reliability, (4) **carousel**, **colour selector**, and **hotspot** — **React Email does not support these features**.

---

## 2. Old process vs now vs next

| Feature | Before | Now (this tool) | Next |
| --- | --- | --- | --- |
| Assembly | Hand HTML / Handlebars + Gulp | Drag library or Figma → React Email (or image flatten); 2-col / 3-col can struggle | Fix complex multi-column builds soon |
| Single component | ~2–2.5 hours (new components) | **25–30 min** | Keep this baseline |
| Full template (layout) | ~4.5–6 hours | Layout build toward **2–3 hours** | Hold **~2 h** end-to-end |
| URLs / tracking | Paste from tagging sheet | Still manual using the tool | Resume tagging-doc import later |
| Check quality | Manual / limited clients | Browser preview OK; **Outlook on Windows is the main issue** | Fix Outlook · re-QA · flatten where needed |
| Export | Gulp → HTML (Accelerator path) | HTML + img / assets folder | Also: production CDN / hosting process |

---

## 3. Progress update (24 August 2026)

### 3.0 Latest (24 August)

| Item | Status | Notes |
| --- | --- | --- |
| Template built in React Email tool | **Done** | Full template composed; HTML + img/assets exported |
| Handover to QA | **Done** | Package sent for real client / device testing |
| **First-round QA** | **Done** | QA tested on target clients/devices; defects returned |
| **QA finding — Outlook desktop** | **Main issue** | React Email HTML **does not render properly** on **Outlook desktop (Windows)**. This is the **primary issue** blocking sign-off. |
| **Finding — Gmail Android app** | **Works for most of the email** | Rechecked in Email on Acid: **no major issues**; the body is **not** empty. |
| QA finding — other clients | TBD | Log separately; **Outlook desktop takes priority** |
| Fix round + QA re-test | **Next** | Triage Outlook (MSO / flatten / mapper fixes) then re-handover |
| Tagging-doc URL import | **On hold** | Pause until Outlook path is resolved or accepted |

### 3.0a QA handover summary (first round)

| Step | What happened |
| --- | --- |
| Step 1 — Build | Template created in the EDM React Email Tool (Figma import + customize + export). |
| Step 2 — Handover | HTML package + assets folder handed to QA with client/device test matrix. |
| Step 3 — QA test | Email on Acid run across phones and desktops, plus first-round QA review. |
| Step 4 — QA return | Defect list returned. **Main issue: Outlook on Windows.** Gmail Android works for most of the email. |
| Step 5 — Next | Dev fixes or workarounds (see §8, Limitation 1); **must re-test Outlook on Windows** before production use. |

**Stakeholder message:** The tool successfully **builds and exports** templates quickly. **Browser preview is not sufficient.** First-round QA proves that **React Email’s Outlook desktop behaviour is the main gap** compared to the existing Handlebars + Gulp pipeline.

### 3.1 Completed / in use

| Item | Status | Notes |
| --- | --- | --- |
| React Email builder (drag-and-drop) | Done | Header, Hero, 2UP, Footer, CTA, text, … |
| Figma import (single + batch) | Done | Desktop + mobile frame URLs |
| React vs image flatten | Done | Image when CSS will not survive clients |
| Customize in tool | Done | Copy, spacing, type, images |
| Browser preview | Done | Not inbox proof by itself |
| Export HTML + img/assets | Done | Package ready to hand off |
| Template layout without URLs | Done | Structure first; URLs still **manual using the tool** |
| First template build + QA handover | Done | Build + export complete |
| First-round QA (Outlook desktop) | Done | **Main issue: React Email not rendering properly on Outlook desktop** |
| BMAD + architecture restructure | Done | July (last 2 weeks) |
| Figma accuracy + content guard | Done | July last week → now |
| Fast URL adding from tagging doc | **On hold** | Feature exists; paused until match/UI issues are fixed |
| Complex 2-col / 3-col components | Partial | Works for many cases; **still struggles** on some complex multi-column layouts — **fix soon** |
| Carousel component | **Not available** | **React Email does not support this feature** |
| Colour selector component | **Not available** | **React Email does not support this feature** |
| Hotspot component | **Not available** | **React Email does not support this feature** |

### 3.2 Roadmap

| When | Milestone | Status |
| --- | --- | --- |
| Early June | Foundation (React Email, export, early Figma) | Done |
| June – early July | Builder iteration (components, mobile) | Done |
| July weeks 1–2 | Multi-component (batch; image vs editable) | Done |
| July last 2 weeks | BMAD integration; architecture restructure / polish | Done |
| July last week → now | Accuracy + content guard | Done |
| **11 August** | First template build → QA handover | **Done** |
| **24 August** | First-round QA complete | **Done** — **Outlook desktop = main issue** |
| **Next** | Outlook fix round + QA re-test | **In progress** |
| **Soon** | Harden complex **2-col / 3-col** component builds | **In progress / fix soon** |
| **On hold** | Fast URL adding from tagging document | **On hold** |
| **N/A** | **Carousel**, **colour selector**, **hotspot** | **React Email does not support these features** |

---

## 4. Next work (gaps)

### 4.1 Campaign QA — first round complete; Email on Acid shows the gaps

The first template from the React Email path went through **build → export → Email on Acid (all clients) → QA return**.

| QA outcome | Detail |
| --- | --- |
| **What we tested** | One live template in Email on Acid across phones and desktops. Shareable results: [Email on Acid test](https://app.emailonacid.com/app/acidtest/CmzIgLgYBesG5ffJbfGDIHmG8sKFAEudltxEgXogdoZjz/list). |
| **Looks good** | Apple Mail on iPhone and Mac; Gmail in Chrome / Edge / Firefox; **Gmail Android app works for most of the email** (body is **not** empty). |
| **Main issue (blocker)** | **Outlook on Windows does not show the email as designed** (wrong image size, duplicated logo, extra space). |
| **Next steps** | Fix or flatten problem sections, or use the Handlebars path for Outlook-critical sends; **re-test in Email on Acid** before production. |

See **§8** for the five limitations, each with Email on Acid evidence.

### 4.2 Complex multi-column components — fix soon

For many simpler sections the tool is fast and reliable. On some **complex components** — especially **2-column** and **3-column** layouts — Figma → React Email can still **struggle** (layout / mapping accuracy). Workaround today: extra manual customize, or image flatten for that block. **This needs to be fixed soon** so multi-column modules are trustworthy without heavy rework.

### 4.3 Carousel, colour selector, hotspot — React Email does not support these

These component types **cannot be built in React Email** — the framework has **no option** to create them:

| Component | Status |
| --- | --- |
| **Carousel** | **React Email does not support this feature** |
| **Colour selector** | **React Email does not support this feature** |
| **Hotspot** | **React Email does not support this feature** |

Until React Email adds them, campaigns that need these must use a workaround (e.g. image flatten for that section, or the existing Handlebars path where applicable).

### 4.4 Fast URL adding — on hold

In-tool tagging (Book1 `.xlsx` → URL Label match → Apply FINAL URL / Alt Text) was built and tried on a real campaign sheet. Matching / panel reliability was **not good enough** for production use, so further tagging-doc import is **on hold**. URLs remain **still manual using the tool** until we resume and harden this path.

---

## 5. Workflow (today)

1. Create / open template  
2. Add blocks (library and/or Figma desk + mobile; batch OK)  
3. Choose React Email or image flatten  
4. Customize copy and styles  
5. Browser preview  
6. Export **HTML + img/assets**  
7. Add URLs (**still manual using the tool** — tagging-doc import **on hold**)  
8. Hand to **QA** → first-round complete (**Outlook on Windows = main issue**) → fix round → **re-QA**

```
Library / Figma → React Email canvas → Preview → Export (HTML + img) → QA round 1
                                                              → Outlook on Windows is the main issue
                                                              → Fix · re-QA Outlook → wider sign-off
```

---

## 6. Success metrics

| Metric | Before | Now / target | Notes |
| --- | --- | --- | --- |
| Single component (simpler) | ~2–2.5 hours (new components) | **25–30 min** | Per section — not a full email |
| Complex 2-col / 3-col | Slow / error-prone by hand | Sometimes struggles in the tool | Fix soon — accuracy on multi-column layouts |
| Carousel / colour selector / hotspot | Built elsewhere / hand | **React Email does not support these features** | No option in React Email to create them |
| Full template (layout) | ~4.5–6 hours | Target **2–3 hours** | Layout/compose in the tool |
| Full template + URLs | Included in long manual build | URLs **still manual using the tool** | Tagging-doc import still on hold |
| Live campaign → QA | N/A | Round 1 done; **Outlook on Windows is the main issue** | Re-test after fix |
| Export | Gulp / hand package | HTML + img/assets | Achieved |
| Inbox reliability | Ad hoc | **Outlook on Windows** is the main issue; Gmail Android works for most of the email | See §8 |
| Maintainability | Slices / one-off HTML | Editable React Email | Core value of this path |

---

## 7. Open considerations

- **Email on Acid evidence** — Outlook Windows is the main issue; Gmail Android works for most of the email; re-test after any fix  
- **Five limitations** documented in §8 — do not sign off from builder preview  
- Freeze the **client list**: Gmail web, Outlook Windows, Apple Mail iOS, **Gmail Android**  
- **Fix complex 2-col / 3-col** Figma → React Email mapping soon  
- Add **carousel**, **colour selector**, and **hotspot** only if React Email adds support (today: **not supported by React Email**)  
- Resume **tagging-doc** URL import only after match/UI hardening  
- Local `img` folder vs production CDN after export  
- When to use **this React path** vs **Handlebars + Gulp** builds  

---

## 8. Five limitations (with Email on Acid evidence)

We tested **one exported template** in Email on Acid on phones and desktops.

**Test:** *Proof – Retail Offer – June Owners 2026 3* (18 August 2026)  
**Results (anyone with the link can open):** [Email on Acid — all client screens](https://app.emailonacid.com/app/acidtest/CmzIgLgYBesG5ffJbfGDIHmG8sKFAEudltxEgXogdoZjz/list)

These five points are what that test showed. They apply to **React Email output** and to **this tool** (because the tool exports React Email HTML).

---

### Limitation 1 — Outlook on Windows does not match the design (main issue)

**In plain terms:** Outlook on a Windows PC does not display this email the way Apple Mail or Gmail on the web do. Logos can appear twice, photos can be cropped or tiny, and large empty gaps can appear.

**Evidence from Email on Acid:**

- **Outlook 2019 (Windows 10):** two Nissan logos stacked in the header (only one is designed). Outlook itself showed a warning: *“If there are problems with how this message is displayed, click here to view it in a web browser.”*
- **Outlook 2016 (Windows 10):** the hero photo of the car appeared **twice, side by side**, instead of one full-width image.
- **Outlook Microsoft 365 / Office 365 (Windows):** the hero photo looked **cropped or zoomed in** compared with Apple Mail on Mac.
- **Outlook 2019 (Windows 10), gallery view:** the car image sat **very small in the middle of a large black area**.

Apple Mail 16 on macOS and Gmail in Chrome/Edge/Firefox showed the same template with **one logo and a normal-width hero**.

**Why it happens (short):** Outlook on Windows draws email more like a Word document than a web page. React Email’s HTML is built for modern inboxes. The house Handlebars template is already tuned for Outlook; this export is not yet.

**What we can do today:** turn a broken section into a **flat image** in the tool; send Outlook-critical work on the **Handlebars** path; or accept that Outlook Windows will look rougher until we add Outlook-specific hardening.

---

### Limitation 2 — Desktop and mobile versions of the same picture can both show

**In plain terms:** The tool (and React Email) often keep **two pictures** — one for desktop, one for phone — and tell the inbox “only show the right one.” Some inboxes ignore that instruction and show **both**, or pick the wrong one.

**Evidence from Email on Acid:**

- On several **desktop Outlook** and **narrower / older** previews, the white SUV hero appeared **twice, stacked**, while Apple Mail showed it **once**.
- The email looked **much longer** on those broken clients because extra images and extra space were added.

**Why it happens (short):** Phone vs desktop layout in this path depends on rules that **Outlook on Windows does not follow**. So a dual desktop/mobile Figma import can look correct in the browser and on iPhone, and wrong in Outlook.

**What we can do today:** flatten that block to one image; or use one image for all clients when Outlook must be perfect.

---

### Limitation 3 — React Email cannot create carousel, colour selector, or hotspot

**In plain terms:** Some campaign modules need a **carousel**, a **colour selector**, or a **hotspot**. **React Email has no option to create these features.** This tool cannot add them either, because it is built on React Email.

**Evidence:**

- There is no Carousel, Colour selector, or Hotspot component in [React Email’s component list](https://react.email/docs/components).
- In this tool those three items are **not available** — not “coming soon in React Email”; they are **outside what React Email can build**.

**What we can do today:** flatten that section as an image, or use the **Handlebars** path where those modules already exist.

---

### Limitation 4 — Dark mode changes colours and contrast

**In plain terms:** Each app has its own dark mode. Some keep our black Nissan header. Some turn backgrounds grey or invert colours. Buttons and logos can look weaker or clash.

**Evidence from Email on Acid:**

- **Apple Mail 16 (macOS) dark mode:** background went a **medium grey**; layout still readable.
- **Outlook Microsoft 365 (macOS) dark mode:** background went **near black**; contrast of red buttons and grey blocks shifted versus Apple Mail.
- **Gmail Android dark mode:** works for most of the email (rechecked — **no empty body**).
- Outlook Windows **dark mode** previews did not match Apple Mail dark mode 1:1.

**What we can do today:** design assuming dark mode will vary; check Email on Acid dark-mode tiles before sign-off; do not promise pixel-perfect dark mode from React Email.

---

### Limitation 5 — What you see in this tool is not what every inbox shows

**In plain terms:** The builder preview uses a **normal web browser**. Real inboxes do not. Apple Mail, Gmail web, and **Gmail Android (most of the email)** were close to the design. Outlook Windows was not. This is the main product risk of the React Email path.

**Evidence from Email on Acid (same file, same HTML):**

| Inbox | What we saw |
| --- | --- |
| Apple Mail (iPhone + Mac) | Matches the design (logo, hero, sections) |
| Gmail.com (Chrome, Edge, Firefox) | Matches the design |
| **Gmail app on Pixel phones** | **Works for most of the email** — no empty body; no major issues in Email on Acid |
| Outlook on Mac (Microsoft 365) | Close, small spacing / dark-mode differences |
| **Outlook on Windows (2016, 2019, 2021, Microsoft 365)** | **Main issue** — duplicate logo, wrong image size, extra space, extra copies of images |

This tool also cannot yet do everything Figma can (separate from Email on Acid, but part of the same “limits” picture):

| This tool cannot (yet) | What that means |
| --- | --- |
| Guarantee complex 2-column / 3-column layouts | Some Figma grids mis-build; flatten that block or fix by hand |
| Carousel, colour selector, hotspot | **React Email does not support these features** |
| Reliable URL import from the tagging spreadsheet | On hold — URLs still manual using the tool |
| Prove inbox quality in the canvas | Always run Email on Acid / device QA |

---

### What to do in practice

| If this is true | Use |
| --- | --- |
| Need a fast draft; Apple Mail / Gmail web are the main audience | **This tool** → export → Email on Acid → fix |
| Must look right in **Outlook on Windows** | **Handlebars + Gulp** master template, or flatten problem blocks |
| Mix of speed + a risky hero / footer | **This tool** for layout + **image flatten** on the broken sections |
| Need carousel / hotspot / colour selector | Handlebars or flatten — **React Email does not support these features** |

**Minimum check before we call a campaign done:** Gmail on the web, **Outlook on Windows**, Apple Mail on iPhone, **and Gmail on Android**. Use the Email on Acid link above as the picture of record for this first template.

---

## IMPORTANT

- **Email on Acid (18 August 2026) is the evidence.** Same HTML: good in Apple Mail and Gmail web; **Gmail Android works for most of the email** (body is **not** empty); **Outlook on Windows is the main issue**. Open the [shareable results](https://app.emailonacid.com/app/acidtest/CmzIgLgYBesG5ffJbfGDIHmG8sKFAEudltxEgXogdoZjz/list).
- **The five limitations** are: (1) Outlook Windows layout, (2) desktop + mobile images both showing, (3) **React Email does not support carousel / colour selector / hotspot**, (4) dark mode differs by app, (5) tool preview ≠ inbox.
- **Do not sign off from the builder preview alone.**
- **25–30 minutes = one simpler component** (previously ~**2–2.5 hours** for new components), not the whole template.
- **Full template layout:** about **4.5–6 h → 2–3 h** target (~**2 h** end-to-end); URLs are **still manual using the tool**.
- Accelerator (Handlebars + Gulp) is still the path that is **already proven in Outlook**.

**TIP**  
Build in the tool → export → open Email on Acid → fix Outlook Windows first → then wider sign-off.
