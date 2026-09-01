import { NextRequest, NextResponse } from 'next/server';
import * as aiAnalyzeComponent from '@/lib/api/routeHandlers/ai/analyze-component';
import * as aiBuildReactEmail from '@/lib/api/routeHandlers/ai/build-react-email';
import * as aiStatus from '@/lib/api/routeHandlers/ai/status';
import * as assetsFile from '@/lib/api/routeHandlers/assets/file';
import * as assetsUpload from '@/lib/api/routeHandlers/assets/upload';
import * as emailExport from '@/lib/api/routeHandlers/email/export';
import * as emailRender from '@/lib/api/routeHandlers/email/render';
import * as emailSend from '@/lib/api/routeHandlers/email/send';
import * as emailTemplate from '@/lib/api/routeHandlers/email/template';
import * as figmaBuildEmail from '@/lib/api/routeHandlers/figma/build-email';
import * as figmaClassifyImageNodes from '@/lib/api/routeHandlers/figma/classify-image-nodes';
import * as figmaImport from '@/lib/api/routeHandlers/figma/import';
import * as figmaImportBuild from '@/lib/api/routeHandlers/figma/import-build';
import * as registry from '@/lib/api/routeHandlers/registry';
import * as savedComponentsById from '@/lib/api/routeHandlers/saved-components/by-id';
import * as savedComponentsCollection from '@/lib/api/routeHandlers/saved-components/collection';
import * as taggingApply from '@/lib/api/routeHandlers/tagging/apply';
import * as taggingParse from '@/lib/api/routeHandlers/tagging/parse';
import * as templatesById from '@/lib/api/routeHandlers/templates/by-id';
import * as templatesCollection from '@/lib/api/routeHandlers/templates/collection';
import * as templatesDuplicate from '@/lib/api/routeHandlers/templates/duplicate';
import { matchApiRoute } from '@/lib/api/catchAllManifest';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type HttpMethod = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS';

type RouteContext = { params: Promise<Record<string, string>> | Record<string, string> };

type RouteHandler = (
  request: NextRequest,
  context: RouteContext
) => Response | Promise<Response>;

function asHandler(handler: unknown): RouteHandler {
  return handler as RouteHandler;
}

type RouteMatch = {
  handlers: Partial<Record<Exclude<HttpMethod, 'HEAD' | 'OPTIONS'>, RouteHandler>>;
  context: RouteContext;
};

const METHOD_ORDER: HttpMethod[] = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

function promiseParams(values: Record<string, string>): RouteContext {
  return { params: Promise.resolve(values) };
}

function matchRoute(segments: string[]): RouteMatch | null {
  const match = matchApiRoute(segments);
  if (!match) return null;
  const context =
    match.key === 'assets-file'
      ? { params: { filename: match.params.filename! } }
      : promiseParams(match.params);

  switch (match.key) {
    case 'ai-status':
      return { handlers: { GET: asHandler(aiStatus.GET) }, context };
    case 'ai-analyze-component':
      return { handlers: { POST: asHandler(aiAnalyzeComponent.POST) }, context };
    case 'ai-build-react-email':
      return { handlers: { POST: asHandler(aiBuildReactEmail.POST) }, context };
    case 'assets-upload':
      return { handlers: { POST: asHandler(assetsUpload.POST) }, context };
    case 'assets-file':
      return { handlers: { GET: asHandler(assetsFile.GET) }, context };
    case 'email-export':
      return { handlers: { POST: asHandler(emailExport.POST) }, context };
    case 'email-render':
      return { handlers: { POST: asHandler(emailRender.POST) }, context };
    case 'email-send':
      return { handlers: { POST: asHandler(emailSend.POST) }, context };
    case 'email-template':
      return { handlers: { GET: asHandler(emailTemplate.GET) }, context };
    case 'figma-build-email':
      return { handlers: { POST: asHandler(figmaBuildEmail.POST) }, context };
    case 'figma-classify-image-nodes':
      return { handlers: { POST: asHandler(figmaClassifyImageNodes.POST) }, context };
    case 'figma-import-build':
      return { handlers: { POST: asHandler(figmaImportBuild.POST) }, context };
    case 'figma-import':
      return { handlers: { POST: asHandler(figmaImport.POST) }, context };
    case 'registry':
      return { handlers: { GET: asHandler(registry.GET) }, context };
    case 'saved-components':
      return {
        handlers: {
          GET: asHandler(savedComponentsCollection.GET),
          POST: asHandler(savedComponentsCollection.POST),
        },
        context,
      };
    case 'saved-components-id':
      return {
        handlers: {
          GET: asHandler(savedComponentsById.GET),
          DELETE: asHandler(savedComponentsById.DELETE),
        },
        context,
      };
    case 'tagging-apply':
      return { handlers: { POST: asHandler(taggingApply.POST) }, context };
    case 'tagging-parse':
      return { handlers: { POST: asHandler(taggingParse.POST) }, context };
    case 'templates':
      return {
        handlers: {
          GET: asHandler(templatesCollection.GET),
          POST: asHandler(templatesCollection.POST),
        },
        context,
      };
    case 'templates-duplicate':
      return { handlers: { POST: asHandler(templatesDuplicate.POST) }, context };
    case 'templates-id':
      return {
        handlers: {
          GET: asHandler(templatesById.GET),
          PUT: asHandler(templatesById.PUT),
          DELETE: asHandler(templatesById.DELETE),
        },
        context,
      };
  }

  return null;
}

function allowedMethods(handlers: RouteMatch['handlers']): HttpMethod[] {
  const methods = new Set<HttpMethod>();
  for (const method of Object.keys(handlers) as Array<keyof typeof handlers>) {
    if (handlers[method]) methods.add(method);
  }
  if (handlers.GET) methods.add('HEAD');
  return METHOD_ORDER.filter((method) => methods.has(method));
}

function methodNotAllowed(allow: HttpMethod[]) {
  return new NextResponse(null, {
    status: 405,
    headers: { Allow: allow.join(', ') },
  });
}

function notFound() {
  return new NextResponse(null, { status: 404 });
}

async function dispatch(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> | { path: string[] } }
) {
  const { path: segments } = await context.params;
  const match = matchRoute(segments ?? []);
  if (!match) {
    return notFound();
  }

  const method = request.method.toUpperCase() as HttpMethod;
  const allow = allowedMethods(match.handlers);
  const handler = method === 'HEAD' ? match.handlers.GET : match.handlers[method as keyof typeof match.handlers];

  if (!handler) {
    return methodNotAllowed(allow);
  }

  return handler(request, match.context);
}

type CatchAllContext = { params: Promise<{ path: string[] }> | { path: string[] } };

export async function GET(request: NextRequest, context: CatchAllContext) {
  return dispatch(request, context);
}

export async function HEAD(request: NextRequest, context: CatchAllContext) {
  return dispatch(request, context);
}

export async function POST(request: NextRequest, context: CatchAllContext) {
  return dispatch(request, context);
}

export async function PUT(request: NextRequest, context: CatchAllContext) {
  return dispatch(request, context);
}

export async function PATCH(request: NextRequest, context: CatchAllContext) {
  return dispatch(request, context);
}

export async function DELETE(request: NextRequest, context: CatchAllContext) {
  return dispatch(request, context);
}

export async function OPTIONS(request: NextRequest, context: CatchAllContext) {
  return dispatch(request, context);
}
