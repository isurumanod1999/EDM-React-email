import { NextResponse } from 'next/server';
import { render } from '@react-email/render';
import { analyzeComponent, toTemplateBlocks } from '@/lib/ai/analyzeComponent';
import { analyzeRequestSchema } from '@/lib/ai/schemas/analyzeResult';
import { DynamicEmailTemplate } from '@/lib/render/DynamicEmailTemplate';
import { DEFAULT_TEMPLATE_META } from '@/lib/schema/template';
import { errorResponse } from '@/lib/api/response';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = analyzeRequestSchema.parse(body);

    const result = await analyzeComponent({
      desktopUrl: parsed.desktopUrl,
      mobileUrl: parsed.mobileUrl,
      hint: parsed.hint,
      figmaContext: parsed.figmaContext,
    });

    const templateBlocks = toTemplateBlocks(result.blocks);

    const previewHtml = await render(
      DynamicEmailTemplate({
        meta: DEFAULT_TEMPLATE_META,
        blocks: templateBlocks,
      })
    );

    return NextResponse.json({
      confidence: result.confidence,
      blocks: result.blocks,
      reasoning: result.reasoning,
      previewHtml,
    });
  } catch (error) {
    console.error('AI analyze error:', error);
    const message = error instanceof Error ? error.message : 'Analysis failed';
    const providerDown =
      message.includes('Ollama') || message.includes('GEMINI') || message.includes('quota');
    return errorResponse(
      providerDown ? 503 : 400,
      providerDown ? 'ai_unavailable' : 'ai_failed',
      message
    );
  }
}
