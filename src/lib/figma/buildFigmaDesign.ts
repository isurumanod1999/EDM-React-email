import { figmaToReactEmailTree } from './figmaToReactEmail';
import { resolveSectionBackground } from './figmaPrimitives';
import { buildFrameImageTree } from './frameImageBlock';
import { resolveForceImageIds } from './resolveForceImageIds';
import { attachMissingForcedExports } from './attachMissingForcedExports';
import { downloadForcedExportToUploads } from './importFromFigma';
import { tryFigmaToRegistryBlocks } from './figmaToRegistryBlocks';
import type { ReactEmailNode } from './types/reactEmailAst';
import { findNodeByNodeId, type ParsedFigmaNode } from './parseFigmaNode';
import type { AiBlock } from '@/lib/ai/schemas/analyzeResult';

export interface BuildFigmaDesignInput {
  desktopNode: ParsedFigmaNode;
  mobileNode?: ParsedFigmaNode;
  nodeName: string;
  desktopUrl?: string;
  mobileUrl?: string;
  mode?: 'fidelity' | 'primitives';
  buildAs?: 'design' | 'image';
  autoDetectImages?: boolean;
  imageInstructions?: string;
  imageNodeIds?: string[];
  fileKey?: string;
  designContext?: string;
  /** When true (default), try registry component links before AST primitives. */
  useRegistryLinks?: boolean;
  /** Explicit layer Image choices must not be swallowed by registry inference. */
  forcePrimitiveBuild?: boolean;
}

export interface BuildFigmaDesignResult {
  blocks: AiBlock[];
  confidence: number;
  reasoning: string;
  warnings: string[];
  nodeCount: number;
  mappingMode: 'registry' | 'primitives' | 'image';
}

export function shouldTryRegistryLinks(
  useRegistryLinks: boolean,
  forcePrimitiveBuild: boolean
): boolean {
  return useRegistryLinks && !forcePrimitiveBuild;
}

export async function buildFigmaDesign(
  input: BuildFigmaDesignInput
): Promise<BuildFigmaDesignResult> {
  const useRegistryLinks = input.useRegistryLinks !== false;

  if (input.buildAs === 'image') {
    if (!input.desktopUrl) {
      throw new Error(
        'Could not flatten this component to an image — no Figma frame render is available. Re-fetch the frame, then try again.'
      );
    }
    const tree = buildFrameImageTree({
      desktopUrl: input.desktopUrl,
      mobileUrl: input.mobileUrl,
      width: input.desktopNode.width,
      height: input.desktopNode.height,
      alt: input.nodeName,
      backgroundColor: resolveSectionBackground(input.desktopNode),
    });
    return {
      blocks: [
        {
          componentId: 'figma-react-email',
          props: {
            tree,
            sourceFrame: input.nodeName,
            mobileFrame: input.mobileNode?.name ?? '',
          },
          label: input.nodeName,
        },
      ],
      confidence: 1,
      reasoning: `Flattened Figma frame "${input.nodeName}" to a single full-frame image.`,
      warnings: [],
      nodeCount: 2,
      mappingMode: 'image',
    };
  }

  if (shouldTryRegistryLinks(useRegistryLinks, Boolean(input.forcePrimitiveBuild))) {
    const registryResult = tryFigmaToRegistryBlocks(input.desktopNode, input.mobileNode, {
      desktopUrl: input.desktopUrl,
      mobileUrl: input.mobileUrl,
    });
    if (registryResult) {
      return {
        blocks: registryResult.blocks,
        confidence: registryResult.confidence,
        reasoning: registryResult.reasoning,
        warnings: [],
        nodeCount: registryResult.blocks.length,
        mappingMode: 'registry',
      };
    }
  }

  const { forceImageIds, mergeClusters } = await resolveForceImageIds(input.desktopNode, {
    autoDetectImages: input.autoDetectImages,
    imageInstructions: input.imageInstructions,
    imageNodeIds: input.imageNodeIds,
    designContext: input.designContext,
  });

  let desktopNode = input.desktopNode;
  if (input.fileKey && (forceImageIds.length > 0 || mergeClusters.length > 0)) {
    desktopNode = await attachMissingForcedExports(
      input.fileKey,
      desktopNode,
      forceImageIds,
      downloadForcedExportToUploads,
      mergeClusters
    );
  }

  if (input.forcePrimitiveBuild) {
    const missingForcedIds = forceImageIds.filter((id) => {
      const node = findNodeByNodeId(desktopNode, id);
      return !node?.exportUrl && !node?.forcedExportUrl;
    });
    if (missingForcedIds.length > 0) {
      throw new Error(
        `Could not flatten ${missingForcedIds.length} selected layer(s) because Figma returned no PNG: ${missingForcedIds.join(', ')}. Re-fetch the frame or choose Design for those layers.`
      );
    }
  }

  const built = figmaToReactEmailTree(desktopNode, input.mobileNode, {
    desktopUrl: input.desktopUrl,
    mobileUrl: input.mobileUrl,
    mode: input.mode,
    forceImageIds,
  });

  const tree: ReactEmailNode = built.tree;

  return {
    blocks: [
      {
        componentId: 'figma-react-email',
        props: {
          tree,
          sourceFrame: input.nodeName,
          mobileFrame: input.mobileNode?.name ?? '',
        },
        label: input.nodeName,
      },
    ],
    confidence: 1,
    reasoning:
      input.mode === 'primitives'
        ? `Built React Email primitives from Figma frame "${input.nodeName}" (${built.nodeCount} nodes). No registry component link matched — used AST fallback.`
        : `Built pixel-accurate email from Figma frame "${input.nodeName}" (${built.nodeCount} React Email nodes).`,
    warnings: built.warnings,
    nodeCount: built.nodeCount,
    mappingMode: 'primitives',
  };
}
