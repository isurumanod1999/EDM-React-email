import type { CSSProperties } from 'react';
import type { FigmaTextRun, ParsedFigmaNode } from './parseFigmaNode';
import {
  findAllTextNodes,
  findNodeByPath,
  getContentChildren,
  hasButtonDescendant,
  hasButtonVisualStructure,
  hasTextDescendant,
  mapCounterAxisAlign,
  normalizeColor,
  resolveEffectiveBackground,
} from './parseFigmaNode';
import { RESPONSIVE_COL_CLASS, type ReactEmailNode } from './types/reactEmailAst';

const EMAIL_FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

const SKIP_TYPES = new Set([
  'VECTOR',
  'ELLIPSE',
  'STAR',
  'POLYGON',
  'BOOLEAN_OPERATION',
  'LINE',
]);

const CONTAINER_TYPES = new Set(['FRAME', 'COMPONENT', 'INSTANCE', 'GROUP']);

/**
 * Mixed-mode image export: the set of Figma nodeIds the caller forced to render
 * as a flat 2× PNG (icons / SVGs / vector art) instead of structured HTML. Set
 * once at the start of each `buildPrimitivesFromFigma` call. The whole build is
 * synchronous (no awaits), so this module-level state can't interleave between
 * concurrent requests. Empty by default → behavior is identical to before.
 */
let FORCE_IMAGE_IDS: Set<string> = new Set();

/**
 * When a node is in the forced set, return the 2× PNG to rasterize its subtree.
 * Prefers `exportUrl` (present when the node was also in the heuristic export
 * set) and falls back to `forcedExportUrl` (downloaded specifically for detected
 * icon/vector clusters). Returns undefined when nothing is forced or no render
 * is available, so the node falls through to the normal structured path.
 */
function forcedImageSrc(node: ParsedFigmaNode): string | undefined {
  if (FORCE_IMAGE_IDS.size === 0) return undefined;
  const id = node.nodeId ?? node.id;
  if (!id || !FORCE_IMAGE_IDS.has(id)) return undefined;
  return node.exportUrl ?? node.forcedExportUrl;
}

/**
 * Fallback mobile behavior for a two-column Row when there is NO mobile Figma
 * frame AND the content-aware heuristic (columnsAreSymmetricGrid) can't decide
 * (e.g. unknown widths). Symmetric image+text card grids stay 2-up regardless;
 * this only covers the truly ambiguous case.
 * `true`  → stack to a single column on mobile (safest for narrow screens).
 * `false` → keep two columns on mobile.
 */
const STACK_COLUMNS_ON_MOBILE_BY_DEFAULT = true;

/** Icons (small circular/square containers) are at most this wide/tall. */
const ICON_MAX_DIMENSION = 96;

/**
 * A node that is small AND roughly square — an icon / icon-container, not a
 * content box. Such frames must render at their intrinsic small size (centered),
 * never stretched to the full column width or turned into a full-width pill.
 */
function isIconSized(node: ParsedFigmaNode): boolean {
  const w = node.width ?? 0;
  const h = node.height ?? 0;
  if (w <= 0 || h <= 0) return false;
  if (w > ICON_MAX_DIMENSION || h > ICON_MAX_DIMENSION) return false;
  const aspect = w / h;
  return aspect >= 0.6 && aspect <= 1.67;
}

// ─── helpers ────────────────────────────────────────────────────────────────

function fontFamily(node: ParsedFigmaNode): string {
  if (node.fontFamily) return `"${node.fontFamily}", ${EMAIL_FONT}`;
  return EMAIL_FONT;
}

function nodeTextAlign(node: ParsedFigmaNode): CSSProperties['textAlign'] {
  return mapCounterAxisAlign(
    node.layoutMode,
    node.counterAxisAlign,
    node.primaryAxisAlign
  );
}

function parseRgbColor(color?: string): [number, number, number] | undefined {
  if (!color) return undefined;
  const c = color.replace(/\s/g, '').toLowerCase();
  if (c === 'white') return [255, 255, 255];
  if (c === 'black') return [0, 0, 0];
  const hex6 = c.match(/^#([0-9a-f]{6})$/);
  if (hex6) {
    const n = parseInt(hex6[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const hex3 = c.match(/^#([0-9a-f]{3})$/);
  if (hex3) {
    return [
      parseInt(hex3[1][0] + hex3[1][0], 16),
      parseInt(hex3[1][1] + hex3[1][1], 16),
      parseInt(hex3[1][2] + hex3[1][2], 16),
    ];
  }
  const m = c.match(/^rgba?\((\d+),(\d+),(\d+)/);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  return undefined;
}

/** Perceived brightness (0–255) via Rec. 709 luma. */
function colorLuminance(color?: string): number | undefined {
  const rgb = parseRgbColor(color);
  if (!rgb) return undefined;
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

function isLightColor(color?: string): boolean {
  if (!color) return false;
  const c = color.replace(/\s/g, '').toLowerCase();
  if (c === '#fff' || c === '#ffffff' || c === 'white') return true;
  const m = c.match(/^rgba?\((\d+),(\d+),(\d+)/);
  if (m) return Number(m[1]) >= 200 && Number(m[2]) >= 200 && Number(m[3]) >= 200;
  return false;
}

function isDarkColor(color?: string): boolean {
  const lum = colorLuminance(color);
  return lum != null && lum < 90;
}

/**
 * Light by perceived luminance. Unlike `isLightColor` (an exact white/near-white
 * match tuned for text fills), this catches off-white graphic fills like #efefef
 * that a logo's vectors carry — the signal that a logo bar was drawn light to sit
 * on a dark background.
 */
function isLightByLuma(color?: string): boolean {
  const lum = colorLuminance(color);
  return lum != null && lum >= 200;
}

/** Vector/graphic shape types — the paths that make up a logo or icon. */
const GRAPHIC_SHAPE_TYPES = new Set([
  'VECTOR',
  'ELLIPSE',
  'STAR',
  'POLYGON',
  'BOOLEAN_OPERATION',
  'LINE',
  'REGULAR_POLYGON',
]);

/**
 * Collect the solid fill colors of vector/graphic leaf shapes (a logo's or
 * icon's paths). Used to reconstruct a background for a logo-only frame that
 * carries no text, so the text-color heuristic can't decide it.
 */
function collectGraphicColors(node: ParsedFigmaNode, acc: string[]): void {
  if (GRAPHIC_SHAPE_TYPES.has(node.type)) {
    const c = normalizeColor(node.backgroundColor);
    if (c) acc.push(c);
  }
  for (const child of node.children) collectGraphicColors(child, acc);
}

/**
 * Collect text colors split by whether the text sits directly on the section
 * surface or inside a button/CTA pill. Button labels are inverted (e.g. dark
 * text on a light pill sitting on a dark section), so they must NOT count toward
 * deciding the section's own background — that was making dark heroes render
 * with a transparent (washed-out) background.
 */
function partitionTextColors(
  node: ParsedFigmaNode,
  insideButton: boolean,
  acc: { surface: string[]; button: string[] }
): void {
  const nowButton = insideButton || isButtonNode(node);
  if (node.type === 'TEXT' && node.text?.trim() && node.color) {
    (nowButton ? acc.button : acc.surface).push(node.color);
  }
  for (const child of node.children) partitionTextColors(child, nowButton, acc);
}

/**
 * A section whose on-surface copy is all light was designed to sit on a dark
 * background. Email has no inherited parent background, so that dark fill (which
 * lives on an ancestor frame we don't import) must be reconstructed onto the
 * section itself — otherwise light text renders on white and looks washed out.
 *
 * The dark color is recovered from the design itself: an inverted (light-pill)
 * button's dark label is almost always the section's dark brand color. Falls
 * back to a dark neutral when there's no such signal.
 */
/**
 * The background color a section wrapper should carry for this frame: the frame's
 * own effective fill, else an inferred hero background (light surface / dark
 * label heuristic). Exposed so "flatten to image" blocks can paint the same
 * background behind a transparent PNG export (Figma renders frames whose fill
 * lives on a parent as transparent).
 */
export function resolveSectionBackground(node: ParsedFigmaNode): string | undefined {
  return resolveEffectiveBackground(node) ?? inferHeroBackground(node);
}

function inferHeroBackground(node: ParsedFigmaNode): string | undefined {
  const acc: { surface: string[]; button: string[] } = { surface: [], button: [] };
  partitionTextColors(node, false, acc);

  const pool = acc.surface.length > 0 ? acc.surface : acc.button;
  if (pool.length > 0) {
    if (!pool.every((c) => isLightColor(c))) return undefined;

    const darkLabel = acc.button
      .filter((c) => isDarkColor(c))
      .sort((a, b) => (colorLuminance(a) ?? 0) - (colorLuminance(b) ?? 0))[0];

    return darkLabel ?? '#111318';
  }

  // No text anywhere — a logo/icon-only frame (e.g. a header logo bar). Its dark
  // background usually lives on an ancestor page frame we don't import, so Figma
  // renders the frame transparent with light/white logo art that would vanish on
  // the email's white body. This runs only after resolveEffectiveBackground found
  // no own fill, so when the frame's vector/icon art is uniformly light, give it a
  // dark background back so the logo stays visible. Dark-on-transparent logos are
  // left alone (they read fine on white), and frames with no vector art (raster-
  // only logos) can't be judged here and are also left untouched.
  const graphic: string[] = [];
  collectGraphicColors(node, graphic);
  if (graphic.length > 0 && graphic.every((c) => isLightByLuma(c))) {
    return '#111318';
  }

  return undefined;
}

function sectionStyle(node: ParsedFigmaNode): CSSProperties {
  const bg = resolveEffectiveBackground(node) ?? inferHeroBackground(node);
  const padding = formatPadding(node);
  const style: CSSProperties = {
    width: '100%',
    textAlign: nodeTextAlign(node),
    ...(padding ? { padding } : {}),
  };
  if (bg) style.backgroundColor = bg;
  return style;
}

function formatPadding(node: ParsedFigmaNode): string | undefined {
  const pt = node.paddingTop ?? 0;
  const pr = node.paddingRight ?? 0;
  const pb = node.paddingBottom ?? 0;
  const pl = node.paddingLeft ?? 0;
  if (pt === 0 && pr === 0 && pb === 0 && pl === 0) return undefined;
  if (pt === pr && pr === pb && pb === pl) return `${pt}px`;
  return `${pt}px ${pr}px ${pb}px ${pl}px`;
}

/** Body copy that runs edge-to-edge is unreadable; guarantee a side gutter. */
const MIN_TEXT_PADDING_X = 24;

function bumpHorizontalPadding(padding: string | undefined): string {
  const parts = (padding ?? '0px').trim().split(/\s+/);
  let top = '0px';
  let right = '0px';
  let bottom = '0px';
  let left = '0px';
  if (parts.length === 1) [top, right, bottom, left] = [parts[0], parts[0], parts[0], parts[0]];
  else if (parts.length === 2) [top, right, bottom, left] = [parts[0], parts[1], parts[0], parts[1]];
  else if (parts.length === 3) [top, right, bottom, left] = [parts[0], parts[1], parts[2], parts[1]];
  else [top, right, bottom, left] = [parts[0], parts[1], parts[2], parts[3]];

  const toNum = (v: string) => parseFloat(v) || 0;
  if (toNum(right) < MIN_TEXT_PADDING_X) right = `${MIN_TEXT_PADDING_X}px`;
  if (toNum(left) < MIN_TEXT_PADDING_X) left = `${MIN_TEXT_PADDING_X}px`;
  return `${top} ${right} ${bottom} ${left}`;
}

function textTransform(node: ParsedFigmaNode): CSSProperties['textTransform'] {
  switch (node.textCase) {
    case 'UPPER':
      return 'uppercase';
    case 'LOWER':
      return 'lowercase';
    case 'TITLE':
      return 'capitalize';
    default:
      return undefined;
  }
}

function textStyle(
  node: ParsedFigmaNode,
  align?: CSSProperties['textAlign']
): CSSProperties {
  const fs = node.fontSize ?? 16;
  return {
    color: node.color ?? '#000000',
    fontSize: `${fs}px`,
    fontWeight: node.fontWeight ?? 400,
    textAlign: (node.textAlign as CSSProperties['textAlign']) ?? align ?? 'left',
    fontFamily: fontFamily(node),
    margin: 0,
    padding: 0,
    // Round fractional line heights (Figma % line-height yields values like
    // 54.599998px) — email clients render integer px far more reliably.
    lineHeight: node.lineHeight ? `${Math.round(node.lineHeight)}px` : `${Math.round(fs * 1.5)}px`,
    letterSpacing: node.letterSpacing ? `${node.letterSpacing}px` : undefined,
    textTransform: textTransform(node),
    whiteSpace: 'pre-line',
  };
}

/**
 * Faithful per-node mobile typography copied from a matched mobile Figma frame,
 * emitted as a ≤600px media-query override (only the values that differ from
 * desktop). Returns undefined when no mobile frame matched this node — the
 * renderer then applies proportional auto-scaling instead, which also covers
 * campaigns that were built before mobile support existed.
 */
function mobileTextStyle(node: ParsedFigmaNode): CSSProperties | undefined {
  if (node.mobileFontSize == null) return undefined;
  const out: CSSProperties = {};
  if (node.mobileFontSize !== node.fontSize) {
    out.fontSize = `${node.mobileFontSize}px`;
  }
  if (node.mobileLineHeight && node.mobileLineHeight !== node.lineHeight) {
    out.lineHeight = `${Math.round(node.mobileLineHeight)}px`;
  }
  if (node.mobileLetterSpacing != null && node.mobileLetterSpacing !== node.letterSpacing) {
    out.letterSpacing = `${node.mobileLetterSpacing}px`;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** Attach a mobileStyle to a Text/Heading/Link node only when there is one. */
function withMobile<T extends ReactEmailNode>(node: T, mobile?: CSSProperties): T {
  return mobile ? { ...node, mobileStyle: mobile } : node;
}

function stripExports(node: ParsedFigmaNode): ParsedFigmaNode {
  // An auto-layout frame (HORIZONTAL/VERTICAL) with content children is a REAL
  // layout — a header row, a card stack, etc. Its children carry their own
  // images (e.g. a logo exported on its own), so it must be laid out, NOT
  // flattened to one full-frame PNG. Flattening here produced heavy images and
  // a padded section wrapping a shrunken frame render. Only leaf raster nodes
  // and free-form overlap compositions keep their full-frame export.
  const isAutoLayoutContainer =
    (node.layoutMode === 'HORIZONTAL' || node.layoutMode === 'VERTICAL') &&
    getContentChildren(node).length > 0;

  // Keep the full-frame PNG for raster-only nodes AND for absolutely-positioned
  // overlay compositions (key visuals) — those must be rasterized even though
  // they contain overlay text, because email can't reproduce free-form overlap.
  const keepRasterOnly =
    !hasTextDescendant(node) && !hasButtonDescendant(node) && !isAutoLayoutContainer;
  // Image slots (including Figma Image component shells with an aspect-ratio
  // keeper child) must keep their PNG export — stripping them forces a fallback
  // to the raw imageRef hash, which browsers cannot load.
  const keep = keepRasterOnly || isAbsoluteComposite(node) || isImageNode(node);
  return {
    ...node,
    exportUrl: keep ? node.exportUrl : undefined,
    children: node.children.map(stripExports),
  };
}

/** Merge a single inner wrapper frame into its parent (common Figma pattern). */
function unwrapSingleWrapper(node: ParsedFigmaNode): ParsedFigmaNode {
  const kids = getContentChildren(node);
  if (kids.length !== 1) {
    return { ...node, children: node.children.map(unwrapSingleWrapper) };
  }
  const wrapper = kids[0];
  if (!CONTAINER_TYPES.has(wrapper.type) || !hasTextDescendant(wrapper)) {
    return { ...node, children: node.children.map(unwrapSingleWrapper) };
  }
  const inner = getContentChildren(wrapper);
  if (inner.length < 2) {
    return { ...node, children: node.children.map(unwrapSingleWrapper) };
  }

  const parentBg = normalizeColor(resolveEffectiveBackground(node));
  const wrapperBg = normalizeColor(resolveEffectiveBackground(wrapper));

  return {
    ...wrapper,
    paddingTop: (node.paddingTop ?? 0) + (wrapper.paddingTop ?? 0),
    paddingRight: (node.paddingRight ?? 0) + (wrapper.paddingRight ?? 0),
    paddingBottom: (node.paddingBottom ?? 0) + (wrapper.paddingBottom ?? 0),
    paddingLeft: (node.paddingLeft ?? 0) + (wrapper.paddingLeft ?? 0),
    gap: wrapper.gap ?? node.gap,
    layoutMode: wrapper.layoutMode ?? node.layoutMode,
    counterAxisAlign: wrapper.counterAxisAlign ?? node.counterAxisAlign,
    primaryAxisAlign: wrapper.primaryAxisAlign ?? node.primaryAxisAlign,
    backgroundColor: parentBg ?? wrapperBg ?? wrapper.backgroundColor,
    children: wrapper.children.map(unwrapSingleWrapper),
  };
}

// ─── heading / text / button detection ──────────────────────────────────────

function isHeading(node: ParsedFigmaNode): boolean {
  const name = node.name.toLowerCase();
  if (/header|title|headline|heading|\bh[1-3]\b|hero|display|subject/.test(name)) return true;
  const fs = node.fontSize ?? 16;
  const fw = node.fontWeight ?? 400;
  if (fs >= 28) return true;
  if (fs >= 20 && fw >= 600) return true;
  return false;
}

function headingLevel(node: ParsedFigmaNode): 'h1' | 'h2' | 'h3' {
  const fs = node.fontSize ?? 16;
  if (fs >= 32) return 'h1';
  if (fs < 24) return 'h3';
  return 'h2';
}

function isCtaPhrase(text: string): boolean {
  const t = text.trim();
  if (t.length > 60) return false;
  return /^(see all|request a quote|shop now|buy now|learn more|get started|click here|view offer|order now|book now|sign up|register|get a quote)/i.test(
    t
  ) || (t.length <= 40 && /see all offers|request a quote/i.test(t));
}

// ─── link detection ─────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Phone-only string: starts with + ( or a digit, then phone punctuation, ending in a digit.
const PHONE_RE = /^[+(]?\d[\d\s\-().]{4,18}\d$/;
const URL_RE = /^(https?:\/\/|www\.)\S+$/i;
// Short, unambiguous link labels (contact rows / footers). Exact-match only.
const LINK_WORDS = new Set([
  'email',
  'email us',
  'call',
  'call us',
  'phone',
  'contact us',
  'view in browser',
  'unsubscribe',
]);

/**
 * Decide whether a TEXT node is really a hyperlink and what href it should carry.
 * Conservative by design — the ENTIRE trimmed string must look like an email,
 * phone number or URL, or exactly equal a known short link label, so ordinary
 * body copy (even sentences that mention an address) is never linkified.
 */
function detectLink(node: ParsedFigmaNode): { href: string } | null {
  const raw = node.text?.trim();
  if (!raw) return null;
  if (isHeading(node)) return null; // never turn a headline into a link

  if (EMAIL_RE.test(raw)) return { href: `mailto:${raw}` };

  if (PHONE_RE.test(raw)) {
    const digits = raw.replace(/\D/g, '');
    if (digits.length >= 6 && digits.length <= 15) return { href: `tel:${digits}` };
  }

  if (URL_RE.test(raw)) {
    return { href: raw.startsWith('http') ? raw : `https://${raw}` };
  }

  const lower = raw.toLowerCase();
  if (raw.length <= 24 && LINK_WORDS.has(lower)) return { href: '#' };

  // Layer-name hint (e.g. "Email link", "Phone") on a short label.
  if (raw.length <= 30 && /\b(link|mailto|tel|email|phone)\b/.test(node.name.toLowerCase())) {
    return { href: '#' };
  }

  return null;
}

function mapLink(
  node: ParsedFigmaNode,
  href: string,
  align?: CSSProperties['textAlign']
): ReactEmailNode {
  const base = textStyle(node, align);
  return withMobile(
    {
      type: 'Link',
      href,
      content: node.text?.trim() ?? '',
      style: { ...base, textDecoration: 'underline', display: 'inline-block' },
    },
    mobileTextStyle(node)
  );
}

/** Find the solid-fill shape inside a button component (prefer largest colored fill). */
function findButtonFill(node: ParsedFigmaNode, depth = 0): ParsedFigmaNode | undefined {
  if (depth > 6) return undefined;

  const candidates: ParsedFigmaNode[] = [];

  function collect(n: ParsedFigmaNode, d: number) {
    if (d > 6) return;
    for (const child of n.children) {
      if (
        (child.type === 'RECTANGLE' ||
          child.type === 'FRAME' ||
          child.type === 'INSTANCE' ||
          child.type === 'COMPONENT') &&
        normalizeColor(child.backgroundColor) &&
        !child.imageRef &&
        !isIconSized(child) // a small dark circle/square is an icon, not a button fill
      ) {
        const nh = node.height ?? 0;
        const ch = child.height ?? 0;
        if (nh === 0 || ch >= nh * 0.35) candidates.push(child);
      }
      if (CONTAINER_TYPES.has(child.type)) collect(child, d + 1);
    }
  }

  collect(node, depth);
  if (candidates.length === 0) return undefined;

  return candidates.sort(
    (a, b) => (b.width ?? 0) * (b.height ?? 0) - (a.width ?? 0) * (a.height ?? 0)
  )[0];
}

/** Collect short label text(s) from a button node (label + arrow icon text). */
function buttonLabel(node: ParsedFigmaNode): string | undefined {
  const texts = findAllTextNodes(node).filter((t) => (t.text?.trim().length ?? 0) <= 60);
  if (texts.length === 0) return undefined;
  return texts.map((t) => t.text?.trim()).filter(Boolean).join(' ');
}

function inferButtonLabel(node: ParsedFigmaNode): string {
  const fromText = buttonLabel(node);
  if (fromText) return fromText;

  // No readable label (e.g. the text was vectorized). Fall back to the layer
  // name only when it reads like a human label — NEVER a brand-specific phrase,
  // so the converter stays generic across any design.
  const name = node.name.trim();
  const structural = /^(button|cta|btn|frame|group|rectangle|instance|component|vector|union|shape)\b/i;
  if (name && name.length <= 30 && !structural.test(name)) return name;

  return 'Learn more';
}

function isButtonNode(node: ParsedFigmaNode): boolean {
  // A small square is an icon container, not a button — even with a fill + radius.
  if (isIconSized(node)) return false;
  const h = node.height ?? 0;
  if (h > 140) return false;

  const name = node.name.toLowerCase();
  if (/button|cta|btn|primary|secondary|pill|action/.test(name) && h > 0 && h <= 120) {
    return true;
  }

  const texts = findAllTextNodes(node);
  if (texts.some((t) => (t.text?.length ?? 0) > 80)) return false;

  const label = buttonLabel(node);
  if (label && isCtaPhrase(label)) return true;

  if (hasButtonVisualStructure(node) && h > 0 && h <= 120) return true;

  const fill = findButtonFill(node);
  if (fill && h > 0 && h <= 120 && texts.length <= 3) return true;

  return false;
}

function isImageNode(node: ParsedFigmaNode): boolean {
  if (hasTextDescendant(node)) return false;
  if (hasButtonDescendant(node)) return false;
  if (node.type === 'IMAGE') return true;
  // Raster fill on a rectangle/frame, or a small icon shipped as an instance/component.
  if (
    node.imageRef &&
    (node.type === 'RECTANGLE' ||
      node.type === 'FRAME' ||
      node.type === 'INSTANCE' ||
      node.type === 'COMPONENT')
  ) {
    return true;
  }
  if (node.exportUrl) return true;
  return false;
}

/** Vertical stack of 2+ pill buttons (Figma "CTA" group). */
function isCtaButtonStack(node: ParsedFigmaNode): boolean {
  const kids = getContentChildren(node);
  if (kids.length < 2) return false;
  // Only count button-SIZED direct children. hasButtonVisualStructure recurses
  // into descendants, so without this height guard a row of tall content cards
  // (each merely containing a button) would be misread as a button stack and
  // collapsed instead of becoming columns.
  const buttons = kids.filter(
    (k) => (k.height ?? 0) <= 120 && (isButtonNode(k) || hasButtonVisualStructure(k))
  );
  return buttons.length >= 2;
}

function getImageSrc(node: ParsedFigmaNode): string | undefined {
  if (node.exportUrl && !hasTextDescendant(node)) return node.exportUrl;
  if (node.forcedExportUrl) return node.forcedExportUrl;
  if (node.imageRef?.startsWith('/') || node.imageRef?.startsWith('http')) return node.imageRef;
  // Raw Figma fill hash — not loadable in email; omit instead of a broken src.
  return undefined;
}

/** Largest-area image descendant (the background / key-visual), if any. */
function findDominantImage(node: ParsedFigmaNode, depth = 0): ParsedFigmaNode | undefined {
  let best: ParsedFigmaNode | undefined;
  let bestArea = 0;
  function walk(n: ParsedFigmaNode, d: number) {
    if (d > 8) return;
    if (isImageNode(n)) {
      const area = (n.width ?? 0) * (n.height ?? 0);
      if (area > bestArea) {
        bestArea = area;
        best = n;
      }
    }
    for (const c of n.children) walk(c, d + 1);
  }
  walk(node, depth);
  return best;
}

/**
 * An absolutely-positioned composition (NO auto-layout) that layers images and
 * text on top of each other — e.g. a hero "key visual" with price / headline
 * text over a car photo, a logo and badges. Email cannot reproduce free-form
 * overlap, so these must be rasterized to a single image (the frame's exported
 * PNG when available, otherwise its dominant background image) instead of being
 * stacked layer-by-layer, which yields broken giant overlay headings and
 * stretched slivers.
 */
function isAbsoluteComposite(node: ParsedFigmaNode): boolean {
  if (!CONTAINER_TYPES.has(node.type)) return false;
  // Auto-layout frames are real stacks/rows — only no-layout frames overlap.
  if (node.layoutMode === 'HORIZONTAL' || node.layoutMode === 'VERTICAL') return false;
  if (isButtonNode(node) || isImageNode(node)) return false;
  const kids = getContentChildren(node);
  if (kids.length < 2) return false;
  // Only when it actually contains imagery; pure-text no-layout frames are rare
  // and handled fine by the normal stack path.
  return !!findDominantImage(node);
}

/** A container that only groups text / buttons / images — flatten its children in order. */
function isLayoutGroup(node: ParsedFigmaNode): boolean {
  if (!CONTAINER_TYPES.has(node.type)) return false;
  if (isButtonNode(node)) return false;
  if (isImageNode(node)) return false;

  // Horizontal auto-layout frames are real columns and must reach the row
  // handler — never flatten them, or multi-column designs collapse into one column.
  if (node.layoutMode === 'HORIZONTAL' && getContentChildren(node).length > 1) {
    return false;
  }

  const kids = getContentChildren(node);
  if (kids.length === 0) return false;

  const h = node.height ?? 0;
  if (h > 140 && kids.length >= 2) return true;
  if (node.layoutMode === 'VERTICAL' && kids.length >= 2) return true;

  return false;
}

// ─── mappers ────────────────────────────────────────────────────────────────

function mapText(
  node: ParsedFigmaNode,
  align?: CSSProperties['textAlign']
): ReactEmailNode {
  const text = node.text ?? '';
  const style = textStyle(node, align);
  const mobile = mobileTextStyle(node);

  if (isHeading(node)) {
    return withMobile(
      {
        type: 'Heading',
        content: text,
        as: headingLevel(node),
        style,
      },
      mobile
    );
  }
  return withMobile(
    {
      type: 'Text',
      content: text,
      style,
    },
    mobile
  );
}

const BULLET_LINE = /^\s*([•·●▪‣◦∙*\-–—])\s+(.*\S.*)$/;

/** Split a multi-line bullet TEXT node into one trimmed item per bullet line. */
function splitBulletItems(text: string): string[] | null {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return null;
  const items = lines.filter((l) => BULLET_LINE.test(l));
  // Treat as a list only when (nearly) every line is a bullet.
  if (items.length >= 2 && items.length >= lines.length - 1) {
    return lines.map((l) => l.replace(BULLET_LINE, '$2'));
  }
  return null;
}

function mapBulletItem(
  node: ParsedFigmaNode,
  item: string,
  align?: CSSProperties['textAlign']
): ReactEmailNode {
  const base = textStyle(node, align);
  return withMobile(
    {
      type: 'Text',
      content: `•  ${item}`,
      style: {
        ...base,
        textAlign: 'left',
        paddingLeft: '1.2em',
        textIndent: '-1.2em',
      },
    },
    mobileTextStyle(node)
  );
}

// ─── rich inline runs → email-safe HTML ─────────────────────────────────────

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, '&quot;');
}

function isSafeHref(href: string): boolean {
  return /^(https?:|mailto:|tel:|#|\/)/i.test(href.trim());
}

/**
 * Serialize inline runs to email-safe HTML. Links inherit the paragraph color
 * (disclaimers use white underlined links, not browser-blue) and keep their
 * underline; non-link runs only emit a <span> when they diverge from the
 * paragraph base color or carry an underline — so the markup stays minimal.
 */
function runsToHtml(runs: FigmaTextRun[], baseColor?: string): string {
  return runs
    .map((run) => {
      const inner = escapeHtml(run.text);
      if (run.href && isSafeHref(run.href)) {
        const deco = run.underline === false ? 'none' : 'underline';
        return `<a href="${escapeAttr(run.href)}" style="color:inherit;text-decoration:${deco}">${inner}</a>`;
      }
      const styles: string[] = [];
      if (run.underline) styles.push('text-decoration:underline');
      if (run.color && run.color !== baseColor) styles.push(`color:${run.color}`);
      return styles.length ? `<span style="${styles.join(';')}">${inner}</span>` : inner;
    })
    .join('');
}

const RUN_ZERO_WIDTH = /[\u200b\u200c\u200d\ufeff]/g;

/** Split runs at hard line breaks into per-paragraph run arrays (empty = blank line). */
function splitRunsIntoParagraphs(runs: FigmaTextRun[]): FigmaTextRun[][] {
  const paras: FigmaTextRun[][] = [];
  let current: FigmaTextRun[] = [];
  for (const run of runs) {
    const parts = run.text.replace(RUN_ZERO_WIDTH, '').split('\n');
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) {
        paras.push(current);
        current = [];
      }
      if (parts[i] !== '') current.push({ ...run, text: parts[i] });
    }
  }
  paras.push(current);
  return paras;
}

const plainFromRuns = (runs: FigmaTextRun[]): string => runs.map((r) => r.text).join('');

/**
 * Map a text node that carries inline links/underlines to one rich <Text> per
 * paragraph. Reuses Figma's `paragraphSpacing` for inter-paragraph gaps (and an
 * extra line-height per blank line), exactly like `mapParagraphs`, but preserves
 * the inline formatting as sanitized HTML on each block.
 */
function mapRichParagraphs(
  node: ParsedFigmaNode,
  align?: CSSProperties['textAlign']
): ReactEmailNode[] {
  const runs = node.runs ?? [];
  const baseColor = node.color;
  const paragraphs = splitRunsIntoParagraphs(runs);

  type Block = { runs: FigmaTextRun[]; extraBlanks: number };
  const blocks: Block[] = [];
  let pendingBlanks = 0;
  for (const para of paragraphs) {
    const hasContent = para.some((r) => r.text.trim() !== '');
    if (!hasContent) {
      if (blocks.length > 0) pendingBlanks += 1;
      continue;
    }
    if (pendingBlanks > 0 && blocks.length > 0) {
      blocks[blocks.length - 1].extraBlanks += pendingBlanks;
    }
    pendingBlanks = 0;
    blocks.push({ runs: para, extraBlanks: 0 });
  }

  if (blocks.length === 0) return [mapText(node, align)];

  const base = textStyle(node, align);
  const fs = node.fontSize ?? 16;
  const lh = node.lineHeight ?? Math.round(fs * 1.4);
  const gap = node.paragraphSpacing != null ? node.paragraphSpacing : 0;
  const mobile = mobileTextStyle(node);

  return blocks.map((block, i) => {
    const isLast = i === blocks.length - 1;
    const marginBottom = (isLast ? 0 : gap) + block.extraBlanks * lh;
    return withMobile(
      {
        type: 'Text',
        content: plainFromRuns(block.runs),
        html: runsToHtml(block.runs, baseColor),
        style: { ...base, margin: 0, marginBottom },
      } as Extract<ReactEmailNode, { type: 'Text' }>,
      mobile
    );
  });
}

const ZERO_WIDTH = /[\u200b\u200c\u200d\ufeff]/g;

/**
 * Split a TEXT node's copy into real paragraph blocks at Figma's hard line
 * breaks. This is the faithful model of Figma's text engine:
 *  - every `\n` is a paragraph boundary (Figma renders each as its own block);
 *  - the gap between consecutive paragraphs is the node's own `paragraphSpacing`
 *    (0 when unset — so a tight "<Name>," greeting stays tight, while a legal
 *    disclaimer with paragraphSpacing=8 gets 8px between every numbered item);
 *  - an EXTRA blank line (an empty paragraph) adds one line-height of space,
 *    matching designers who insert a blank line for a bigger visual break.
 *
 * Relying on `white-space: pre-line` for these breaks is unreliable across
 * email clients, so we emit one real <Text> per paragraph with explicit
 * spacing. This single rule covers intro copy, multi-paragraph bodies, and the
 * long numbered disclaimers shipped in every campaign.
 */
function mapParagraphs(
  node: ParsedFigmaNode,
  align?: CSSProperties['textAlign']
): ReactEmailNode[] {
  const rawLines = (node.text ?? '').split('\n');

  type Block = { content: string; extraBlanks: number };
  const blocks: Block[] = [];
  let pendingBlanks = 0;

  for (const raw of rawLines) {
    const line = raw.replace(ZERO_WIDTH, '').trim();
    if (line === '') {
      if (blocks.length > 0) pendingBlanks += 1;
      continue;
    }
    if (pendingBlanks > 0 && blocks.length > 0) {
      blocks[blocks.length - 1].extraBlanks += pendingBlanks;
    }
    pendingBlanks = 0;
    blocks.push({ content: line, extraBlanks: 0 });
  }

  if (blocks.length <= 1) return [mapText(node, align)];

  const base = textStyle(node, align);
  const fs = node.fontSize ?? 16;
  const lh = node.lineHeight ?? Math.round(fs * 1.4);
  const gap = node.paragraphSpacing != null ? node.paragraphSpacing : 0;
  const mobile = mobileTextStyle(node);

  return blocks.map((block, i) => {
    const isLast = i === blocks.length - 1;
    const marginBottom = (isLast ? 0 : gap) + block.extraBlanks * lh;
    return withMobile(
      {
        type: 'Text',
        content: block.content,
        style: { ...base, margin: 0, marginBottom },
      } as Extract<ReactEmailNode, { type: 'Text' }>,
      mobile
    );
  });
}

function mapTextNode(node: ParsedFigmaNode, align?: CSSProperties['textAlign']): ReactEmailNode[] {
  // Inline formatting from Figma (hyperlinks / underlines) → rich HTML paragraphs.
  // This must run first: a disclaimer's embedded links live mid-sentence and
  // would otherwise be flattened to plain text by the paragraph/link paths below.
  if (
    node.type === 'TEXT' &&
    node.text?.trim() &&
    !isHeading(node) &&
    node.runs?.some((r) => r.href || r.underline)
  ) {
    return mapRichParagraphs(node, align);
  }

  if (node.type === 'TEXT' && node.text?.trim()) {
    const link = detectLink(node);
    if (link) return [mapLink(node, link.href, align)];
  }
  if (node.type === 'TEXT' && node.text?.trim() && isCtaPhrase(node.text)) {
    return [mapButton(node, align)];
  }
  if (node.type === 'TEXT' && !isHeading(node)) {
    const items = splitBulletItems(node.text ?? '');
    if (items) return items.map((item) => mapBulletItem(node, item, align));
    // Any hard line break → real paragraph blocks (gap = Figma paragraphSpacing).
    if ((node.text ?? '').includes('\n')) return mapParagraphs(node, align);
  }
  return [mapText(node, align)];
}

/** Largest corner radius anywhere in the button subtree (pill shape may live on a child). */
function findMaxCornerRadius(node: ParsedFigmaNode, depth = 0): number {
  let r = node.cornerRadius ?? 0;
  if (depth < 6) {
    for (const c of node.children) r = Math.max(r, findMaxCornerRadius(c, depth + 1));
  }
  return r;
}

/** First visible stroke anywhere in the button subtree (border may live on a child shape). */
function findStroke(node: ParsedFigmaNode, depth = 0): { color?: string; weight: number } {
  const color = normalizeColor(node.strokeColor);
  if (color) return { color, weight: Math.max(1, Math.round(node.strokeWeight ?? 1)) };
  if (depth < 6) {
    for (const c of node.children) {
      const s = findStroke(c, depth + 1);
      if (s.color) return s;
    }
  }
  return { weight: 0 };
}

function mapButton(node: ParsedFigmaNode, align?: CSSProperties['textAlign']): ReactEmailNode {
  void align;
  const texts = findAllTextNodes(node);
  const primaryText = texts.find((t) => (t.text?.length ?? 0) > 2) ?? texts[0];
  const label = inferButtonLabel(node);
  const fill = findButtonFill(node);

  const bg =
    normalizeColor(fill?.backgroundColor) ??
    normalizeColor(node.backgroundColor);

  // Outline / secondary button: little or no fill but a visible stroke (search
  // the whole subtree — the border often lives on a child pill shape).
  const deepStroke = findStroke(node);
  const strokeColor =
    normalizeColor(fill?.strokeColor) ?? normalizeColor(node.strokeColor) ?? deepStroke.color;
  const strokeWeight = fill?.strokeWeight ?? node.strokeWeight ?? deepStroke.weight ?? 0;
  const isOutline = (!bg || isLightColor(bg)) && !!strokeColor && strokeWeight > 0;

  // Preserve the button's ACTUAL Figma colors — they are already correct for the
  // design's own background. We can't see the section background here, so coercing
  // to a "safe" black/white would break faithful designs (e.g. a white-outline
  // button on a dark hero would vanish).
  const textColor = isOutline
    ? primaryText?.color ?? strokeColor ?? '#000000'
    : primaryText?.color ?? '#ffffff';
  // A solid button whose fill couldn't be resolved (gradient/variable fill, or a
  // fill bound to a Figma color token we can't read) must never render as bare
  // text. Fall back to a visible pill that contrasts with the label color.
  const fallbackFill = isLightColor(textColor) ? '#333333' : '#e0e0e0';
  const fillColor = isOutline ? bg ?? 'transparent' : bg ?? fallbackFill;
  const borderColor = strokeColor ?? textColor;
  // Render the border whenever Figma has a visible stroke — outline CTAs depend
  // on it, and a filled CTA can legitimately carry a stroke too. (Previously this
  // only fired for `isOutline`, so any bordered solid button lost its outline.)
  const hasBorder = !!strokeColor && strokeWeight > 0;
  const border = hasBorder
    ? `${Math.max(1, Math.round(strokeWeight))}px solid ${borderColor}`
    : undefined;
  const radius = fill?.cornerRadius ?? findMaxCornerRadius(node);
  const pillRadius = radius >= 8 ? 999 : Math.max(radius, 0);
  const fw = primaryText?.fontWeight ?? 700;
  const fs = primaryText?.fontSize ?? 14;
  const lineH = primaryText?.lineHeight ?? Math.round(fs * 1.2);
  // CTAs read best centered within these card/column layouts.
  const textAlign: CSSProperties['textAlign'] = 'center';

  // CTA dimensions follow the Figma design. Nissan campaign CTAs are typically
  // 290×48 (desktop) / 190×40 (mobile); honour whatever the design specifies and
  // fall back to a 290px-wide pill only when the width is missing. Render
  // full-width only when the button was genuinely designed as a wide bar.
  const designW = Math.round(node.width ?? fill?.width ?? 0);
  const designH = Math.round(node.height ?? fill?.height ?? 0);
  const fullWidth = designW >= 480;
  const widthValue = fullWidth ? '100%' : `${designW > 0 ? designW : 290}px`;

  // Vertical padding is derived so the rendered pill matches the design height
  // (default 48px). Width is fixed to the design width via `widthValue`, and
  // box-sizing: border-box means horizontal padding only insets the label.
  const pr = node.paddingRight ?? fill?.paddingRight ?? 0;
  const pl = node.paddingLeft ?? fill?.paddingLeft ?? 0;
  const targetH = designH > 0 ? Math.min(designH, 64) : 48;
  const borderPx = hasBorder ? Math.max(1, Math.round(strokeWeight)) : 0;
  const vPad = Math.max(4, Math.round((targetH - lineH) / 2) - borderPx);
  const hPad = (pl || pr) > 0 ? Math.min(pl || pr, 48) : 24;
  const verticalPad = `${vPad}px ${hPad}px`;

  const mobileBtn = primaryText ? mobileTextStyle(primaryText) : undefined;

  return {
    type: 'Button',
    href: '#',
    label,
    ...(mobileBtn ? { mobileStyle: mobileBtn } : {}),
    containerStyle: {
      textAlign,
      width: '100%',
      margin: 0,
      padding: 0,
    },
    style: {
      backgroundColor: fillColor,
      color: textColor,
      border,
      borderRadius: pillRadius,
      fontFamily: fontFamily(primaryText ?? node),
      fontSize: `${fs}px`,
      fontWeight: fw,
      lineHeight: primaryText?.lineHeight
        ? `${primaryText.lineHeight}px`
        : `${Math.round(fs * 1.2)}px`,
      padding: verticalPad,
      textAlign: 'center',
      textTransform:
        (primaryText && textTransform(primaryText) === 'uppercase') ||
        (label === label.toUpperCase() && /[A-Z]/.test(label))
          ? 'uppercase'
          : undefined,
      textDecoration: 'none',
      width: widthValue,
      maxWidth: '100%',
      display: 'inline-block',
      boxSizing: 'border-box',
      margin: 0,
    },
  };
}

function mapImage(node: ParsedFigmaNode): ReactEmailNode | null {
  const src = getImageSrc(node);
  if (!src) return null;
  return {
    type: 'Img',
    src,
    width: node.width,
    height: node.height,
    alt: node.name,
    className: `figma-img-${node.id.replace(/[:;]/g, '-')}`,
    // Standalone images (logos, hero art, column art) read best centered in email.
    align: 'center',
    // Small square icons render at a fixed small size, never stretched full-width.
    isIcon: isIconSized(node) || undefined,
  };
}

/** Insert spacers only between direct Figma child groups — not inside split text runs. */
function interleaveChildGaps(
  childGroups: ReactEmailNode[][],
  gap?: number
): ReactEmailNode[] {
  const out: ReactEmailNode[] = [];
  for (let i = 0; i < childGroups.length; i++) {
    if (i > 0 && gap && gap > 0) out.push({ type: 'Spacer', height: gap });
    out.push(...childGroups[i]);
  }
  return out;
}

/**
 * Apply a Figma stroke as CSS. A frame whose sides differ gets only the edges
 * that carry weight — a 1px top rule stays a rule instead of boxing the section.
 */
function applyBorder(
  style: CSSProperties,
  node: ParsedFigmaNode,
  stroke: string,
  weight: number
): void {
  const px = (w: number) => `${Math.max(1, Math.round(w))}px solid ${stroke}`;
  const sides = node.strokeSides;
  if (!sides) {
    style.border = px(weight);
    return;
  }
  if (sides.top > 0) style.borderTop = px(sides.top);
  if (sides.right > 0) style.borderRight = px(sides.right);
  if (sides.bottom > 0) style.borderBottom = px(sides.bottom);
  if (sides.left > 0) style.borderLeft = px(sides.left);
}

/**
 * Visual box styling for a content frame: background color, border (stroke),
 * corner radius and padding. Returns undefined when the frame has no visible
 * box, so plain content isn't wrapped in a redundant Section.
 */
function boxStyle(node: ParsedFigmaNode): CSSProperties | undefined {
  const bg = resolveEffectiveBackground(node);
  const stroke = normalizeColor(node.strokeColor);
  const strokeWeight = node.strokeWeight ?? 0;
  const hasBorder = !!stroke && strokeWeight > 0;
  const pad = formatPadding(node);
  // A transparent frame that still carries auto-layout padding must keep it:
  // designers put the section's side/vertical gutters on such wrapper frames
  // (e.g. a footer's 40px inset), and dropping them collapses copy edge-to-edge.
  if (!bg && !hasBorder && !pad) return undefined;

  // Icon-sized container (e.g. a small dark circle): keep it at its intrinsic
  // small size and centered — NOT width:100% with default padding, which would
  // balloon a ~48px circle into a full-width oval/pill.
  if (isIconSized(node)) {
    const iconStyle: CSSProperties = {
      width: node.width,
      height: node.height,
      boxSizing: 'border-box',
      marginLeft: 'auto',
      marginRight: 'auto',
    };
    if (bg) iconStyle.backgroundColor = bg;
    if (hasBorder) applyBorder(iconStyle, node, stroke!, strokeWeight);
    // Round shape scaled to the icon (half its size), capped at the real radius.
    if (node.cornerRadius && node.cornerRadius > 0) {
      const maxDim = Math.max(node.width ?? 0, node.height ?? 0);
      iconStyle.borderRadius = Math.min(node.cornerRadius, Math.round(maxDim / 2));
    }
    const pad = formatPadding(node);
    if (pad) iconStyle.padding = pad;
    return iconStyle;
  }

  const style: CSSProperties = { width: '100%' };
  const align = nodeTextAlign(node);
  if (align) style.textAlign = align;
  if (bg) style.backgroundColor = bg;
  if (hasBorder) applyBorder(style, node, stroke!, strokeWeight);
  // Colored / bordered blocks need breathing room even when Figma padding is 0;
  // transparent frames only get padding when the design actually specified it.
  if (bg || hasBorder) {
    style.padding = pad ?? '12px 16px';
  } else if (pad) {
    style.padding = pad;
  }
  if (node.cornerRadius && node.cornerRadius > 0) style.borderRadius = node.cornerRadius;
  return style;
}

/** Wrap mapped children in a Section carrying the frame's box styling, if any. */
function wrapBox(node: ParsedFigmaNode, children: ReactEmailNode[]): ReactEmailNode[] {
  const style = boxStyle(node);
  if (children.length === 0) {
    // A small colored/bordered icon whose only glyph was a dropped vector still
    // renders as a small standalone shape (a dark circle); larger empty boxes
    // contribute nothing.
    if (style && isIconSized(node)) return [{ type: 'Section', style, children: [] }];
    return [];
  }
  if (!style) return children;
  return [{ type: 'Section', style, children }];
}

function hasImageDescendant(node: ParsedFigmaNode): boolean {
  if (isImageNode(node)) return true;
  return node.children.some(hasImageDescendant);
}

/** Largest image dimension anywhere in the subtree (0 if no image). */
function largestImageDimension(node: ParsedFigmaNode, depth = 0): number {
  let d = isImageNode(node) ? Math.max(node.width ?? 0, node.height ?? 0) : 0;
  if (depth < 8) {
    for (const c of node.children) d = Math.max(d, largestImageDimension(c, depth + 1));
  }
  return d;
}

/** A column whose only image is icon-sized (icon + short label unit). */
function columnLooksLikeIconUnit(col: ParsedFigmaNode): boolean {
  const dim = largestImageDimension(col);
  return dim > 0 && dim <= ICON_MAX_DIMENSION;
}

/**
 * Content-aware default (used ONLY when no mobile frame says otherwise): should a
 * desktop two-column Row stay 2-up on mobile?
 *
 * Returns true for symmetric "grid / comparison" rows — repeated cards of roughly
 * equal width that each pair an image with text (e.g. X-TRAIL/QASHQAI compare,
 * 2UP product grid). Returns false for asymmetric rows (e.g. image-left /
 * text-right banner) so they collapse to one column on mobile.
 *
 * Thresholds (deliberately conservative):
 *  - every column is 33%–60% of the parent width, and
 *  - the widest and narrowest columns are within 15 percentage points, and
 *  - every column contains BOTH an image and text (same card shape), and
 *  - the images are NOT icon-sized (small icon + label rows stack on mobile).
 */
function columnsAreSymmetricGrid(kids: ParsedFigmaNode[], parentWidth: number): boolean {
  if (kids.length < 2) return false;

  const ratios = kids.map((k) => (k.width && parentWidth ? k.width / parentWidth : NaN));
  if (ratios.some((r) => Number.isNaN(r))) return false; // unknown widths → not confident
  if (Math.max(...ratios) - Math.min(...ratios) > 0.15) return false;
  if (ratios.some((r) => r < 0.33 || r > 0.6)) return false;

  // Rows of small icon + short-label units (contact / social rows) read better
  // stacked on mobile than squeezed multi-up, and are visually distinct from
  // large image cards — let them fall through to the stacking default.
  if (kids.every(columnLooksLikeIconUnit)) return false;

  return kids.every((k) => hasImageDescendant(k) && hasTextDescendant(k));
}

/**
 * A direct child that spans (essentially) the full frame width while the frame
 * itself carries horizontal padding — a deliberately full-bleed element such as
 * edge-to-edge hero art or a banner strip. In email this must render at the full
 * section width, NOT be confined to the padded content box (which shrinks it and
 * invents side gutters the design never had).
 */
function isFullBleedChild(parent: ParsedFigmaNode, child: ParsedFigmaNode): boolean {
  const px = (parent.paddingLeft ?? 0) + (parent.paddingRight ?? 0);
  if (px <= 0) return false; // no padding → nothing to break out of
  const pw = parent.width;
  const cw = child.width;
  if (!pw || !cw) return false;
  // Reaches (near) the full frame width → it overflows the padded content box.
  return cw >= pw - 2;
}

/**
 * Flag full-bleed Img nodes so the renderer drops their bottom margin and lets
 * them span the full section width. A single top-level Img is flagged directly;
 * an Img wrapped in a bleed Section is flagged in place.
 */
function markFullBleed(node: ReactEmailNode): ReactEmailNode {
  if (node.type === 'Img') return { ...node, fullBleed: true };
  return node;
}

/**
 * Wrap a vertical stack's mapped children in the frame's box — but when the frame
 * mixes full-bleed children (edge-to-edge art) with normally-inset content, split
 * the horizontal padding: the outer Section keeps background + vertical padding,
 * full-bleed children render flush to the edges, and contiguous runs of inset
 * content receive the frame's side padding via an inner wrapper. Falls back to
 * the plain wrapBox when there is no full-bleed child (unchanged behavior).
 */
function wrapBoxSplittingBleed(
  node: ParsedFigmaNode,
  childData: { child: ParsedFigmaNode; group: ReactEmailNode[] }[]
): ReactEmailNode[] {
  const nonEmpty = childData.filter((d) => d.group.length > 0);
  const bleed = nonEmpty.map((d) => isFullBleedChild(node, d.child));
  const style = boxStyle(node);
  const pl = node.paddingLeft ?? 0;
  const pr = node.paddingRight ?? 0;

  // Nothing to break out of (no box, no horizontal padding, or no full-bleed
  // child) → normal behavior.
  if (!style || (pl === 0 && pr === 0) || !bleed.some(Boolean)) {
    return wrapBox(node, interleaveChildGaps(nonEmpty.map((d) => d.group), node.gap));
  }

  const pt = node.paddingTop ?? 0;
  const pb = node.paddingBottom ?? 0;

  // Outer keeps bg / border + vertical padding only; horizontal inset moves inward.
  const outerStyle: CSSProperties = { ...style };
  if (pt || pb) outerStyle.padding = `${pt}px 0px ${pb}px 0px`;
  else delete outerStyle.padding;

  const gap = node.gap && node.gap > 0 ? node.gap : 0;
  const out: ReactEmailNode[] = [];
  let emitted = false;
  let i = 0;
  while (i < nonEmpty.length) {
    if (gap && emitted) out.push({ type: 'Spacer', height: gap });
    if (bleed[i]) {
      out.push(...nonEmpty[i].group.map(markFullBleed));
      emitted = true;
      i++;
      continue;
    }
    // Collect a contiguous run of inset (non-bleed) children and inset the run.
    const run: ReactEmailNode[][] = [];
    while (i < nonEmpty.length && !bleed[i]) {
      run.push(nonEmpty[i].group);
      i++;
    }
    const inner = interleaveChildGaps(run, gap);
    out.push({
      type: 'Section',
      style: { width: '100%', paddingLeft: pl, paddingRight: pr },
      children: inner,
    });
    emitted = true;
  }

  return [{ type: 'Section', style: outerStyle, children: out }];
}

// ─── ordered walk (core algorithm) ──────────────────────────────────────────

function mapNode(node: ParsedFigmaNode, align?: CSSProperties['textAlign']): ReactEmailNode[] {
  if (!node.visible) return [];

  // Mixed-mode image export (highest priority). The caller forced this subtree to
  // a flat 2× raster because it's an icon / SVG / vector cluster that email
  // clients render inconsistently. Emit ONE centered Img (the retina PNG shown at
  // its 1× layout width) and DO NOT recurse — its child shapes are baked into the
  // render. This runs BEFORE the SKIP_TYPES drop so a standalone VECTOR/GROUP the
  // user forced is never silently dropped.
  const forceKey = node.nodeId ?? node.id;
  if (forceKey && FORCE_IMAGE_IDS.has(forceKey)) {
    const forcedSrc = forcedImageSrc(node);
    if (forcedSrc) {
      return [
        {
          type: 'Img',
          src: forcedSrc,
          width: node.width != null ? Math.min(node.width, 600) : undefined,
          alt: node.name,
          align: 'center',
          className: `figma-img-${forceKey.replace(/[:;]/g, '-')}`,
          isIcon: isIconSized(node) || undefined,
        },
      ];
    }
    // Forced but no 2× PNG available — skip the subtree instead of emitting
    // broken empty vector shells or duplicate partial layout.
    return [];
  }

  if (SKIP_TYPES.has(node.type)) return [];

  const effectiveAlign = nodeTextAlign(node) ?? align;

  // 1. Plain text
  if (node.type === 'TEXT' && node.text?.trim()) {
    return mapTextNode(node, effectiveAlign);
  }

  // 2. CTA stack — always emit one React Email Button per child
  if (isCtaButtonStack(node)) {
    const kids = getContentChildren(node);
    const groups = kids.map((child) => {
      if (isButtonNode(child) || hasButtonVisualStructure(child)) {
        return [mapButton(child, effectiveAlign)];
      }
      return mapNode(child, effectiveAlign);
    });
    return interleaveChildGaps(groups, node.gap);
  }

  // 3. Button component
  if (isButtonNode(node)) return [mapButton(node, effectiveAlign)];

  // 4. Image
  if (isImageNode(node)) {
    const img = mapImage(node);
    return img ? [img] : [];
  }

  // 5. Named CTA container with any children — flatten (never rasterize)
  const nodeName = node.name.toLowerCase();
  if (/^cta$|cta.?group|cta.?stack|buttons?|actions?/.test(nodeName)) {
    const kids = getContentChildren(node);
    if (kids.length > 0) {
      const groups = kids.map((child) => {
        if (isButtonNode(child) || hasButtonVisualStructure(child)) {
          return [mapButton(child, effectiveAlign)];
        }
        return mapNode(child, effectiveAlign);
      });
      return interleaveChildGaps(groups, node.gap);
    }
  }

  // 5.5 Absolutely-positioned overlay composition (key visual) — rasterize to a
  // single image rather than stacking its overlapping layers. Prefer the frame's
  // exported PNG (overlay text baked in); otherwise fall back to its dominant
  // background image (overlay text/decoration can't be reproduced as live text).
  if (isAbsoluteComposite(node)) {
    if (node.exportUrl) {
      return [
        {
          type: 'Img',
          src: node.exportUrl,
          width: Math.min(node.width ?? 600, 600),
          height: node.height,
          alt: node.name,
          align: 'center',
        },
      ];
    }
    const dominant = findDominantImage(node);
    if (dominant) {
      const img = mapImage(dominant);
      if (img) return [img];
    }
  }

  // 6. Layout group — flatten children in Figma order (preserving any box).
  // Full-bleed children (edge-to-edge art) break out of the frame's side padding.
  if (isLayoutGroup(node)) {
    const kids = getContentChildren(node);
    const childData = kids.map((child) => ({ child, group: mapNode(child, effectiveAlign) }));
    return wrapBoxSplittingBleed(node, childData);
  }

  // 7. Horizontal row
  if (node.layoutMode === 'HORIZONTAL') {
    const kids = getContentChildren(node);
    if (kids.length > 1) {
      const parentW = node.width ?? 600;
      const gutter = node.gap && node.gap > 0 ? Math.round(node.gap / 2) : 0;

      const mapped = kids.map((child) => ({
        child,
        children: mapNode(child, effectiveAlign),
      }));
      // Drop columns that produced nothing (e.g. icon slots that were skipped).
      const nonEmpty = mapped.filter((m) => m.children.length > 0);

      // Collapsed to a single real column → flatten inside the box, no Row.
      if (nonEmpty.length <= 1) {
        return wrapBox(node, nonEmpty.flatMap((m) => m.children));
      }

      // Mobile column decision (strongest signal first):
      //  1. explicit mobile frame (keepColumnsOnMobile) always wins;
      //  2. else content-aware default: symmetric image+text cards stay 2-up;
      //  3. else the ambiguous-case fallback constant.
      const stackOnMobile =
        node.keepColumnsOnMobile !== undefined
          ? !node.keepColumnsOnMobile
          : columnsAreSymmetricGrid(nonEmpty.map((m) => m.child), parentW)
            ? false
            : STACK_COLUMNS_ON_MOBILE_BY_DEFAULT;

      const columns: ReactEmailNode[] = nonEmpty.map((m, i) => ({
        type: 'Column',
        className: stackOnMobile ? RESPONSIVE_COL_CLASS : undefined,
        style: {
          width: m.child.width
            ? `${Math.min(100, Math.round((m.child.width / parentW) * 100))}%`
            : `${Math.round(100 / nonEmpty.length)}%`,
          verticalAlign: 'top',
          ...(gutter
            ? {
                paddingLeft: i === 0 ? 0 : gutter,
                paddingRight: i === nonEmpty.length - 1 ? 0 : gutter,
              }
            : {}),
        },
        children: m.children,
      }));
      return wrapBox(node, [{ type: 'Row', style: { width: '100%' }, children: columns }]);
    }
  }

  // 8. Recurse into children (preserving any box). Full-bleed children break out
  // of the frame's side padding so edge-to-edge art isn't inset/shrunk.
  const kids = getContentChildren(node);
  if (kids.length > 0) {
    const childData = kids.map((child) => ({ child, group: mapNode(child, effectiveAlign) }));
    return wrapBoxSplittingBleed(node, childData);
  }

  return [];
}

function isFullSection(child: ParsedFigmaNode): boolean {
  if (!CONTAINER_TYPES.has(child.type)) return false;
  if (isButtonNode(child)) return false;
  const h = child.height ?? 0;
  return h >= 200 || hasTextDescendant(child);
}

// ─── public entry ─────────────────────────────────────────────────────────────

/**
 * Pair a desktop child with its mobile counterpart. Matches by layer name first
 * (Figma mobile frames are usually name-for-name copies); for TEXT nodes, falls
 * back to identical trimmed copy so typography still transfers when a designer
 * renamed the mobile layer.
 */
function matchMobileChild(
  child: ParsedFigmaNode,
  mobChildren: ParsedFigmaNode[]
): ParsedFigmaNode | undefined {
  const byName = mobChildren.find((c) => c.name === child.name);
  if (byName) return byName;
  if (child.type === 'TEXT' && child.text) {
    const target = child.text.trim();
    return mobChildren.find((c) => c.type === 'TEXT' && c.text?.trim() === target);
  }
  return undefined;
}

function applyMobileLayout(desktop: ParsedFigmaNode, mobile: ParsedFigmaNode): ParsedFigmaNode {
  function walk(desk: ParsedFigmaNode, mob: ParsedFigmaNode | undefined): ParsedFigmaNode {
    if (!mob) return desk;

    // Per-row mobile column decision: if this desktop row's mobile counterpart
    // is ALSO a multi-column horizontal layout, keep two columns on mobile;
    // if the mobile counterpart is vertical/single-column, let it stack.
    let keepColumnsOnMobile: boolean | undefined;
    if (desk.layoutMode === 'HORIZONTAL' && getContentChildren(desk).length > 1) {
      keepColumnsOnMobile =
        mob.layoutMode === 'HORIZONTAL' && getContentChildren(mob).length > 1;
    }

    // Capture the mobile frame's own typography for TEXT nodes so the generated
    // email can shrink font size / line height on small screens via a media
    // query, instead of rendering desktop type on mobile.
    const isText = desk.type === 'TEXT';
    return {
      ...desk,
      // Desktop keeps its OWN padding / gap / background — the mobile frame must
      // not overwrite the desktop render (that made a desktop header inherit the
      // mobile frame's tighter padding). Mobile-specific typography still flows
      // to `mobileStyle` media queries below, and column behavior via
      // `keepColumnsOnMobile`.
      keepColumnsOnMobile,
      mobileFontSize: isText ? mob.fontSize ?? desk.mobileFontSize : desk.mobileFontSize,
      mobileLineHeight: isText ? mob.lineHeight ?? desk.mobileLineHeight : desk.mobileLineHeight,
      mobileLetterSpacing: isText ? mob.letterSpacing ?? desk.mobileLetterSpacing : desk.mobileLetterSpacing,
      children: desk.children.map((child) => {
        const mc = matchMobileChild(child, mob.children);
        return walk(child, mc);
      }),
    };
  }
  return walk(desktop, mobile);
}

function buildPathList(node: ParsedFigmaNode, parentPath: string[] = []): string[][] {
  const current = [...parentPath, node.name];
  const paths = [current];
  for (const child of node.children) paths.push(...buildPathList(child, current));
  return paths;
}

function mergeMobileImages(
  tree: ReactEmailNode,
  desktopRoot: ParsedFigmaNode,
  mobileRoot: ParsedFigmaNode | undefined,
  warnings: string[]
): ReactEmailNode {
  if (!mobileRoot) return tree;
  const mobile = mobileRoot;
  const paths = buildPathList(desktopRoot);
  let swaps = 0;

  function walk(node: ReactEmailNode): ReactEmailNode {
    if (node.type === 'Img') {
      const matchPath = paths.find((p) => findNodeByPath(desktopRoot, p)?.name === node.alt);
      if (matchPath) {
        const mob = findNodeByPath(mobile, matchPath);
        const mobSrc = mob?.exportUrl ?? (mob ? getImageSrc(mob) : undefined);
        if (mobSrc && mobSrc !== node.src) {
          swaps++;
          return { ...node, mobileSrc: mobSrc, className: node.className ?? 'figma-img-responsive' };
        }
      }
      return node;
    }
    if ('children' in node && Array.isArray(node.children)) {
      return { ...node, children: node.children.map(walk) } as ReactEmailNode;
    }
    return node;
  }

  const merged = walk(tree);
  if (swaps > 0) warnings.push(`Applied ${swaps} mobile image swap(s).`);
  return merged;
}

export function buildPrimitivesFromFigma(
  desktopNode: ParsedFigmaNode,
  mobileNode: ParsedFigmaNode | undefined,
  warnings: string[],
  forceImageIds?: Set<string>
): ReactEmailNode {
  // Set the mixed-mode forced-image set for this (synchronous) build. Reset each
  // call so an empty/absent set restores identical default behavior.
  FORCE_IMAGE_IDS = forceImageIds ?? new Set();

  let root =
    mobileNode != null ? applyMobileLayout(desktopNode, mobileNode) : desktopNode;

  root = unwrapSingleWrapper(stripExports(root));

  const rootBg = resolveEffectiveBackground(root) ?? inferHeroBackground(root);
  const topKids = getContentChildren(root);

  const sectionNodes: ReactEmailNode[] = [];

  // Multiple full-height page sections (e.g. hero + footer), not content + CTA
  // siblings — and not image + copy within one composed card (1-up, promo, etc.).
  const fullSections = topKids.filter(isFullSection);
  const hasCtaSibling = topKids.some(
    (k) =>
      /^cta$/i.test(k.name.trim()) ||
      isCtaButtonStack(k) ||
      (isButtonNode(k) && !isFullSection(k))
  );
  const isComposedCard =
    root.layoutMode === 'VERTICAL' &&
    topKids.length >= 2 &&
    topKids.length <= 4 &&
    (root.height ?? 0) < 900 &&
    topKids.some((k) => isImageNode(k) || hasImageDescendant(k)) &&
    topKids.some((k) => hasTextDescendant(k));
  // A horizontal auto-layout root is a row of columns, not stacked page
  // sections — let mapNode build the Row/Column structure instead of splitting.
  const rootIsRow =
    root.layoutMode === 'HORIZONTAL' && getContentChildren(root).length > 1;
  const shouldSplit =
    fullSections.length > 1 && !hasCtaSibling && !rootIsRow && !isComposedCard;

  if (shouldSplit) {
    for (const section of fullSections) {
      const children = mapNode(section, nodeTextAlign(root));
      if (children.length === 0) continue;
      const style = sectionStyle(section);
      if (!style.backgroundColor && rootBg) style.backgroundColor = rootBg;
      sectionNodes.push({ type: 'Section', style, children });
    }
  } else {
    // Single hero block — map ALL top-level children (content frame + CTA buttons)
    let children = mapNode(root, nodeTextAlign(root));
    let style = sectionStyle(root);
    if (!style.backgroundColor && rootBg) style.backgroundColor = rootBg;

    // mapNode already wrapped the root in its own box Section (same bg/padding as
    // sectionStyle here). Collapse that duplicate instead of nesting two identical
    // boxes — otherwise the root's padding/background is applied twice (e.g. a
    // header logo ends up double-padded and shrunken).
    if (children.length === 1 && children[0].type === 'Section') {
      const inner = children[0];
      style = { ...style, ...inner.style };
      children = inner.children;
    }

    sectionNodes.push({
      type: 'Section',
      style,
      children,
    });
  }

  let tree: ReactEmailNode;

  if (sectionNodes.length === 0) {
    tree = {
      type: 'Section',
      style: { maxWidth: 600, width: '100%', margin: '0 auto', backgroundColor: rootBg },
      children: [],
    };
  } else if (sectionNodes.length === 1 && sectionNodes[0].type === 'Section') {
    const s = sectionNodes[0];
    tree = {
      type: 'Section',
      style: {
        maxWidth: 600,
        width: '100%',
        margin: '0 auto',
        backgroundColor: s.style?.backgroundColor ?? rootBg,
        ...s.style,
      },
      children: s.children,
    };
  } else {
    tree = {
      type: 'Section',
      style: { maxWidth: 600, width: '100%', margin: '0 auto', backgroundColor: rootBg },
      children: sectionNodes,
    };
  }

  // Text-only layouts (e.g. a copy-heavy hero) often have no horizontal padding
  // in Figma because the text frame is width-constrained — which collapses to
  // edge-to-edge copy in email. Guarantee a side gutter. Skipped when the layout
  // contains imagery, so full-bleed hero art is never inset.
  if (
    tree.type === 'Section' &&
    hasTextDescendant(root) &&
    !hasImageDescendant(root)
  ) {
    tree = {
      ...tree,
      style: {
        ...tree.style,
        padding: bumpHorizontalPadding(tree.style?.padding as string | undefined),
      },
    };
  }

  warnings.push('Built React Email Heading, Text, and Button components from Figma layer order.');
  if (FORCE_IMAGE_IDS.size > 0) {
    let rasterized = 0;
    let missingRender = 0;
    const countForced = (n: ParsedFigmaNode) => {
      const key = n.nodeId ?? n.id;
      if (key && FORCE_IMAGE_IDS.has(key)) {
        if (n.exportUrl || n.forcedExportUrl) rasterized++;
        else missingRender++;
        return;
      }
      n.children.forEach(countForced);
    };
    countForced(desktopNode);
    warnings.push(
      `Mixed-mode: rasterized ${rasterized} icon/SVG/vector subtree(s) to 2× PNG(s); text & layout kept structured.`
    );
    if (missingRender > 0) {
      warnings.push(
        `${missingRender} layer(s) were marked for image export but had no 2× PNG — re-fetch the frame or narrow your selection.`
      );
    }
  }
  return mergeMobileImages(tree, desktopNode, mobileNode, warnings);
}

export function countAstNodes(node: ReactEmailNode): number {
  let n = 1;
  if ('children' in node && Array.isArray(node.children)) {
    for (const c of node.children) n += countAstNodes(c);
  }
  return n;
}
