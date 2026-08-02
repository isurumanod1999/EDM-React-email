import { config } from '@/lib/config';

/**
 * External-exposure gate (Story 2.7 / AD-10, NFR9).
 *
 * Refuses to serve when AUTH_MODE=open is combined with a non-local bind, so
 * the tool cannot be accidentally exposed before authentication exists.
 */

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export function isLocalBindHost(host: string): boolean {
  const normalized = host.trim().toLowerCase();
  if (LOCAL_HOSTS.has(normalized)) return true;
  // Private RFC1918 ranges are treated as internal/VPN-safe.
  if (/^10\./.test(normalized)) return true;
  if (/^192\.168\./.test(normalized)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(normalized)) return true;
  return false;
}

export function assertSafeExposure(): void {
  if (config.authMode === 'enforced') {
    return;
  }

  const host = config.host;
  if (isLocalBindHost(host)) {
    return;
  }

  throw new Error(
    [
      `Refusing to start: AUTH_MODE=open with non-local bind (${host}).`,
      'Use localhost or a private network address for internal team use,',
      'or set AUTH_MODE=enforced before binding to a public interface.',
    ].join(' ')
  );
}
