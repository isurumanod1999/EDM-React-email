import { NextRequest, NextResponse } from 'next/server';
import { CORRELATION_HEADER, getOrCreateCorrelationId } from '@/lib/observability/correlation';
import { logger } from '@/lib/observability/logger';

/**
 * Request middleware (Story 1.8, and the seam for Story 2.3's access gate).
 *
 * Ensures every API request has a correlation id, logs the request, forwards
 * the id to the handler on request headers, and echoes it on the response so a
 * client/operator can quote it when reporting an error.
 */
export function middleware(request: NextRequest) {
  const correlationId = getOrCreateCorrelationId(request.headers);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(CORRELATION_HEADER, correlationId);

  logger.info('request', {
    correlationId,
    method: request.method,
    path: request.nextUrl.pathname,
  });

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(CORRELATION_HEADER, correlationId);
  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};
