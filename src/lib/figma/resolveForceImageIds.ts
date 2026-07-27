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

  return { forceImageIds: [...ids], mergeClusters };
}
