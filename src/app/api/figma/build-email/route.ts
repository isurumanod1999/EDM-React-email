import { NextResponse } from 'next/server';
import { render } from '@react-email/render';
import { z } from 'zod';
import { figmaToReactEmailTree } from '@/lib/figma/figmaToReactEmail';
import { resolveSectionBackground } from '@/lib/figma/figmaPrimitives';
import { buildFrameImageTree } from '@/lib/figma/frameImageBlock';
import { resolveForceImageIds } from '@/lib/figma/resolveForceImageIds';
import { attachMissingForcedExports } from '@/lib/figma/attachMissingForcedExports';
import { downloadForcedExportToUploads } from '@/lib/figma/importFromFigma';
import type { ReactEmailNode } from '@/lib/figma/types/reactEmailAst';
import type { ParsedFigmaNode } from '@/lib/figma/parseFigmaNode';
import { DynamicEmailTemplate } from '@/lib/render/DynamicEmailTemplate';
import { generateId } from '@/lib/utils/id';
import { DEFAULT_TEMPLATE_META } from '@/lib/schema/template';
import { errorResponse } from '@/lib/api/response';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const parsedFigmaNodeSchema: z.ZodType<ParsedFigmaNode, z.ZodTypeDef, unknown> = z.lazy(() =>
  z
    .object({
      id: z.string(),
      type: z.string(),
      name: z.string(),
      width: z.number().optional(),
      height: z.number().optional(),
      x: z.number().optional(),
      y: z.number().optional(),
      visible: z.preprocess((v) => (v === undefined ? true : v), z.boolean()),
    text: z.string().optional(),
    fontSize: z.number().optional(),
    fontWeight: z.number().optional(),
    fontFamily: z.string().optional(),
    lineHeight: z.number().optional(),
    letterSpacing: z.number().optional(),
    paragraphSpacing: z.number().optional(),
    textAlign: z.string().optional(),
    color: z.string().optional(),
    backgroundColor: z.string().optional(),
    paddingTop: z.number().optional(),
    paddingRight: z.number().optional(),
    paddingBottom: z.number().optional(),
    paddingLeft: z.number().optional(),
    gap: z.number().optional(),
    layoutMode: z.string().optional(),
    primaryAxisAlign: z.string().optional(),
    counterAxisAlign: z.string().optional(),
    cornerRadius: z.number().optional(),
    strokeColor: z.string().optional(),
    strokeWeight: z.number().optional(),
    imageRef: z.string().optional(),
    exportUrl: z.string().optional(),
    // 2× PNG for mixed-mode image export; must survive the session round-trip so
    // forced icon/vector subtrees can be rasterized at build time.
    forcedExportUrl: z.string().optional(),
    componentId: z.string().optional(),
    nodeId: z.string().optional(),
    children: z.array(parsedFigmaNodeSchema),
  })
    .passthrough()
);

const buildEmailSchema = z.object({
  desktopNode: parsedFigmaNodeSchema,
  mobileNode: parsedFigmaNodeSchema.optional(),
  nodeName: z.string(),
  fileName: z.string().optional(),
  desktopUrl: z.string().optional(),
  mobileUrl: z.string().optional(),
  mode: z.enum(['fidelity', 'primitives']).optional(),
  /** 'image' flattens the whole component to a single full-frame PNG. */
  buildAs: z.enum(['design', 'image']).optional(),
  /**
   * Mixed-mode image export (buildAs='design'/primitives only). See
   * `computeForceImageIds` — union of explicit ids, heuristic auto-detect, and
   * (when an instruction is given) the AI classifier.
   */
  autoDetectImages: z.boolean().optional(),
  imageInstructions: z.string().optional(),
  imageNodeIds: z.array(z.string()).optional(),
  fileKey: z.string().optional(),
  designContext: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = buildEmailSchema.parse(body);

    let tree: ReactEmailNode;
    let warnings: string[] = [];
    let nodeCount = 2;

    if (parsed.buildAs === 'image') {
      if (!parsed.desktopUrl) {
        throw new Error(
          'Could not flatten this component to an image — no Figma frame render is available. Re-fetch the frame, then try again.'
        );
      }
      tree = buildFrameImageTree({
        desktopUrl: parsed.desktopUrl,
        mobileUrl: parsed.mobileUrl,
        width: parsed.desktopNode.width,
        height: parsed.desktopNode.height,
        alt: parsed.nodeName,
        backgroundColor: resolveSectionBackground(parsed.desktopNode),
      });
    } else {
      // Mixed-mode: union explicit ids + heuristic auto-detect + AI-from-instruction.
      // Forced subtrees rasterize only when a 2× render is available on the node
      // (exportUrl or the import-time forcedExportUrl); others stay structured.
      const { forceImageIds, mergeClusters } = await resolveForceImageIds(parsed.desktopNode, {
        autoDetectImages: parsed.autoDetectImages,
        imageInstructions: parsed.imageInstructions,
        imageNodeIds: parsed.imageNodeIds,
        designContext: parsed.designContext,
      });

      let desktopNode = parsed.desktopNode;
      if (parsed.fileKey && (forceImageIds.length > 0 || mergeClusters.length > 0)) {
        desktopNode = await attachMissingForcedExports(
          parsed.fileKey,
          desktopNode,
          forceImageIds,
          downloadForcedExportToUploads,
          mergeClusters
        );
      }

      const built = figmaToReactEmailTree(desktopNode, parsed.mobileNode, {
        desktopUrl: parsed.desktopUrl,
        mobileUrl: parsed.mobileUrl,
        mode: parsed.mode,
        forceImageIds,
      });
      tree = built.tree;
      warnings = built.warnings;
      nodeCount = built.nodeCount;
    }

    const block = {
      componentId: 'figma-react-email',
      props: {
        tree,
        sourceFrame: parsed.nodeName,
        mobileFrame: parsed.mobileNode?.name ?? '',
      },
      label: parsed.nodeName,
    };

    const templateBlock = {
      id: generateId(),
      componentId: block.componentId,
      componentVersion: 1,
      props: block.props,
      label: block.label,
    };

    const previewHtml = await render(
      DynamicEmailTemplate({
        meta: DEFAULT_TEMPLATE_META,
        blocks: [templateBlock],
      })
    );

    return NextResponse.json({
      confidence: 1,
      blocks: [block],
      reasoning:
        parsed.buildAs === 'image'
          ? `Flattened Figma frame "${parsed.nodeName}" to a single full-frame image.`
          : parsed.mode === 'primitives'
            ? `Built React Email primitives from Figma frame "${parsed.nodeName}" (${nodeCount} nodes).`
            : `Built pixel-accurate email from Figma frame "${parsed.nodeName}" (${nodeCount} React Email nodes).`,
      previewHtml,
      warnings,
      nodeCount,
    });
  } catch (error) {
    console.error('Figma build-email error:', error);
    const message = error instanceof Error ? error.message : 'React Email build failed';
    return errorResponse(400, 'figma_build_failed', message);
  }
}
