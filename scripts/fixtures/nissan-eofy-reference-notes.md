# Nissan production EDM — reference structure (June EOFY / JuneRetail2026Owners)

Source: real Handlebars-generated EDM the Nissan team ships, then edits manually.
This is the TARGET output shape the app's Figma → React Email build path should approximate.

## Global shell
- Outer background `#f7f8f8`. Inner email body on `#000000` / `#FFFFFF`.
- Fixed container width **600px**, `class="full-width"` → `width:100%` on mobile.
- Fonts: `Verdana, Helvetica, Arial, sans-serif`.
- **Responsive breakpoint = `max-width: 599px`** (NOT 600). House standard.
- Heavy Outlook/MSO conditionals present: `<!--[if gte mso 9]> OfficeDocumentSettings ...`, `[if !mso]`, `mso-line-height-rule:exactly`, `role="presentation"` on all tables.
- Large utility-class system keyed to the 599px media query: `text-size-{N}px`, `line-height-{N}px`, `padding-horz/top/bottom-{N}`, `width-third` (33%), `width-dynamic-third` (32%), `column-half` (49%), and `.drop/.block/.td-drop` (stack table cells: `display:block;width:100%;float:none`), `.center/.align-left/.align-right`.

## Section order (top → bottom)
1. **Hidden preheader/preview text** — `display:none;...max-height:0;opacity:0` block with the preview sentence + zero-width spacer chars. (→ react.email `Preview`.)
2. **Inbox min-width fix** — two 300px transparent spacer GIFs (600px total), `class="m-hide"`. (Email hack; not needed from Figma.)
3. **Preheader bar** — black bg, white 12px text: "Can't see this email? Click here to view online" with inline `<a>` (Handlebars `MirrorPageUrl`).
4. **Hero** — clickable `<a>` (offers URL) wrapping `hero-desk.png` 600×700 (`m-hide`) + `hero-mob.png` (`m-show`, `width-100`). `_label="Hero"`.
5. **Headline** — black bg, white **40px/48px bold** (mobile 28px/34px): "Your EOFY deal, / plus $2,000. / Three days only." (real text, `<br>`s).
6. **Body copy** — white 16px/24px on black. Contains Handlebars `first_name_greeting`, footnote superscripts (¹ ⁸), non-breaking hyphens `&#8209;` (X‑TRAIL, 18‑20).
7. **CTA1 "See all offers"** — clickable image `cta1-desk.png` 294×48 / `cta1-mob.png` 220×40. Centered (narrow padding).
8. **img4 X‑TRAIL** — clickable image 600×680 desk/mob. Link has `&model=70049`. `_label="See Offers X-TRAIL"`.
9. **cta4 Request a Quote** — clickable image 600×80 / 60 mob.
10. **img1 Navara** — clickable 600×660 (`model=30316`).
11. **img2n Ariya** — clickable 600×710 (`model=30179`).
12. **img3n Qashqai** — clickable 600×688 (`model=70059`).
13. **"Nissan More Benefits" dark card** — `#292929`, `border-radius:8px`: `img5-desk.png` 520×200 (rounded top) + heading text "Nissan More Benefits" (28px/40px bold white) + `cta3` image 294×48 "More Benefits". Card padding ~40px.
14. **Divider** — `line-desk.png` 520×1 / `line.png` mobile.
15. **Legal disclaimer footer** — left-aligned white 10px/14px on black. 9 numbered footnotes + MANY inline `<a>` links (warranty, unsubscribe `nmaLCUnsubsciptionURL`, `mailto:noreply@nissan.com.au`, privacy, find-a-dealer) + company address.
16. **Divider** (again).
17. **Footer logo** — clickable `footer-logo-desk.png` 600×150 / mob. `_label="Nissan Icon"`.

## KEY PATTERNS the build path should reproduce
1. **Every visual section is a sliced image wrapped in a tracking link.** `<a href="...utm...&cid=..." _label="<LayerName>" target="_blank"><img .../></a>`. → app must emit `Img` **wrapped in `Link`** with the Figma node's hyperlink (or `#`) and carry the layer name as the link label/alt.
2. **Per-section desktop + mobile image swap** via the 599px media query (`m-hide`/`m-show` + MSO conditional spans). App already does responsive swap via `mobileSrc` + className + media query — align breakpoint to **599px** and confirm desktop hides / mobile shows.
3. **Hybrid text vs image**: text sections (headline, body, "More Benefits" heading, disclaimer) stay as real editable text; complex visuals (hero, product cards, CTAs-as-images) are image slices. The app's primitives path keeps text; rasterizes composite/overlay frames to images (KV fix). This matches.
4. **Preheader** → react.email `Preview`.
5. **Dark rounded card** (#292929, radius 8) wrapping image + heading + CTA → `wrapBox` Section with bg + borderRadius.
6. **Tracking URLs + `_label`** come from Figma layer hyperlinks / names — needed for the clickable sections.

## Known hard parts (email-medium / data limits)
- Inline anchors *inside* a sentence (disclaimer links, "click here") need Figma hyperlink range metadata; without it they render as plain text.
- Handlebars tokens (`<%@ include %>`, `<%= %>`) are CRM personalization, not derivable from Figma — would be inserted manually (as the user does).
- Outlook ignores `@media`; the house template uses table-cell `.drop` stacking + MSO conditionals, which react.email's `Row/Column` approximate but don't replicate 1:1.
