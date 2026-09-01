import { describe, expect, it } from 'vitest';
import { API_ROUTE_MANIFEST, matchApiRoute } from './catchAllManifest';

describe('API catch-all manifest', () => {
  it.each(API_ROUTE_MANIFEST)('matches /api/$pattern', (route) => {
    const concretePath = route.pattern
      .replace(':id', 'record-id')
      .replace(':filename', 'image.png')
      .replace(':template', 'nissan');
    const match = matchApiRoute(concretePath.split('/'));

    expect(match?.key).toBe(route.key);
    expect(match?.methods).toEqual(route.methods);
  });

  it('captures dynamic route parameters', () => {
    expect(matchApiRoute(['templates', 'abc'])?.params).toEqual({ id: 'abc' });
    expect(matchApiRoute(['assets', 'file', 'hero.png'])?.params).toEqual({
      filename: 'hero.png',
    });
  });

  it('keeps reserved email operations ahead of the legacy template route', () => {
    expect(matchApiRoute(['email', 'render'])?.key).toBe('email-render');
    expect(matchApiRoute(['email', 'nissan'])?.key).toBe('email-template');
  });

  it('returns null for an unknown API path', () => {
    expect(matchApiRoute(['not-a-route'])).toBeNull();
  });
});
