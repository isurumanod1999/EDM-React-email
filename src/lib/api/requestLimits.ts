/**
 * Request-size guards (Story 2.5).
 *
 * Uses Content-Length when present; routes may also enforce limits after
 * reading the body when the header is absent.
 */

export function contentLengthBytes(request: Request): number | null {
  const raw = request.headers.get('content-length');
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isBodyTooLarge(request: Request, maxBytes: number): boolean {
  const length = contentLengthBytes(request);
  return length !== null && length > maxBytes;
}

/** JSON POST bodies for render/export/send and similar routes. */
export const MAX_JSON_BODY_BYTES = 5 * 1024 * 1024;

/** Figma/AI import payloads may include large node trees. */
export const MAX_HEAVY_JSON_BODY_BYTES = 10 * 1024 * 1024;
