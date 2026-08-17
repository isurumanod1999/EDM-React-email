import { describe, expect, it } from 'vitest';
import { printBlocks } from '@/lib/codeview/printBlocks';
import type { TemplateBlock } from '@/lib/schema/template';
import type { ReactEmailNode } from '@/lib/figma/types/reactEmailAst';

function figmaBlock(id: string, tree: ReactEmailNode, extra: Record<string, unknown> = {}): TemplateBlock {
  return {
    id,
    componentId: 'figma-react-email',
    componentVersion: 1,
    label: 'figma',
    props: {
      tree,
      sourceFrame: 'frame-a',
      mobileFrame: 'frame-a-m',
      editable: true,
      blockId: id,
      emitResponsiveStyles: false,
      ...extra,
    },
  };
}

describe('printBlocks', () => {
  it('prints a registry header as a self-closing Block with props as attributes', () => {
    const blocks: TemplateBlock[] = [
      {
        id: 'b-header',
        componentId: 'header',
        componentVersion: 1,
        label: 'header',
        props: {
          logoUrl: 'https://cdn.example/logo.png',
          logoAlt: 'Nissan',
        },
      },
    ];
    const out = printBlocks(blocks);
    expect(out).toBe(
      [
        '<Block',
        '  id="b-header"',
        '  component="header"',
        '  label="header"',
        '  componentVersion={1}',
        '  logoAlt="Nissan"',
        '  logoUrl="https://cdn.example/logo.png"',
        '/>',
      ].join('\n')
    );
  });

  it('keeps short elements on one line and wraps only long ones', () => {
    const short = printBlocks([
      { id: 'a', componentId: 'divider', componentVersion: 1, props: {} },
    ]);
    expect(short).toBe('<Block id="a" component="divider" componentVersion={1} />');
  });

  it('expands a long style object instead of running off the line', () => {
    const out = printBlocks([
      figmaBlock('wide', {
        type: 'Section',
        style: {
          backgroundColor: '#000000',
          margin: '0 auto',
          maxWidth: 600,
          padding: '24px 40px 0px 40px',
        },
        children: [{ type: 'Text', content: 'x' }],
      }),
    ]);

    expect(out).toContain('  <Section\n    style={{\n');
    expect(out).toContain('      backgroundColor: "#000000",\n');
    expect(out).toContain('      padding: "24px 40px 0px 40px"\n');
    expect(out.split('\n').every((l) => l.length <= 100)).toBe(true);
  });

  it('nests figma-react-email tree as the single child and skips editor-only props', () => {
    const tree: ReactEmailNode = {
      type: 'Section',
      style: { padding: 24 },
      children: [{ type: 'Text', content: 'Hi', style: { fontSize: 16 } }],
    };
    const out = printBlocks([figmaBlock('b1', tree)]);
    expect(out).toContain('component="figma-react-email"');
    expect(out).toContain('sourceFrame="frame-a"');
    expect(out).not.toContain('editable');
    expect(out).not.toContain('blockId');
    expect(out).not.toContain('emitResponsiveStyles');
    expect(out).not.toContain('tree=');
    expect(out).toContain('<Section style={{ padding: 24 }}>');
    expect(out).toContain('<Text content="Hi" style={{ fontSize: 16 }} />');
    expect(out.endsWith('</Block>')).toBe(true);
  });

  it('is deterministic across two prints', () => {
    const tree: ReactEmailNode = {
      type: 'Section',
      style: { zIndex: 1, padding: 8, backgroundColor: '#fff' },
      children: [],
    };
    const blocks = [figmaBlock('x', tree)];
    expect(printBlocks(blocks)).toBe(printBlocks(blocks));
  });

  it('covers all 11 node types and optional props', () => {
    const tree: ReactEmailNode = {
      type: 'Section',
      mobileStyle: { padding: 4 },
      children: [
        {
          type: 'Container',
          children: [
            {
              type: 'Row',
              children: [
                {
                  type: 'Column',
                  className: 'figma-col-stack',
                  children: [
                    {
                      type: 'Heading',
                      content: 'Title',
                      html: '<b>Title</b>',
                      mobileContent: 'T',
                      mobileHtml: '<b>T</b>',
                      as: 'h1',
                      href: 'https://example.com',
                      style: { color: '#000' },
                      mobileStyle: { fontSize: 12 },
                    },
                    {
                      type: 'Text',
                      content: 'Body',
                      html: '<p>Body</p>',
                      mobileContent: 'B',
                      mobileHtml: '<p>B</p>',
                      href: 'https://t.example',
                      style: { margin: 0 },
                      mobileStyle: { lineHeight: '1.2' },
                    },
                    {
                      type: 'Img',
                      src: '/a.png',
                      mobileSrc: '/a-m.png',
                      width: 600,
                      height: 200,
                      alt: 'hero',
                      href: 'https://img.example',
                      className: 'hero-img',
                      align: 'center',
                      isIcon: false,
                      fullBleed: true,
                      mobileStyle: { width: '100%' },
                    },
                    {
                      type: 'Link',
                      href: 'https://l.example',
                      content: 'Click',
                      html: '<u>Click</u>',
                      mobileContent: 'Go',
                      mobileHtml: '<u>Go</u>',
                      style: { color: 'blue' },
                      mobileStyle: { fontSize: 10 },
                    },
                    {
                      type: 'Button',
                      href: 'https://cta.example',
                      label: 'Register',
                      mobileLabel: 'Reg',
                      style: { backgroundColor: '#000' },
                      containerStyle: { textAlign: 'center' },
                      mobileStyle: { padding: 8 },
                    },
                    { type: 'Hr', style: { borderColor: '#ccc' }, mobileStyle: { margin: 4 } },
                    { type: 'Spacer', height: 16 },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const out = printBlocks([figmaBlock('all', tree, { hideBorders: true, borderColor: '#f00' })]);

    expect(out).toContain('<Section');
    expect(out).toContain('<Container');
    expect(out).toContain('<Row');
    expect(out).toContain('className="figma-col-stack"');
    expect(out).toContain('as="h1"');
    expect(out).toContain('mobileContent="T"');
    expect(out).toContain('mobileHtml={"<b>T</b>"}');
    expect(out).toContain('html={"<p>Body</p>"}');
    expect(out).toContain('mobileSrc="/a-m.png"');
    expect(out).toContain('fullBleed={true}');
    expect(out).toContain('isIcon={false}');
    expect(out).toContain('align="center"');
    expect(out).toContain('mobileLabel="Reg"');
    expect(out).toContain('containerStyle={{ textAlign: "center" }}');
    expect(out).toContain('<Hr');
    expect(out).toContain('<Spacer height={16} />');
    expect(out).toContain('hideBorders={true}');
    expect(out).toContain('borderColor="#f00"');
    expect(out).not.toMatch(new RegExp('<Text[^>]*>[^<]+</Text>'));
  });

  it('prints mixed figma + registry blocks in document order', () => {
    const blocks: TemplateBlock[] = [
      figmaBlock('b-fig', {
        type: 'Section',
        children: [{ type: 'Text', content: 'A' }],
      }),
      {
        id: 'b-cta',
        componentId: 'cta-banner',
        componentVersion: 1,
        props: { buttonUrl: 'https://cta', buttonText: 'Go' },
      },
    ];
    const out = printBlocks(blocks);
    expect(out.indexOf('figma-react-email')).toBeLessThan(out.indexOf('cta-banner'));
    expect(out).toContain('id="b-cta"');
    expect(out).toContain('component="cta-banner"');
    expect(out).toContain('buttonText="Go"');
  });

  it('escapes quotes inside string attributes via JSX expressions', () => {
    const out = printBlocks([
      figmaBlock('q', {
        type: 'Section',
        children: [{ type: 'Text', content: 'Say "hello"', html: '<span title="x">y</span>' }],
      }),
    ]);
    expect(out).toContain('content={"Say \\"hello\\""}');
    expect(out).toContain('html={"<span title=\\"x\\">y</span>"}');
  });
});
