/* TEMP diagnostic — node 18886-484 desktop header. Delete after verification. */
import { render } from '@react-email/render';
import * as React from 'react';
import { importFromFigma } from '../src/lib/figma/importFromFigma';
import { resolveSectionBackground } from '../src/lib/figma/figmaPrimitives';
import { resolveEffectiveBackground } from '../src/lib/figma/parseFigmaNode';
import { buildFrameImageTree } from '../src/lib/figma/frameImageBlock';
import { FigmaReactEmailBlock } from '../src/components/email/FigmaReactEmailBlock';

async function main() {
  const figmaUrl =
    'https://www.figma.com/design/d01HwQtDDKOfYzjqe03aJu/NSSNAM-2315_Nissan_FY25_September_Retail_eDM?node-id=18886-484';

  const imported = await importFromFigma({ figmaUrl });
  const node = imported.desktopNode;

  console.log('desktopUrl:', imported.desktopUrl);
  console.log('node w x h:', node.width, 'x', node.height);
  console.log('node.backgroundColor:', node.backgroundColor);
  console.log('resolveEffectiveBackground:', resolveEffectiveBackground(node));
  console.log('resolveSectionBackground:', resolveSectionBackground(node));

  const tree = buildFrameImageTree({
    desktopUrl: imported.desktopUrl!,
    mobileUrl: imported.mobileUrl,
    width: node.width,
    height: node.height,
    alt: imported.nodeName,
    backgroundColor: resolveSectionBackground(node),
  });
  const section = tree as { style?: Record<string, unknown> };
  console.log('image-mode Section backgroundColor:', section.style?.backgroundColor);

  const html = await render(
    React.createElement(FigmaReactEmailBlock, { tree, editable: false })
  );
  const tableMatch = html.match(/<table[^>]*background[^>]*>/i);
  const imgMatch = html.match(/<img[^>]*>/i);
  console.log('table w/ background:', tableMatch?.[0]?.slice(0, 200) ?? '(none)');
  console.log('img:', imgMatch?.[0]?.slice(0, 200) ?? '(none)');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
