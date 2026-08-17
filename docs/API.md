# API Reference

All routes live under `/api`. Responses include header **`x-correlation-id`** for log correlation.

## Error shape

```json
{
  "error": "Human-readable message",
  "code": "not_found",
  "correlationId": "uuid"
}
```

Common codes: `validation_error`, `not_found`, `rate_limited`, `payload_too_large`, `internal_error`, `figma_not_configured`, `ai_unavailable`.

---

## Templates

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/templates` | List template summaries |
| POST | `/api/templates` | Create template (`useDefaults: true` or full document) |
| GET | `/api/templates/:id` | Get full template document |
| PUT | `/api/templates/:id` | Update template |
| DELETE | `/api/templates/:id` | Delete template |
| POST | `/api/templates/:id/duplicate` | Duplicate template |

Storage: `data/templates/{id}.json` via `TemplateService` → filesystem adapter.

---

## Registry

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/registry` | Component registry for builder palette |

---

## Email render & export

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/email/render` | Render blocks to HTML (`editable: true` for builder preview) |
| POST | `/api/email/export` | Returns ZIP (HTML + images) |
| POST | `/api/email/send` | Send test email via Resend |
| GET | `/api/email/[template]` | **Legacy** static demo templates (disabled in prod unless `ENABLE_LEGACY_DEMOS`) |

Render/export/send accept `{ meta, blocks, name }` or `{ templateId }` fallback.

---

## Assets

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/assets/upload` | Multipart upload (`file` field). Max 10 MB; PNG/JPEG/WebP/GIF |

Returns `{ url, filename, size }`.

---

## Tagging (campaign URL Excel)

Post-compose only. Excel parsing is server-side (`exceljs`); browser never loads the workbook parser.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/tagging/parse` | Multipart `file` (`.xlsx`, max 10 MB) → `{ rows, sheetName? }` |
| POST | `/api/tagging/apply` | JSON `{ templateId, mappings[] }` → writes URL/alt props, saves template |

Parse row shape: `finalUrl`, `urlLabel`, `altText?`, `status` (`proposed` \| `skipped`), `skipReason?`, `raw`.  
Apply mapping shape: `rowIndex`, `targetId`, `finalUrl`, `urlLabel`, `altText?`. Target ids: `{blockId}:{propKey}`, `{blockId}:social:N:url`, `{blockId}:tree:path:href`.

Error codes include `tagging_parse_failed`, `tagging_apply_failed`. Multipart parse is exempt from the JSON body-size limiter (same pattern as assets upload).

---

## Figma

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/figma/import` | Fetch Figma frame(s) |
| POST | `/api/figma/build-email` | Build React Email tree from parsed nodes |
| POST | `/api/figma/import-build` | Single-shot import + build (batch modal) |
| POST | `/api/figma/classify-image-nodes` | AI image-node classifier (always 200, soft-fail) |

Requires `FIGMA_ACCESS_TOKEN`.

---

## AI

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/ai/status` | Ollama availability (public, no auth gate) |
| POST | `/api/ai/analyze-component` | Screenshot → component blocks |
| POST | `/api/ai/build-react-email` | Figma nodes + AI → React Email build |

---

## Middleware limits

Applied to matching routes before handlers:

| Limit | Routes |
|-------|--------|
| 30 requests / minute / IP | `/api/email/render`, export, send, `/api/figma/*`, `/api/ai/analyze-component`, `/api/ai/build-react-email` |
| 5 MB JSON body | templates, render, export, send |
| 10 MB JSON body | figma, ai |
| 10 MB upload | assets |

---

## Health / status

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/ai/status` | Only dedicated status endpoint; not gated by access middleware |

---

## Client usage map

See [BUILDER.md](./BUILDER.md) for which UI features call which endpoints.
