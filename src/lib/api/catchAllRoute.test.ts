import { describe, expect, it } from 'vitest';
import {
  API_ROUTE_MANIFEST,
  DEDICATED_API_ROUTES,
  matchApiRoute,
} from './catchAllManifest';

describe('API catch-all manifest', () => {
  it.each(API_ROUTE_MANIFEST)('matches leftover /api/$pattern', (route) => {
    const concretePath = route.pattern
      .replace(':id', 'record-id')
      .replace(':filename', 'image.png')
      .replace(':template', 'nissan');
    const match = matchApiRoute(concretePath.split('/'));

    expect(match?.key).toBe(route.key);
    expect(match?.methods).toEqual(route.methods);
  });

  it.each(DEDICATED_API_ROUTES)('does not catch dedicated /api/%s', (pattern) => {
    const concretePath = pattern.replace(':id', 'record-id');
    expect(matchApiRoute(concretePath.split('/'))).toBeNull();
  });

  it('captures dynamic leftover parameters', () => {
    expect(matchApiRoute(['saved-components', 'abc'])?.params).toEqual({ id: 'abc' });
    expect(matchApiRoute(['assets', 'file', 'hero.png'])?.params).toEqual({
      filename: 'hero.png',
    });
  });

  it('keeps email/send ahead of the legacy template route', () => {
    expect(matchApiRoute(['email', 'send'])?.key).toBe('email-send');
    expect(matchApiRoute(['email', 'nissan'])?.key).toBe('email-template');
  });

  it('returns null for an unknown API path', () => {
    expect(matchApiRoute(['not-a-route'])).toBeNull();
  });

  it('stays within the Hobby function budget', () => {
    const dedicatedApis = DEDICATED_API_ROUTES.length;
    const catchAll = 1;
    const dynamicPages = 2;
    expect(dedicatedApis + catchAll + dynamicPages).toBe(12);
  });
});
