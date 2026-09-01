import { NextResponse } from 'next/server';
import { z } from 'zod';
import { buildReactEmailWithAi } from '@/lib/ai/buildReactEmailWithAi';
import { buildReactEmailRequestSchema } from '@/lib/ai/schemas/reactEmailBuildResult';
import type { ParsedFigmaNode } from '@/lib/figma/parseFigmaNode';
import { errorResponse } from '@/lib/api/response';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const parsedFigmaNodeSchema: z.ZodType<ParsedFigmaNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: z.string(),
    name: z.string(),
    width: z.number().optional(),
    height: z.number().optional(),
    visible: z.boolean(),
    text: z.string().optional(),
    fontSize: z.number().optional(),
    fontWeight: z.number().optional(),
    textAlign: z.string().optional(),
    color: z.string().optional(),
    backgroundColor: z.string().optional(),
    paddingTop: z.number().optional(),
    paddingRight: z.number().optional(),
    paddingBottom: z.number().optional(),
    paddingLeft: z.number().optional(),
    gap: z.number().optional(),
    layoutMode: z.string().optional(),
    cornerRadius: z.number().optional(),
    imageRef: z.string().optional(),
    exportUrl: z.string().optional(),
    componentId: z.string().optional(),
    nodeId: z.string().optional(),
    children: z.array(parsedFigmaNodeSchema),
  })
);

const requestSchema = buildReactEmailRequestSchema.extend({
  desktopNode: parsedFigmaNodeSchema,
  mobileNode: parsedFigmaNodeSchema.optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestSchema.parse(body);

    const result = await buildReactEmailWithAi({
      desktopUrl: parsed.desktopUrl,
      mobileUrl: parsed.mobileUrl,
      desktopNode: parsed.desktopNode,
      mobileNode: parsed.mobileNode,
      nodeName: parsed.nodeName,
      fileName: parsed.fileName,
      figmaContext: parsed.figmaContext,
      hint: parsed.hint,
    });

    return NextResponse.json({
      confidence: result.confidence,
      blocks: result.blocks,
      reasoning: result.reasoning,
      previewHtml: result.previewHtml,
      warnings: result.warnings,
      nodeCount: result.nodeCount,
      buildMethod: result.buildMethod,
    });
  } catch (error) {
    console.error('AI build-react-email error:', error);
    const message = error instanceof Error ? error.message : 'React Email AI build failed';
    const providerDown =
      message.includes('Ollama') || message.includes('GEMINI') || message.includes('quota');
    return errorResponse(
      providerDown ? 503 : 400,
      providerDown ? 'ai_unavailable' : 'ai_failed',
      message
    );
  }
}
