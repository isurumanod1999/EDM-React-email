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

**Feedback:** load failures show a retry banner; duplicate/delete/create use toast notifications and disable buttons while in progress.

---

## Editor layout

```
Toolbar     Save · Export · Figma/AI · Send · Duplicate
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

1. **Add components** — drag from the palette onto the canvas, or double-click to insert.
2. **Edit properties** — select a block; use the property panel on the right (or Properties drawer on mobile).
3. **Preview** — live preview updates automatically (debounced). Stale preview dims with a spinner overlay while re-rendering.
4. **Save** — manual **Save** or auto-save every **45 seconds** when dirty. Toasts confirm save/auto-save.
5. **Export** — **Export** downloads a ZIP with HTML + bundled images.
6. **Send test** — requires `RESEND_API_KEY` in `.env.local`.

### Unsaved changes

- Browser warns on tab close when edits are unsaved.
- Navigating to **← Templates** prompts for confirmation.
- **Duplicate** also prompts if the current template is dirty.

---

## Figma import

Requires `FIGMA_ACCESS_TOKEN` in `.env.local`.

1. **Fetch from Figma** — paste desktop (and optional mobile) frame URLs.
2. **Build from Figma** — converts the fetched frame to React Email blocks (primitives or image flattening).
3. **Batch Import** — import several Figma URLs in parallel.

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

## Storage

Templates are JSON files under `data/templates/`. Uploaded images go to `public/images/uploads/`. No database or cloud storage in the current phase.

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
