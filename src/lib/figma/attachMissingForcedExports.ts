import { getFigmaImages } from './client';
import type { ImageMergeCluster } from './detectImageNodes';
import { findNodeByNodeId, resolveForcedExportUrls, type ParsedFigmaNode } from './parseFigmaNode';
import path from 'path';
import { promises as fs } from 'fs';
import { generateId } from '@/lib/utils/id';
import { resolveUploadFilePath, uploadDirectory } from '@/lib/runtimePaths';

/** Same scale as `importFromFigma` — retina 2× PNGs shown at 1× layout width. */
const FIGMA_EXPORT_SCALE = 2;
const UPLOAD_DIR = uploadDirectory();

function nodeKey(node: ParsedFigmaNode): string | undefined {
  return node.nodeId ?? node.id;
}

/**
 * Figma nodeIds in `forceIds` that still need a 2× PNG (no exportUrl / forcedExportUrl).
 * Stops descending into a forced subtree — the whole subtree is one raster.
 */
export function collectMissingForcedExportIds(
  root: ParsedFigmaNode,
  forceIds: Iterable<string>,
  refresh = false
): string[] {
  const force = new Set(forceIds);
  const missing = new Set<string>();

  const walk = (node: ParsedFigmaNode) => {
    if (!node.visible) return;
    const key = nodeKey(node);
    if (key && force.has(key)) {
      if (node.nodeId && (refresh || (!node.exportUrl && !node.forcedExportUrl))) {
        missing.add(node.nodeId);
      }
      return;
    }
    for (const child of node.children) walk(child);
  };

  walk(root);

  for (const id of force) {
    if (id && !missing.has(id)) {
      const hasUrl = !refresh && nodeHasForcedRender(root, id);
      if (!hasUrl) missing.add(id);
    }
  }

  return [...missing];
}

function nodeHasForcedRender(root: ParsedFigmaNode, forceId: string): boolean {
  let found = false;
  const walk = (node: ParsedFigmaNode) => {
    if (found) return;
    const key = nodeKey(node);
    if (key === forceId) {
      found = Boolean(node.exportUrl || node.forcedExportUrl);
      return;
    }
    node.children.forEach(walk);
  };
  walk(root);
  return found;
}

export type ForcedExportDownloader = (remoteUrl: string, prefix: string) => Promise<string | undefined>;

async function mergeClusterToUploads(
  root: ParsedFigmaNode,
  cluster: ImageMergeCluster,
  layerPaths: Map<string, string>
): Promise<string | undefined> {
  const nodes = cluster.nodeIds
    .map((id) => findNodeByNodeId(root, id))
    .filter((n): n is ParsedFigmaNode => Boolean(n));

  if (nodes.length === 0) return undefined;

  const positioned = nodes.filter(
    (n) => n.x != null && n.y != null && n.width != null && n.height != null
  );
  if (positioned.length === 0) {
    const firstPath = layerPaths.get(cluster.nodeIds[0]);
    return firstPath;
  }

  const minX = Math.min(...positioned.map((n) => n.x!));
  const minY = Math.min(...positioned.map((n) => n.y!));
  const maxX = Math.max(...positioned.map((n) => n.x! + n.width!));
  const maxY = Math.max(...positioned.map((n) => n.y! + n.height!));
  const outW = Math.max(1, Math.round(maxX - minX));
  const outH = Math.max(1, Math.round(maxY - minY));

  try {
    const sharp = (await import('sharp')).default;
    const base = sharp({
      create: {
        width: outW,
        height: outH,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    });

    const composites: { input: Buffer; left: number; top: number }[] = [];
    for (const n of positioned) {
      const local = layerPaths.get(n.nodeId ?? n.id);
      if (!local) continue;
      const filePath = resolveUploadFilePath(local);
      const buf = await fs.readFile(filePath);
      composites.push({
        input: buf,
        left: Math.round(n.x! - minX),
        top: Math.round(n.y! - minY),
      });
    }

    if (composites.length === 0) return layerPaths.get(cluster.nodeIds[0]);

    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const filename = `figma-icon-merge-${generateId()}.png`;
    const outPath = path.join(UPLOAD_DIR, filename);
    await base.composite(composites).png().toFile(outPath);
    return `/images/uploads/${filename}`;
  } catch (err) {
    console.warn('Icon cluster merge failed (non-fatal):', err);
    return layerPaths.get(cluster.nodeIds[0]);
  }
}

/**
 * Download 2× PNGs for forced nodes and merge loose vector clusters into one badge PNG.
 */
export async function attachMissingForcedExports(
  fileKey: string,
  root: ParsedFigmaNode,
  forceIds: string[],
  download: ForcedExportDownloader,
  mergeClusters: ImageMergeCluster[] = [],
  refreshForced = false
): Promise<ParsedFigmaNode> {
  if (!fileKey) return root;

  const mergeMemberIds = mergeClusters.flatMap((c) => c.nodeIds);
  const allFetchIds = [...new Set([...forceIds, ...mergeMemberIds])];
  if (allFetchIds.length === 0) return root;

  const missing = collectMissingForcedExportIds(root, allFetchIds, refreshForced);
  if (missing.length === 0 && mergeClusters.length === 0) return root;

  const renderImages = await getFigmaImages(fileKey, missing, FIGMA_EXPORT_SCALE).catch((err) => {
    console.warn('Figma forced export fetch failed (non-fatal):', err);
    return {} as Record<string, string | null>;
  });

  const layerPaths = new Map<string, string>();
  const localForcedMap: Record<string, string> = {};

  for (const nodeId of missing) {
    const remoteUrl = renderImages[nodeId];
    if (remoteUrl) {
      const local = await download(remoteUrl, 'figma-icon');
      if (local) {
        layerPaths.set(nodeId, local);
        localForcedMap[nodeId] = local;
      }
    }
  }

  for (const cluster of mergeClusters) {
    const merged = await mergeClusterToUploads(root, cluster, layerPaths);
    const anchor = cluster.nodeIds[0];
    if (merged && anchor) {
      localForcedMap[anchor] = merged;
    }
  }

  if (Object.keys(localForcedMap).length === 0) return root;
  return resolveForcedExportUrls(root, localForcedMap);
}
