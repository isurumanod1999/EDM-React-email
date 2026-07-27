import type { ParsedFigmaNode } from './parseFigmaNode';

/** One layer line from `extractDesignContext`, e.g. INSTANCE "Icon-badge" 56×56px … */
export interface DesignContextLayerHint {
  type: string;
  name: string;
  width?: number;
  height?: number;
}

const CONTEXT_LAYER_LINE =
  /^\s*-\s+([A-Z_]+)\s+"([^"]+)"\s+(\d+)×(\d+)px/i;

/** Lines like: export INSTANCE "Icon-badge" 56×56 as image */
const INSTRUCTION_QUOTED =
  /(?:export|raster|flatten|image)\s+(?:the\s+)?(?:INSTANCE|FRAME|GROUP|COMPONENT)?\s*"([^"]+)"/gi;

const INSTRUCTION_ICON_BADGE =
  /icon[-\s]?badge|"Icon-badge"/gi;

/**
 * Parse layer summaries from the Figma design-context block (Structure: section).
 */
export function parseDesignContextLayerHints(designContext: string): DesignContextLayerHint[] {
  const hints: DesignContextLayerHint[] = [];
  for (const line of designContext.split('\n')) {
    const m = line.match(CONTEXT_LAYER_LINE);
    if (!m) continue;
    hints.push({
      type: m[1].toUpperCase(),
      name: m[2],
      width: Number(m[3]),
      height: Number(m[4]),
    });
  }
  return hints;
}

/**
 * Parse explicit export targets from free-form build instructions.
 */
export function parseInstructionExportNames(instruction: string): string[] {
  const names = new Set<string>();
  let m: RegExpExecArray | null;
  const re = new RegExp(INSTRUCTION_QUOTED.source, INSTRUCTION_QUOTED.flags);
  while ((m = re.exec(instruction)) !== null) {
    if (m[1]?.trim()) names.add(m[1].trim());
  }
  if (INSTRUCTION_ICON_BADGE.test(instruction)) {
    names.add('Icon-badge');
  }
  return [...names];
}

function nodeKey(node: ParsedFigmaNode): string | undefined {
  return node.nodeId ?? node.id;
}

function sizeClose(
  node: ParsedFigmaNode,
  width?: number,
  height?: number,
  tolerancePx = 4
): boolean {
  if (width == null || height == null) return true;
  const w = node.width ?? 0;
  const h = node.height ?? 0;
  if (w <= 0 || h <= 0) return true;
  return Math.abs(w - width) <= tolerancePx && Math.abs(h - height) <= tolerancePx;
}

function nameMatches(nodeName: string, hintName: string): boolean {
  const a = nodeName.trim().toLowerCase();
  const b = hintName.trim().toLowerCase();
  return a === b || a.includes(b) || b.includes(a);
}

function hintMatchesNode(node: ParsedFigmaNode, hint: DesignContextLayerHint): boolean {
  if (!node.visible || !nodeKey(node)) return false;
  if (hint.type && node.type.toUpperCase() !== hint.type) return false;
  if (!nameMatches(node.name, hint.name)) return false;
  return sizeClose(node, hint.width, hint.height);
}

/**
 * Resolve Figma nodeIds for layers described in design context and/or instructions.
 * Example context line:
 *   - INSTANCE "Icon-badge" 56×56px bg=#22252f layout=HORIZONTAL gap=11.25
 */
export function findNodeIdsFromDesignHints(
  root: ParsedFigmaNode,
  designContext?: string,
  instruction?: string
): string[] {
  const hints: DesignContextLayerHint[] = [];

  if (designContext?.trim()) {
    hints.push(...parseDesignContextLayerHints(designContext));
  }

  if (instruction?.trim()) {
    hints.push(...parseDesignContextLayerHints(instruction));
  }

  for (const name of parseInstructionExportNames(instruction ?? '')) {
    hints.push({ type: 'INSTANCE', name, width: 56, height: 56 });
  }

  if (hints.length === 0) return [];

  const ids: string[] = [];
  const seen = new Set<string>();

  const walk = (node: ParsedFigmaNode) => {
    if (!node.visible) return;
    for (const hint of hints) {
      if (hintMatchesNode(node, hint)) {
        const id = nodeKey(node);
        if (id && !seen.has(id)) {
          seen.add(id);
          ids.push(id);
        }
      }
    }
    node.children.forEach(walk);
  };

  walk(root);
  return ids;
}

/** Default export targets for Nissan-style benefit rows when context mentions Icon-badge. */
export function defaultIconBadgeHintsFromContext(designContext: string): DesignContextLayerHint[] {
  return parseDesignContextLayerHints(designContext).filter(
    (h) =>
      h.type === 'INSTANCE' &&
      /icon.?badge/i.test(h.name) &&
      (h.width === 56 || h.height === 56 || (h.width != null && h.width <= 96))
  );
}
