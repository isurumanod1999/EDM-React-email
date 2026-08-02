import { NextRequest, NextResponse } from 'next/server';
import { getTemplateService } from '@/lib/templates/service';
import { handleRouteError, notFound } from '@/lib/api/response';
import { getCorrelationId } from '@/lib/observability/correlation';
import { logger } from '@/lib/observability/logger';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const correlationId = getCorrelationId(request);
  const { id } = await params;
  const template = await getTemplateService().get(id);

  if (!template) {
    return notFound('Template not found', correlationId);
  }

  return NextResponse.json({ template });
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const correlationId = getCorrelationId(request);
  try {
    const { id } = await params;
    const body = await request.json();
    const updated = await getTemplateService().update(id, body);

    if (!updated) {
      return notFound('Template not found', correlationId);
    }

    return NextResponse.json({ template: updated });
  } catch (error) {
    logger.error('templates.update failed', { correlationId, error: String(error) });
    return handleRouteError(error, {
      status: 400,
      code: 'bad_request',
      message: 'Failed to update template',
      correlationId,
    });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const correlationId = getCorrelationId(request);
  const { id } = await params;
  const deleted = await getTemplateService().remove(id);

  if (!deleted) {
    return notFound('Template not found', correlationId);
  }

  return NextResponse.json({ success: true });
}
