import { NextResponse } from 'next/server';
import { z } from 'zod';
import { importFromFigma } from '@/lib/figma/importFromFigma';
import { buildFigmaDesign } from '@/lib/figma/buildFigmaDesign';
import { errorResponse } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

/**
 * Single-shot import + build for ONE component: fetches the Figma frame(s) and
 * builds registry blocks (when component links match) or React Email primitives.
 */
const schema = z.object({
  figmaUrl: z.string().url(),
  mobileFigmaUrl: z.string().url().optional(),
  label: z.string().optional(),
  buildAs: z.enum(['design', 'image']).optional(),
  autoDetectImages: z.boolean().optional(),
  imageInstructions: z.string().optional(),
  imageNodeIds: z.array(z.string()).optional(),
  useRegistryLinks: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      figmaUrl,
      mobileFigmaUrl,
      label,
      buildAs,
      autoDetectImages,
      imageInstructions,
      imageNodeIds,
      useRegistryLinks,
    } = schema.parse(body);

    const imported = await importFromFigma({ figmaUrl, mobileFigmaUrl });
    const nodeName = label?.trim() || imported.nodeName;

    const built = await buildFigmaDesign({
      desktopNode: imported.desktopNode,
      mobileNode: imported.mobileNode,
      nodeName,
      desktopUrl: imported.desktopUrl,
      mobileUrl: imported.mobileUrl,
      mode: 'primitives',
      buildAs,
      autoDetectImages,
      imageInstructions,
      imageNodeIds,
      fileKey: imported.fileKey,
      designContext: imported.designContext,
      useRegistryLinks,
    });

    const block = built.blocks[0];
    if (!block) {
      throw new Error('Build produced no blocks');
    }

    return NextResponse.json({
      block,
      blocks: built.blocks,
      nodeName,
      warnings: built.warnings,
      nodeCount: built.nodeCount,
      buildAs: buildAs ?? 'design',
      mappingMode: built.mappingMode,
      confidence: built.confidence,
      reasoning: built.reasoning,
    });
  } catch (error) {
    console.error('Figma import-build error:', error);
    const message = error instanceof Error ? error.message : 'Figma import/build failed';
    const notConfigured = message.includes('FIGMA_ACCESS_TOKEN');
    return errorResponse(
      notConfigured ? 503 : 400,
      notConfigured ? 'figma_not_configured' : 'figma_import_failed',
      message
    );
  }
}
