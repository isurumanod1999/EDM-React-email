export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export const API_ROUTE_MANIFEST = [
  { key: 'ai-status', pattern: 'ai/status', methods: ['GET'] },
  { key: 'ai-analyze-component', pattern: 'ai/analyze-component', methods: ['POST'] },
  { key: 'ai-build-react-email', pattern: 'ai/build-react-email', methods: ['POST'] },
  { key: 'assets-upload', pattern: 'assets/upload', methods: ['POST'] },
  { key: 'assets-file', pattern: 'assets/file/:filename', methods: ['GET'] },
  { key: 'email-export', pattern: 'email/export', methods: ['POST'] },
  { key: 'email-render', pattern: 'email/render', methods: ['POST'] },
  { key: 'email-send', pattern: 'email/send', methods: ['POST'] },
  { key: 'figma-build-email', pattern: 'figma/build-email', methods: ['POST'] },
  {
    key: 'figma-classify-image-nodes',
    pattern: 'figma/classify-image-nodes',
    methods: ['POST'],
  },
  { key: 'figma-import-build', pattern: 'figma/import-build', methods: ['POST'] },
  { key: 'figma-import', pattern: 'figma/import', methods: ['POST'] },
  { key: 'registry', pattern: 'registry', methods: ['GET'] },
  { key: 'saved-components', pattern: 'saved-components', methods: ['GET', 'POST'] },
  {
    key: 'saved-components-id',
    pattern: 'saved-components/:id',
    methods: ['GET', 'DELETE'],
  },
  { key: 'tagging-apply', pattern: 'tagging/apply', methods: ['POST'] },
  { key: 'tagging-parse', pattern: 'tagging/parse', methods: ['POST'] },
  { key: 'templates', pattern: 'templates', methods: ['GET', 'POST'] },
  {
    key: 'templates-duplicate',
    pattern: 'templates/:id/duplicate',
    methods: ['POST'],
  },
  {
    key: 'templates-id',
    pattern: 'templates/:id',
    methods: ['GET', 'PUT', 'DELETE'],
  },
  // Keep this parameter route after the reserved email operation paths.
  { key: 'email-template', pattern: 'email/:template', methods: ['GET'] },
] as const satisfies ReadonlyArray<{
  key: string;
  pattern: string;
  methods: readonly ApiMethod[];
}>;

export type ApiRouteKey = (typeof API_ROUTE_MANIFEST)[number]['key'];

export interface ApiManifestMatch {
  key: ApiRouteKey;
  methods: readonly ApiMethod[];
  params: Record<string, string>;
}

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

    if (matches) {
      return { key: route.key, methods: route.methods, params };
    }
  }

  return null;
}
