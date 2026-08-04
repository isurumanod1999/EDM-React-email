# Next plans — Client QA

Last updated: 2026-08-04  
Status: **pending** (not started in code)

Slides: [demo-diagrams.html](./demo-diagrams.html) → **What's next**, **Render in clients**, **Add & test URLs**.

---

## Why this is next

The builder can compose emails from the registry and from Figma. That path is validated in the **browser preview** only.

**Client QA** means two things we still must do:

1. **Render QA** — how templates look in real email clients on desktop and mobile (every device we care about)
2. **Add URLs & test them** — get campaign URLs from the tagging doc into the email, then click-test every link

Rendering fixes come out of render QA evidence. Infrastructure Epics F1–F4 stay deferred unless explicitly requested.

---

## 1. Render in real email clients — pending

QA how templates **render** — not only the in-app live preview.

| Item | Status |
|------|--------|
| In-app live preview (desktop/mobile) | Done |
| Optional Resend test send | Done (when configured) |
| Outlook / Gmail / Apple Mail (desktop) | **Pending** |
| iPhone + Android (real devices) | **Pending** |
| Other clients as needed (Yahoo, etc.) | **Pending** |
| Litmus / Email on Acid (optional matrix) | **Pending** |
| Per-client screenshot + defect log | **Pending** |

### What we check

Layout, spacing, images, fonts, buttons, dark mode, clipping / broken CSS — against Figma. Screenshot + ticket each issue; then fix in the builder and re-QA.

### Acceptance (when done)

- [ ] Representative template opened in at least Outlook, Gmail, and Apple Mail / iOS (desktop + mobile)
- [ ] Screenshots / notes per client-device (e.g. `docs/qa-clients/` or shared drive)
- [ ] Open defects listed with severity and proposed fix (primitives vs image flatten vs customize)
- [ ] Blockers from that log closed or explicitly deferred

---

## 2. Add URLs — then test them — pending

Figma does not supply production tracking. Builds often leave `#` / empty hrefs and generic alt.

### Add URLs (from tagging doc)

Find a way to put tagging-doc rows onto CTAs, images, logos, and text links:

| Field | Used for |
|-------|----------|
| Tracking URL (`href`, UTM, `cid`, …) | Every interactive asset |
| `_label` / link label | Analytics / click naming |
| Alt text | Images and logos |

**Planned shape (not built):** import tagging rows → match to blocks → fill `href` / label / `alt` → allow manual override in the customizer.

### Test URLs

After send / preview, **click every link** on desktop and mobile. Confirm destination and tracking params. Wrong URL = fail Client QA.

### Acceptance (when done)

- [ ] Tagging sheet format documented (columns + example rows)
- [ ] User can apply tagging URLs without hand-editing every link
- [ ] Export HTML has real tracking URLs and alt for mapped assets
- [ ] Checklist: every CTA / image / logo / text link clicked on at least one desktop and one mobile client

---

## Suggested order

1. **Render QA** (evidence on real clients / devices)  
2. **Fix what breaks** from that evidence (can overlap with URL work)  
3. **Add URLs** from tagging doc + **test every URL**

---

## Related docs

- [DEMO-PRESENTATION.md](./DEMO-PRESENTATION.md) — stakeholder talking points  
- [demo-diagrams.html](./demo-diagrams.html) — visual slides (`#next`, `#render-qa`, `#add-urls`)  
- [template-building-comparison.md](./template-building-comparison.md) — why tagging matters vs Handlebars  
- [BUILDER.md](./BUILDER.md) — current Figma / image / customize behaviour  
- [_bmad-output/planning-artifacts/HANDOFF.md](../_bmad-output/planning-artifacts/HANDOFF.md) — agent resume  
