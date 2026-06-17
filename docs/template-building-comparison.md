# Email Template Building — Process Comparison

> A detailed comparison of three ways to build Nissan (and similar) marketing emails (EDMs):
> **(1)** the current Handlebars / hand-coded process, **(2)** building with React Email by hand (the framework, *not* our tool), and **(3)** our current tool (the Figma → React Email builder).
>
> Audience: design, dev, and marketing stakeholders evaluating how we produce templates.

---

## TL;DR

| | Current process (Handlebars + manual slicing) | React Email (framework, hand-coded) | Our tool (Figma → React Email builder) |
|---|---|---|---|
| **What it is** | Hand-built HTML email from a master Handlebars template, design sliced into images | Developers write reusable React/TSX components with `@react-email/components` | Paste a Figma URL → deterministic build into React Email components |
| **Speed to first draft** | Slow (hours–days) | Medium (hours) | Fast (minutes) |
| **Skill required** | Specialist email developer | React developer | Low (designer/marketer-friendly) |
| **Fidelity to design** | Highest (pixel-perfect) | Good (HTML-email constrained) | Good for clean Figma; complex art is rasterized |
| **Editable text** | Mostly baked into images | Real, editable text | Real text where possible; complex visuals as images |
| **Outlook robustness** | Excellent (MSO hacks) | Good (library-tested) | Good (inherits React Email) |
| **Maintainability** | Low (copy/paste HTML) | High (components, git) | High (regenerate from Figma) |
| **Personalization (CRM tokens)** | Full (Handlebars) | Manual | Manual (added post-build) |
| **Consistency / repeatability** | Variable (human) | High | Highest (deterministic) |

**Bottom line:** the current process gives maximum control at a high manual cost; React Email gives maintainable, text-first templates with developer effort; our tool gives the fastest path from design to a React Email template, best used as a strong starting point that is then polished for personalization and edge-case clients.

---

## 1. Current process — Handlebars master template + manual image slicing

### How it works
1. Designers produce the campaign in **Figma**.
2. An email developer **slices** the design into images (per section, often a desktop + a mobile variant — e.g. `hero-desk.png` / `hero-mob.png`).
3. They hand-assemble the HTML inside a mature **Handlebars master template**: nested `<table>` layout, a large utility-class CSS system (`text-size-{N}px`, `line-height-{N}px`, `padding-*`, `width-third`, `column-half`, `.drop/.block` cell-stacking, `.m-hide/.m-show`), and **MSO/Outlook conditional comments**.
4. Each visual section is wrapped in a tracking **link** (`<a href="…utm…&cid=…" _label="Hero">`), and **CRM personalization** is injected via Handlebars tokens (`<%@ include view='first_name_greeting' %>`, `<%= message.delivery.internalName %>`, `MirrorPageUrl`, `nmaLCUnsubsciptionURL`, …).
5. Responsive behavior comes from a `@media (max-width: 599px)` block plus the desktop/mobile **image swap** (`m-hide` / `m-show`).
6. The result is QA'd across many email clients.

### Pros
- **Maximum fidelity & control.** Pixel-perfect; any design (overlapping art, gradients, custom type set in the image) can be reproduced because complex sections are flattened to images.
- **Battle-tested cross-client support.** The master template's MSO conditionals and table layout render reliably in Outlook (Word engine), Gmail, Apple Mail, etc.
- **Full CRM personalization.** Handlebars tokens enable first-name greetings, mirror-page URLs, dynamic content, unsubscribe links, per-delivery tracking IDs.
- **Mature responsive system.** The utility classes + image swap handle stacking, font scaling, and padding on mobile predictably.
- **Team familiarity.** Existing, proven workflow with known QA expectations.

### Cons
- **Slow and labor-intensive.** Manual slicing + hand-coding a large HTML file per campaign takes significant time.
- **Specialist skill required.** Requires an experienced email developer comfortable with table layout and Outlook quirks.
- **Error-prone.** Editing hundreds of lines of HTML by hand invites copy/paste mistakes, broken tags, and inconsistent spacing.
- **Image-heavy = real downsides:**
  - Text baked into images is **not accessible** (screen readers), **not translatable/searchable**, and **breaks in dark mode**.
  - "Images off" (common in Outlook/corporate) shows little to nothing without good `alt` text.
  - Larger payload / slower load; risk of clipping in Gmail (102KB).
  - **Copy changes require re-slicing** images — a designer + developer round-trip for a single word.
- **Low reusability / maintainability.** Sections are copied between templates rather than composed from shared components; updates don't propagate.
- **Long QA cycles** due to hand-built markup.

### Best for
Hero/brand-led campaigns where pixel-perfect art matters more than editable text, and where the team already has the slicing + Handlebars pipeline in place.

---

## 2. React Email (the framework) — hand-coded, *not* our tool

> Building templates by writing React components directly with [`@react-email/components`](https://react.email/docs/components) (`Html`, `Head`, `Body`, `Container`, `Section`, `Row`, `Column`, `Heading`, `Text`, `Button`, `Img`, `Link`, `Hr`, `Preview`, …) and rendering them to HTML.

### How it works
1. Developers write composable TSX components (a `HeroBanner`, a `ProductCard`, a `Footer`, …).
2. They use React Email primitives that **compile to email-safe table HTML** internally, so they get cross-client output without hand-writing tables.
3. Local **preview + hot reload** speeds iteration; output is rendered to HTML at build/send time.
4. Templates live in **git**: reviewed, versioned, tested.

### Pros
- **Component-based & reusable.** Build once, reuse across campaigns; fix a bug in one place.
- **Real, editable text** by default → accessible, dark-mode friendly, translatable, smaller payload, no re-slicing for copy edits.
- **Modern developer experience.** TypeScript, props, preview server, unit-testable, code review.
- **Cross-client foundation.** The library encodes many Outlook/Gmail workarounds so devs don't reinvent them.
- **Maintainable & scalable.** A design-system of email components keeps campaigns consistent.

### Cons
- **Still requires developer effort** to translate each Figma design into components.
- **Not pixel-perfect for complex art.** Overlapping layers, free-form composition, custom rasterized typography, and vector effects can't be reproduced as live HTML — they must be exported as images anyway.
- **Outlook limits remain.** Outlook desktop ignores `@media` queries, so true mobile restyling/stacking is constrained (a fundamental HTML-email limitation, not specific to the library).
- **Manual personalization.** CRM tokens (Handlebars/ESP merge fields) must be wired in by hand.
- **Learning curve** for developers new to email constraints.
- **Asset hosting** for images is still required.

### Best for
Teams with React developers who want maintainable, text-first, component-driven templates and are willing to invest dev time per template.

---

## 3. Our current tool — Figma → React Email builder

> Paste a Figma frame URL; the app fetches the design tree + image assets and **deterministically** maps them into a React Email component tree (the `figma-react-email` block), rendered with `@react-email/components` only. (A separate screenshot/AI path also exists.)

### How it works
1. **Fetch:** the app calls the Figma REST API for the frame's node tree and exports images (no AI).
2. **Build:** a deterministic mapper (`figmaToReactEmail` → `buildPrimitivesFromFigma`) walks the Figma tree and emits React Email primitives:
   - `HORIZONTAL` auto-layout → `Row` of `Column`s (2-up / 3-up); `VERTICAL` → stacked `Section`s.
   - Text → `Heading` / `Text`; emails/phones/URLs → `Link` (`mailto:` / `tel:`).
   - Filled vs **outline** buttons detected from fill + stroke.
   - Colored banners, **bordered boxes**, and **rounded cards** preserved as `Section`s with background/border/radius.
   - Small **icons** kept at fixed size (not stretched).
   - Complex **overlay/composite** frames (e.g. a key-visual with text over a photo) are **rasterized to a single image** instead of being mis-stacked.
   - **Responsive**: desktop/mobile image swap and content-aware mobile column stacking (equal-weight grids stay multi-up; asymmetric banners stack; an explicit mobile frame overrides).
3. **Output:** a template made of **official React Email components only**, addable to the builder and exportable to HTML.

### Pros
- **Fastest path from design to template** — minutes, not hours/days.
- **Low skill barrier** — designers/marketers can generate a draft without an email developer.
- **Deterministic & repeatable** — same Figma input → same output every time; consistent across campaigns.
- **React Email output** — inherits the framework's pros: real text where possible, maintainable components, cross-client base.
- **Handles the common Nissan archetypes** out of the box: hero banners, 2/3-column product & comparison cards, icon-benefit rows, CTA banners (filled + outline), social/Instagram rows, footers.
- **Smart fallbacks** — composite art is rasterized (faithful), responsive image swap is wired automatically.
- **Reduces manual slicing** — the import exports section/asset images for you.

### Cons
- **Fidelity depends on Figma hygiene.** Needs clean **auto-layout**, consistent **layer names** (for desktop↔mobile matching), and exported assets; absolutely-positioned/loosely-structured frames map less accurately.
- **Free-form/complex effects can't be live HTML.** Overlapping text on imagery, gradients, and vectors are rasterized or skipped (e.g. small **vector icon glyphs are dropped** unless exported as PNG/`imageRef`).
- **Links & personalization aren't in Figma.** Tracking URLs (UTM/`cid`) and CRM tokens (Handlebars merge fields) are **added manually** after build — the tool can emit labeled `#` placeholders but not the real URLs.
- **Outlook media-query limits remain** (shared with all HTML email): mobile restyling/stacking only applies in clients that honor `@media`.
- **Heuristics can misclassify** unusual structures; edge cases occasionally need a code fix.
- **Setup required** — a Figma access token (or the Figma desktop plugin) and well-prepared design files.
- **Not yet a 1:1 replacement** for the hand-tuned master template's every Outlook nuance (table-cell `.drop` stacking, full MSO conditional suite).

### Best for
Rapidly turning well-structured Figma campaigns into a high-quality React Email **starting point**, which is then polished for personalization tokens, real tracking URLs, and any client-specific edge cases.

---

## 4. Side-by-side detail

### Effort & speed
| Stage | Current process | React Email (hand) | Our tool |
|---|---|---|---|
| Design → first draft | Manual slice + hand-code (hours–days) | Hand-code components (hours) | Paste URL → build (minutes) |
| Copy change | Re-slice image + re-code | Edit text in code | Edit text / re-import |
| New similar campaign | Copy/paste + rework | Reuse components | Re-import new Figma |
| QA | Long (hand-built HTML) | Medium | Medium (review generated output) |

### Quality attributes
| Attribute | Current process | React Email (hand) | Our tool |
|---|---|---|---|
| Pixel fidelity | ★★★★★ | ★★★☆☆ | ★★★★☆ (clean Figma) |
| Editable/accessible text | ★★☆☆☆ | ★★★★★ | ★★★★☆ |
| Dark-mode safety | ★★☆☆☆ | ★★★★☆ | ★★★★☆ |
| Outlook robustness | ★★★★★ | ★★★★☆ | ★★★☆☆ |
| Maintainability/reuse | ★★☆☆☆ | ★★★★★ | ★★★★☆ |
| Personalization (CRM) | ★★★★★ | ★★★☆☆ (manual) | ★★★☆☆ (manual) |
| Speed | ★★☆☆☆ | ★★★☆☆ | ★★★★★ |
| Skill barrier (lower = easier) | High | Medium | Low |

### Accessibility & deliverability
- **Current process:** image-heavy → weakest for screen readers, images-off, dark mode, and payload size; strongest for visual fidelity.
- **React Email / our tool:** text-first → better accessibility, dark mode, and smaller payload; visual-heavy sections still become images (with `alt`).

---

## 5. Recommended workflow (hybrid)

The three approaches are not mutually exclusive. A pragmatic pipeline:

1. **Design in Figma** with email in mind: clean auto-layout, consistent layer names across desktop/mobile frames, components for repeated cards, and exported assets.
2. **Generate the scaffold with our tool** — get a React Email template covering hero, product/comparison cards, icon/CTA banners, and footer in minutes.
3. **Polish in React Email** — wire real tracking URLs and CRM personalization tokens, adjust any sections the heuristics misread, and reuse shared components.
4. **Apply hand-tuned email hardening where needed** — for campaigns that must be flawless in Outlook, layer in the master-template MSO nuances and verify the desktop/mobile image swap.
5. **QA across clients** before sending.

This keeps the **speed** of the tool, the **maintainability** of React Email, and the **fidelity/robustness** of the current process where it matters most.

---

## 6. Glossary
- **EDM** — Electronic Direct Mail (marketing email).
- **MSO conditionals** — `<!--[if mso]>` comments that target Microsoft Outlook's Word rendering engine.
- **Image swap (`m-hide`/`m-show`)** — showing a desktop image on wide screens and a mobile image under the breakpoint.
- **Handlebars tokens** — server-side merge fields (`<%@ include %>`, `<%= %>`) for CRM personalization.
- **React Email primitives** — `Section`, `Row`, `Column`, `Text`, `Heading`, `Img`, `Link`, `Button`, `Hr`, `Preview`, etc. (https://react.email/docs/components).
- **Deterministic mapping** — same input always yields the same output (no AI/randomness).
