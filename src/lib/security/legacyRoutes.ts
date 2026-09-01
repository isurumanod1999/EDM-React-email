/** Legacy static demo routes (Story 2.4 / AR19). */

const LEGACY_API_RESERVED = new Set(['render', 'export', 'send']);

/** `/api/email/two-col-dual-cta` style legacy handlers — not render/export/send. */
export function isLegacyDemoApiPath(pathname: string): boolean {
  const match = /^\/api\/email\/([^/]+)$/.exec(pathname);
  if (!match) return false;
  return !LEGACY_API_RESERVED.has(match[1]);
}

export function isLegacyDemoPagePath(pathname: string): boolean {
  return /^\/preview\/[^/]+$/.test(pathname);
}

export function isLegacyDemoPath(pathname: string): boolean {
  return isLegacyDemoApiPath(pathname) || isLegacyDemoPagePath(pathname);
}

/** Routes that skip the access gate matcher (public health/readiness). */
export function isPublicApiPath(pathname: string): boolean {
  return pathname === '/api/ai/status';
}
