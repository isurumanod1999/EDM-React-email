export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

/**
 * Hobby allows 12 serverless functions total. Dynamic pages already use 2:
 * `/builder/[id]` and `/preview/[template]`. That leaves 10 API functions:
 * 9 dedicated hot-path routes + this catch-all for everything else.
 *
 * Dedicated routes (not dispatched here):
 * registry, templates, templates/:id, templates/:id/duplicate,
 * email/render, email/export, figma/import, figma/build-email, assets/upload
 */
export const API_ROUTE_MANIFEST = [
  { key: 'ai-status', pattern: 'ai/status', methods: ['GET'] },
  { key: 'ai-analyze-component', pattern: 'ai/analyze-component', methods: ['POST'] },
  { key: 'ai-build-react-email', pattern: 'ai/build-react-email', methods: ['POST'] },
  { key: 'assets-file', pattern: 'assets/file/:filename', methods: ['GET'] },
  { key: 'email-send', pattern: 'email/send', methods: ['POST'] },
  {
    key: 'figma-classify-image-nodes',
    pattern: 'figma/classify-image-nodes',
    methods: ['POST'],
  },
  { key: 'figma-import-build', pattern: 'figma/import-build', methods: ['POST'] },
  { key: 'saved-components', pattern: 'saved-components', methods: ['GET', 'POST'] },
  {
    key: 'saved-components-id',
    pattern: 'saved-components/:id',
    methods: ['GET', 'DELETE'],
  },
  { key: 'tagging-apply', pattern: 'tagging/apply', methods: ['POST'] },
  { key: 'tagging-parse', pattern: 'tagging/parse', methods: ['POST'] },
  // Keep after reserved email/send so /api/email/nissan still maps here.
  { key: 'email-template', pattern: 'email/:template', methods: ['GET'] },
] as const satisfies ReadonlyArray<{
  key: string;
  pattern: string;
  methods: readonly ApiMethod[];
}>;

export const DEDICATED_API_ROUTES = [
  'registry',
  'templates',
  'templates/:id',
  'templates/:id/duplicate',
  'email/render',
  'email/export',
  'figma/import',
  'figma/build-email',
  'assets/upload',
] as const;

export type ApiRouteKey = (typeof API_ROUTE_MANIFEST)[number]['key'];

export interface ApiManifestMatch {
  key: ApiRouteKey;
  methods: readonly ApiMethod[];
  params: Record<string, string>;
}

const RESERVED_EMAIL_SLUGS = new Set(['render', 'export', 'send']);

export function matchApiRoute(segments: string[]): ApiManifestMatch | null {
  for (const route of API_ROUTE_MANIFEST) {
    const patternSegments = route.pattern.split('/');
    if (patternSegments.length !== segments.length) continue;

    const params: Record<string, string> = {};
    let matches = true;
    for (let index = 0; index < patternSegments.length; index++) {
      const expected = patternSegments[index]!;
      const actual = segments[index];
      if (!actual) {
        matches = false;
        break;
      }
      if (expected.startsWith(':')) {
        params[expected.slice(1)] = actual;
      } else if (expected !== actual) {
        matches = false;
        break;
      }
    }

    if (
      matches &&
      route.key === 'email-template' &&
      RESERVED_EMAIL_SLUGS.has(params.template ?? '')
    ) {
      matches = false;
    }

    if (matches) {
      return { key: route.key, methods: route.methods, params };
    }
  }

  return null;
}
