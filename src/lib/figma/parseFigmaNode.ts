import type { CSSProperties } from 'react';
import type { FigmaNodeDocument, FigmaVariable } from './client';
import {
  extractBackgroundColor,
  extractImageRef,
  extractStrokeColor,
  extractTextColor,
} from './resolveFigmaColor';

export interface ParsedFigmaNode {
  id: string;
  type: string;
  name: string;
  width?: number;
  height?: number;
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
  strokeColor?: string;
  strokeWeight?: number;
  imageRef?: string;
  /** PNG export from Figma /images API — pixel-accurate render of this node */
  exportUrl?: string;
  componentId?: string;
  nodeId?: string;
  /**
   * Transient build-time flag (not from Figma): set on HORIZONTAL frames during
   * mobile-layout merge to record whether the mobile counterpart is also a
   * multi-column row. Controls whether the generated columns stack on mobile.
   */
  keepColumnsOnMobile?: boolean;
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

export function parseFigmaNode(
  node: FigmaNodeDocument,
  variables?: Record<string, FigmaVariable>
): ParsedFigmaNode {
  const box = node.absoluteBoundingBox;
  const textStyle = node.type === 'TEXT' ? extractTextStyle(node, variables) : {};
  const cornerRadius =
    typeof node.cornerRadius === 'number'
      ? node.cornerRadius
      : Array.isArray(node.rectangleCornerRadii)
        ? Math.max(...node.rectangleCornerRadii)
        : undefined;

  const parsed: ParsedFigmaNode = {
    id: node.id,
    type: node.type,
    name: node.name,
    width: box?.width != null ? Math.round(box.width) : undefined,
    height: box?.height != null ? Math.round(box.height) : undefined,
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
    color: textStyle.color,
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
    strokeColor: extractStrokeColor(node, variables),
    strokeWeight: node.strokeWeight,
    imageRef: extractImageRef(node.fills),
    componentId: node.componentId,
    nodeId: node.id,
    children: (node.children ?? [])
      .filter((child) => child.visible !== false)
      .map((child) => parseFigmaNode(child, variables)),
  };

  return parsed;
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

export function collectExportNodeIds(root: ParsedFigmaNode): string[] {
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

export function nodePath(node: ParsedFigmaNode, parentPath: string[] = []): string {
  return [...parentPath, node.name].join('/');
}

export function isBackgroundRect(child: ParsedFigmaNode, parent: ParsedFigmaNode): boolean {
  if (child.imageRef) return false;
  if (!normalizeColor(child.backgroundColor)) return false;

  const name = child.name.toLowerCase();
  if (/background|^bg$|base|surface/.test(name)) return true;

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
