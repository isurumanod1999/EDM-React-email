export interface ParsedFigmaUrl {
  fileKey: string;
  nodeId: string;
}

/** Convert Figma URL node-id (1-2) to API format (1:2) */
export function normalizeNodeId(raw: string): string {
  return decodeURIComponent(raw).replace(/-/g, ':');
}

/**
 * Parse Figma design/file URLs:
 * https://www.figma.com/design/ABC123/My-File?node-id=1-2
 * https://www.figma.com/file/ABC123/My-File?node-id=1%3A2
 */
export function parseFigmaUrl(url: string): ParsedFigmaUrl | null {
  try {
    const parsed = new URL(url.trim());
    if (!parsed.hostname.includes('figma.com')) return null;

    const match = parsed.pathname.match(/\/(design|file|proto)\/([a-zA-Z0-9]+)/);
    if (!match) return null;

    const nodeRaw = parsed.searchParams.get('node-id');
    if (!nodeRaw) return null;

    return {
      fileKey: match[2],
      nodeId: normalizeNodeId(nodeRaw),
    };
  } catch {
    return null;
  }
}
