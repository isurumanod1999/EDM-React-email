import { NextResponse } from 'next/server';
import { z } from 'zod';
import { importFromFigma } from '@/lib/figma/importFromFigma';
import { figmaToReactEmailTree } from '@/lib/figma/figmaToReactEmail';

export const dynamic = 'force-dynamic';

/**
 * Single-shot import + build for ONE component: fetches the Figma frame(s) and
 * builds the React Email primitive block in a single round trip. The batch
 * import modal fires this endpoint once per row, all in parallel, so importing
 * N components takes roughly as long as the slowest single component instead of
 * the sum of all of them.
 */
const schema = z.object({
  figmaUrl: z.string().url(),
  mobileFigmaUrl: z.string().url().optional(),
  label: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { figmaUrl, mobileFigmaUrl, label } = schema.parse(body);

    const imported = await importFromFigma({ figmaUrl, mobileFigmaUrl });

    const { tree, warnings, nodeCount } = figmaToReactEmailTree(
      imported.desktopNode,
      imported.mobileNode,
      {
        desktopUrl: imported.desktopUrl,
        mobileUrl: imported.mobileUrl,
        mode: 'primitives',
      }
    );

    const nodeName = label?.trim() || imported.nodeName;

    const block = {
      componentId: 'figma-react-email',
      props: {
        tree,
        sourceFrame: imported.nodeName,
        mobileFrame: imported.mobileNode?.name ?? '',
      },
      label: nodeName,
    };

    return NextResponse.json({ block, nodeName, warnings, nodeCount });
  } catch (error) {
    console.error('Figma import-build error:', error);
    const message = error instanceof Error ? error.message : 'Figma import/build failed';
    const status = message.includes('FIGMA_ACCESS_TOKEN') ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
