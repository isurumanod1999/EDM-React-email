import { NextRequest, NextResponse } from 'next/server';
import { CORRELATION_HEADER, getOrCreateCorrelationId } from '@/lib/observability/correlation';
import { logger } from '@/lib/observability/logger';
import { openModeActorHeaders } from '@/lib/auth/accessContext';
import { isLegacyDemoPath, isPublicApiPath } from '@/lib/security/legacyRoutes';
import {
  isBodyTooLarge,
  MAX_HEAVY_JSON_BODY_BYTES,
  MAX_JSON_BODY_BYTES,
} from '@/lib/api/requestLimits';
import { checkRateLimit, clientRateLimitKey } from '@/lib/api/rateLimit';

/**
 * Request middleware (Stories 1.8, 2.3, 2.4, 2.5).
 *
 * - Correlation id on every protected request
 * - Access gate seam: open mode stamps anonymous actor (AD-10)
 * - Legacy demo lockdown outside local/dev opt-in (AR19)
 * - Body-size and rate limits on expensive routes (Story 2.5)
 */

const AUTH_MODE = process.env.AUTH_MODE ?? 'open';

const LEGACY_DEMOS_ENABLED =
  process.env.ENABLE_LEGACY_DEMOS === 'true' ||
  (process.env.ENABLE_LEGACY_DEMOS !== 'false' && process.env.NODE_ENV === 'development');

const RATE_LIMITED_PREFIXES = [
  '/api/email/render',
  '/api/email/export',
  '/api/email/send',
  '/api/figma/',
  '/api/ai/analyze-component',
  '/api/ai/build-react-email',
];

function jsonError(
  status: number,
  code: string,
  message: string,
  correlationId: string
): NextResponse {
  return NextResponse.json({ error: message, code, correlationId }, { status });
}

function maxBodyBytesForPath(pathname: string): number | null {
  if (pathname.startsWith('/api/assets/upload')) return null; // validated in route
  if (pathname.startsWith('/api/tagging/parse')) return null; // multipart xlsx; validated in route
  if (pathname.startsWith('/api/figma/') || pathname.startsWith('/api/ai/')) {
    return MAX_HEAVY_JSON_BODY_BYTES;
  }
  if (
    pathname.startsWith('/api/email/render') ||
    pathname.startsWith('/api/email/export') ||
    pathname.startsWith('/api/email/send') ||
    pathname.startsWith('/api/templates')
  ) {
    return MAX_JSON_BODY_BYTES;
  }
  return null;
}

function isRateLimitedPath(pathname: string): boolean {
  return RATE_LIMITED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function applyAccessGate(request: NextRequest, requestHeaders: Headers): NextResponse | null {
  if (AUTH_MODE === 'enforced') {
    // Epic F4 wires session validation here. Until then, fail closed (NFR9).
    return jsonError(
      503,
      'auth_not_configured',
      'Authentication is enforced but no identity adapter is configured yet.',
      getOrCreateCorrelationId(request.headers)
    );
  }

  const actorHeaders = openModeActorHeaders();
  for (const [key, value] of Object.entries(actorHeaders)) {
    requestHeaders.set(key, value);
  }
  return null;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const correlationId = getOrCreateCorrelationId(request.headers);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(CORRELATION_HEADER, correlationId);

  logger.info('request', {
    correlationId,
    method: request.method,
    path: pathname,
  });

  if (isLegacyDemoPath(pathname) && !LEGACY_DEMOS_ENABLED) {
    return jsonError(
      404,
      'legacy_demo_disabled',
      'Legacy demo routes are disabled. Set ENABLE_LEGACY_DEMOS=true for local use.',
      correlationId
    );
  }

  if (pathname.startsWith('/api/') && !isPublicApiPath(pathname)) {
    const gateResponse = applyAccessGate(request, requestHeaders);
    if (gateResponse) {
      gateResponse.headers.set(CORRELATION_HEADER, correlationId);
      return gateResponse;
    }

    if (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH') {
      const maxBytes = maxBodyBytesForPath(pathname);
      if (maxBytes !== null && isBodyTooLarge(request, maxBytes)) {
        return jsonError(
          413,
          'payload_too_large',
          `Request body exceeds the ${maxBytes} byte limit.`,
          correlationId
        );
      }
    }

    if (isRateLimitedPath(pathname)) {
      const limit = checkRateLimit(clientRateLimitKey(request, pathname), {
        windowMs: 60_000,
        maxRequests: 30,
      });
      if (!limit.allowed) {
        const response = jsonError(
          429,
          'rate_limited',
          'Too many requests. Try again shortly.',
          correlationId
        );
        response.headers.set('Retry-After', String(limit.retryAfterSeconds));
        response.headers.set(CORRELATION_HEADER, correlationId);
        return response;
      }
    }
  }

  if (pathname.startsWith('/builder')) {
    const gateResponse = applyAccessGate(request, requestHeaders);
    if (gateResponse) {
      gateResponse.headers.set(CORRELATION_HEADER, correlationId);
      return gateResponse;
    }
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(CORRELATION_HEADER, correlationId);
  return response;
}

export const config = {
  matcher: ['/api/:path*', '/builder/:path*', '/preview/:path*'],
};
