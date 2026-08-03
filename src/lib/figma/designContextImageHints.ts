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

/** Largest edge (px) an unprompted design-context layer may have to auto-export. */
const AUTO_EXPORT_MAX_EDGE = 96;

const AUTO_EXPORT_NAME = /icon|badge|glyph|emblem|sticker|stamp|seal|rosette/i;

/**
 * Design context is a dump of EVERY layer in the frame, root included. Treating
 * each line as an export target force-rasterizes the whole design down to one
 * flat PNG — the root line matches the root node and swallows everything below
 * it. Unprompted auto-export is therefore limited to small icon/badge-style
 * layers, which is what the feature exists for; anything larger has to be named
 * explicitly in the build instructions.
 */
function isAutoExportable(hint: DesignContextLayerHint): boolean {
  if (hint.width == null || hint.height == null) return false;
  if (hint.width > AUTO_EXPORT_MAX_EDGE || hint.height > AUTO_EXPORT_MAX_EDGE) return false;
  return AUTO_EXPORT_NAME.test(hint.name);
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
    hints.push(...parseDesignContextLayerHints(designContext).filter(isAutoExportable));
  }

  if (instruction?.trim()) {
    hints.push(...parseDesignContextLayerHints(instruction));
  }

  // A layer the user named in the instructions is matched on name alone — it
  // may be any type or size, not just a 56×56 icon instance.
  for (const name of parseInstructionExportNames(instruction ?? '')) {
    hints.push({ type: '', name });
  }

  if (hints.length === 0) return [];

  const ids: string[] = [];
  const seen = new Set<string>();
  const rootId = nodeKey(root);

  const walk = (node: ParsedFigmaNode) => {
    if (!node.visible) return;
    // Flattening the root is what `buildAs: 'image'` is for, never a hint.
    if (nodeKey(node) !== rootId) {
      for (const hint of hints) {
        if (hintMatchesNode(node, hint)) {
          const id = nodeKey(node);
          if (id && !seen.has(id)) {
            seen.add(id);
            ids.push(id);
          }
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
