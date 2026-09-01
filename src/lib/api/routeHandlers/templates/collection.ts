import { NextRequest, NextResponse } from 'next/server';
import { getTemplateService } from '@/lib/templates/service';
import { handleRouteError } from '@/lib/api/response';
import { getCorrelationId } from '@/lib/observability/correlation';
import { logger } from '@/lib/observability/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const correlationId = getCorrelationId(request);
  try {
    const templates = await getTemplateService().list();
    return NextResponse.json({ templates });
  } catch (error) {
    logger.error('templates.list failed', { correlationId, error: String(error) });
    return handleRouteError(error, {
      status: 500,
      code: 'internal_error',
      message: 'Failed to list templates',
      correlationId,
    });
  }
}

export async function POST(request: NextRequest) {
  const correlationId = getCorrelationId(request);
  try {
    const body = await request.json();
    const saved = await getTemplateService().create(body);
    return NextResponse.json({ template: saved }, { status: 201 });
  } catch (error) {
    logger.error('templates.create failed', { correlationId, error: String(error) });
    return handleRouteError(error, {
      status: 400,
      code: 'bad_request',
      message: 'Failed to create template',
      correlationId,
    });
  }
}
