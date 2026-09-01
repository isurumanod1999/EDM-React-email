import { NextResponse } from 'next/server';
import { z } from 'zod';
import { classifyImageNodeIds } from '@/lib/ai/classifyImageNodes';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * AI image-node classifier endpoint (mixed-mode export).
 *
 * Body: { nodes: {id,name,type,width?,height?,text?}[], instruction: string }.
 * Returns { ids: string[], error? }. ALWAYS responds 200 — even when the AI
 * provider is unavailable (e.g. Ollama is off) or returns garbage — so the
 * client can quietly fall back to the deterministic heuristic. The build must
 * never hard-fail just because AI is unavailable.
 */
const schema = z.object({
  nodes: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.string(),
      width: z.number().optional(),
      height: z.number().optional(),
      text: z.string().optional(),
      depth: z.number().int().nonnegative().optional().default(0),
      childCount: z.number().int().nonnegative().optional().default(0),
    })
  ),
  instruction: z.string().optional().default(''),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.parse(body);
    const result = await classifyImageNodeIds({
      nodes: parsed.nodes,
      instruction: parsed.instruction,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'classify-image-nodes failed';
    // Still 200 with an empty list so the client falls back to the heuristic.
    return NextResponse.json({ ids: [], error: message }, { status: 200 });
  }
}
