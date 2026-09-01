import { NextRequest, NextResponse } from 'next/server';
import { getSavedComponentService } from '@/lib/saved-components/service';
import { errorResponse, handleRouteError, notFound } from '@/lib/api/response';
import { getCorrelationId } from '@/lib/observability/correlation';
import { logger } from '@/lib/observability/logger';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const correlationId = getCorrelationId(request);
  const { id } = await params;
  const component = await getSavedComponentService().get(id);
  if (!component) return notFound('Reusable component not found', correlationId);
  return NextResponse.json({ component });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const correlationId = getCorrelationId(request);
  try {
    const { id } = await params;
    const result = await getSavedComponentService().remove(id);

    if (result.status === 'not-found') {
      return notFound('Reusable component not found', correlationId);
    }
    if (result.status === 'in-use') {
      const names = result.templates.map((template) => template.name).join(', ');
      return errorResponse(
        409,
        'component_in_use',
        `Remove this component from these templates first: ${names}`,
        correlationId
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('saved-components.delete failed', { correlationId, error: String(error) });
    return handleRouteError(error, {
      status: 500,
      code: 'internal_error',
      message: 'Failed to delete reusable component',
      correlationId,
    });
  }
}
