# EDM React Email Tool — A-to-Z Guide

An internal builder that turns component blocks and Figma frames into React Email HTML, then exports a ready-to-hand-over package of HTML plus images.

**Audience:** Clients, delivery leads, technical leads, developers, designers, and QA  
**Last updated:** 31 August 2026

---

## 1. Contents

### Part 1 — The product

| § | Section |
| --- | --- |
| 2 | Executive summary |
| 3 | Product status at a glance |
| 4 | When to use this tool |
| 5 | End-to-end campaign workflow |
| 6 | Access and prerequisites |

### Part 2 — Building an email

| § | Section |
| --- | --- |
| 7 | Template gallery |
| 8 | Editor layout |
| 9 | Template-level settings |
| 10 | Canvas operations |
| 11 | Built-in component library |
| 12 | Reusable component library |
| 13 | Figma workflow |
| 14 | Screenshot/AI import |
| 15 | Editing built-in components |
| 16 | Editing imported Figma components |
| 17 | React Email JSX code editor |
| 18 | Live preview |

### Part 3 — Shipping and quality

| § | Section |
| --- | --- |
| 19 | URLs and tagging |
| 20 | Test email |
| 21 | Export |
| 22 | Feature boundaries and known limitations |
| 23 | QA and release checklist |
| 24 | Recorded performance context |

### Part 4 — Technical reference

| § | Section |
| --- | --- |
| 25 | Technology stack |
| 26 | Architecture |
| 27 | Data model and persistence |
| 28 | API reference |
| 29 | Configuration |
| 30 | Security and deployment posture |
| 31 | Developer commands |
| 32 | Troubleshooting |
| 33 | Demonstration plan for clients and technical leads |
| 34 | Roadmap and deferred capabilities |
| 35 | Glossary |
| 36 | Reference evidence |
| 37 | Final rules of use |

### Suggested reading routes

| Reader | Route |
| --- | --- |
| Client or delivery lead | 2 → 4 → 5 → 22 → 23 |
| Designer or email builder | 5 → 7 → 13 → 16 → 21 → 23 |
| Technical lead | 26 → 27 → 28 → 29 → 30 → 31 |
| Running a live demo | 33 |

---


## 2. Executive summary

The EDM React Email Tool is an internal web application for assembling responsive email templates from reusable blocks and Figma designs. It converts the resulting template into React Email HTML, provides a browser preview, exports a ZIP containing the HTML and local images, and can send test messages through Resend.

The tool is designed to reduce repetitive hand-coding while keeping the email editable. It supports three main ways to create content:

1. add a built-in email component from the palette;
2. import a Figma frame as editable React Email content or as a flattened image;
3. reuse a previously saved and customized canvas block from the shared component library.

The current implementation is an internal, filesystem-backed modular monolith. It does not yet have user authentication, cloud storage, or production multi-user data management.

### Current value

- Faster assembly of common EDM sections.
- Reusable, editable components instead of rebuilding each campaign from zero.
- Direct Figma-to-email workflow with desktop and optional mobile references.
- A visual editor and an advanced React Email JSX editor over the same template data.
- Browser preview, downloadable HTML package, and test-send capability.
- Guardrails for unsaved changes, invalid code, failed imports, and component deletion.

### Current production caveat

The browser preview is not an inbox certification tool. Exported emails must still be tested in the agreed email-client matrix. The first recorded Email on Acid run showed good results in Apple Mail and Gmail web, while Outlook on Windows remained the main rendering risk.

---

## 3. Product status at a glance

| Capability | Status | Notes |
| --- | --- | --- |
| Template gallery and editor | Available | Create, search, sort, edit, duplicate, and delete |
| Drag-and-drop component builder | Available | Mouse, double-click, and keyboard insertion |
| Built-in component registry | Available | Layout, promotional, newsletter, transactional, and product modules |
| Shared reusable component library | Available | Save any canvas block as a snapshot and reuse it |
| Figma fetch and review | Available | Desktop frame required; mobile frame optional |
| Figma editable build | Available | Converts supported designs into React Email blocks/primitives |
| Figma image build | Available | Flattens a selected frame when fidelity is more important than editability |
| Batch Figma import | Available | Bounded concurrency; multiple rows/components |
| Screenshot-to-component AI import | Available when configured | Ollama or Gemini |
| Desktop/mobile customization | Available for Figma blocks | Separate mobile style/content overrides |
| React Email JSX code editor | Available | Valid edits apply back to the canvas |
| URL tagging spreadsheet workflow | Implemented but on hold | URLs should currently be reviewed and applied manually |
| Live browser preview | Available | Useful for composition, not final inbox sign-off |
| Test email send | Available when configured | Uses Resend |
| HTML and image ZIP export | Available | One HTML file plus `img/` assets |
| Authentication | Not implemented | Internal/open mode only |
| PostgreSQL, S3, worker queue | Deferred | Filesystem/local storage is the current implementation |

---

## 4. When to use this tool

Use the tool when:

- a campaign is built from standard email sections;
- the design needs fast conversion from Figma to an editable email;
- teams want to reuse approved/customized blocks across campaigns;
- Gmail and Apple Mail are important targets and the campaign will receive normal inbox QA;
- complex sections can be flattened to an image where necessary;
- the output needs to be handed over as HTML plus image assets.

Use the existing Handlebars/Gulp path, or agree a hybrid approach, when:

- pixel-accurate Outlook for Windows rendering is mandatory before this tool’s output has been hardened for that design;
- the campaign requires carousel, colour-selector, or hotspot interaction;
- a complex layout cannot be reproduced reliably with email-safe tables and React Email primitives;
- a production-grade authenticated, cloud-hosted, multi-user workflow is required.

### Practical decision guide

| Requirement | Recommended path |
| --- | --- |
| Fast editable draft from a standard Figma layout | This tool, editable/design mode |
| Visually complex hero or decorative panel | This tool, with selected image exports or image flatten |
| Outlook-critical campaign | This tool plus flattening and full QA, or the proven Handlebars path |
| Carousel, colour picker, or hotspot | Static alternative, image flatten, or Handlebars solution |
| Repeatable header, offer card, legal section, or CTA | Save to the reusable component library |
| Production sign-off | Export, send/test, then run the agreed real-client or Email on Acid matrix |

---

## 5. End-to-end campaign workflow

```text
Create/Open template
        ↓
Add built-in, reusable, Figma, or screenshot-derived blocks
        ↓
Customize content, images, spacing, colours, and mobile overrides
        ↓
Review desktop/mobile browser preview
        ↓
Add and verify URLs
        ↓
Save → Export ZIP and/or send test email
        ↓
Run inbox QA (especially Outlook on Windows)
        ↓
Fix or flatten problem sections → re-test → approve
```

### Recommended working sequence

1. Prepare the Figma frames and campaign content.
2. Open the template gallery at `/builder`.
3. Create a new template or duplicate a suitable existing template.
4. Set the template name, description, category, preview text, and email background.
5. Add standard blocks from the component palette.
6. Import desktop and, where available, mobile Figma frames.
7. Choose editable **Design** mode or **Image** mode for each imported section.
8. Review import warnings and the generated preview before adding blocks to the canvas.
9. Reorder, duplicate, remove, and customize blocks.
10. Save stable campaign-specific modules to the reusable component library if they will be reused.
11. Review both desktop and mobile views.
12. Add URLs and alt text manually. The spreadsheet-assisted tagging feature exists but is currently considered on hold for production use.
13. Save the template.
14. Export the ZIP or send a test email.
15. Test the exact exported/sent HTML in the required inboxes.
16. Fix or flatten affected sections and repeat the QA pass.

---

## 6. Access and prerequisites

### Application URLs

- Home: `http://localhost:3000/` — shortcuts, saved-template cards, and legacy demo links
- Template gallery: `http://localhost:3000/builder`
- Template editor: `http://localhost:3000/builder/{template-id}`
- React Email legacy preview environment: `http://localhost:3005/` after `npm run email:dev`

### Minimum local setup

- Node.js and npm compatible with the project.
- Repository access.
- Local filesystem write access for templates, reusable components, and uploaded images.

### Optional integrations

| Feature | Requirement |
| --- | --- |
| Fetch/build from Figma | `FIGMA_ACCESS_TOKEN` |
| Local screenshot/AI analysis | Ollama running, normally with `llava:latest` |
| Gemini screenshot/AI analysis | `AI_PROVIDER=gemini` and `GEMINI_API_KEY` |
| Send test email | `RESEND_API_KEY` |
| Custom verified sender | `RESEND_FROM` and a verified Resend domain |

### Quick start

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open `http://localhost:3000/builder`.

On macOS/Linux, use `cp .env.example .env.local` instead of `copy`.

---

## 7. Template gallery

The gallery is the entry point for template management.

### Available actions

- **New Template** — creates an empty newsletter template and opens it.
- **Edit** — opens an existing template.
- **Duplicate** — creates an independent copy and opens it.
- **Delete** — permanently removes the selected template after confirmation.
- **Search** — searches template names and descriptions.
- **Sort** — recently updated, oldest updated, name A–Z, or name Z–A.
- **Retry** — shown when loading fails.

Each gallery card shows the template’s category and summary information. Long-running actions disable the affected controls and report success or failure using toast notifications.

### Recommended use

- Create a new template for a genuinely new structure.
- Duplicate an approved template for a campaign variant.
- Use clear campaign/version names so exported filenames and QA references are understandable.
- Treat delete as permanent; the filesystem implementation does not provide a recycle bin.

---

## 8. Editor layout

### Desktop

```text
Toolbar: Template name | Advanced | Import | Tagging | Code | Send | Export | Duplicate | Save
---------------------------------------------------------------------------------------------
Components palette | Canvas and live preview | Properties
                   |                         | Figma customizer drawer when active
```

### Mobile and tablet

At widths of 900 px or less, **Components**, **Canvas**, and **Properties** are available through a bottom navigation pattern. Components and properties open as drawers while the canvas/preview remains the main work area.

### Editor regions

1. **Toolbar** — template-level actions and import/export workflows.
2. **Components palette** — built-in and reusable blocks.
3. **Canvas** — block order and block-level actions.
4. **Live preview** — debounced browser rendering of the current template.
5. **Properties** — template metadata or registry-defined block fields.
6. **Figma customizer** — node-level editing for imported Figma React Email blocks.

---

## 9. Template-level settings

When no canvas block is selected, the Properties panel exposes:

- template description;
- template category;
- preview/preheader text;
- overall email background colour.

The template name is edited directly in the toolbar.

### Template categories

- Promotional
- Newsletter
- Transactional
- Product Showcase
- Layout

The persisted template also carries a 600 px default container width and timestamps.

---

## 10. Canvas operations

Each block on the canvas can be:

- selected for editing;
- dragged to a new position;
- saved to the reusable component library;
- duplicated with a fresh block ID;
- removed after confirmation.

### Keyboard support

- Palette items can be focused and added with **Enter**.
- Canvas blocks can be selected with **Enter** or **Space**.
- Accessible modals support labelled controls, focus handling, and **Escape** where safe.

### Unsaved-change protection

- The toolbar shows an **Unsaved** indicator.
- Manual save writes the current template.
- Auto-save runs after 45 seconds when there are changes.
- Closing the browser tab with unsaved changes triggers a browser warning.
- Returning to the template gallery asks for confirmation when the template is dirty.
- Duplicating from the editor also checks for unsaved changes.

---

## 11. Built-in component library

The built-in registry is the source of truth for standard canvas blocks. Components are grouped by use case and provide default content plus editable fields.

### Built-in component catalogue

| Category | Components | Typical use |
| --- | --- | --- |
| Layout | Header, Section Title, Divider, Image Block, Spacer | Structure, branding, separators, images, spacing |
| Promotional | Promo Block, CTA Banner, Three Col Icon, Hero Banner, Button Row, Stats Row | Offers, calls to action, hero content, feature summaries |
| Newsletter | Intro Copy, Testimonial, Text Block | Greeting, narrative content, customer quote, rich text |
| Transactional | Order Card | Label/value order or account details |
| Product Showcase | 2-Col Dual CTA, Two Col Stacked, One Col Product | Product cards, pricing, dual actions |

The internal **Figma React Email** component renders imported AST content but is hidden from the normal palette.

### Common editable field types

- plain text;
- rich text/HTML;
- URL;
- image upload or image URL;
- number;
- colour;
- boolean;
- select list;
- advanced JSON for structured rows or social links.

Enable **Advanced** in the toolbar to reveal advanced fields such as raw structured arrays and imported AST data.

### Adding a component

Use any of these methods:

- drag it from the palette to the canvas;
- double-click the palette item;
- focus it and press **Enter**.

---

## 12. Reusable component library

The **Reusable Components** palette section is a shared installation-wide library. It stores independent snapshots of configured canvas blocks.

### Save a canvas block

1. Find the block on the canvas.
2. Click **＋ Add to components**, immediately before Duplicate.
3. Enter a required unique name.
4. Optionally add a description.
5. Confirm the save.

The saved item captures the block’s component type, version, props, label, category, and timestamps. The source canvas block is not converted into a linked placement.

### Reuse a saved component

Drag, double-click, or press **Enter** on the reusable palette item.

Every placement receives:

- a new block ID;
- a deep clone of the saved props;
- `sourceSavedComponentId` provenance.

Editing one placement does not update the saved snapshot or other placements.

### Delete a reusable component

Use the reusable item’s delete control and confirm the named item.

Deletion is blocked when:

- the open canvas contains a placement from the reusable item; or
- any saved template contains a placement from that item.

Remove those placements and save the affected templates before retrying. Built-in components cannot be deleted.

### Current reusable-library boundaries

- Names are unique without regard to letter case.
- There is no rename/version-history workflow.
- Saving again creates a separate snapshot; it does not update earlier placements.
- Deleting a snapshot does not garbage-collect referenced uploaded images.
- The library is shared by everyone using the same installation because authentication and per-user ownership do not yet exist.

---

## 13. Figma workflow

Figma integration is available from **Import** in the editor toolbar.

### 13.1 Prepare the Figma design

For the best results:

- use a node-specific Figma design URL containing `node-id`;
- keep the main desktop section close to a 600 px email width;
- provide an optional mobile frame for responsive intent;
- use clear semantic layer names such as Header, Hero, CTA, Footer, Image, or Product;
- keep text as text when it must remain editable;
- identify decorative/complex groups that should be images;
- avoid unsupported web-only interactions;
- review nested frames for their own fills, padding, and corner radius;
- ensure the Figma token can access the file.

### 13.2 Fetch from Figma

1. Select **Import → Fetch from Figma**.
2. Paste the desktop frame URL.
3. Optionally paste the mobile frame URL.
4. Choose the intended build style:
   - **Design** for editable React Email content;
   - **Image** for a flattened visual result.
5. Optionally add a build hint.
6. Fetch and review the returned file/frame information.
7. Continue to the build step.

Fetch only retrieves and reviews the design data. It does not add blocks to the canvas until the build result is confirmed.

### 13.3 Build as editable design

Editable design mode converts the Figma node tree into:

- known registry components when the design safely matches one; or
- React Email primitives in a `figma-react-email` block.

Registry matching uses layer names and known component IDs, with content checks to avoid accepting a match that would discard text, images, or buttons.

### 13.4 Mixed design/image mode

An editable build can still rasterize selected subtrees:

- auto-detected badge/icon/image candidates;
- nodes discovered from design-context hints;
- manually selected image nodes;
- AI-suggested image nodes when the classifier is configured.

This is useful for keeping copy and buttons editable while converting visual artwork that cannot be reproduced reliably with email-safe CSS.

### 13.5 Build as image

Image mode exports the selected Figma component as an image-backed email block. Use it when:

- exact visual fidelity is more important than editable text;
- the section contains decorative overlaps, masks, effects, or unsupported interaction;
- an imported section fails in Outlook or another required client;
- nested layout conversion requires too much manual correction.

Trade-offs include reduced accessibility, reduced text editability, and text potentially becoming unreadable when images are blocked.

### 13.6 Review the result

The build result can include:

- confidence;
- reasoning;
- one or more generated blocks;
- mapping mode;
- warnings;
- preview HTML.

Review warnings and the preview before adding the result to the canvas.

### 13.7 Batch import

Batch Import accepts multiple rows, each with:

- optional label;
- desktop Figma URL;
- optional mobile Figma URL;
- Design or Image mode;
- automatic image detection;
- optional image instructions.

Imports run with bounded concurrency (up to three at a time) to avoid overwhelming the development server. Each row reports idle, importing, ready, or error status. Successful rows can then be added to the canvas together.

---

## 14. Screenshot/AI import

Screenshot Upload provides a fallback when Figma node data is unavailable or when the team wants AI-assisted component recognition.

### Workflow

1. Upload a desktop screenshot.
2. Optionally upload a mobile screenshot.
3. Add a short structural hint.
4. Run analysis.
5. Review confidence, reasoning, mapped blocks, and preview.
6. Add the result to the canvas.

### Providers

- **Ollama** — local, with configurable base URL and vision model.
- **Gemini** — remote, selected by `AI_PROVIDER=gemini`.

### Important AI caveats

- AI output is probabilistic and must be reviewed.
- A provider outage or missing model disables this workflow but does not disable normal builder use.
- Sensitive client screenshots should only be sent to a provider approved by the organization.
- Screenshot analysis cannot recover semantic structure with the same certainty as clean Figma node data.

---

## 15. Editing built-in components

Select a built-in block and use the Properties panel. Fields are grouped by purpose, normally:

- Content;
- Layout;
- Style;
- Links;
- Advanced.

Typical edits include:

- text and rich text;
- image and logo **URL** (property fields accept a pasted or typed URL; file upload is used in Screenshot Import);
- image dimensions and alt text;
- CTA text and URL;
- section/card backgrounds;
- text colour and alignment;
- spacing and width;
- structured products, statistics, order rows, or social links.

The exact fields depend on the selected component definition.

---

## 16. Editing imported Figma components

Selecting a `figma-react-email` block opens the **Customize component** drawer.

### Layer navigation

- Browse the generated React Email node tree.
- Select a node from the layers list.
- Select editable nodes directly from the live preview.
- Duplicate or delete non-root elements.

### Desktop and mobile editing

Use the viewport toggle:

- **Desktop** edits the base `style`.
- **Mobile** edits `mobileStyle` overrides for screens at or below 600 px.

Mobile values are derived from desktop styles plus automatic typography scaling until explicitly overridden.

### Supported node-level controls

Depending on node type, the customizer can edit:

- content, labels, and rich text;
- desktop and separate mobile content;
- font size, weight, line height, and letter spacing;
- text alignment and text transform;
- text and background colours;
- padding and margin;
- heading level;
- link/button URL;
- button width, alignment, colours, and corner radius;
- image source, alt text, optional link, width, and alignment;
- spacer height;
- divider colour and thickness;
- section/container background, corner radius, and content alignment.

### Global imported-block controls

Advanced fields also allow:

- hiding all imported borders;
- overriding imported border colours;
- inspecting/editing the serialized React Email AST.

---

## 17. React Email JSX code editor

The **Code** action opens a full-screen representation of the template as a constrained React Email JSX document.

### Capabilities

- Code-only or split code/preview layout.
- Adjustable editor/preview split.
- Font-size controls.
- Line wrapping preference.
- Syntax highlighting and editor diagnostics.
- Reformat to the canonical format.
- Reset from the current canvas.
- Selection synchronization between canvas nodes and code spans.
- Debounced valid changes applied back to the canvas.
- Invalid changes kept in the editor without replacing the last valid canvas state.

### Safety model

This is not an unrestricted JavaScript runtime. The parser accepts the tool’s supported JSX projection and literal values. It does not execute arbitrary code, imports, functions, or expressions.

Use the visual editor for common changes. Use Code when a technical user needs faster structural edits across blocks or precise AST changes.

---

## 18. Live preview

The preview renders the current template through the same server-side React Email rendering route used by export/send.

### Behaviour

- Changes trigger a debounced refresh.
- The previous preview dims while a new render is pending.
- A spinner communicates stale/re-rendering state.
- Render failures show a retry option.
- Figma-imported nodes can expose editor selection hooks in editable preview mode.

### What preview proves

- the current template can be rendered by the application;
- broad layout, content, and asset composition;
- desktop/mobile intent within the browser viewport.

### What preview does not prove

- Outlook for Windows compatibility;
- Gmail/Apple Mail transformations;
- dark-mode behaviour;
- final image blocking, proxying, or CDN behaviour;
- deliverability;
- accessibility in every mail client.

---

## 19. URLs and tagging

### Current production recommendation

Add and verify links manually using the relevant component properties or Figma-node link controls. The spreadsheet-assisted workflow is implemented, but its matching/review experience is currently on hold for production use.

### Implemented spreadsheet workflow

The Tagging panel can:

1. upload an `.xlsx` file;
2. parse `FINAL URL`, `URL Label`, and optional `Alt Text`;
3. discover linkable targets in the template;
4. propose label-to-target matches;
5. allow manual rematching or clearing;
6. confirm and apply mappings;
7. save the updated template;
8. provide a desktop/mobile checklist for applied links (session-only; not stored on the template).

### Matching rules

- `URL Label` is used for matching.
- `FINAL URL` is written to the target.
- `Alt Text` is written when a paired image target supports it.
- The visible CTA label is not replaced by `URL Label`.
- Mirror/unsubscribe CRM include rows, empty URLs, and non-HTTP URLs may be skipped.
- Partial application is allowed and can report warnings.

### Required manual review

- Confirm each link points to the intended CTA/image.
- Check desktop and mobile variants.
- Verify unsubscribe, privacy, preference, and social links.
- Check exported HTML, not only in-editor state.

---

## 20. Test email

The **Send email** action renders the current canvas and sends it through Resend.

### Inputs

- one or more recipients separated by commas, spaces, or semicolons;
- optional subject (template name is the fallback).

### Requirements and constraints

- At least one canvas block.
- Valid recipient addresses.
- `RESEND_API_KEY`.
- With the default `onboarding@resend.dev` sender, Resend generally restricts delivery to the verified account email.
- For broader delivery, verify a domain and configure `RESEND_FROM`.
- Configure `PUBLIC_BASE_URL` when test emails must resolve local image URLs from a reachable host.

A successful API response is not inbox sign-off; check delivery, spam placement, images, links, and rendering.

---

## 21. Export

**Export** downloads a ZIP generated from the current canvas, including unsaved edits.

### ZIP structure

```text
sanitized-template-name.zip
├── sanitized-template-name.html
└── img/
    ├── bundled-image-1.ext
    └── bundled-image-2.ext
```

The export pipeline:

1. renders the React Email template to HTML;
2. applies email-output enhancements;
3. discovers and downloads bundleable images;
4. rewrites image references to the local `img/` paths;
5. wraps/formats the HTML;
6. creates a compressed ZIP.

### Export checks

- Export is disabled for an empty canvas.
- The client verifies an `application/zip` response and a non-empty file.
- The filename is sanitized from the template name.
- Images that cannot be fetched or bundled require review in the resulting HTML/package.

### Handover expectation

The ZIP is a build artifact, not a QA certificate. Preserve the exact exported package used for review so fixes and screenshots can be traced to the same HTML.

---

## 22. Feature boundaries and known limitations

### 22.1 Outlook for Windows

The current React Email output is not guaranteed to match the design in Outlook for Windows. The recorded Email on Acid run showed issues including duplicated logos/images, incorrect sizing or cropping, and extra space.

**Workarounds:**

- flatten the affected section;
- simplify the design;
- use one image/layout variant across clients;
- add Outlook-specific hardening outside the current generic conversion path;
- use the existing Handlebars/Gulp implementation for Outlook-critical work;
- always re-test after a change.

### 22.2 Desktop and mobile assets can conflict

Responsive email often uses client-dependent CSS to choose desktop or mobile content. Some Outlook versions can ignore those rules and show both variants or the wrong variant.

**Workarounds:** use one universal image, flatten the section, or validate dual variants in the complete client matrix.

### 22.3 Complex multi-column conversion

Some two-column and three-column Figma layouts still require manual correction. Auto-layout nesting, mixed fixed/flexible widths, alignment, and desktop/mobile reflow can be interpreted differently by email-safe table layouts.

**Workarounds:** use a known registry component, simplify the Figma structure, customize the generated AST, or flatten the section.

### 22.4 Nested backgrounds and border radius

Nested Figma frames can carry separate outer and inner fills plus an inner corner radius. These values may be present in Figma data but may not always survive wrapper collapsing and primitive conversion exactly as designed.

**Impact:** the imported section may lose the outer background, inner panel background, or rounded inner container.

**Workarounds:** edit the Section/Container background and corner radius in the Figma customizer, use Code view for the generated node, or flatten the component. This is a known import-fidelity area, not an export-button failure.

### 22.5 Unsupported interactive components

React Email does not provide native components for:

- carousel;
- colour selector;
- hotspot interaction.

These cannot be represented as normal editable React Email components in this tool.

**Workarounds:** provide a static image/CTA alternative, flatten the visual section, or use another established email implementation where applicable.

### 22.6 Dark mode

Mail clients apply different dark-mode transformations. Backgrounds, logos, grey panels, and button contrast can vary even when the light-mode layout is correct.

**Workaround:** design defensively and test dark-mode variants in the target clients.

### 22.7 Browser preview is not inbox rendering

The in-tool preview uses a browser engine. Outlook, Gmail, and Apple Mail can rewrite or render HTML differently.

**Rule:** never approve a campaign from the builder preview alone.

### 22.8 Tagging spreadsheet workflow is on hold

The feature exists, but automatic matching and panel reliability are not currently considered production-ready. Links remain a manual responsibility.

### 22.9 AI output is non-deterministic

Screenshot analysis and image-node suggestions can vary by model/provider and may be unavailable.

**Rule:** review all generated blocks, content, assets, links, and responsive behaviour.

### 22.10 Image flatten trade-offs

Flattening improves visual consistency but:

- makes text non-editable;
- reduces accessibility;
- prevents natural text reflow;
- can produce large assets;
- can fail when images are blocked;
- requires accurate alt text and link wrapping.

### 22.11 Internal deployment only

The current open mode has no login or user ownership. The application must not be exposed publicly in this state.

### 22.12 Local persistence

Templates, reusable components, and uploads are local files. There is no built-in:

- database transaction model;
- cloud backup;
- multi-user conflict resolution;
- audit history;
- recycle bin;
- automated asset garbage collection.

---

## 23. QA and release checklist

### Content

- [ ] Template name, subject, and preview text are correct.
- [ ] All visible copy matches approved content.
- [ ] Personalization/CRM tokens are preserved.
- [ ] Legal text and required disclaimers are present.
- [ ] Desktop and mobile-specific copy are intentional.

### Images and accessibility

- [ ] Image source is correct and reachable.
- [ ] Every meaningful image has useful alt text.
- [ ] Decorative images do not create misleading alt text.
- [ ] Flattened sections remain understandable when images are blocked.
- [ ] Logos, icons, and hero images have appropriate dimensions.

### Links

- [ ] Every CTA and linked image points to the final URL.
- [ ] Social links are correct.
- [ ] Privacy, preference, mirror, and unsubscribe handling is correct.
- [ ] Desktop and mobile versions use the intended URLs.
- [ ] Tracking parameters are approved.

### Layout

- [ ] Browser desktop preview reviewed.
- [ ] Browser mobile preview reviewed.
- [ ] No unintended duplicate desktop/mobile images.
- [ ] Backgrounds, nested card fills, borders, and corner radius match intent.
- [ ] Complex columns stack or remain aligned as expected.
- [ ] Long copy and long CTA labels have been tested.

### Inbox matrix

At minimum, test:

- [ ] Gmail web;
- [ ] Outlook on Windows;
- [ ] Apple Mail on iPhone;
- [ ] Gmail on Android.

Add client-specific required versions and dark-mode variants to the campaign test plan.

### Artifact and approval

- [ ] Save the template.
- [ ] Export the final ZIP.
- [ ] Test the exact final HTML.
- [ ] Record test evidence and defects.
- [ ] Re-export and re-test after fixes.
- [ ] Obtain client/QA approval against the final artifact.

---

## 24. Recorded performance context

These figures are working observations/targets, not a service-level guarantee:

| Work item | Previous process | Current observation/target |
| --- | --- | --- |
| New simpler component | Approximately 2–2.5 hours | Approximately 25–30 minutes |
| Full template layout | Approximately 4.5–6 hours | Target approximately 2–3 hours |
| URLs/tracking | Manual | Still manual in the current production recommendation |

Time varies with Figma quality, component complexity, content readiness, supported-client requirements, and the number of QA/fix rounds.

---

# Technical reference

## 25. Technology stack

- Next.js 14 App Router
- React 18
- TypeScript
- React Email components and renderer
- Zustand client state
- Zod runtime validation
- dnd-kit drag and drop
- CodeMirror/Acorn JSX editing pipeline
- JSZip export packaging
- Sharp image processing
- ExcelJS tagging workbook parsing
- Resend email delivery
- Ollama or Google Gemini for optional AI
- Vitest tests

---

## 26. Architecture

The application is a modular monolith using ports and adapters.

```text
Browser UI (src/builder)
        ↓ fetch
Next.js route handlers (src/app/api)
        ↓
Application/domain services (src/lib)
        ↓
Ports/interfaces (src/lib/ports)
        ↓
Filesystem and local-asset adapters (src/lib/adapters)
        ↓
data/*.json and public/images/uploads
```

### Core rules

- Route handlers validate/request-shape, call services, and shape responses.
- Business persistence goes through repository/asset ports.
- `src/lib/container.ts` is the composition root.
- Zod validation occurs before persistence side effects.
- API errors include a correlation ID.
- Secrets remain server-side.
- Expensive routes are rate-limited and body-size constrained.

### Important modules

| Path | Responsibility |
| --- | --- |
| `src/app/builder/` | Gallery and editor pages |
| `src/builder/` | Builder UI, state, hooks, utilities, modals |
| `src/components/email/` | React Email component implementations |
| `src/lib/registry/definitions.ts` | Built-in palette definitions and editable fields |
| `src/lib/render/DynamicEmailTemplate.tsx` | Dynamic React Email rendering |
| `src/lib/figma/` | Figma fetch, parse, mapping, primitive conversion, asset resolution |
| `src/lib/codeview/` | JSX projection, parsing, canonicalization, selection indexing |
| `src/lib/tagging/` | Link-target discovery, spreadsheet matching, apply logic |
| `src/lib/export/` | HTML enhancement, image bundling, ZIP generation |
| `src/lib/templates/` | Template service/factory |
| `src/lib/saved-components/` | Reusable snapshot service and placement logic |
| `src/lib/ports/` | Repository and storage contracts |
| `src/lib/adapters/` | Filesystem template/snapshot and local asset implementations |
| `src/lib/container.ts` | Adapter binding/composition root |
| `src/lib/config.ts` | Validated environment configuration |
| `src/middleware.ts` | Access seam, correlation IDs, limits, legacy route handling |
| `src/instrumentation.ts` | Startup exposure guard |

---

## 27. Data model and persistence

### Templates

Stored as:

```text
data/templates/{template-id}.json
```

A template contains:

- schema version;
- ID, name, description, category, and optional tags;
- email metadata;
- ordered blocks;
- creation/update timestamps;
- optional duplication provenance.

Each block contains:

- instance ID;
- component ID and version;
- props;
- optional label;
- optional reusable-component provenance.

### Reusable components

Stored as:

```text
data/saved-components/{saved-component-id}.json
```

Snapshots contain component identity/version, deep-cloned props, name, description, category, label, and timestamps. The source canvas block ID is intentionally excluded.

### Uploaded/generated assets

Stored under:

```text
public/images/uploads/
```

Current deletion operations do not automatically identify and remove orphan assets.

### Generated Figma debug data

When Figma debug mode is enabled, diagnostic payloads may be written under:

```text
data/figma-debug/
```

These can contain campaign structure and should be handled according to project data policy.

---

## 28. API reference

All routes are under `/api`.

### Templates

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/templates` | List template summaries |
| POST | `/api/templates` | Create a default or supplied template |
| GET | `/api/templates/{id}` | Read a complete template |
| PUT | `/api/templates/{id}` | Update a template |
| DELETE | `/api/templates/{id}` | Delete a template |
| POST | `/api/templates/{id}/duplicate` | Duplicate a template |

### Reusable components

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/saved-components` | List snapshots newest first |
| POST | `/api/saved-components` | Create a snapshot |
| GET | `/api/saved-components/{id}` | Read a snapshot |
| DELETE | `/api/saved-components/{id}` | Delete when no saved template uses it |

### Registry

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/registry` | Return component definitions grouped for the palette |

### Render, export, and delivery

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/email/render` | Render blocks/template to HTML; editable mode supports preview selection |
| POST | `/api/email/export` | Return ZIP with HTML and bundled images |
| POST | `/api/email/send` | Render and send a test message via Resend |
| GET | `/api/email/{template}` | Legacy static demo endpoint when enabled |

### Assets

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/assets/upload` | Upload PNG, JPEG, WebP, or GIF, maximum 10 MB |

### Figma

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/figma/import` | Fetch desktop/mobile Figma frame data |
| POST | `/api/figma/build-email` | Convert fetched nodes into email blocks |
| POST | `/api/figma/import-build` | Combined import/build for batch rows |
| POST | `/api/figma/classify-image-nodes` | Optional soft-fail AI image-node suggestions |

### AI

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/ai/status` | Check local Ollama availability |
| POST | `/api/ai/analyze-component` | Analyze screenshots into blocks |
| POST | `/api/ai/build-react-email` | AI-assisted React Email build |

### Tagging

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/tagging/parse` | Parse campaign `.xlsx` tagging rows |
| POST | `/api/tagging/apply` | Apply confirmed URLs/alt text and save template |

### Error shape

```json
{
  "error": "Human-readable message",
  "code": "machine_code",
  "correlationId": "request-correlation-id"
}
```

Common codes include validation, not found, payload too large, rate limited, duplicate reusable name, component in use, missing configuration, and internal error.

---

## 29. Configuration

Create `.env.local` from `.env.example`. Never commit credentials.

| Variable | Default/requirement | Purpose |
| --- | --- | --- |
| `AUTH_MODE` | `open` | Internal access posture; `enforced` fails closed until auth exists |
| `HOST` | `localhost` | Checked by the exposure guard |
| `STORAGE_DRIVER` | `filesystem` | Current template/snapshot storage |
| `ASSET_DRIVER` | `local` | Current asset storage |
| `ENABLE_LEGACY_DEMOS` | Development on, production off | Enable legacy preview/static routes |
| `PUBLIC_BASE_URL` | `http://localhost:3000` | Absolute image URL base for sent email |
| `NEXT_PUBLIC_BASE_URL` | Fallback | Public base URL alternative |
| `FIGMA_ACCESS_TOKEN` | Optional | Figma API access |
| `FIGMA_DEBUG` | Enabled by current config default | Figma diagnostics |
| `AI_PROVIDER` | `ollama` | `ollama` or `gemini` |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Local AI endpoint |
| `OLLAMA_VISION_MODEL` | `llava:latest` | Local vision model |
| `GEMINI_API_KEY` | Required for Gemini | Gemini credential |
| `GEMINI_MODEL` | `gemini-2.0-flash` | Gemini model |
| `RESEND_API_KEY` | Optional | Enables test sends |
| `RESEND_FROM` | `onboarding@resend.dev` at send time | Test sender |
| `NEXT_PUBLIC_TEST_EMAIL_DEFAULT` | Optional | Prefills test recipient in the browser |

`postgres`, `s3`, and enforced authentication values are reserved architecture options but do not have active adapters in the current phase.

---

## 30. Security and deployment posture

### Current posture

- Internal developer-team use.
- `AUTH_MODE=open`.
- No user login, roles, tenant separation, or ownership controls.
- Open mode stamps an anonymous actor context.
- The startup exposure gate is intended to refuse unsafe non-local binding while authentication is open.

### Request hardening

- Correlation ID on protected requests/responses.
- 30 requests/minute/IP on expensive render, export, send, Figma, and AI routes.
- 5 MB JSON body limit for templates/render/export/send.
- 10 MB JSON body limit for Figma/AI.
- 10 MB upload limit for supported image uploads.
- 10 MB multipart limit for tagging workbooks at the route layer.
- Legacy demos disabled by default in production.

### Before external hosting

Do not expose the current app directly to clients or the public internet. External deployment requires:

- completed authentication/identity adapter;
- authorization and ownership rules;
- HTTPS and secret management;
- backed-up database/object storage;
- audit and retention policy;
- approved AI/data-processing posture;
- operational logging/monitoring;
- vulnerability and dependency review.

---

## 31. Developer commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Next.js development server on port 3000 |
| `npm run build` | Create production build |
| `npm run start` | Start production server on port 3000 |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | Next.js ESLint |
| `npm run test` | Run Vitest once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run verify` | Typecheck, lint, boundaries, secret scan, and tests |
| `npm run format` | Apply Prettier |
| `npm run format:check` | Check formatting |
| `npm run check:boundaries` | Enforce architecture import boundaries |
| `npm run check:secrets` | Scan client-reachable code for server credentials |
| `npm run email:dev` | Start React Email preview on port 3005 |
| `npm run email:export` | Export legacy React Email examples |
| `npm run seed:templates` | Seed template data |
| `npm run clean` | Delete `.next` build output |

### Release-quality verification

```bash
npm run verify
npm run build
npm run check:secrets
```

---

## 32. Troubleshooting

### Figma fetch fails

Check:

- the URL is a Figma Design URL with `node-id`;
- `FIGMA_ACCESS_TOKEN` exists in `.env.local`;
- the token can access the file;
- the dev server was restarted after environment changes;
- the frame is not excessively large;
- network/API rate limits.

### Figma build loses styling

Check:

- whether the fill belongs to the selected root or a nested frame;
- inner/outer background assignments;
- nested corner radius;
- hidden wrappers and auto-layout;
- image versus editable build mode;
- customizer Section/Container styles;
- build warnings and generated AST.

For high-risk sections, use mixed node exports or flatten the entire component.

### AI unavailable

For Ollama:

```bash
ollama pull llava
ollama serve
```

Then check `OLLAMA_BASE_URL`, `OLLAMA_VISION_MODEL`, and `/api/ai/status`.

For Gemini, check provider selection, API key, model, quota, and organization approval.

### Preview fails

- Use **Retry render**.
- Inspect server logs using the response correlation ID.
- Validate advanced JSON or Code view changes.
- Reset Code view from the canvas if invalid source remains.

### Export fails

- Confirm the canvas is not empty.
- Check the server log/correlation ID.
- Confirm source images are reachable by the server.
- Check whether remote image hosts block download.
- Retry after resolving failed asset URLs.

### Test send fails

- Check `RESEND_API_KEY`.
- Check recipient syntax.
- Confirm sender-domain verification and `RESEND_FROM`.
- Check Resend account restrictions.
- Set a reachable `PUBLIC_BASE_URL` for local images.

### Reusable component cannot be deleted

- Remove all placements from the open canvas.
- Save the template.
- Remove placements from every other saved template named in the error.
- Retry deletion.

### Tagging produces weak matches

- Treat the feature as on hold.
- Apply URLs manually.
- If evaluating the workflow, ensure labels clearly match CTA/image target names and review every proposal before applying.

---

## 33. Demonstration plan for clients and technical leads

### 10–15 minute product demonstration

1. Open the gallery and show search/sort.
2. Duplicate an existing template or create a new one.
3. Add a built-in block by drag/drop.
4. Edit copy, image, colour, and CTA URL.
5. Add a Figma frame in editable Design mode.
6. Show a section that is better suited to Image mode.
7. Select an imported node in preview and edit desktop/mobile styles.
8. Save the block to Reusable Components and place a second independent copy.
9. Open Code view, change a safe literal value, and show canvas synchronization.
10. Show the live preview and explain that it is not inbox certification.
11. Export the ZIP and inspect the HTML + `img/` structure.
12. End with the limitations and QA checklist, especially Outlook on Windows.

### Technical-lead discussion points

- Ports/adapters and current filesystem implementation.
- Zod validation and constrained code parser.
- Figma registry matching versus primitive fallback.
- Mixed editable/image import strategy.
- Export asset bundling.
- Open-mode security boundary and work required before external hosting.
- Deferred PostgreSQL, S3, worker, and authentication capabilities.
- Current test and verification pipeline.

---

## 34. Roadmap and deferred capabilities

### Product hardening priorities

- Improve Outlook for Windows rendering.
- Improve complex two/three-column conversion.
- Preserve nested outer/inner backgrounds and border radius more reliably.
- Re-test exported campaigns in the agreed inbox matrix.
- Harden URL-tagging matching and review UX before restoring it as a recommended workflow.
- Define image hosting/CDN and final deployment process.

### Deferred platform capabilities

- PostgreSQL repository.
- S3/object asset store.
- Background worker/job queue.
- Authentication and authorization.
- Per-user or per-team component ownership.
- Revision history and restore.
- Automated asset lifecycle/garbage collection.

---

## 35. Glossary

| Term | Meaning |
| --- | --- |
| EDM | Electronic direct mail/email campaign |
| React Email | React components and renderer used to generate email HTML |
| Registry component | A built-in typed block with known editable fields |
| Figma primitive block | Imported React Email AST generated from a Figma node tree |
| Flatten/image mode | Render visual content as an image instead of editable email elements |
| Mixed mode | Editable content with selected subtrees exported as images |
| Reusable component | Independent saved snapshot of a configured canvas block |
| Placement provenance | `sourceSavedComponentId` linking a placement to its saved snapshot |
| Browser preview | In-tool web rendering; not equivalent to inbox rendering |
| Tagging | Applying final URLs and alt text from campaign data |
| Correlation ID | Request identifier used to connect UI errors to server logs |
| Ports and adapters | Architecture separating business logic from storage implementations |

---

## 36. Reference evidence

The current client-rendering caveats are grounded in one recorded cross-client test:

- **Test:** *Proof – Retail Offer – June Owners 2026 3*
- **Date:** 18 August 2026
- **Email on Acid:** [Shareable client results](https://app.emailonacid.com/app/acidtest/CmzIgLgYBesG5ffJbfGDIHmG8sKFAEudltxEgXogdoZjz/list)

Observed summary:

- Apple Mail on iPhone/Mac: generally matched the intended design.
- Gmail web: generally matched the intended design.
- Gmail Android: most of the email worked; the body was not empty.
- Outlook on Windows: the principal issue, with duplicated/wrongly sized images and spacing differences.

This is useful evidence, but it is one template and must not be treated as a permanent guarantee for all future campaigns.

---

## 37. Final rules of use

1. Build with reusable/editable content where practical.
2. Flatten only the sections that need it.
3. Review desktop and mobile.
4. Add and verify every final URL.
5. Save before handover.
6. Test the exact exported or sent HTML in real inboxes.
7. Prioritize Outlook on Windows in defect triage.
8. Re-test after every rendering fix.
9. Do not publicly expose the current open-mode installation.
10. Treat the final QA artifact—not the browser preview—as the campaign result.
