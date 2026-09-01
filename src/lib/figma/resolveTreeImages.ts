import type { FigmaAsset } from './collectFigmaAssets';
import type { ReactEmailNode } from './types/reactEmailAst';

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function findAsset(assets: FigmaAsset[], hint?: string): FigmaAsset | undefined {
  if (!hint) return undefined;
  const norm = normalizeName(hint);

  return (
    assets.find((a) => normalizeName(a.name) === norm) ??
    assets.find((a) => normalizeName(a.name).includes(norm)) ??
    assets.find((a) => norm.includes(normalizeName(a.name)))
  );
}

function resolveSrc(src: string, alt: string | undefined, assets: FigmaAsset[]): {
  src: string;
  mobileSrc?: string;
  width?: number;
  height?: number;
} {
  if (src.startsWith('/') || src.startsWith('http')) {
    const byUrl = assets.find((a) => a.url === src);
    return {
      src,
      mobileSrc: byUrl?.mobileUrl,
      width: byUrl?.width,
      height: byUrl?.height,
    };
  }

  const asset = findAsset(assets, src) ?? findAsset(assets, alt);
  if (asset) {
    return {
      src: asset.url,
      mobileSrc: asset.mobileUrl,
      width: asset.width,
      height: asset.height,
    };
  }

  return { src };
}

export function resolveTreeImages(
  node: ReactEmailNode,
  assets: FigmaAsset[]
): ReactEmailNode {
  if (node.type === 'Img') {
    const resolved = resolveSrc(node.src, node.alt, assets);
    const mobileSrc = node.mobileSrc ?? resolved.mobileSrc;
    const className =
      mobileSrc && mobileSrc !== resolved.src
        ? node.className ?? 'figma-img-responsive'
        : node.className;

    return {
      ...node,
      src: resolved.src,
      mobileSrc: mobileSrc && mobileSrc !== resolved.src ? mobileSrc : undefined,
      width: node.width ?? resolved.width,
      height: node.height ?? resolved.height,
      className,
    };
  }

  if ('children' in node && Array.isArray(node.children)) {
    return {
      ...node,
      children: node.children.map((child) => resolveTreeImages(child, assets)),
    } as ReactEmailNode;
  }

  return node;
}

export function ensureEmailRoot(tree: ReactEmailNode): ReactEmailNode {
  if (tree.type === 'Section' || tree.type === 'Container') {
    return {
      ...tree,
      style: {
        maxWidth: 600,
        width: '100%',
        margin: '0 auto',
        ...tree.style,
      },
    };
  }

  return {
    type: 'Section',
    style: { maxWidth: 600, width: '100%', margin: '0 auto' },
    children: [tree],
  };
}
