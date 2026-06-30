import type { CSSProperties } from 'react';
import type { ParsedFigmaNode } from './parseFigmaNode';
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
 * Fallback mobile behavior for a two-column Row when there is NO mobile Figma
 * frame AND the content-aware heuristic (columnsAreSymmetricGrid) can't decide
 * (e.g. unknown widths). Symmetric image+text card grids stay 2-up regardless;
 * this only covers the truly ambiguous case.
 * `true`  → stack to a single column on mobile (safest for narrow screens).
 * `false` → keep two columns on mobile.
 */
const STACK_COLUMNS_ON_MOBILE_BY_DEFAULT = true;

/** Icons (small circular/square containers) are at most this wide/tall. */
const ICON_MAX_DIMENSION = 80;

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

function isLightColor(color?: string): boolean {
  if (!color) return false;
  const c = color.replace(/\s/g, '').toLowerCase();
  if (c === '#fff' || c === '#ffffff' || c === 'white') return true;
  const m = c.match(/^rgba?\((\d+),(\d+),(\d+)/);
  if (m) return Number(m[1]) >= 200 && Number(m[2]) >= 200 && Number(m[3]) >= 200;
  return false;
}

function inferHeroBackground(node: ParsedFigmaNode): string | undefined {
  const texts = findAllTextNodes(node);
  if (texts.length === 0) return undefined;
  if (texts.every((t) => isLightColor(t.color))) return '#000000';
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
    lineHeight: node.lineHeight ? `${node.lineHeight}px` : `${Math.round(fs * 1.5)}px`,
    letterSpacing: node.letterSpacing ? `${node.letterSpacing}px` : undefined,
    textTransform: textTransform(node),
    whiteSpace: 'pre-line',
  };
}

function stripExports(node: ParsedFigmaNode): ParsedFigmaNode {
  // Keep the full-frame PNG for raster-only nodes AND for absolutely-positioned
  // overlay compositions (key visuals) — those must be rasterized even though
  // they contain overlay text, because email can't reproduce free-form overlap.
  const keepRasterOnly = !hasTextDescendant(node) && !hasButtonDescendant(node);
  const keep = keepRasterOnly || isAbsoluteComposite(node);
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
  return {
    type: 'Link',
    href,
    content: node.text?.trim() ?? '',
    style: { ...base, textDecoration: 'underline', display: 'inline-block' },
  };
}

/** Find the solid-fill shape inside a button component (prefer largest colored fill). */
function findButtonFill(node: ParsedFigmaNode, depth = 0): ParsedFigmaNode | undefined {
  if (depth > 6) return undefined;

  const candidates: ParsedFigmaNode[] = [];

  function collect(n: ParsedFigmaNode, d: number) {
    if (d > 6) return;
    for (const child of n.children) {
      if (
        (child.type === 'RECTANGLE' || child.type === 'FRAME') &&
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
  if (node.imageRef?.startsWith('/') || node.imageRef?.startsWith('http')) return node.imageRef;
  return node.imageRef;
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

  if (isHeading(node)) {
    return {
      type: 'Heading',
      content: text,
      as: headingLevel(node),
      style,
    };
  }
  return {
    type: 'Text',
    content: text,
    style,
  };
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
  return {
    type: 'Text',
    content: `•  ${item}`,
    style: {
      ...base,
      textAlign: 'left',
      paddingLeft: '1.2em',
      textIndent: '-1.2em',
    },
  };
}

/**
 * Split a TEXT node's copy into paragraphs at newline boundaries. Figma stores
 * multi-paragraph body copy as a single TEXT node with `\n` separators; relying
 * on `white-space: pre-line` to render those breaks is unreliable across email
 * clients, so emit one real paragraph block per line with proper spacing.
 */
function mapParagraphs(
  node: ParsedFigmaNode,
  align?: CSSProperties['textAlign']
): ReactEmailNode[] {
  // Paragraph boundaries are BLANK lines (\n\n). A single newline is a line
  // break *within* a paragraph and is preserved (rendered via `pre-line`), so
  // tight breaks like a "<Name>," greeting above its sentence don't get an
  // extra paragraph gap.
  const paragraphs = (node.text ?? '')
    .split(/\n[ \t]*\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length <= 1) return [mapText(node, align)];

  const base = textStyle(node, align);
  const fs = node.fontSize ?? 16;
  const gap =
    node.paragraphSpacing && node.paragraphSpacing > 0
      ? node.paragraphSpacing
      : Math.round(fs * 0.9);

  return paragraphs.map((content, i) => ({
    type: 'Text',
    content,
    style: {
      ...base,
      margin: 0,
      marginBottom: i === paragraphs.length - 1 ? 0 : gap,
    },
  }));
}

function mapTextNode(node: ParsedFigmaNode, align?: CSSProperties['textAlign']): ReactEmailNode[] {
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
    // Only break into separate paragraph blocks when there's a blank line.
    // Plain single line breaks stay in one block and render via `pre-line`.
    if (/\n[ \t]*\n/.test(node.text ?? '')) return mapParagraphs(node, align);
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
  if (color && (node.strokeWeight ?? 0) > 0) return { color, weight: node.strokeWeight ?? 1 };
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
  const border = isOutline
    ? `${Math.max(1, Math.round(strokeWeight))}px solid ${borderColor}`
    : undefined;
  const radius = fill?.cornerRadius ?? findMaxCornerRadius(node);
  const pillRadius = radius >= 8 ? 999 : Math.max(radius, 0);
  const fw = primaryText?.fontWeight ?? 700;
  const fs = primaryText?.fontSize ?? 14;
  // A CTA pill should hug its label and center, not stretch edge-to-edge. Only
  // render full-width when the Figma button itself is near the email's content
  // width (i.e. it was genuinely designed as a full-width bar).
  const buttonWidth = node.width ?? fill?.width ?? 0;
  const fullWidth = buttonWidth >= 480;
  // CTAs read best centered within these card/column layouts.
  const textAlign: CSSProperties['textAlign'] = 'center';

  const pt = node.paddingTop ?? fill?.paddingTop ?? 0;
  const pr = node.paddingRight ?? fill?.paddingRight ?? 0;
  const pb = node.paddingBottom ?? fill?.paddingBottom ?? 0;
  const pl = node.paddingLeft ?? fill?.paddingLeft ?? 0;
  // Cap the height used for padding so a tall CTA *frame* (often padded with
  // surrounding space in Figma) doesn't become an absurdly tall pill.
  const btnH = Math.min(node.height ?? fill?.height ?? 0, 56);
  const cappedPad = (v: number) => Math.min(Math.max(v, 0), 18);
  const verticalPad =
    pt || pb
      ? `${cappedPad(pt || 14)}px ${pr || 28}px ${cappedPad(pb || 14)}px ${pl || 28}px`
      : btnH > 0
        ? `${Math.min(Math.max(12, Math.round((btnH - fs) / 2)), 18)}px ${pr || 28}px`
        : '14px 28px';

  return {
    type: 'Button',
    href: '#',
    label,
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
      width: fullWidth ? '100%' : 'auto',
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
 * Visual box styling for a content frame: background color, border (stroke),
 * corner radius and padding. Returns undefined when the frame has no visible
 * box, so plain content isn't wrapped in a redundant Section.
 */
function boxStyle(node: ParsedFigmaNode): CSSProperties | undefined {
  const bg = resolveEffectiveBackground(node);
  const stroke = normalizeColor(node.strokeColor);
  const strokeWeight = node.strokeWeight ?? 0;
  const hasBorder = !!stroke && strokeWeight > 0;
  if (!bg && !hasBorder) return undefined;

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
    if (hasBorder) iconStyle.border = `${Math.max(1, Math.round(strokeWeight))}px solid ${stroke}`;
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
  if (hasBorder) style.border = `${Math.max(1, Math.round(strokeWeight))}px solid ${stroke}`;
  // Colored / bordered blocks need breathing room even when Figma padding is 0.
  style.padding = formatPadding(node) ?? '12px 16px';
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

// ─── ordered walk (core algorithm) ──────────────────────────────────────────

function mapNode(node: ParsedFigmaNode, align?: CSSProperties['textAlign']): ReactEmailNode[] {
  if (!node.visible) return [];
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

  // 6. Layout group — flatten children in Figma order (preserving any box)
  if (isLayoutGroup(node)) {
    const kids = getContentChildren(node);
    const groups = kids.map((child) => mapNode(child, effectiveAlign));
    return wrapBox(node, interleaveChildGaps(groups, node.gap));
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

  // 8. Recurse into children (preserving any box)
  const kids = getContentChildren(node);
  if (kids.length > 0) {
    const groups = kids.map((child) => mapNode(child, effectiveAlign));
    return wrapBox(node, interleaveChildGaps(groups, node.gap));
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

    return {
      ...desk,
      paddingTop: mob.paddingTop ?? desk.paddingTop,
      paddingRight: mob.paddingRight ?? desk.paddingRight,
      paddingBottom: mob.paddingBottom ?? desk.paddingBottom,
      paddingLeft: mob.paddingLeft ?? desk.paddingLeft,
      gap: mob.gap ?? desk.gap,
      backgroundColor: resolveEffectiveBackground(mob) ?? resolveEffectiveBackground(desk),
      keepColumnsOnMobile,
      children: desk.children.map((child) => {
        const mc = mob.children.find((c) => c.name === child.name);
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
  warnings: string[]
): ReactEmailNode {
  let root =
    mobileNode != null ? applyMobileLayout(desktopNode, mobileNode) : desktopNode;

  root = unwrapSingleWrapper(stripExports(root));

  const rootBg = resolveEffectiveBackground(root) ?? inferHeroBackground(root);
  const topKids = getContentChildren(root);

  const sectionNodes: ReactEmailNode[] = [];

  // Multiple full-height page sections (e.g. hero + footer), not content + CTA siblings
  const fullSections = topKids.filter(isFullSection);
  const hasCtaSibling = topKids.some(
    (k) =>
      /^cta$/i.test(k.name.trim()) ||
      isCtaButtonStack(k) ||
      (isButtonNode(k) && !isFullSection(k))
  );
  // A horizontal auto-layout root is a row of columns, not stacked page
  // sections — let mapNode build the Row/Column structure instead of splitting.
  const rootIsRow =
    root.layoutMode === 'HORIZONTAL' && getContentChildren(root).length > 1;
  const shouldSplit = fullSections.length > 1 && !hasCtaSibling && !rootIsRow;

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
    const children = mapNode(root, nodeTextAlign(root));
    const style = sectionStyle(root);
    if (!style.backgroundColor && rootBg) style.backgroundColor = rootBg;

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
  return mergeMobileImages(tree, desktopNode, mobileNode, warnings);
}

export function countAstNodes(node: ReactEmailNode): number {
  let n = 1;
  if ('children' in node && Array.isArray(node.children)) {
    for (const c of node.children) n += countAstNodes(c);
  }
  return n;
}
