import { promises as fs } from 'fs';
import path from 'path';
import { generateId } from '@/lib/utils/id';
import {
  getFigmaFileImages,
  getFigmaImages,
  getFigmaNodes,
  getFigmaVariables,
  type FigmaNodeDocument,
  type FigmaNodesResponse,
} from './client';
import { extractDesignContext } from './extractDesignContext';
import {
  collectExportNodeIds,
  collectImageRefs,
  parseFigmaNode,
  resolveExportUrls,
  resolveForcedExportUrls,
  resolveImageRefsInTree,
  type ParsedFigmaNode,
} from './parseFigmaNode';
import { detectImageNodeIds } from './detectImageNodes';
import { parseFigmaUrl } from './parseUrl';
import { figmaDebugDirectory, uploadDirectory } from '@/lib/runtimePaths';

const UPLOAD_DIR = uploadDirectory();
const DEBUG_DIR = figmaDebugDirectory();

/**
 * All Figma renders (whole-frame "flatten to image" exports AND individual
 * exported assets in the tree) are rendered at 2× so they stay crisp on retina
 * / high-DPI displays. The image is displayed at its 1× layout width, so a 2×
 * source is downscaled — the standard email retina-image technique.
 */
const FIGMA_EXPORT_SCALE = 2;

/**
 * Dump the exact data we got from Figma (raw API node document + the parsed
 * tree the converter actually consumes) so it can be inspected. Writes a JSON
 * file and prints a concise structural summary to the server console. Enabled
 * unless FIGMA_DEBUG="false".
 */
async function debugDumpFigma(
  label: string,
  rawNodeDoc: unknown,
  parsed: ParsedFigmaNode,
  variables: unknown
): Promise<void> {
  if (process.env.FIGMA_DEBUG === 'false') return;
  try {
    await fs.mkdir(DEBUG_DIR, { recursive: true });
    const safe = label.replace(/[^a-z0-9-_]+/gi, '_').slice(0, 40);
    const file = path.join(DEBUG_DIR, `${safe}-${Date.now()}.json`);
    await fs.writeFile(
      file,
      JSON.stringify({ label, rawNodeDoc, parsed, variables }, null, 2),
      'utf8'
    );

    const summarize = (n: ParsedFigmaNode, depth = 0): string => {
      const pad = '  '.repeat(depth);
      const bits: string[] = [`${n.type} "${n.name}" ${n.width ?? '?'}x${n.height ?? '?'}`];
      if (n.backgroundColor) bits.push(`bg=${n.backgroundColor}`);
      if (n.text) bits.push(`text="${n.text.slice(0, 40).replace(/\n/g, '\\n')}"`);
      if (n.color) bits.push(`color=${n.color}`);
      const line = `${pad}- ${bits.join(' ')}`;
      return [line, ...n.children.map((c) => summarize(c, depth + 1))].join('\n');
    };

    console.log(`\n──── FIGMA IMPORT DEBUG: ${label} ────`);
    console.log(`Full data written to: ${file}`);
    console.log('Parsed tree the converter consumes:');
    console.log(summarize(parsed));
    console.log('──── end ────\n');
  } catch (err) {
    console.warn('Figma debug dump failed (non-fatal):', err);
  }
}

const DOWNLOAD_ATTEMPTS = 3;
const PER_ATTEMPT_TIMEOUT_MS = 30000;

/**
 * Optional proxy support. Figma renders are served from an S3 CDN host that is
 * often blocked separately from api.figma.com on corporate networks. Node's
 * global fetch (undici) does NOT honour HTTP(S)_PROXY automatically, so wire up
 * a ProxyAgent when one is configured. Guarded so it never breaks if undici
 * can't be resolved.
 */
const proxyUrl =
  process.env.HTTPS_PROXY ||
  process.env.https_proxy ||
  process.env.HTTP_PROXY ||
  process.env.http_proxy;

let proxyDispatcher: unknown;
async function getProxyDispatcher(): Promise<unknown> {
  if (!proxyUrl) return undefined;
  if (proxyDispatcher !== undefined) return proxyDispatcher || undefined;
  try {
    // Non-literal specifier so TS/webpack don't statically resolve undici
    // (it ships with Node at runtime as the global fetch implementation).
    const moduleName = 'undici';
    const undici = (await import(/* webpackIgnore: true */ moduleName)) as {
      ProxyAgent: new (opts: { uri: string }) => unknown;
    };
    proxyDispatcher = new undici.ProxyAgent({ uri: proxyUrl });
  } catch {
    proxyDispatcher = null; // tried and failed; don't retry the import
  }
  return proxyDispatcher || undefined;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function downloadToUploads(imageUrl: string, prefix: string): Promise<string> {
  const dispatcher = await getProxyDispatcher();
  let lastError: unknown;

  for (let attempt = 1; attempt <= DOWNLOAD_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(imageUrl, {
        signal: AbortSignal.timeout(PER_ATTEMPT_TIMEOUT_MS),
        headers: { 'User-Agent': 'edm-react-email-tool' },
        // undici-specific option; ignored when no proxy is configured.
        ...(dispatcher ? { dispatcher } : {}),
      } as RequestInit);

      if (!res.ok) {
        throw new Error(`Failed to download Figma render (HTTP ${res.status})`);
      }

      await fs.mkdir(UPLOAD_DIR, { recursive: true });
      const buffer = Buffer.from(await res.arrayBuffer());
      const filename = `${prefix}-${generateId()}.png`;
      await fs.writeFile(path.join(UPLOAD_DIR, filename), buffer);

      return `/images/uploads/${filename}`;
    } catch (err) {
      lastError = err;
      if (attempt < DOWNLOAD_ATTEMPTS) {
        await sleep(attempt * 1500); // 1.5s, then 3s
      }
    }
  }

  const reason = lastError instanceof Error ? lastError.message : String(lastError);
  const isTimeout = /timeout|UND_ERR_CONNECT|fetch failed|ENOTFOUND|ECONNREFUSED/i.test(reason);
  throw new Error(
    isTimeout
      ? `Could not reach Figma's image CDN after ${DOWNLOAD_ATTEMPTS} attempts (${reason}). ` +
        `Your network/firewall/VPN is likely blocking Figma's S3 host (s3-alpha-sig.figma.com), ` +
        `or you're offline. If you're behind a corporate proxy, set the HTTPS_PROXY environment variable and restart the dev server.`
      : `Failed to download a Figma render (${reason}).`
  );
}

/**
 * Best-effort download: never throws. A failed image fetch (e.g. the S3 CDN is
 * blocked/slow) must NOT abort the whole import — text/layout still build from
 * the node tree. Returns undefined when the asset couldn't be fetched.
 */
async function safeDownloadToUploads(
  imageUrl: string,
  prefix: string
): Promise<string | undefined> {
  try {
    return await downloadToUploads(imageUrl, prefix);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.warn(`Figma asset download skipped (${prefix}): ${reason}`);
    return undefined;
  }
}

/** Used by build routes to fetch 2× PNGs for AI/explicit forced nodes. */
export { safeDownloadToUploads as downloadForcedExportToUploads };

async function resolveTreeAssets(
  fileKey: string,
  node: ParsedFigmaNode
): Promise<ParsedFigmaNode> {
  const imageRefs = [...new Set(collectImageRefs(node))];

  // The heuristic export set drives the DEFAULT build (attached to `exportUrl`).
  const heuristicIds = [...new Set(collectExportNodeIds(node))];
  const heuristicSet = new Set(heuristicIds);

  // Mixed-mode candidates: icon/SVG/vector clusters at any depth. We download
  // their 2× PNGs up front (single component builds re-use the parsed tree at
  // build time and can't re-fetch), but attach them to `forcedExportUrl` so the
  // default build output is completely unchanged — they're only rasterized when
  // the caller forces them via `forceImageIds`.
  const detectedIds = detectImageNodeIds(node).filter((id) => !heuristicSet.has(id));

  // One /images call for the union (heuristic ∪ detected) at 2× (retina-crisp).
  const exportNodeIds = collectExportNodeIds(node, detectedIds);

  const [fileImages, renderImages] = await Promise.all([
    imageRefs.length > 0
      ? getFigmaFileImages(fileKey)
      : Promise.resolve({} as Record<string, string | null>),
    exportNodeIds.length > 0
      ? getFigmaImages(fileKey, exportNodeIds, FIGMA_EXPORT_SCALE)
      : Promise.resolve({} as Record<string, string | null>),
  ]);

  const localRefMap: Record<string, string> = {};
  for (const ref of imageRefs) {
    const remoteUrl = fileImages[ref];
    if (remoteUrl) {
      const local = await safeDownloadToUploads(remoteUrl, 'figma-asset');
      if (local) localRefMap[ref] = local;
    }
  }

  let resolved = resolveImageRefsInTree(node, localRefMap);

  // Heuristic renders → exportUrl (unchanged default behavior).
  const localExportMap: Record<string, string> = {};
  for (const nodeId of heuristicIds) {
    const remoteUrl = renderImages[nodeId];
    if (remoteUrl) {
      const local = await safeDownloadToUploads(remoteUrl, 'figma-export');
      if (local) localExportMap[nodeId] = local;
    }
  }
  resolved = resolveExportUrls(resolved, localExportMap);

  // Detected mixed-mode renders → forcedExportUrl (opt-in raster, gated at build).
  const localForcedMap: Record<string, string> = {};
  for (const nodeId of detectedIds) {
    const remoteUrl = renderImages[nodeId];
    if (remoteUrl) {
      const local = await safeDownloadToUploads(remoteUrl, 'figma-icon');
      if (local) localForcedMap[nodeId] = local;
    }
  }
  resolved = resolveForcedExportUrls(resolved, localForcedMap);

  return resolved;
}

/**
 * Figma answers `/nodes` with HTTP 200 and a `null` entry for an id that is not
 * in the file, so a missing frame is indistinguishable from a typo unless the
 * failure names the id, the file it was looked up in, and the way to recover.
 */
export function requireNodeDocument(
  nodesResponse: Pick<FigmaNodesResponse, 'name' | 'nodes'>,
  nodeId: string,
  label: 'desktop' | 'mobile'
): FigmaNodeDocument {
  const document = nodesResponse.nodes?.[nodeId]?.document;
  if (document) return document;

  const fileName = nodesResponse.name ? `"${nodesResponse.name}"` : 'the linked Figma file';
  const available = Object.entries(nodesResponse.nodes ?? {})
    .filter(([, entry]) => entry?.document)
    .map(([id]) => id);
  const alsoFailed =
    available.length === 0 && Object.keys(nodesResponse.nodes ?? {}).length > 1
      ? ' Neither the desktop nor the mobile frame resolved, so the link is probably from a different file.'
      : '';

  throw new Error(
    `The ${label} frame (node-id ${nodeId}) is not in ${fileName}. It was deleted, or the link came from a different file — a "(Copy)" duplicate has different node ids to the original.${alsoFailed} Open the frame in Figma, right-click it and choose Copy link to selection, then paste that URL.`
  );
}

export interface FigmaImportInput {
  figmaUrl: string;
  mobileFigmaUrl?: string;
}

export interface FigmaImportResult {
  desktopUrl?: string;
  mobileUrl?: string;
  designContext: string;
  fileName: string;
  nodeName: string;
  fileKey: string;
  desktopNode: ParsedFigmaNode;
  mobileNode?: ParsedFigmaNode;
}

export async function importFromFigma(input: FigmaImportInput): Promise<FigmaImportResult> {
  const desktop = parseFigmaUrl(input.figmaUrl);
  if (!desktop) {
    throw new Error('Invalid Figma URL. Paste a link with node-id, e.g. figma.com/design/...?node-id=1-2');
  }

  const mobile = input.mobileFigmaUrl?.trim()
    ? parseFigmaUrl(input.mobileFigmaUrl)
    : null;

  if (input.mobileFigmaUrl?.trim() && !mobile) {
    throw new Error('Invalid mobile Figma URL.');
  }

  if (mobile && mobile.fileKey !== desktop.fileKey) {
    throw new Error('Desktop and mobile Figma URLs must be from the same file.');
  }

  const nodeIds = mobile ? [desktop.nodeId, mobile.nodeId] : [desktop.nodeId];

  // Only the node document is essential. Variables (token colours) and the
  // frame-preview render are best-effort — if those calls fail we still build
  // from the node tree rather than failing the whole import with nothing.
  const [nodesResponse, variablesMeta, frameImages] = await Promise.all([
    getFigmaNodes(desktop.fileKey, nodeIds),
    getFigmaVariables(desktop.fileKey).catch((err) => {
      console.warn('Figma variables fetch failed (non-fatal):', err);
      return undefined;
    }),
    getFigmaImages(desktop.fileKey, nodeIds, FIGMA_EXPORT_SCALE).catch((err) => {
      console.warn('Figma frame render fetch failed (non-fatal):', err);
      return {} as Record<string, string | null>;
    }),
  ]);

  const variables = variablesMeta?.variables;

  const desktopNodeDoc = requireNodeDocument(nodesResponse, desktop.nodeId, 'desktop');

  // The frame-preview render is a nice-to-have (used as a pixel-accurate
  // fallback for image-heavy heroes). It must never block the import — a
  // text/layout frame builds fine from the node tree without it.
  const desktopImageUrl = frameImages[desktop.nodeId];
  const savedDesktopUrl = desktopImageUrl
    ? await safeDownloadToUploads(desktopImageUrl, 'figma-desk')
    : undefined;

  let savedMobileUrl: string | undefined;
  let designContext = extractDesignContext(desktopNodeDoc);

  let parsedDesktop = parseFigmaNode(desktopNodeDoc, variables);
  if (savedDesktopUrl) parsedDesktop.exportUrl = savedDesktopUrl;

  let parsedMobile: ParsedFigmaNode | undefined;

  if (mobile) {
    // A mobile URL is an explicit request for a paired responsive build, so a
    // missing mobile frame must fail loudly instead of silently producing a
    // desktop-only import the user did not ask for.
    const mobileNodeDoc = requireNodeDocument(nodesResponse, mobile.nodeId, 'mobile');
    const mobileImageUrl = frameImages[mobile.nodeId];

    designContext += `\n\n--- Mobile frame ---\n${extractDesignContext(mobileNodeDoc)}`;
    parsedMobile = parseFigmaNode(mobileNodeDoc, variables);

    if (mobileImageUrl) {
      savedMobileUrl = await safeDownloadToUploads(mobileImageUrl, 'figma-mob');
      if (parsedMobile && savedMobileUrl) {
        parsedMobile.exportUrl = savedMobileUrl;
      }
    }
  }

  parsedDesktop = await resolveTreeAssets(desktop.fileKey, parsedDesktop);
  if (savedDesktopUrl) parsedDesktop.exportUrl = savedDesktopUrl;

  await debugDumpFigma(desktopNodeDoc.name, desktopNodeDoc, parsedDesktop, variables);

  if (parsedMobile) {
    parsedMobile = await resolveTreeAssets(desktop.fileKey, parsedMobile);
    if (savedMobileUrl) {
      parsedMobile.exportUrl = savedMobileUrl;
    }
  }

  return {
    desktopUrl: savedDesktopUrl ?? undefined,
    mobileUrl: savedMobileUrl,
    designContext,
    fileName: nodesResponse.name,
    nodeName: desktopNodeDoc.name,
    fileKey: desktop.fileKey,
    desktopNode: parsedDesktop,
    mobileNode: parsedMobile,
  };
}
