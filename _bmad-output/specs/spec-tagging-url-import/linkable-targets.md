# Linkable targets (brownfield catalog)

Load-bearing catalog of registry props the tagging feature may write. Export/preview already render these; tagging MUST target them.

| Target kind | Typical components | URL prop(s) | Alt prop(s) | Visible text / label-related prop(s) |
| --- | --- | --- | --- | --- |
| Logo link | Header / footer logo | `logoUrl` | `logoAlt` | — |
| Image link | Standalone image / hero image areas | `url` (and component-specific equivalents) | `altText` | — |
| Primary CTA | Hero, feature, CTA blocks | `ctaUrl`, `buttonUrl`, `primaryUrl` | — | `ctaText`, `buttonText`, `primaryText` |
| Secondary CTA | Dual-CTA blocks | `secondaryUrl` | — | `secondaryText` |
| Legal / utility links | Footer | `unsubscribeUrl`, `privacyUrl`, `preferencesUrl` | — | — |
| Social links | Footer social items | item `url` inside social list | — | platform name |

## Rules for consumers

- A **linkable target** is one writable URL prop instance on one block (or one social item), optionally paired with alt and/or visible text props on the same block.
- CAP-2 proposals enumerate targets from the open template’s blocks via the registry field definitions (`type: 'url'` and known alt/text siblings).
- CAP-4 writes only props that exist on that block’s definition; never invent new prop keys in v1 without a registry update story.
- Image-flattened Figma blocks that are pure `<img>` still need `url`/`altText` (or equivalent) if they are meant to be clickable — if a flatten path has no URL prop today, that is a gap to surface as unmatched/unsupported target, not silent skip without UI notice.

## Out of this companion

Matching algorithm and sheet column names live in `tagging-sheet-contract.md`.
