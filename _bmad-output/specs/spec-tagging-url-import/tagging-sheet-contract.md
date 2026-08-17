# Tagging sheet contract

## Intent

Define how the campaign tagging spreadsheet maps into CAP-1 rows and CAP-2 match keys.

## Workflow phase (locked)

1. Build the **entire** template (library / Figma / customize) — **URLs not required**.
2. **Then** upload the tagging `.xlsx`.
3. Review mappings → apply → preview / export / click-check.

Tagging is a **post-compose** step only. Do not design CAP-1 as part of component creation.

## Confirmed from Book1.xlsx (`Patrol - Aug 2026 (2)`)

| Sheet header (logical) | Maps to | Notes |
| --- | --- | --- |
| **FINAL URL** | `finalUrl` | Full tracked URL; may include `<%= message.delivery.internalName %>` |
| **URL Label** | `urlLabel` | e.g. `header-nissanlogo`, `hero`, `cta1-RegisterYourInterest` — **match key** + AC reporting name |
| **Alt Text** | `altText` | Required for image/logo URL rows per sheet guidance |

Also present (not required for v1 apply): Landing Page, UTM/GA cols, AA Channel/Campaign/Content, CID, CRM attribution flag. Content/`utm_content` often equals URL Label.

Sample path: `Desktop\Book1.xlsx`

## Row model

```ts
TaggingRow = {
  finalUrl: string
  urlLabel: string
  altText?: string
  raw: Record<string, unknown>
}
```

## Apply rules (architecture AD-14…AD-18)

- Match primarily by **URL Label** → linkable target; human confirm before write.
- `finalUrl` → target URL prop; preserve CRM tokens literally.
- `altText` → image/logo alt props only.
- **Do not** overwrite CTA button text from URL Label.
- Skip mirror/unsubscribe include rows without http FINAL URL; warn; partial apply OK; export not blocked in v1.

## Format

- **v1:** `.xlsx` upload in builder (exceljs server-side).
- **Stretch:** `.csv` with same logical columns.
