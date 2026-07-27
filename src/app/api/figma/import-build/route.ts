import { NextResponse } from 'next/server';
import { z } from 'zod';
import { importFromFigma } from '@/lib/figma/importFromFigma';
import { figmaToReactEmailTree } from '@/lib/figma/figmaToReactEmail';
import { resolveSectionBackground } from '@/lib/figma/figmaPrimitives';
import { buildFrameImageTree } from '@/lib/figma/frameImageBlock';
import { resolveForceImageIds } from '@/lib/figma/resolveForceImageIds';
import { attachMissingForcedExports } from '@/lib/figma/attachMissingForcedExports';
import { downloadForcedExportToUploads } from '@/lib/figma/importFromFigma';

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
  /**
   * 'design'  → build structured React Email primitives (default).
   * 'image'   → flatten the whole component to a single full-frame PNG. Used for
   *             CSS-heavy components email clients can't render reliably.
   */
  buildAs: z.enum(['design', 'image']).optional(),
  /**
   * Mixed-mode image export (only relevant for buildAs='design').
   *  - autoDetectImages: run the heuristic detector to rasterize icon/SVG/vector
   *    clusters to 2× PNGs (default true).
   *  - imageInstructions: free-form guidance; when present the AI classifier runs
   *    server-side to pick additional nodes (falls back silently if AI is off).
   *  - imageNodeIds: explicit node IDs to force to image (e.g. from a client-side
   *    "Suggest with AI" checklist). Highest-priority source.
   */
  autoDetectImages: z.boolean().optional(),
  imageInstructions: z.string().optional(),
  imageNodeIds: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      figmaUrl,
      mobileFigmaUrl,
      label,
      buildAs,
      autoDetectImages,
      imageInstructions,
      imageNodeIds,
    } = schema.parse(body);

    const imported = await importFromFigma({ figmaUrl, mobileFigmaUrl });
    const nodeName = label?.trim() || imported.nodeName;

    if (buildAs === 'image') {
      if (!imported.desktopUrl) {
        throw new Error(
          'Could not flatten this component to an image — the Figma frame render could not be downloaded (check network/proxy to Figma\'s image CDN).'
        );
      }
      const tree = buildFrameImageTree({
        desktopUrl: imported.desktopUrl,
        mobileUrl: imported.mobileUrl,
        width: imported.desktopNode.width,
        height: imported.desktopNode.height,
        alt: nodeName,
        backgroundColor: resolveSectionBackground(imported.desktopNode),
      });
      const block = {
        componentId: 'figma-react-email',
        props: { tree, sourceFrame: imported.nodeName, mobileFrame: imported.mobileNode?.name ?? '' },
        label: nodeName,
      };
      return NextResponse.json({ block, nodeName, warnings: [], nodeCount: 2, buildAs: 'image' });
    }

    // Compute the mixed-mode forced-image set. Priority/union of three sources:
    //  1. explicit imageNodeIds (client-picked, e.g. from "Suggest with AI"),
    //  2. heuristic detection when autoDetect is on (default),
    //  3. the AI classifier when a free-form instruction is supplied (best-effort;
    //     silently contributes nothing if the AI provider is unavailable).
    const { forceImageIds, mergeClusters } = await resolveForceImageIds(imported.desktopNode, {
      autoDetectImages,
      imageInstructions,
      imageNodeIds,
      designContext: imported.designContext,
    });

    const desktopForBuild = await attachMissingForcedExports(
      imported.fileKey,
      imported.desktopNode,
      forceImageIds,
      downloadForcedExportToUploads,
      mergeClusters
    );

    const { tree, warnings, nodeCount } = figmaToReactEmailTree(
      desktopForBuild,
      imported.mobileNode,
      {
        desktopUrl: imported.desktopUrl,
        mobileUrl: imported.mobileUrl,
        mode: 'primitives',
        forceImageIds,
      }
    );

    const block = {
      componentId: 'figma-react-email',
      props: {
        tree,
        sourceFrame: imported.nodeName,
        mobileFrame: imported.mobileNode?.name ?? '',
      },
      label: nodeName,
    };

    return NextResponse.json({ block, nodeName, warnings, nodeCount, buildAs: 'design' });
  } catch (error) {
    console.error('Figma import-build error:', error);
    const message = error instanceof Error ? error.message : 'Figma import/build failed';
    const status = message.includes('FIGMA_ACCESS_TOKEN') ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
