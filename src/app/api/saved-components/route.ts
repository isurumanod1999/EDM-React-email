import { NextRequest, NextResponse } from 'next/server';
import {
  DuplicateSavedComponentNameError,
  getSavedComponentService,
} from '@/lib/saved-components/service';
import { errorResponse, handleRouteError } from '@/lib/api/response';
import { getCorrelationId } from '@/lib/observability/correlation';
import { logger } from '@/lib/observability/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const correlationId = getCorrelationId(request);
  try {
    const components = await getSavedComponentService().list();
    return NextResponse.json({ components });
  } catch (error) {
    logger.error('saved-components.list failed', { correlationId, error: String(error) });
    return handleRouteError(error, {
      status: 500,
      code: 'internal_error',
      message: 'Failed to list reusable components',
      correlationId,
    });
  }
}

export async function POST(request: NextRequest) {
  const correlationId = getCorrelationId(request);
  try {
    const body = await request.json();
    const component = await getSavedComponentService().create(body);
    return NextResponse.json({ component }, { status: 201 });
  } catch (error) {
    logger.error('saved-components.create failed', { correlationId, error: String(error) });
    if (error instanceof DuplicateSavedComponentNameError) {
      return errorResponse(409, 'duplicate_name', error.message, correlationId);
    }
    return handleRouteError(error, {
      status: 400,
      code: 'bad_request',
      message: 'Failed to create reusable component',
      correlationId,
    });
  }
}
