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

## 5. Customization & fixing rendering issues (device/client-specific)

Email rendering differs across clients **and** OS/device versions (e.g. Apple Mail on iPhone 15/16/17 vs 13/14, Pixel vs iPhone, Gmail vs Outlook vs Apple Mail). A key demo question is: *when a campaign breaks in one client, can we get in and fix it?*

### The important clarification
**React Email output is fully customizable code — it is not a closed black box.** It is React/JSX that compiles to HTML, so every fix an email developer makes by hand is possible: a `<style>` block in `<Head>`, inline styles per element, VML "bulletproof" buttons, ghost tables, background-image fallbacks, and even raw-HTML escape hatches. So the claim "we can't customize React Email" is a myth.

### The genuine caveats (where the manual process still wins)
- **MSO/Outlook conditional comments** (`<!--[if mso]>…<![endif]-->`) are awkward in React Email: React can't natively emit HTML comments, so they require a small helper (e.g. `react-email-mso`) or a post-processing step. Reliable, but **less direct** than hand-written HTML.
- **The tool's generated output is not pre-hardened.** Our app emits clean React Email, but does **not** auto-inject the full suite of Outlook/VML/device hacks your master Handlebars template has accumulated. A nasty client-specific bug means a developer hardens the generated code (or we bake the fix into the generator).
- **Re-generation overwrites manual edits.** Fixes hand-applied to generated output are lost on re-import — unless the fix is made in the **mapper/template** (fix once, applies to all).
- **Pixel-perfect:** the manual process achieves it by slicing everything to images. React Email / our tool **can also be pixel-perfect** by using image slices for those sections (the tool already rasterizes complex/overlay art), but they default to live text (better accessibility) and use images only where needed.

### Side-by-side: fixing rendering issues
| Capability | Manual (Handlebars) | React Email (hand) | Our tool |
|---|---|---|---|
| Edit raw HTML directly | Yes, instantly | Yes (escape hatch / post-process) | Yes, on the **generated** output |
| MSO `<!--[if mso]>` comments | Native, easy | Possible via helper/post-process | Not auto-injected today |
| VML bulletproof buttons | Hand-written | Built into `Button`; custom possible | Inherits `Button`; custom = manual |
| Per-device/client targeted CSS | Full control | Full control | Edit generated code |
| Pixel-perfect arbitrary art | Yes (image slices) | Yes (if using image slices) | Yes (auto-rasterizes complex sections) |
| Fixes survive re-generation | N/A | N/A | Only if fixed in the mapper/template |

### Demo takeaway
The master template's real value is the **years of client/device hardening baked into it**. React Email doesn't *lack the ability* to do that — it lacks *your specific hacks* until they're ported in **once**. Port those proven fixes into the React Email layer (or the tool's output template) a single time and every generated email inherits them — combining the tool's speed with the manual process's bulletproofing.

---

## 6. Framework landscape: Handlebars vs React Email vs JSX Email (+ our tool) & ESP fit

> Incorporates an internal competitor analysis (Handlebars vs React Email vs **JSX Email**). It adds a third framework and the ESP/Adobe Campaign angle, both relevant to the demo.

### A third framework: JSX Email
Besides React Email there is also **[JSX Email](https://jsx.email)** — a community-driven JSX/TSX email framework with extra developer tooling.
- **Pros:** modern DX, native TypeScript, improved CLI, preview server, **built-in email-client compatibility checking**, CSS-support validation, spam analysis, async components/Suspense, plugin architecture, strong Tailwind support.
- **Cons:** smaller community than React Email, another framework layer, requires React/JSX expertise, more complex setup than Handlebars.
- **Best for:** SaaS / developer-focused teams (like React Email).
- **Note for us:** our tool targets **React Email** output specifically; JSX Email is listed here for completeness as the main alternative framework.

### Feature comparison (4-way)
| Feature | Handlebars (manual) | React Email | JSX Email | Our tool |
|---|---|---|---|---|
| Learning curve | Low | Medium–High | Medium–High | **Low** (to generate) |
| Requires React knowledge | No | Yes | Yes | No to generate; Yes to hand-edit output |
| Direct HTML control | **Excellent** | Limited (abstraction) | Limited (abstraction) | Limited (edit generated code) |
| Email-client workarounds | Easy | Moderate | Moderate | Moderate (inherits React Email) |
| Outlook fixes | **Easy** | Harder (abstraction) | Harder (abstraction) | Harder (edit generated code) |
| Dynamic content / personalization | Excellent | Excellent | Excellent | Manual (added post-build) |
| Component reusability | Manual | **Excellent** | **Excellent** | Excellent (React Email output) |
| TypeScript support | Optional | Native | Native | Native (output) |
| Preview environment | Depends on tooling | Built-in | Built-in | Built-in (app preview) |
| Compatibility checking | Manual / Email on Acid | Tools available | **Built-in checker** | Manual + React Email |
| Tailwind support | Custom | Supported | Strong | Via React Email |
| ESP integration | Universal | Universal (needs render pipeline) | Universal (needs render pipeline) | Universal (exports HTML) |
| Best for | **Marketing EDMs** | SaaS / transactional | SaaS / developer teams | **Fast Figma → EDM drafts** |

### ESP / Adobe Campaign fit (important for marketing EDMs)
- **Handlebars** plugs naturally into ESPs like **Adobe Campaign**, Salesforce Marketing Cloud, Acoustic, Braze, and Oracle Responsys — its tokens (`<%@ include %>`, `<%= %>`) are the personalization layer those platforms expect.
- **React Email / JSX Email** need a **rendering pipeline** to turn components into the HTML the ESP sends.
- **Our tool** exports standard HTML/React Email that you then wire with the ESP's personalization tokens (the manual step you already do).

### Risk assessment (4-way)
| Risk | Handlebars | React Email | JSX Email | Our tool |
|---|---|---|---|---|
| Email-client rendering issues | Low | Medium | Medium | Medium |
| Framework dependency risk | Low | Medium | Medium | Medium–High (React Email + tool) |
| Developer skill gap | Low | High | High | Low to generate; Medium to harden |
| Migration complexity | N/A | High | High | **Low** (additive — generates React Email) |
| Debugging complexity | Low | Medium–High | Medium–High | Medium |

### Balanced conclusion (from the competitor analysis, framed for us)
For **marketing-focused EDM production tied to Adobe Campaign**, **Handlebars currently offers the best balance** of reliability, flexibility, maintainability, and email-client control — especially when frequent Outlook/client-specific fixes are needed. **React Email and JSX Email** give a superior developer experience for React teams but don't, on their own, justify migrating away from a mature Handlebars pipeline today.

**Where our tool fits:** it isn't a competing framework to migrate to — it's an **accelerator on top of React Email** that removes the slowest, most manual step (turning a Figma design into a first working template). Use it to generate the draft fast, then keep the team's Handlebars hardening/personalization for the final, client-proof send.

### When to consider moving further toward React Email / JSX Email
- The org moves toward a **React-first** strategy.
- Email templates become **highly componentized** / a shared design system spans web + email.
- **Transactional email** becomes a bigger focus (where React Email/JSX Email shine).

---

## 7. Recommended workflow (hybrid)

The three approaches are not mutually exclusive. A pragmatic pipeline:

1. **Design in Figma** with email in mind: clean auto-layout, consistent layer names across desktop/mobile frames, components for repeated cards, and exported assets.
2. **Generate the scaffold with our tool** — get a React Email template covering hero, product/comparison cards, icon/CTA banners, and footer in minutes.
3. **Polish in React Email** — wire real tracking URLs and CRM personalization tokens, adjust any sections the heuristics misread, and reuse shared components.
4. **Apply hand-tuned email hardening where needed** — for campaigns that must be flawless in Outlook, layer in the master-template MSO nuances and verify the desktop/mobile image swap.
5. **QA across clients** before sending.

This keeps the **speed** of the tool, the **maintainability** of React Email, and the **fidelity/robustness** of the current process where it matters most.

---

## 8. Glossary
- **EDM** — Electronic Direct Mail (marketing email).
- **MSO conditionals** — `<!--[if mso]>` comments that target Microsoft Outlook's Word rendering engine.
- **Image swap (`m-hide`/`m-show`)** — showing a desktop image on wide screens and a mobile image under the breakpoint.
- **Handlebars tokens** — server-side merge fields (`<%@ include %>`, `<%= %>`) for CRM personalization.
- **React Email primitives** — `Section`, `Row`, `Column`, `Text`, `Heading`, `Img`, `Link`, `Button`, `Hr`, `Preview`, etc. (https://react.email/docs/components).
- **JSX Email** — an alternative JSX/TSX email framework (https://jsx.email) with built-in compatibility checking and tooling; a sibling to React Email.
- **ESP** — Email Service Provider / sending platform (e.g. Adobe Campaign, Salesforce Marketing Cloud, Braze) that handles personalization tokens and delivery.
- **Deterministic mapping** — same input always yields the same output (no AI/randomness).
