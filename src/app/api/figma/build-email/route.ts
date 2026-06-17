import { NextResponse } from 'next/server';
import { render } from '@react-email/render';
import { z } from 'zod';
import { figmaToReactEmailTree } from '@/lib/figma/figmaToReactEmail';
import type { ParsedFigmaNode } from '@/lib/figma/parseFigmaNode';
import { DynamicEmailTemplate } from '@/lib/render/DynamicEmailTemplate';
import { generateId } from '@/lib/utils/id';
import { DEFAULT_TEMPLATE_META } from '@/lib/schema/template';

export const dynamic = 'force-dynamic';

const parsedFigmaNodeSchema: z.ZodType<ParsedFigmaNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: z.string(),
    name: z.string(),
    width: z.number().optional(),
    height: z.number().optional(),
    visible: z.boolean(),
    text: z.string().optional(),
    fontSize: z.number().optional(),
    fontWeight: z.number().optional(),
    fontFamily: z.string().optional(),
    lineHeight: z.number().optional(),
    letterSpacing: z.number().optional(),
    paragraphSpacing: z.number().optional(),
    textAlign: z.string().optional(),
    color: z.string().optional(),
    backgroundColor: z.string().optional(),
    paddingTop: z.number().optional(),
    paddingRight: z.number().optional(),
    paddingBottom: z.number().optional(),
    paddingLeft: z.number().optional(),
    gap: z.number().optional(),
    layoutMode: z.string().optional(),
    primaryAxisAlign: z.string().optional(),
    counterAxisAlign: z.string().optional(),
    cornerRadius: z.number().optional(),
    strokeColor: z.string().optional(),
    strokeWeight: z.number().optional(),
    imageRef: z.string().optional(),
    exportUrl: z.string().optional(),
    componentId: z.string().optional(),
    nodeId: z.string().optional(),
    children: z.array(parsedFigmaNodeSchema),
  })
);

const buildEmailSchema = z.object({
  desktopNode: parsedFigmaNodeSchema,
  mobileNode: parsedFigmaNodeSchema.optional(),
  nodeName: z.string(),
  fileName: z.string().optional(),
  desktopUrl: z.string().optional(),
  mobileUrl: z.string().optional(),
  mode: z.enum(['fidelity', 'primitives']).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = buildEmailSchema.parse(body);

    const { tree, warnings, nodeCount } = figmaToReactEmailTree(
      parsed.desktopNode,
      parsed.mobileNode,
      {
        desktopUrl: parsed.desktopUrl,
        mobileUrl: parsed.mobileUrl,
        mode: parsed.mode,
      }
    );

    const block = {
      componentId: 'figma-react-email',
      props: {
        tree,
        sourceFrame: parsed.nodeName,
        mobileFrame: parsed.mobileNode?.name ?? '',
      },
      label: parsed.nodeName,
    };

    const templateBlock = {
      id: generateId(),
      componentId: block.componentId,
      componentVersion: 1,
      props: block.props,
      label: block.label,
    };

    const previewHtml = await render(
      DynamicEmailTemplate({
        meta: DEFAULT_TEMPLATE_META,
        blocks: [templateBlock],
      })
    );

    return NextResponse.json({
      confidence: 1,
      blocks: [block],
      reasoning:
        parsed.mode === 'primitives'
          ? `Built React Email primitives from Figma frame "${parsed.nodeName}" (${nodeCount} nodes).`
          : `Built pixel-accurate email from Figma frame "${parsed.nodeName}" (${nodeCount} React Email nodes).`,
      previewHtml,
      warnings,
      nodeCount,
    });
  } catch (error) {
    console.error('Figma build-email error:', error);
    const message = error instanceof Error ? error.message : 'React Email build failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
