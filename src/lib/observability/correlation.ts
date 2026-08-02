import { generateId } from '@/lib/utils/id';

/**
 * Correlation id plumbing (Story 1.8). A single id ties a request, its logs,
 * and its response together. Callers may supply one via the header (e.g. a
 * reverse proxy or the client); otherwise we generate one.
 */

export const CORRELATION_HEADER = 'x-correlation-id';

export function getOrCreateCorrelationId(headers: Headers): string {
  const existing = headers.get(CORRELATION_HEADER);
  if (existing && existing.trim().length > 0) {
    return existing.trim();
  }
  return generateId();
}

/**
 * Read the correlation id inside a route handler. Middleware sets it on the
 * request headers; if middleware was bypassed we mint one so logs still tie
 * together.
 */
export function getCorrelationId(request: { headers: Headers }): string {
  return getOrCreateCorrelationId(request.headers);
}
