import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { CORRELATION_HEADER } from '@/lib/observability/correlation';
import { AccessDeniedError } from '@/lib/auth/accessContext';

/**
 * Uniform API error handling (Story 1.7 / AD-9).
 *
 * The wire shape keeps `error` as a string for client compatibility and adds a
 * machine-readable `code`. Unexpected errors fall back to a safe generic
 * message so stack traces, secrets, and internals never reach the browser
 * (FR21). Intentional, user-facing failures use `ApiError` with a curated
 * message; validation failures map to 400 automatically.
 *
 * Note: AD-9's fully nested `{ error: { code, message } }` shape plus the
 * coordinated client migration is deferred to avoid breaking the current client
 * which reads `data.error` as a string.
 */

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function zodMessage(error: ZodError): string {
  const first = error.issues[0];
  if (!first) return 'Invalid request';
  const path = first.path.join('.');
  return path ? `${path}: ${first.message}` : first.message;
}

export function errorResponse(
  status: number,
  code: string,
  message: string,
  correlationId?: string
): NextResponse {
  const body = correlationId ? { error: message, code, correlationId } : { error: message, code };
  const response = NextResponse.json(body, { status });
  if (correlationId) {
    response.headers.set(CORRELATION_HEADER, correlationId);
  }
  return response;
}

export function notFound(message = 'Not found', correlationId?: string): NextResponse {
  return errorResponse(404, 'not_found', message, correlationId);
}

/**
 * Map a caught error to a standard response. Known conditions (ApiError,
 * ZodError) are surfaced with their own status; anything else uses the caller's
 * safe fallback.
 */
export function handleRouteError(
  error: unknown,
  fallback: {
    status?: number;
    code?: string;
    message?: string;
    correlationId?: string;
  } = {}
): NextResponse {
  const { correlationId } = fallback;
  if (error instanceof AccessDeniedError) {
    return errorResponse(error.status, error.code, error.message, correlationId);
  }
  if (error instanceof ApiError) {
    return errorResponse(error.status, error.code, error.message, correlationId);
  }
  if (error instanceof ZodError) {
    return errorResponse(400, 'validation_error', zodMessage(error), correlationId);
  }
  return errorResponse(
    fallback.status ?? 500,
    fallback.code ?? 'internal_error',
    fallback.message ?? 'Something went wrong',
    correlationId
  );
}
