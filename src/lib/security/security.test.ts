import { describe, it, expect } from 'vitest';
import { isLocalBindHost } from '@/lib/security/exposureGate';
import { isLegacyDemoApiPath, isLegacyDemoPagePath } from '@/lib/security/legacyRoutes';
import { requireAccess, ANONYMOUS_ACTOR } from '@/lib/auth/accessContext';

describe('exposureGate', () => {
  it('treats localhost as a safe bind', () => {
    expect(isLocalBindHost('localhost')).toBe(true);
    expect(isLocalBindHost('127.0.0.1')).toBe(true);
  });

  it('treats private RFC1918 addresses as internal', () => {
    expect(isLocalBindHost('10.0.0.5')).toBe(true);
    expect(isLocalBindHost('192.168.1.10')).toBe(true);
  });

  it('rejects public bind addresses', () => {
    expect(isLocalBindHost('0.0.0.0')).toBe(false);
    expect(isLocalBindHost('203.0.113.1')).toBe(false);
  });
});

describe('legacyRoutes', () => {
  it('detects legacy demo API paths but not render/export/send', () => {
    expect(isLegacyDemoApiPath('/api/email/nissan')).toBe(true);
    expect(isLegacyDemoApiPath('/api/email/render')).toBe(false);
    expect(isLegacyDemoApiPath('/api/email/export')).toBe(false);
  });

  it('detects legacy preview pages', () => {
    expect(isLegacyDemoPagePath('/preview/nissan')).toBe(true);
    expect(isLegacyDemoPagePath('/builder/abc')).toBe(false);
  });
});

describe('requireAccess (open mode)', () => {
  it('allows anonymous actor in open mode', () => {
    const headers = new Headers({
      'x-actor-id': ANONYMOUS_ACTOR.actorId,
      'x-actor-role': ANONYMOUS_ACTOR.role,
    });
    const ctx = requireAccess({ headers });
    expect(ctx.actorId).toBe('anonymous');
  });
});
