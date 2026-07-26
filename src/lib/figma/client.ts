const FIGMA_API = 'https://api.figma.com/v1';
const IMAGE_BATCH_SIZE = 200;

export interface FigmaVariableAlias {
  type?: string;
  id?: string;
}

export interface FigmaGradientStop {
  position?: number;
  color?: { r: number; g: number; b: number; a?: number };
  /** A stop color can itself be bound to a Figma color variable/token. */
  boundVariables?: { color?: FigmaVariableAlias };
}

export interface FigmaPaint {
  type?: string;
  visible?: boolean;
  opacity?: number;
  color?: { r: number; g: number; b: number; a?: number };
  /** Present on GRADIENT_* paints instead of a single `color`. */
  gradientStops?: FigmaGradientStop[];
  /** Per-paint variable bindings — design systems bind a fill's color here. */
  boundVariables?: { color?: FigmaVariableAlias };
  imageRef?: string;
  scaleMode?: string;
}

/**
 * A per-character style override entry (Figma `styleOverrideTable` value). Holds
 * the fields that make disclaimer/footer copy faithful: inline hyperlinks,
 * underlines, and per-run color — none of which live on the base text style.
 */
export interface FigmaTypeStyleOverride {
  fills?: FigmaPaint[];
  /** 'UNDERLINE' | 'STRIKETHROUGH' | 'NONE' */
  textDecoration?: string;
  hyperlink?: { type?: string; url?: string; nodeID?: string };
  fontWeight?: number;
  fontSize?: number;
}

export interface FigmaNodeDocument {
  id: string;
  name: string;
  type: string;
  visible?: boolean;
  opacity?: number;
  characters?: string;
  style?: Record<string, unknown>;
  /**
   * Per-character index into `styleOverrideTable` (0 = base style). Length
   * matches `characters`; trailing characters may be omitted (treated as 0).
   */
  characterStyleOverrides?: number[];
  /** Map of override id → the style applied to characters carrying that id. */
  styleOverrideTable?: Record<string, FigmaTypeStyleOverride>;
  fills?: FigmaPaint[];
  strokes?: FigmaPaint[];
  background?: FigmaPaint[];
  backgroundColor?: { r: number; g: number; b: number; a?: number };
  absoluteBoundingBox?: { width?: number; height?: number; x?: number; y?: number };
  layoutMode?: string;
  itemSpacing?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  primaryAxisAlignItems?: string;
  counterAxisAlignItems?: string;
  layoutAlign?: string;
  layoutSizingHorizontal?: string;
  layoutSizingVertical?: string;
  cornerRadius?: number;
  rectangleCornerRadii?: number[];
  strokeWeight?: number;
  /** Per-side stroke weights, present when a node's border sides differ. */
  individualStrokeWeights?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  /** Stroke alignment: INSIDE | OUTSIDE | CENTER. */
  strokeAlign?: string;
  /** Whether the frame clips overflowing children (Figma "Clip content"). */
  clipsContent?: boolean;
  componentId?: string;
  boundVariables?: Record<string, FigmaVariableAlias | FigmaVariableAlias[]>;
  styles?: Record<string, string>;
  /**
   * Node-level hyperlink. Figma populates this for text nodes that carry a link
   * and (via some plugin exports) for image/frame nodes. Standard REST rarely
   * sets it on images, so callers must tolerate it being absent.
   */
  hyperlink?: { type?: string; url?: string; nodeID?: string };
  children?: FigmaNodeDocument[];
}

export interface FigmaFileImagesResponse {
  images: Record<string, string | null>;
  error?: boolean;
  status?: number;
}

export interface FigmaNodeEntry {
  document: FigmaNodeDocument;
  components?: Record<string, unknown>;
  componentSets?: Record<string, unknown>;
  styles?: Record<string, unknown>;
}

export interface FigmaNodesResponse {
  name: string;
  nodes: Record<string, FigmaNodeEntry | null>;
}

export interface FigmaColorValue {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface FigmaVariable {
  name?: string;
  resolvedType?: string;
  valuesByMode?: Record<string, FigmaColorValue | number | string | boolean>;
}

export interface FigmaVariablesResponse {
  status?: number;
  error?: boolean;
  meta?: {
    variables?: Record<string, FigmaVariable>;
    variableCollections?: Record<
      string,
      { name?: string; modes?: Array<{ modeId: string; name: string }> }
    >;
  };
}

function getToken(): string {
  const token = process.env.FIGMA_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      'FIGMA_ACCESS_TOKEN is not set. Create a personal access token at https://help.figma.com/hc/en-us/articles/8085703771159'
    );
  }
  return token;
}

async function figmaFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${FIGMA_API}${path}`, {
    headers: { 'X-Figma-Token': getToken() },
    signal: AbortSignal.timeout(60000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    if (res.status === 403) {
      throw new Error('Figma access denied. Check your token and file permissions.');
    }
    if (res.status === 404) {
      throw new Error('Figma file or node not found. Check the URL and node-id.');
    }
    throw new Error(`Figma API error (${res.status}): ${body.slice(0, 200)}`);
  }

  return res.json() as Promise<T>;
}

/** Fetch full node subtree — depth must be high enough to include all layers. */
export async function getFigmaNodes(
  fileKey: string,
  nodeIds: string[],
  depth = 100
): Promise<FigmaNodesResponse> {
  const ids = nodeIds.map(encodeURIComponent).join(',');
  return figmaFetch(`/files/${fileKey}/nodes?ids=${ids}&depth=${depth}`);
}

export async function getFigmaImages(
  fileKey: string,
  nodeIds: string[],
  scale = 2
): Promise<Record<string, string | null>> {
  if (nodeIds.length === 0) return {};

  const merged: Record<string, string | null> = {};

  for (let i = 0; i < nodeIds.length; i += IMAGE_BATCH_SIZE) {
    const batch = nodeIds.slice(i, i + IMAGE_BATCH_SIZE);
    const ids = batch.map(encodeURIComponent).join(',');
    const data = await figmaFetch<{ images: Record<string, string | null> }>(
      `/images/${fileKey}?ids=${ids}&format=png&scale=${scale}`
    );
    Object.assign(merged, data.images);
  }

  return merged;
}

/** Resolve image fill hashes to temporary CDN URLs */
export async function getFigmaFileImages(
  fileKey: string
): Promise<Record<string, string | null>> {
  const data = await figmaFetch<FigmaFileImagesResponse>(`/files/${fileKey}/images`);
  return data.images ?? {};
}

/** Resolve Figma variable bindings (requires file_variables:read scope). */
export async function getFigmaVariables(
  fileKey: string
): Promise<FigmaVariablesResponse['meta'] | null> {
  try {
    const data = await figmaFetch<FigmaVariablesResponse>(
      `/files/${fileKey}/variables/local`
    );
    return data.meta ?? null;
  } catch {
    return null;
  }
}
