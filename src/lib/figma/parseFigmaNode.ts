import type { CSSProperties } from 'react';
import type { FigmaNodeDocument, FigmaVariable } from './client';
import {
  extractBackgroundColor,
  extractImageRef,
  extractSolidFromPaints,
  extractStrokeColor,
  extractTextColor,
} from './resolveFigmaColor';

/**
 * One styled span of a text node — the reconstruction of Figma's character-level
 * formatting (inline hyperlinks, underlines, and per-run color) that the flat
 * `characters` string throws away. Consecutive characters sharing the same
 * formatting are merged into a single run.
 */
export interface FigmaTextRun {
  text: string;
  underline?: boolean;
  href?: string;
  color?: string;
}

export interface ParsedFigmaNode {
  id: string;
  type: string;
  name: string;
  width?: number;
  height?: number;
  /** Layout position from Figma (used to merge loose vector clusters into one PNG). */
  x?: number;
  y?: number;
  visible: boolean;
  text?: string;
  fontSize?: number;
  fontWeight?: number;
  fontFamily?: string;
  lineHeight?: number;
  letterSpacing?: number;
  paragraphSpacing?: number;
  textAlign?: string;
  /** Figma text casing: UPPER | LOWER | TITLE | ORIGINAL. */
  textCase?: string;
  color?: string;
  backgroundColor?: string;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  gap?: number;
  layoutMode?: string;
  primaryAxisAlign?: string;
  counterAxisAlign?: string;
  cornerRadius?: number;
  /**
   * Per-corner radii (top-left, top-right, bottom-right, bottom-left), set only
   * when the corners differ. A card rounded on its top edge only must not become
   * rounded on all four, and `cornerRadius` alone cannot express that.
   */
  cornerRadii?: [number, number, number, number];
  strokeColor?: string;
  strokeWeight?: number;
  /**
   * Per-side stroke weights, set only when the sides differ. A Figma rule drawn
   * on one edge (a footer's hairline divider) must not become a box.
   */
  strokeSides?: { top: number; right: number; bottom: number; left: number };
  imageRef?: string;
  /** PNG export from Figma /images API — pixel-accurate render of this node */
  exportUrl?: string;
  /**
   * A 2× PNG downloaded for a node that the mixed-mode image detector / user may
   * FORCE to render as a flat raster (icons, SVGs, vector art). Kept SEPARATE
   * from `exportUrl` on purpose: the default build never reads it, so importing
   * these extra renders can't change existing output. The build only rasterizes
   * such a subtree when its id is in the caller's `forceImageIds` set — see
   * `figmaPrimitives.mapNode`.
   */
  forcedExportUrl?: string;
  /**
   * Character-level styled spans (inline links / underlines / colors). Present
   * only when the text actually carries such formatting; plain text leaves this
   * undefined so the simple text path is used.
   */
  runs?: FigmaTextRun[];
  componentId?: string;
  nodeId?: string;
  /**
   * Transient build-time flag (not from Figma): set on HORIZONTAL frames during
   * mobile-layout merge to record whether the mobile counterpart is also a
   * multi-column row. Controls whether the generated columns stack on mobile.
   */
  keepColumnsOnMobile?: boolean;
  /**
   * Transient build-time typography copied from the matched mobile Figma frame
   * during the mobile-layout merge. Drives per-node `@media (max-width:600px)`
   * overrides so mobile keeps the design's own font size / line height instead
   * of inheriting the (often much larger) desktop values.
   */
  mobileFontSize?: number;
  mobileLineHeight?: number;
  mobileLetterSpacing?: number;
  children: ParsedFigmaNode[];
}

const RASTER_TYPES = new Set([
  'VECTOR',
  'ELLIPSE',
  'STAR',
  'POLYGON',
  'BOOLEAN_OPERATION',
  'LINE',
  'REGULAR_POLYGON',
]);

function extractTextStyle(
  node: FigmaNodeDocument,
  variables?: Record<string, FigmaVariable>
): {
  fontSize?: number;
  fontWeight?: number;
  fontFamily?: string;
  lineHeight?: number;
  letterSpacing?: number;
  paragraphSpacing?: number;
  textAlign?: string;
  textCase?: string;
  color?: string;
} {
  const style = node.style as
    | {
        fontSize?: number;
        fontWeight?: number;
        fontFamily?: string;
        lineHeightPx?: number;
        lineHeightPercentFontSize?: number;
        lineHeightUnit?: string;
        letterSpacing?: number;
        paragraphSpacing?: number;
        textAlignHorizontal?: string;
        textCase?: string;
      }
    | undefined;

  let lineHeight = style?.lineHeightPx;
  if (
    lineHeight == null &&
    style?.lineHeightPercentFontSize != null &&
    style.fontSize
  ) {
    lineHeight = Math.round((style.lineHeightPercentFontSize / 100) * style.fontSize);
  }

  return {
    fontSize: style?.fontSize,
    fontWeight: style?.fontWeight,
    fontFamily: style?.fontFamily,
    lineHeight,
    letterSpacing: style?.letterSpacing,
    paragraphSpacing: style?.paragraphSpacing,
    textAlign: style?.textAlignHorizontal?.toLowerCase(),
    textCase: style?.textCase,
    color: extractTextColor(node, variables),
  };
}

/** Merge neighbouring runs whose formatting is identical (keeps output compact). */
function mergeRuns(runs: FigmaTextRun[]): FigmaTextRun[] {
  const out: FigmaTextRun[] = [];
  for (const run of runs) {
    const prev = out[out.length - 1];
    if (
      prev &&
      prev.underline === run.underline &&
      prev.href === run.href &&
      prev.color === run.color
    ) {
      prev.text += run.text;
    } else {
      out.push({ ...run });
    }
  }
  return out;
}

/**
 * Reconstruct a text node's inline formatting from Figma's character override
 * tables. Figma stores hyperlinks, underlines and per-word color NOT on the base
 * text style but per-character: `characterStyleOverrides[i]` indexes into
 * `styleOverrideTable`. A disclaimer that reads as dark base text with white,
 * underlined links is the norm — so this is the only faithful source of truth.
 *
 * Returns undefined when there is no inline formatting worth preserving (no
 * override table and no base link/underline), so ordinary copy stays on the
 * simple text path.
 */
function extractTextRuns(
  node: FigmaNodeDocument,
  variables?: Record<string, FigmaVariable>
): FigmaTextRun[] | undefined {
  const chars = node.characters;
  if (!chars) return undefined;

  const style = node.style as
    | { textDecoration?: string; hyperlink?: { url?: string } }
    | undefined;
  const baseColor = extractTextColor(node, variables);
  const baseUnderline = style?.textDecoration === 'UNDERLINE';
  const baseHref = style?.hyperlink?.url;

  const overrides = node.characterStyleOverrides;
  const table = node.styleOverrideTable;

  if (!overrides?.length || !table) {
    // No per-character data: only interesting if the WHOLE node is a link/underline.
    if (baseHref || baseUnderline) {
      return [{ text: chars, color: baseColor, underline: baseUnderline || undefined, href: baseHref || undefined }];
    }
    return undefined;
  }

  const runFor = (id: number, start: number, end: number): FigmaTextRun | null => {
    const text = chars.slice(start, end);
    if (text === '') return null;
    const ov = id !== 0 ? table[String(id)] : undefined;
    const color = ov?.fills ? extractSolidFromPaints(ov.fills, 1, variables) ?? baseColor : baseColor;
    const underline = ov?.textDecoration ? ov.textDecoration === 'UNDERLINE' : baseUnderline;
    const href = ov?.hyperlink?.url ?? baseHref;
    return { text, color, underline: underline || undefined, href: href || undefined };
  };

  const runs: FigmaTextRun[] = [];
  let runStart = 0;
  let runId = overrides[0] ?? 0;
  for (let i = 1; i <= chars.length; i++) {
    const id = i < chars.length ? overrides[i] ?? 0 : -1; // sentinel flushes last run
    if (id !== runId) {
      const run = runFor(runId, runStart, i);
      if (run) runs.push(run);
      runStart = i;
      runId = id;
    }
  }

  const merged = mergeRuns(runs);
  // Only worth keeping if some run actually carries inline formatting.
  const hasFormatting = merged.some((r) => r.href || r.underline);
  const colors = new Set(merged.map((r) => r.color ?? ''));
  if (!hasFormatting && colors.size <= 1) return undefined;
  return merged;
}

/** Dominant run color, weighted by character count — the node's effective color. */
function dominantRunColor(runs: FigmaTextRun[]): string | undefined {
  const weight = new Map<string, number>();
  for (const run of runs) {
    if (!run.color) continue;
    weight.set(run.color, (weight.get(run.color) ?? 0) + run.text.length);
  }
  let best: string | undefined;
  let bestN = -1;
  for (const [color, n] of weight) {
    if (n > bestN) {
      best = color;
      bestN = n;
    }
  }
  return best;
}

export function parseFigmaNode(
  node: FigmaNodeDocument,
  variables?: Record<string, FigmaVariable>
): ParsedFigmaNode {
  const box = node.absoluteBoundingBox;
  const textStyle = node.type === 'TEXT' ? extractTextStyle(node, variables) : {};
  const runs = node.type === 'TEXT' ? extractTextRuns(node, variables) : undefined;
  // When character overrides exist, the real color is the dominant run color —
  // NOT the base fill (designers routinely leave a dark base fill and override
  // every character to white, which otherwise renders as unreadable dark text).
  const dominantColor = runs ? dominantRunColor(runs) : undefined;
  const cornerRadius =
    typeof node.cornerRadius === 'number'
      ? node.cornerRadius
      : Array.isArray(node.rectangleCornerRadii)
        ? Math.max(...node.rectangleCornerRadii)
        : undefined;
  const cornerRadii = asymmetricCornerRadii(node.rectangleCornerRadii);

  // A border can be lost three ways: the weight lives in `individualStrokeWeights`
  // (per-side), the weight is omitted entirely (Figma's implicit 1px default), or
  // the stroke color is variable-bound. Resolve the color first, then derive a
  // weight that survives all three so outline buttons keep their border.
  const strokeColor = extractStrokeColor(node, variables);
  const strokeWeight = effectiveStrokeWeight(node, strokeColor);

  const parsed: ParsedFigmaNode = {
    id: node.id,
    type: node.type,
    name: node.name,
    width: box?.width != null ? Math.round(box.width) : undefined,
    height: box?.height != null ? Math.round(box.height) : undefined,
    x: box?.x != null ? Math.round(box.x) : undefined,
    y: box?.y != null ? Math.round(box.y) : undefined,
    visible: node.visible !== false,
    text: node.characters?.trim() || undefined,
    fontSize: textStyle.fontSize,
    fontWeight: textStyle.fontWeight,
    fontFamily: textStyle.fontFamily,
    lineHeight: textStyle.lineHeight,
    letterSpacing: textStyle.letterSpacing,
    paragraphSpacing: textStyle.paragraphSpacing,
    textAlign: textStyle.textAlign,
    textCase: textStyle.textCase,
    color: dominantColor ?? textStyle.color,
    runs,
    backgroundColor: extractBackgroundColor(node, variables),
    paddingTop: node.paddingTop,
    paddingRight: node.paddingRight,
    paddingBottom: node.paddingBottom,
    paddingLeft: node.paddingLeft,
    gap: node.itemSpacing,
    layoutMode: node.layoutMode,
    primaryAxisAlign: node.primaryAxisAlignItems,
    counterAxisAlign: node.counterAxisAlignItems,
    cornerRadius,
    cornerRadii,
    strokeColor,
    strokeWeight,
    strokeSides: strokeSidesOf(node),
    imageRef: extractImageRef(node.fills),
    componentId: node.componentId,
    nodeId: node.id,
    children: visibleDocumentChildren(node).map((child) => parseFigmaNode(child, variables)),
  };

  return parsed;
}

/**
 * Figma's four corner radii, kept only when they actually differ. Uniform
 * corners stay undefined so downstream keeps emitting the simpler shorthand.
 */
function asymmetricCornerRadii(
  radii: number[] | undefined
): [number, number, number, number] | undefined {
  if (!Array.isArray(radii) || radii.length !== 4) return undefined;
  const corners = radii.map((r) => (typeof r === 'number' && r > 0 ? r : 0));
  if (corners.every((r) => r === corners[0])) return undefined;
  return corners as [number, number, number, number];
}

/**
 * Resolve a node's stroke weight so a visible border is never dropped.
 *
 * Figma reports borders three different ways:
 *  - `individualStrokeWeights` (per-side) — checked first, because Figma keeps
 *    sending a stale uniform `strokeWeight` alongside it. Trusting the scalar
 *    turns a one-sided rule into a full box.
 *  - `strokeWeight` (uniform) — the common case.
 *  - neither, when the weight is left at Figma's implicit 1px default — if a
 *    stroke paint resolved to a color, we treat the weight as 1.
 *
 * The number returned is the thickest side; `strokeSides` carries which edges
 * actually have it.
 */
function effectiveStrokeWeight(
  node: FigmaNodeDocument,
  strokeColor: string | undefined
): number | undefined {
  const sides = node.individualStrokeWeights;
  if (sides) {
    const maxSide = Math.max(sides.top ?? 0, sides.right ?? 0, sides.bottom ?? 0, sides.left ?? 0);
    if (maxSide > 0) return maxSide;
    // Every side is 0 — the design explicitly has no border here.
    return undefined;
  }
  if (typeof node.strokeWeight === 'number' && node.strokeWeight > 0) {
    return node.strokeWeight;
  }
  if (strokeColor) return 1;
  return node.strokeWeight;
}

/**
 * Per-side weights, only when the sides genuinely differ. Uniform borders stay
 * undefined so downstream keeps emitting the simpler shorthand.
 */
function strokeSidesOf(
  node: FigmaNodeDocument
): { top: number; right: number; bottom: number; left: number } | undefined {
  const sides = node.individualStrokeWeights;
  if (!sides) return undefined;
  const resolved = {
    top: sides.top ?? 0,
    right: sides.right ?? 0,
    bottom: sides.bottom ?? 0,
    left: sides.left ?? 0,
  };
  const values = Object.values(resolved);
  if (values.every((v) => v === values[0])) return undefined;
  return resolved;
}

/**
 * Return the children that are actually visible in the rendered frame.
 *
 * Besides honouring the `visible` flag, this drops children that are fully
 * clipped away by a fixed-height (or fixed-width) frame with "Clip content"
 * enabled. Design systems commonly stack every component variant inside one
 * slot (e.g. a 48px-tall "CTA" frame holding 5 button variants); Figma shows
 * only the top one, so the converter must not emit all of them.
 *
 * This is the canonical rule: anything that summarizes or converts a raw Figma
 * document must use it, or the design context will describe layers the build
 * never emits.
 */
export function visibleDocumentChildren(node: FigmaNodeDocument): FigmaNodeDocument[] {
  const kids = (node.children ?? []).filter((child) => child.visible !== false);
  if (kids.length <= 1 || node.clipsContent === false) return kids;

  const pBox = node.absoluteBoundingBox;
  if (!pBox || pBox.x == null || pBox.y == null) return kids;
  const px = pBox.x;
  const py = pBox.y;
  const pw = pBox.width;
  const ph = pBox.height;

  const TOL = 2;
  return kids.filter((child) => {
    const cb = child.absoluteBoundingBox;
    if (!cb || cb.x == null || cb.y == null) return true;
    // Fully past the clipped bottom edge → hidden.
    if (ph != null && cb.y - py >= ph - TOL) return false;
    // Fully past the clipped right edge → hidden.
    if (pw != null && cb.x - px >= pw - TOL) return false;
    return true;
  });
}

export function collectImageRefs(node: ParsedFigmaNode): string[] {
  const refs: string[] = [];
  if (node.imageRef && !node.imageRef.startsWith('/') && !node.imageRef.startsWith('http')) {
    refs.push(node.imageRef);
  }
  for (const child of node.children) {
    refs.push(...collectImageRefs(child));
  }
  return refs;
}

export function hasTextDescendant(node: ParsedFigmaNode): boolean {
  if (node.type === 'TEXT' && node.text?.trim()) return true;
  return node.children.some(hasTextDescendant);
}

export function findAllTextNodes(node: ParsedFigmaNode): ParsedFigmaNode[] {
  const results: ParsedFigmaNode[] = [];
  if (node.type === 'TEXT' && node.text?.trim()) {
    results.push(node);
  }
  for (const child of node.children) {
    results.push(...findAllTextNodes(child));
  }
  return results;
}

/** Pill-shaped control: short height + solid rounded fill (even when label text is vectorized). */
export function hasButtonVisualStructure(node: ParsedFigmaNode, depth = 0): boolean {
  if (depth > 6) return false;

  const h = node.height ?? 0;
  if (h > 0 && h >= 28 && h <= 120) {
    const name = node.name.toLowerCase();
    if (/button|cta|btn|primary|secondary|pill|action/.test(name)) return true;

    for (const child of node.children) {
      if (
        (child.type === 'RECTANGLE' || child.type === 'FRAME') &&
        normalizeColor(child.backgroundColor) &&
        !child.imageRef
      ) {
        const cw = child.width ?? 0;
        const ch = child.height ?? 0;
        const radius = child.cornerRadius ?? 0;
        // A small roughly-square fill is an icon container (e.g. a dark circle),
        // not a button pill — don't treat it as button visual structure.
        const isIconSquare =
          cw > 0 && ch > 0 && cw <= 80 && ch <= 80 && cw / ch >= 0.6 && cw / ch <= 1.67;
        if (isIconSquare) continue;
        if (ch >= h * 0.4 || radius >= 8) return true;
      }
    }
  }

  for (const child of node.children) {
    if (child.type === 'FRAME' || child.type === 'INSTANCE' || child.type === 'COMPONENT' || child.type === 'GROUP') {
      if (hasButtonVisualStructure(child, depth + 1)) return true;
    }
  }
  return false;
}

export function hasButtonDescendant(node: ParsedFigmaNode): boolean {
  if (hasButtonVisualStructure(node)) return true;
  return node.children.some(hasButtonDescendant);
}

function nodeHasImageDescendant(node: ParsedFigmaNode): boolean {
  const isImg =
    node.type === 'IMAGE' ||
    (!!node.imageRef &&
      (node.type === 'RECTANGLE' ||
        node.type === 'FRAME' ||
        node.type === 'INSTANCE' ||
        node.type === 'COMPONENT'));
  if (isImg) return true;
  return node.children.some(nodeHasImageDescendant);
}

export function collectExportNodeIds(
  root: ParsedFigmaNode,
  forceIds?: Iterable<string>
): string[] {
  const ids = new Set<string>();

  function walk(node: ParsedFigmaNode, depth: number) {
    if (!node.nodeId || !node.visible) return;

    const hasText = hasTextDescendant(node);
    const hasButtons = hasButtonDescendant(node);
    const hasImageFill = Boolean(node.imageRef);
    const isImageType = node.type === 'IMAGE' || (node.type === 'RECTANGLE' && hasImageFill);

    // Absolutely-positioned overlay composition (no auto-layout) that layers
    // imagery + text — a hero "key visual". Email can't reproduce free-form
    // overlap, so export the whole frame as one PNG even though it has text, and
    // don't recurse into its layers (they're baked into the export).
    const isOverlayComposite =
      (node.type === 'FRAME' ||
        node.type === 'INSTANCE' ||
        node.type === 'COMPONENT' ||
        node.type === 'GROUP') &&
      node.layoutMode !== 'HORIZONTAL' &&
      node.layoutMode !== 'VERTICAL' &&
      node.children.length >= 2 &&
      nodeHasImageDescendant(node);

    if (isImageType || RASTER_TYPES.has(node.type)) {
      ids.add(node.nodeId);
    } else if (node.type === 'INSTANCE' && !hasText && !hasButtons) {
      ids.add(node.nodeId);
    } else if (isOverlayComposite && depth >= 1) {
      ids.add(node.nodeId);
      return; // rasterize the whole composite; skip its individual layers
    } else if (
      depth === 1 &&
      (node.type === 'FRAME' || node.type === 'GROUP' || node.type === 'INSTANCE') &&
      !hasText &&
      !hasButtons
    ) {
      ids.add(node.nodeId);
    }

    for (const child of node.children) {
      walk(child, depth + 1);
    }
  }

  walk(root, 0);

  // Union any caller-forced IDs (mixed-mode image export) so their 2× PNGs are
  // fetched even when the heuristics above would not have exported them (e.g. an
  // icon/vector GROUP nested deeper than depth 1).
  if (forceIds) {
    for (const id of forceIds) {
      if (id) ids.add(id);
    }
  }

  return [...ids];
}

export function getTopLevelSections(root: ParsedFigmaNode): ParsedFigmaNode[] {
  return getContentChildren(root);
}

export function collectNodeIdsForRender(node: ParsedFigmaNode): string[] {
  return collectExportNodeIds(node);
}

export function resolveImageRefsInTree(
  node: ParsedFigmaNode,
  refMap: Record<string, string>
): ParsedFigmaNode {
  return {
    ...node,
    imageRef: node.imageRef && refMap[node.imageRef] ? refMap[node.imageRef] : node.imageRef,
    children: node.children.map((child) => resolveImageRefsInTree(child, refMap)),
  };
}

export function resolveExportUrls(
  node: ParsedFigmaNode,
  exportMap: Record<string, string>
): ParsedFigmaNode {
  const exportUrl = node.nodeId ? exportMap[node.nodeId] : undefined;
  return {
    ...node,
    exportUrl: exportUrl ?? node.exportUrl,
    imageRef:
      exportUrl && (RASTER_TYPES.has(node.type) || node.type === 'IMAGE')
        ? exportUrl
        : node.imageRef,
    children: node.children.map((child) => resolveExportUrls(child, exportMap)),
  };
}

/**
 * Attach `forcedExportUrl` (the 2× PNG downloaded for mixed-mode image export) to
 * nodes by nodeId. Deliberately parallel to — and independent of — `exportUrl`:
 * this field is invisible to the default build, so populating it never changes
 * existing output. The build reads it only for nodes the caller forced to image.
 */
export function resolveForcedExportUrls(
  node: ParsedFigmaNode,
  forcedMap: Record<string, string>
): ParsedFigmaNode {
  const id = node.nodeId ?? node.id;
  const forcedExportUrl = id ? forcedMap[id] : undefined;
  return {
    ...node,
    forcedExportUrl: forcedExportUrl ?? node.forcedExportUrl,
    children: node.children.map((child) => resolveForcedExportUrls(child, forcedMap)),
  };
}

export function findNodeByPath(
  node: ParsedFigmaNode,
  path: string[]
): ParsedFigmaNode | undefined {
  if (path.length === 0) return node;
  const [head, ...rest] = path;
  const child = node.children.find((c) => c.name === head);
  if (!child) return undefined;
  return findNodeByPath(child, rest);
}

export function findNodeByNodeId(
  root: ParsedFigmaNode,
  targetId: string
): ParsedFigmaNode | undefined {
  const key = root.nodeId ?? root.id;
  if (key === targetId) return root;
  for (const child of root.children) {
    const found = findNodeByNodeId(child, targetId);
    if (found) return found;
  }
  return undefined;
}

export function nodePath(node: ParsedFigmaNode, parentPath: string[] = []): string {
  return [...parentPath, node.name].join('/');
}

export function isBackgroundRect(child: ParsedFigmaNode, parent: ParsedFigmaNode): boolean {
  if (child.imageRef) return false;
  if (!normalizeColor(child.backgroundColor)) return false;

  // TEXT nodes carry a text-fill colour in Figma — never decorative backgrounds.
  // Disclaimer layer names often contain "based", which falsely matched `/base/`.
  if (child.type === 'TEXT') return false;

  const name = child.name.toLowerCase();
  if (/\bbackground\b|^bg$|\bbase\b|\bsurface\b/i.test(name)) {
    if (child.type !== 'RECTANGLE' && child.type !== 'FRAME') return false;
    return true;
  }

  // Auto-layout button fills are full-size rectangles with rounded corners — not section backgrounds.
  const hasSiblingText = parent.children.some(
    (c) => c.id !== child.id && c.type === 'TEXT' && c.text
  );
  if (hasSiblingText && (child.cornerRadius ?? 0) >= 4) return false;
  if (/button|cta|shape|pill/i.test(name)) return false;

  // Only leaf fill rectangles count as decorative backgrounds — not content wrapper frames.
  if (child.type !== 'RECTANGLE') return false;

  const wRatio = parent.width && child.width ? child.width / parent.width : 1;
  const hRatio = parent.height && child.height ? child.height / parent.height : 1;

  return wRatio >= 0.85 && hRatio >= 0.85;
}

export function findButtonBackgroundShape(
  node: ParsedFigmaNode,
  depth = 0
): ParsedFigmaNode | undefined {
  if (depth > 6) return undefined;

  const candidates = node.children.filter(
    (c) =>
      (c.type === 'RECTANGLE' || c.type === 'FRAME') &&
      c.backgroundColor &&
      !c.imageRef &&
      !isBackgroundRect(c, node) &&
      !c.children.some((t) => t.type === 'TEXT' && t.text)
  );

  if (candidates.length > 0) {
    const named = candidates.find((c) =>
      /background|^bg$|fill|button|cta|shape/i.test(c.name)
    );
    if (named) return named;

    const rounded = candidates.find((c) => (c.cornerRadius ?? 0) > 0);
    if (rounded) return rounded;

    return candidates.sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0];
  }

  for (const child of node.children) {
    if (child.type === 'FRAME' || child.type === 'GROUP' || child.type === 'INSTANCE') {
      const nested = findButtonBackgroundShape(child, depth + 1);
      if (nested) return nested;
    }
  }

  return undefined;
}

export function tryMapCompositeButton(
  node: ParsedFigmaNode,
  depth = 0
): { shape: ParsedFigmaNode; text: ParsedFigmaNode } | null {
  if (depth > 6) return null;

  const children = node.children.filter((c) => c.visible !== false);
  const textNodes = children.filter((c) => c.type === 'TEXT' && c.text);
  const shapeNodes = children.filter(
    (c) =>
      (c.type === 'RECTANGLE' || c.type === 'FRAME') &&
      c.backgroundColor &&
      !c.imageRef &&
      !isBackgroundRect(c, node)
  );

  const name = node.name.toLowerCase();
  const nameMatch =
    /button|cta|btn|call.?to.?action|primary|secondary|shop|buy|learn|sign.?up|register/.test(
      name
    );

  if (textNodes.length === 1 && shapeNodes.length > 0) {
    const text = textNodes[0];
    const shape = findButtonBackgroundShape(node) ?? shapeNodes[0];
    const height = node.height ?? shape.height ?? 0;
    const width = node.width ?? shape.width ?? 0;

    if (nameMatch || (height > 0 && height <= 100 && width > 0 && width <= 600)) {
      return { shape, text };
    }
  }

  for (const child of children) {
    if (child.type === 'FRAME' || child.type === 'GROUP' || child.type === 'INSTANCE') {
      const nested = tryMapCompositeButton(child, depth + 1);
      if (nested) return nested;
    }
  }

  return null;
}

export function normalizeColor(color?: string): string | undefined {
  if (!color) return undefined;
  const compact = color.replace(/\s/g, '').toLowerCase();
  if (compact === 'rgba(0,0,0,0)' || compact === 'transparent') return undefined;
  return color;
}

/**
 * Whether a frame paints its own surface (fill, visible border, or rounded
 * corners).
 *
 * Two stacked surfaces are not interchangeable: the outer frame commonly
 * provides the section background while the child is a contrasting rounded
 * card. Merging them loses the inner fill and moves its radius onto the outer
 * background, so every converter must consult this before collapsing a wrapper.
 */
export function hasOwnVisualSurface(node: ParsedFigmaNode): boolean {
  return (
    normalizeColor(node.backgroundColor) != null ||
    (normalizeColor(node.strokeColor) != null && (node.strokeWeight ?? 0) > 0) ||
    (node.cornerRadius ?? 0) > 0 ||
    node.cornerRadii != null
  );
}

/** CSS `border-radius` for a node, preserving asymmetric corners. */
export function cornerRadiusCss(node: ParsedFigmaNode): string | number | undefined {
  if (node.cornerRadii) {
    return node.cornerRadii.map((r) => `${r}px`).join(' ');
  }
  return node.cornerRadius && node.cornerRadius > 0 ? node.cornerRadius : undefined;
}

export function resolveEffectiveBackground(node: ParsedFigmaNode): string | undefined {
  const direct = normalizeColor(node.backgroundColor);
  if (direct) return direct;

  const bgChild = node.children.find((c) => isBackgroundRect(c, node));
  const fromChild = normalizeColor(bgChild?.backgroundColor);
  if (fromChild) return fromChild;

  for (const child of node.children) {
    if (child.type === 'RECTANGLE' || child.type === 'FRAME') {
      const nested = normalizeColor(child.backgroundColor);
      if (nested && isBackgroundRect(child, node)) return nested;
    }
  }

  return undefined;
}

export function getContentChildren(node: ParsedFigmaNode): ParsedFigmaNode[] {
  const effectiveBg = resolveEffectiveBackground(node);
  return node.children.filter((child) => {
    if (isBackgroundRect(child, node) && child.backgroundColor === effectiveBg) {
      return false;
    }
    return true;
  });
}

export function findTextChild(node: ParsedFigmaNode): ParsedFigmaNode | undefined {
  for (const child of node.children) {
    if (child.type === 'TEXT' && child.text) return child;
    const nested = findTextChild(child);
    if (nested) return nested;
  }
  return undefined;
}

export function mapCounterAxisAlign(
  layoutMode: string | undefined,
  counterAxisAlign: string | undefined,
  primaryAxisAlign?: string
): CSSProperties['textAlign'] {
  const counter = counterAxisAlign?.toUpperCase();
  const primary = primaryAxisAlign?.toUpperCase();

  if (layoutMode === 'VERTICAL' || layoutMode === 'GRID') {
    if (counter === 'CENTER') return 'center';
    if (counter === 'MAX') return 'right';
    if (counter === 'MIN') return 'left';
  }

  if (layoutMode === 'HORIZONTAL') {
    if (primary === 'CENTER') return 'center';
    if (primary === 'MAX') return 'right';
    if (counter === 'CENTER') return 'center';
    return 'left';
  }

  if (counter === 'CENTER' || primary === 'CENTER') return 'center';
  if (counter === 'MAX' || primary === 'MAX') return 'right';
  return 'left';
}
