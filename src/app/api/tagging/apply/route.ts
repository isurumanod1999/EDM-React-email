import { NextResponse } from 'next/server';
import { z } from 'zod';
import { errorResponse, handleRouteError, notFound } from '@/lib/api/response';
import { getTaggingService } from '@/lib/tagging/service';

export const dynamic = 'force-dynamic';

const mappingSchema = z.object({
  rowIndex: z.number().int().nonnegative(),
  targetId: z.string().min(1),
  finalUrl: z.string().min(1),
  altText: z.string().optional(),
  urlLabel: z.string(),
});

const bodySchema = z.object({
  templateId: z.string().min(1),
  mappings: z.array(mappingSchema).min(1),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const body = bodySchema.parse(json);
    const result = await getTaggingService().apply(body.templateId, body.mappings);

    if (result.notFound) {
      return notFound('Template not found');
    }

    return NextResponse.json({
      template: result.template,
      applied: result.applied,
      warnings: result.warnings,
    });
  } catch (error) {
    console.error('Tagging apply error:', error);
    const message = error instanceof Error ? error.message : 'Tagging apply failed';
    return handleRouteError(error, {
      status: 400,
      code: 'tagging_apply_failed',
      message,
    });
  }
}
