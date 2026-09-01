import type { ParsedFigmaNode } from './parseFigmaNode';
import {
  collectImageNodeOutline,
  detectImageMergeClusters,
  detectImageNodeIds,
  type ImageMergeCluster,
} from './detectImageNodes';
import { classifyImageNodeIds } from '@/lib/ai/classifyImageNodes';
import { findNodeIdsFromDesignHints } from './designContextImageHints';

export interface ForceImageOptions {
  autoDetectImages?: boolean;
  imageInstructions?: string;
  imageNodeIds?: string[];
  /** Figma design-context text (Structure: …) — used to match layers like Icon-badge 56×56. */
  designContext?: string;
}

export interface ForceImageResolution {
  forceImageIds: string[];
  mergeClusters: ImageMergeCluster[];
}

/**
 * Resolve a possibly unordered/overlapping set of choices against the source
 * tree. The root belongs to whole-frame Image mode, and once a parent is Image
 * its descendants are already baked into that export.
 */
export function normalizeOutermostImageNodeIds(
  root: ParsedFigmaNode,
  selectedIds: Iterable<string>
): string[] {
  const selected = new Set([...selectedIds].filter(Boolean));
  const normalized: string[] = [];

  const walk = (node: ParsedFigmaNode, depth: number, underSelected: boolean) => {
    if (!node.visible || underSelected) return;
    const key = node.nodeId ?? node.id;
    const isSelected = depth > 0 && Boolean(key && selected.has(key));
    if (isSelected && key) {
      normalized.push(key);
      return;
    }
    for (const child of node.children) walk(child, depth + 1, isSelected);
  };

  walk(root, 0, false);
  return normalized;
}

export async function computeForceImageIds(
  root: ParsedFigmaNode,
  opts: ForceImageOptions
): Promise<string[]> {
  const resolved = await resolveForceImageIds(root, opts);
  return resolved.forceImageIds;
}

export async function resolveForceImageIds(
  root: ParsedFigmaNode,
  opts: ForceImageOptions
): Promise<ForceImageResolution> {
  const ids = new Set<string>();
  let mergeClusters: ImageMergeCluster[] = [];

  for (const id of opts.imageNodeIds ?? []) {
    if (id) ids.add(id);
  }

  // Design context + instruction lines, e.g. INSTANCE "Icon-badge" 56×56px → one 2× PNG.
  for (const id of findNodeIdsFromDesignHints(
    root,
    opts.designContext,
    opts.imageInstructions
  )) {
    ids.add(id);
  }

  if (opts.autoDetectImages !== false) {
    for (const id of detectImageNodeIds(root)) ids.add(id);
    mergeClusters = detectImageMergeClusters(root);
    for (const cluster of mergeClusters) {
      const anchor = cluster.nodeIds[0];
      if (anchor) ids.add(anchor);
    }
  }

  const instruction = opts.imageInstructions?.trim();
  const clientPicked = (opts.imageNodeIds?.length ?? 0) > 0;
  if (instruction && !clientPicked) {
    const outline = collectImageNodeOutline(root);
    const { ids: aiIds } = await classifyImageNodeIds({ nodes: outline, instruction });
    for (const id of aiIds) ids.add(id);
  }

  const forceImageIds = normalizeOutermostImageNodeIds(root, ids);
  const forceSet = new Set(forceImageIds);
  return {
    forceImageIds,
    mergeClusters: mergeClusters.filter((cluster) => {
      const anchor = cluster.nodeIds[0];
      return Boolean(anchor && forceSet.has(anchor));
    }),
  };
}
