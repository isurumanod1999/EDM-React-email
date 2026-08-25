# Builder Guide

How developers use the email template builder day-to-day.

## Access

- **Gallery:** [http://localhost:3000/builder](http://localhost:3000/builder)
- **Editor:** `/builder/{template-id}`

The tool is intended for **internal developer-team use**. Authentication is not enabled (`AUTH_MODE=open`). Do not bind to a public interface without completing Epic F4 (auth).

---

## Gallery (`/builder`)

| Action | Behavior |
|--------|----------|
| **+ New Template** | Creates an empty template and opens the editor |
| **Edit** | Opens the template in the builder |
| **Duplicate** | Copies the template and opens the new copy |
| **Delete** | Confirms, then removes the template from disk |

**Search & sort:** filter templates by name; sort by last updated or name.

**Feedback:** load failures show a retry banner; duplicate/delete/create use toast notifications and disable buttons while in progress.

---

## Editor layout

```
Toolbar     Save · Export · Import ▾ · Tagging… · Send · Duplicate
──────────────────────────────────────────────────────
Components  │  Canvas (block list)     │  Properties
 (palette)  │  Live preview (iframe)   │  (meta + props)
            │                          │
            └── Figma customizer drawer (when editing Figma blocks)
```

### Desktop (>900px)

Three columns: component palette, canvas + preview, property panel.

### Mobile / tablet (≤900px)

Bottom nav: **Components | Canvas | Properties**. Palette and properties open as slide-over drawers; canvas + preview stay primary.

---

## Core workflow

1. **Add components** — drag from the palette, double-click, or focus a palette item and press **Enter**.
2. **Edit properties** — select a block; use the property panel on the right (or Properties drawer on mobile).
3. **Rename template** — edit the name in the **toolbar** (not in the property panel).
4. **Remove blocks** — delete requires confirmation.
5. **Preview** — live preview updates automatically (debounced). Stale preview dims with a spinner overlay while re-rendering.
6. **Save** — manual **Save** or auto-save every **45 seconds** when dirty. Toasts confirm save/auto-save.
7. **Tagging (URLs)** — after the layout is composed, use **Tagging…** to upload the campaign Excel and apply FINAL URLs (see below).
8. **Export** — **Export** downloads a ZIP with HTML + bundled images.
9. **Send test** — requires `RESEND_API_KEY`; optional default recipient via `NEXT_PUBLIC_TEST_EMAIL_DEFAULT` in `.env.local`.

### Reusable components

The palette’s **Reusable Components** section is a shared library for this installation (not per-user). Built-in registry entries stay listed below it and cannot be deleted.

1. On a canvas block, click **＋** (**Add to components**) immediately before **Duplicate**.
2. Enter a unique name and optional description. Saving stores a snapshot of the block’s current props (Figma AST or customized built-in). The canvas block itself is unchanged and is **not** linked as a placement.
3. Drag a reusable item onto the canvas, double-click it, or focus it and press **Enter**. Each placement gets a new block ID and `sourceSavedComponentId`. Later canvas edits do not update the library; later library deletes do not rewrite existing templates.
4. Delete a reusable item from the palette (✕). Confirm by name. Deletion is blocked if this unsaved canvas or any **saved** template still has a placement from that item. Uploaded images are not garbage-collected.

Names must be unique (case-insensitive). Duplicate names stay in the save dialog with an error.

### Unsaved changes

- Browser warns on tab close when edits are unsaved.
- Navigating to **← Templates** prompts for confirmation.
- **Duplicate** also prompts if the current template is dirty.

---

## Figma import

Requires `FIGMA_ACCESS_TOKEN` in `.env.local`. Use **Import** in the toolbar:

1. **Fetch from Figma** — paste desktop (and optional mobile) frame URLs.
2. **Build from Figma** — converts the fetched frame to React Email blocks (also shown as a quick action when a session is loaded).
3. **Batch Import** — import several Figma URLs in parallel.

Long-running imports show progress and cannot be dismissed mid-operation. **Ollama status** is shown when AI assist is relevant.

**Registry component links:** Figma layers match editable registry blocks using **layer names first**, then Figma master component IDs. Shared IDs (e.g. 2UP Standard vs Dual CTA) are disambiguated by name and button layout. Successful matches produce blocks like `hero-banner`, `header`, `two-col-stacked` instead of a monolithic `figma-react-email` AST. Multi-section frames decompose when enough sections match. Extend links in `src/lib/figma/componentLinks.ts` and IDs in `src/lib/figma/figmaComponentIds.ts`.

A name match alone is **not** enough to accept a registry block. Every string in the Figma layer must survive into the block's props, and buttons and images must land in fields that render them as such. A frame named `Opening` that also holds a headline and a CTA is therefore *not* collapsed into the text-only `intro-copy` block — matches that would drop content fall back to React Email primitives, which reproduce the frame faithfully.

**Image export hints:** only small icon/badge-style layers are auto-exported as PNGs from the Figma design context. To rasterize anything larger, name it in the build instructions (e.g. `export FRAME "Callout" as image`) or select it in the build modal. Flattening a whole component is the **Image** build option, not a hint.

Optional local AI (Ollama): see `.env.example` and run `ollama pull llava`.

---

## Screenshot / AI import

**Screenshot Upload** sends desktop/mobile screenshots to the AI analyze endpoint. Works with Ollama (local) or Gemini (`AI_PROVIDER=gemini`).

---

## Figma block customization

For blocks imported via **Build from Figma** (`figma-react-email`):

- Click elements in the **live preview** to select AST nodes.
- The **Customize component** drawer opens for layers, typography, spacing, and rich text.
- Toggle **Desktop / Mobile** view mode to edit viewport-specific styles.

---

## Tagging URLs (post-compose)

Build the template **without** requiring campaign URLs, then apply them from the tagging spreadsheet.

1. Open a composed template in the editor.
2. Click **Tagging…** / **Upload** and choose a Book1-style `.xlsx` with columns **FINAL URL**, **URL Label**, **Alt Text** (extra header text / newlines are OK).
3. Review proposed matches (URL Label → linkable targets). Rematch or clear rows as needed; confirm, then **Apply & save**.
4. Use the **Checklist** tab to mark pass/fail for desktop and mobile preview contexts.

| Behavior | Detail |
|----------|--------|
| Match key | **URL Label** (not FINAL URL) |
| Writes | FINAL URL → URL props; Alt Text → paired alt props; Figma tree `href` / `alt` when applicable |
| Does not write | CTA / button **visible text** (URL Label is match-only) |
| Skipped rows | Mirror / Unsubscribe CRM includes, empty / non-http FINAL URL |
| Partial apply | Allowed; unmatched rows warn but do **not** hard-block export |

APIs: `POST /api/tagging/parse`, `POST /api/tagging/apply` — see [API.md](./API.md).

---

## Known gaps / next (pending)

Not done in the tool yet — see [NEXT-PLANS.md](./NEXT-PLANS.md):

1. **Render QA** — how templates look in real email clients on desktop and mobile (not only browser preview)  
2. **Rendering fixes** — driven by render QA evidence (Outlook, dark mode, etc.)  

---

## Storage

Templates are JSON files under `data/templates/`. Reusable component snapshots are JSON files under `data/saved-components/`. Uploaded images go to `public/images/uploads/`. No database or cloud storage in the current phase.

---

## Troubleshooting

| Issue | Check |
|-------|--------|
| Figma fetch fails | `FIGMA_ACCESS_TOKEN`, frame URL, network |
| AI analyze unavailable | Ollama running (`/api/ai/status`) or `GEMINI_API_KEY` |
| Send email fails | `RESEND_API_KEY`, verified sender domain |
| Preview render error | Use **Retry render** banner; check server logs (correlation id in response header `x-correlation-id`) |
| Legacy demo previews 404 in production | Set `ENABLE_LEGACY_DEMOS=true` or use `/builder` templates instead |

See also [API.md](./API.md) and [../.env.example](../.env.example).
