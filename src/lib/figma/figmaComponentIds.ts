/**
 * Figma master component IDs observed in Nissan EDM design files.
 * Populated from `data/figma-debug/` fixtures; extend when new DS components ship.
 *
 * Multiple IDs can map to one registry component (desktop/mobile variants, DS versions).
 * When IDs collide across registry types, `resolveComponentLink()` uses layer names
 * and structure (e.g. button count) to disambiguate.
 */
export const FIGMA_MASTER_COMPONENT_IDS: Record<string, string[]> = {
  header: ['16715:400', '16715:401', '33:645', '6711:1865'],
  'hero-banner': ['4338:2574', '520:8372', '10158:4380', '6726:1400'],
  footer: ['8535:1312', '1:796'],
  'intro-copy': [],
  'text-block': ['556:2633'],
  'section-title': ['6720:1185', '12696:1753'],
  'one-col-product': ['4726:203', '511:3787'],
  'two-col-stacked': ['2001:2397'],
  'two-col-dual-cta': ['2001:2397'],
  'three-col-icon': ['6725:1275'],
  'image-block': ['2001:1619'],
  'promo-block': [],
  'cta-banner': [],
  'button-row': [],
  testimonial: [],
  divider: [],
  spacer: [],
  'order-card': [],
};
