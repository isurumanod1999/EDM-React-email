import { describe, expect, it } from 'vitest';
import { render } from '@react-email/render';
import { FigmaReactEmailBlock } from '@/components/email/FigmaReactEmailBlock';
import type { ReactEmailNode } from '@/lib/figma/types/reactEmailAst';
import { DynamicEmailTemplate } from './DynamicEmailTemplate';

const figmaTree: ReactEmailNode = {
  type: 'Section',
  children: [
    {
      type: 'Img',
      src: 'https://example.com/icon.png',
      width: 32,
      height: 32,
      href: 'https://example.com',
    },
    { type: 'Spacer', height: 12 },
  ],
};

describe('preview selection annotations', () => {
  it('annotates Figma Img and Spacer when editable', async () => {
    const html = await render(
      FigmaReactEmailBlock({
        tree: figmaTree,
        editable: true,
        blockId: 'fig-1',
        emitResponsiveStyles: false,
      })
    );

    expect(html).toContain('data-node-path="0"');
    expect(html).toContain('data-node-path="1"');
    expect(html).toContain('data-block-id="fig-1"');
  });

  it('omits Figma selection attrs when not editable', async () => {
    const html = await render(
      FigmaReactEmailBlock({
        tree: figmaTree,
        editable: false,
        blockId: 'fig-1',
        emitResponsiveStyles: false,
      })
    );

    expect(html).not.toContain('data-node-path');
  });

  it('annotates built-in header logo as field:logoSrc when editable', async () => {
    const html = await render(
      DynamicEmailTemplate({
        editable: true,
        blocks: [
          {
            id: 'hdr-1',
            componentId: 'header',
            componentVersion: 1,
            props: { logoSrc: 'https://example.com/logo.png', logoAlt: 'Logo' },
          },
        ],
      })
    );

    expect(html).toContain('data-node-path="field:logoSrc"');
    expect(html).toContain('data-block-id="hdr-1"');
  });

  it('export-style render has no editor selection chrome', async () => {
    const html = await render(
      DynamicEmailTemplate({
        blocks: [
          {
            id: 'hdr-1',
            componentId: 'header',
            componentVersion: 1,
            props: { logoSrc: 'https://example.com/logo.png', logoAlt: 'Logo' },
          },
          {
            id: 'fig-1',
            componentId: 'figma-react-email',
            componentVersion: 1,
            props: { tree: figmaTree },
          },
        ],
      })
    );

    expect(html).not.toContain('data-node-path');
    expect(html).not.toContain('__fc-bridge');
    expect(html).not.toContain('__fc-style');
    expect(html).not.toContain('data-block-root');
  });
});
