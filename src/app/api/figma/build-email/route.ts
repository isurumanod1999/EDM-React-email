import { NextResponse } from 'next/server';
import { render } from '@react-email/render';
import { z } from 'zod';
import { buildFigmaDesign } from '@/lib/figma/buildFigmaDesign';
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
    cornerRadii: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
    strokeColor: z.string().optional(),
    strokeWeight: z.number().optional(),
    imageRef: z.string().optional(),
    exportUrl: z.string().optional(),
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
  buildAs: z.enum(['design', 'image']).optional(),
  autoDetectImages: z.boolean().optional(),
  imageInstructions: z.string().optional(),
  imageNodeIds: z.array(z.string()).optional(),
  fileKey: z.string().optional(),
  designContext: z.string().optional(),
  /** Try Figma component links → registry blocks before AST fallback (default true). */
  useRegistryLinks: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = buildEmailSchema.parse(body);

    const built = await buildFigmaDesign({
      desktopNode: parsed.desktopNode,
      mobileNode: parsed.mobileNode,
      nodeName: parsed.nodeName,
      desktopUrl: parsed.desktopUrl,
      mobileUrl: parsed.mobileUrl,
      mode: parsed.mode,
      buildAs: parsed.buildAs,
      autoDetectImages: parsed.autoDetectImages,
      imageInstructions: parsed.imageInstructions,
      imageNodeIds: parsed.imageNodeIds,
      fileKey: parsed.fileKey,
      designContext: parsed.designContext,
      useRegistryLinks: parsed.useRegistryLinks,
    });

    const templateBlocks = built.blocks.map((block) => ({
      id: generateId(),
      componentId: block.componentId,
      componentVersion: 1,
      props: block.props,
      label: block.label,
    }));

    const previewHtml = await render(
      DynamicEmailTemplate({
        meta: DEFAULT_TEMPLATE_META,
        blocks: templateBlocks,
      })
    );

    return NextResponse.json({
      confidence: built.confidence,
      blocks: built.blocks,
      reasoning: built.reasoning,
      previewHtml,
      warnings: built.warnings,
      nodeCount: built.nodeCount,
      mappingMode: built.mappingMode,
    });
  } catch (error) {
    console.error('Figma build-email error:', error);
    const message = error instanceof Error ? error.message : 'React Email build failed';
    return errorResponse(400, 'figma_build_failed', message);
  }
}
