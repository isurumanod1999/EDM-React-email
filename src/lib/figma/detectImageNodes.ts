import {
  getContentChildren,
  hasButtonDescendant,
  hasTextDescendant,
  type ParsedFigmaNode,
} from './parseFigmaNode';

/**
 * Mixed-mode image detection.
 *
 * Prefer whole icon BADGES (e.g. a 56×56 circle + glyph paths) as ONE 2× PNG,
 * not each inner VECTOR path. Email clients can't render SVGs; designers often
 * build badges from many small vector layers under one frame — or as loose paths
 * when no frame exists (we merge those into one raster).
 */

const GRAPHIC_SHAPE_TYPES = new Set([
  'VECTOR',
  'BOOLEAN_OPERATION',
  'ELLIPSE',
  'STAR',
  'POLYGON',
  'LINE',
  'REGULAR_POLYGON',
]);

const CONTAINER_TYPES = new Set(['FRAME', 'COMPONENT', 'INSTANCE', 'GROUP']);

/** Nissan-style benefit badges are 56×56; allow up to 96px containers. */
const DEFAULT_ICON_MAX_DIMENSION = 96;

/** Never rasterize tiny path fragments alone (clock hands, arrow tips, etc.). */
const MIN_STANDALONE_GRAPHIC_PX = 40;

export interface DetectImageNodesOptions {
  iconMaxDimension?: number;
}

export interface ImageMergeCluster {
  /** All Figma nodeIds that compose one visual icon — merged into one PNG. */
  nodeIds: string[];
}

function nodeId(node: ParsedFigmaNode): string | undefined {
  return node.nodeId ?? node.id;
}

function isGraphicShape(node: ParsedFigmaNode): boolean {
  return GRAPHIC_SHAPE_TYPES.has(node.type);
}

function maxSide(node: ParsedFigmaNode): number {
  return Math.max(node.width ?? 0, node.height ?? 0);
}

function isIconSized(node: ParsedFigmaNode, max: number): boolean {
  const w = node.width ?? 0;
  const h = node.height ?? 0;
  if (w <= 0 || h <= 0) return false;
  if (w > max || h > max) return false;
  const aspect = w / h;
  return aspect >= 0.55 && aspect <= 1.85;
}

function isGraphicOnlySubtree(node: ParsedFigmaNode): boolean {
  let sawGraphic = false;
  let ok = true;

  const walk = (n: ParsedFigmaNode) => {
    if (!ok) return;
    if (!n.visible) return;
    if (n.type === 'TEXT' && n.text?.trim()) {
      ok = false;
      return;
    }
    // Only real raster content disqualifies a badge. Vector shapes legitimately
    // carry an `imageRef`/export once the import has rendered each path, so
    // testing `imageRef` alone would classify every already-imported icon as a
    // photo — leaving only fragment-level exports of the glyph.
    if (n.type === 'IMAGE' || (n.imageRef && !isGraphicShape(n))) {
      ok = false;
      return;
    }
    if (isGraphicShape(n)) sawGraphic = true;
    // Filled circle behind the glyph counts as part of the badge art.
    if (
      n.type === 'RECTANGLE' &&
      normalizeColor(n.backgroundColor) &&
      (n.cornerRadius ?? 0) >= Math.min(n.width ?? 0, n.height ?? 0) / 2 - 1
    ) {
      sawGraphic = true;
    }
    for (const child of n.children) walk(child);
  };

  walk(node);
  return ok && sawGraphic;
}

function normalizeColor(color?: string): string | undefined {
  if (!color) return undefined;
  const c = color.trim();
  return c.length > 0 ? c : undefined;
}

/**
 * A whole icon badge export root: graphic-only container up to `iconMax` px
 * (typical 56×56 benefit icons), or a named INSTANCE like "Icon-badge".
 */
export function isIconBadgeExportRoot(node: ParsedFigmaNode, iconMax: number): boolean {
  if (!node.visible || !nodeId(node)) return false;
  if (hasTextDescendant(node) || hasButtonDescendant(node)) return false;

  if (
    node.type === 'INSTANCE' &&
    /icon[-\s]?badge/i.test(node.name) &&
    isIconSized(node, iconMax)
  ) {
    return true;
  }

  if (!CONTAINER_TYPES.has(node.type)) return false;
  if (!isGraphicOnlySubtree(node)) return false;
  return isIconSized(node, iconMax);
}

function isDescendantOf(node: ParsedFigmaNode, ancestor: ParsedFigmaNode): boolean {
  if (node === ancestor) return true;
  for (const child of ancestor.children) {
    if (isDescendantOf(node, child)) return true;
  }
  return false;
}

/** Keep only nodes that aren't under another export root in the same list. */
function filterOutermostRoots(candidates: ParsedFigmaNode[]): ParsedFigmaNode[] {
  return candidates.filter(
    (node) => !candidates.some((other) => other !== node && isDescendantOf(node, other))
  );
}

function findIconBadgeAmongChildren(
  parent: ParsedFigmaNode,
  iconMax: number
): ParsedFigmaNode | undefined {
  for (const child of getContentChildren(parent)) {
    if (!child.visible) continue;
    if (isIconBadgeExportRoot(child, iconMax)) return child;
    if (CONTAINER_TYPES.has(child.type) && isGraphicOnlySubtree(child) && !hasTextDescendant(child)) {
      const w = child.width ?? 0;
      const h = child.height ?? 0;
      if (w > 0 && h > 0 && w <= iconMax && h <= iconMax && countGraphicShapes(child) >= 2) {
        return child;
      }
    }
  }
  return undefined;
}

function countGraphicShapes(node: ParsedFigmaNode): number {
  let n = 0;
  const walk = (x: ParsedFigmaNode) => {
    if (!x.visible) return;
    if (isGraphicShape(x)) n++;
    x.children.forEach(walk);
  };
  walk(node);
  return n;
}

/**
 * Loose vector paths sitting beside copy (no 56×56 wrapper in Figma) — merge to
 * one PNG instead of six 7×7 exports.
 */
export function detectImageMergeClusters(
  root: ParsedFigmaNode,
  opts?: DetectImageNodesOptions
): ImageMergeCluster[] {
  const iconMax = opts?.iconMaxDimension ?? DEFAULT_ICON_MAX_DIMENSION;
  const clusters: ImageMergeCluster[] = [];

  const walk = (node: ParsedFigmaNode) => {
    if (!node.visible) return;

    if (findIconBadgeAmongChildren(node, iconMax)) {
      node.children.forEach(walk);
      return;
    }

    const kids = getContentChildren(node).filter((c) => c.visible);
    const hasTextSibling = kids.some((c) => c.type === 'TEXT' && c.text?.trim());
    if (hasTextSibling) {
      const loose = kids.filter(
        (c) =>
          (isGraphicShape(c) || (CONTAINER_TYPES.has(c.type) && isGraphicOnlySubtree(c))) &&
          !hasTextDescendant(c) &&
          !hasButtonDescendant(c) &&
          maxSide(c) < MIN_STANDALONE_GRAPHIC_PX
      );
      const looseIds = loose.map((c) => nodeId(c)).filter((id): id is string => Boolean(id));
      if (loose.length >= 2) {
        clusters.push({ nodeIds: looseIds });
      }
    }

    node.children.forEach(walk);
  };

  walk(root);
  return clusters;
}

/**
 * Node IDs to rasterize as a single 2× PNG (whole badges, not inner paths).
 */
export function detectImageNodeIds(
  root: ParsedFigmaNode,
  opts?: DetectImageNodesOptions
): string[] {
  const iconMax = opts?.iconMaxDimension ?? DEFAULT_ICON_MAX_DIMENSION;
  const candidates: ParsedFigmaNode[] = [];

  const walk = (node: ParsedFigmaNode, depth: number) => {
    if (!node.visible) return;

    if (depth > 0 && isIconBadgeExportRoot(node, iconMax)) {
      candidates.push(node);
      return;
    }

    if (depth > 0 && isGraphicShape(node)) {
      if (
        maxSide(node) >= MIN_STANDALONE_GRAPHIC_PX &&
        !hasTextDescendant(node) &&
        !hasButtonDescendant(node)
      ) {
        candidates.push(node);
      }
      return;
    }

    if (CONTAINER_TYPES.has(node.type)) {
      const badge = findIconBadgeAmongChildren(node, iconMax);
      if (badge) candidates.push(badge);
    }

    for (const child of node.children) walk(child, depth + 1);
  };

  walk(root, 0);

  const outermost = filterOutermostRoots(candidates);
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const n of outermost) {
    const id = nodeId(n);
    if (id && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

/** All node IDs that should receive the same merged PNG URL. */
export function flattenMergeClusterIds(clusters: ImageMergeCluster[]): string[] {
  const out: string[] = [];
  for (const c of clusters) out.push(...c.nodeIds);
  return out;
}

export interface ImageNodeOutlineEntry {
  id: string;
  name: string;
  type: string;
  width?: number;
  height?: number;
  text?: string;
  /** Depth below the imported root (root itself is never included). */
  depth: number;
  childCount: number;
}

export function collectImageNodeOutline(
  root: ParsedFigmaNode,
  opts?: { maxNodes?: number; maxTextLength?: number }
): ImageNodeOutlineEntry[] {
  const maxNodes = opts?.maxNodes ?? 400;
  const maxText = opts?.maxTextLength ?? 60;
  const out: ImageNodeOutlineEntry[] = [];

  const textPreview = (node: ParsedFigmaNode): string | undefined => {
    if (node.text?.trim()) return node.text.trim().slice(0, maxText);
    for (const child of node.children) {
      const preview = textPreview(child);
      if (preview) return preview;
    }
    return undefined;
  };

  const walk = (node: ParsedFigmaNode, depth: number) => {
    if (out.length >= maxNodes) return;
    if (!node.visible) return;
    const id = nodeId(node);
    if (depth > 0 && id) {
      out.push({
        id,
        name: node.name,
        type: node.type,
        width: node.width,
        height: node.height,
        text: textPreview(node),
        depth,
        childCount: node.children.filter((child) => child.visible).length,
      });
    }
    for (const child of node.children) walk(child, depth + 1);
  };

  walk(root, 0);
  return out;
}
