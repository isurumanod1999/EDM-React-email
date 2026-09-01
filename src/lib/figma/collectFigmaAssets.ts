import type { ParsedFigmaNode } from './parseFigmaNode';

export interface FigmaAsset {
  name: string;
  url: string;
  mobileUrl?: string;
  width?: number;
  height?: number;
}

function getImageSrc(node: ParsedFigmaNode): string | undefined {
  return node.exportUrl;
}

function walkAssets(
  node: ParsedFigmaNode,
  mobileRoot: ParsedFigmaNode | undefined,
  out: FigmaAsset[],
  seen: Set<string>
): void {
  const src = getImageSrc(node);
  const mobileMatch = mobileRoot?.children.find((c) => c.name === node.name);
  const mobileSrc = mobileMatch?.exportUrl;

  const isImageLike =
    src &&
    (node.type === 'RECTANGLE' ||
      node.type === 'FRAME' ||
      node.type === 'COMPONENT' ||
      node.type === 'INSTANCE' ||
      node.type === 'GROUP' ||
      node.imageRef);

  if (isImageLike && src && !seen.has(src)) {
    seen.add(src);
    out.push({
      name: node.name,
      url: src,
      mobileUrl: mobileSrc && mobileSrc !== src ? mobileSrc : undefined,
      width: node.width,
      height: node.height,
    });
  }

  for (const child of node.children) {
    const mobileChild = mobileMatch ?? mobileRoot;
    walkAssets(child, mobileChild, out, seen);
  }
}

export function collectFigmaAssets(
  desktopNode: ParsedFigmaNode,
  mobileNode?: ParsedFigmaNode
): FigmaAsset[] {
  const assets: FigmaAsset[] = [];
  const seen = new Set<string>();

  if (desktopNode.exportUrl) {
    seen.add(desktopNode.exportUrl);
    assets.push({
      name: desktopNode.name,
      url: desktopNode.exportUrl,
      mobileUrl:
        mobileNode?.exportUrl && mobileNode.exportUrl !== desktopNode.exportUrl
          ? mobileNode.exportUrl
          : undefined,
      width: desktopNode.width,
      height: desktopNode.height,
    });
  }

  walkAssets(desktopNode, mobileNode, assets, seen);
  return assets;
}

export function formatAssetsForPrompt(assets: FigmaAsset[]): string {
  if (assets.length === 0) return 'No image assets available.';
  return assets
    .map(
      (a, i) =>
        `${i + 1}. "${a.name}" → url="${a.url}"${a.mobileUrl ? ` mobileUrl="${a.mobileUrl}"` : ''}${a.width ? ` width=${a.width}` : ''}`
    )
    .join('\n');
}
