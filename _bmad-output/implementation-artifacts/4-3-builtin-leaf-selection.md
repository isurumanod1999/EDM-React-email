---
status: done
story_key: 4-3-builtin-leaf-selection
---

# Story 4-3 — Built-in components annotate visual leaves

## Acceptance Criteria

Every palette component annotates images, headings/text hosts, buttons/links, and dividers with `useSelectable` / `editorSelectAttrs` mapped to registry field keys (`logoSrc`, `title`, `content`, `rows`, `stats`, etc.).

## Tasks

- [x] Annotate all `src/components/email/*` except Figma block
- [x] Forward attrs through `ResponsiveImg`
- [x] Nested JSON visuals use the parent field key (`rows`, `stats`, `socialLinks`)

## File List

- `src/lib/email/ResponsiveImg.tsx`
- `src/components/email/Header.tsx`
- `src/components/email/SectionTitle.tsx`
- `src/components/email/Divider.tsx`
- `src/components/email/Spacer.tsx`
- `src/components/email/CtaBanner.tsx`
- `src/components/email/IntroCopy.tsx`
- `src/components/email/TextBlock.tsx`
- `src/components/email/ImageBlock.tsx`
- `src/components/email/ButtonRow.tsx`
- `src/components/email/PromoBlock.tsx`
- `src/components/email/HeroBanner.tsx`
- `src/components/email/Testimonial.tsx`
- `src/components/email/Footer.tsx`
- `src/components/email/StatsRow.tsx`
- `src/components/email/ThreeColIcon.tsx`
- `src/components/email/OrderCard.tsx`
- `src/components/email/TwoColStacked.tsx`
- `src/components/email/TwoColDualCta.tsx`
- `src/components/email/OneColProduct.tsx`
