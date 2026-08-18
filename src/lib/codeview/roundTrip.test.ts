import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { printBlocks } from '@/lib/codeview/printBlocks';
import { parseBlocks } from '@/lib/codeview/parseBlocks';
import { canonicalizeBlocks } from '@/lib/codeview/canonicalize';
import type { TemplateBlock } from '@/lib/schema/template';
import type { ReactEmailNode } from '@/lib/figma/types/reactEmailAst';

function allNodesFixture(): ReactEmailNode {
  return {
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
                    content: 'Body "quoted"',
                    html: '<p title="x">Body</p>',
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
                  { type: 'Preview', content: 'Inbox preview line' },
                  {
                    type: 'Font',
                    fontFamily: 'Roboto',
                    fallbackFontFamily: ['Helvetica', 'Arial', 'sans-serif'],
                    webFont: { url: 'https://fonts.example/roboto.woff2', format: 'woff2' },
                    fontWeight: 400,
                  },
                  {
                    type: 'CodeInline',
                    content: 'npm install',
                    style: { backgroundColor: '#eee', padding: '2px 4px' },
                  },
                  {
                    type: 'Markdown',
                    content: '# Hello\n\n**Bold** text',
                    markdownContainerStyles: { padding: 12 },
                    markdownCustomStyles: { h1: { color: '#111' } },
                  },
                  {
                    type: 'CodeBlock',
                    code: 'const x = 1;',
                    language: 'javascript',
                    themeName: 'dracula',
                    lineNumbers: true,
                  },
                ],
              },
              {
                type: 'Column',
                children: [{ type: 'Text', content: 'col2' }],
              },
            ],
          },
        ],
      },
    ],
  };
}

describe('round-trip parse(print(doc))', () => {
  it('is identity for all 16 node types + optional props', () => {
    const blocks: TemplateBlock[] = [
      {
        id: 'all-nodes',
        componentId: 'figma-react-email',
        componentVersion: 1,
        label: 'kitchen-sink',
        props: {
          tree: allNodesFixture(),
          sourceFrame: 'desk',
          mobileFrame: 'mob',
          hideBorders: true,
          borderColor: '#f00',
        },
      },
      {
        id: 'hdr',
        componentId: 'header',
        componentVersion: 1,
        label: 'header',
        props: { logoUrl: 'https://cdn.example/l.png', logoAlt: 'Logo' },
      },
    ];

    const printed = printBlocks(blocks);
    const parsed = parseBlocks(printed);
    expect(parsed).toEqual(canonicalizeBlocks(blocks));
    expect(printBlocks(parsed)).toBe(printed);
  });

  it('survives a real multi-column Figma-imported template', () => {
    const file = path.join(
      process.cwd(),
      'data/templates/0929ded6-2876-4414-a3ee-045e50662944.json'
    );
    const doc = JSON.parse(fs.readFileSync(file, 'utf8')) as { blocks: TemplateBlock[] };
    expect(doc.blocks.length).toBeGreaterThan(1);

    const printed = printBlocks(doc.blocks);
    const parsed = parseBlocks(printed);
    expect(parsed).toEqual(canonicalizeBlocks(doc.blocks));
    expect(printBlocks(parsed)).toBe(printed);
  });

  it('preserves rich-text html with quotes and angle brackets', () => {
    const html = '<span title="x & y">a <b>b</b></span>';
    const blocks: TemplateBlock[] = [
      {
        id: 'rich',
        componentId: 'figma-react-email',
        componentVersion: 1,
        props: {
          tree: { type: 'Section', children: [{ type: 'Text', content: 'plain', html }] },
        },
      },
    ];
    const round = parseBlocks(printBlocks(blocks));
    const tree = round[0].props.tree as ReactEmailNode;
    expect(tree.type).toBe('Section');
    if (tree.type === 'Section') {
      const text = tree.children[0];
      expect(text.type).toBe('Text');
      if (text.type === 'Text') expect(text.html).toBe(html);
    }
  });

  // JSX attribute strings decode HTML entities, so anything with `&` must be
  // printed in expression form or the value silently changes on re-parse.
  it('preserves ampersands and entity-looking text through plain attributes', () => {
    const blocks: TemplateBlock[] = [
      {
        id: 'amp',
        componentId: 'figma-react-email',
        componentVersion: 1,
        props: {
          tree: {
            type: 'Section',
            children: [
              { type: 'Text', content: 'Terms &amp; Conditions &nbsp; apply' },
              {
                type: 'Img',
                src: 'https://cdn.example/i.png?a=1&b=2&amp=3',
                alt: 'Sales & Service',
              },
            ],
          },
        },
      },
    ];
    const printed = printBlocks(blocks);
    expect(parseBlocks(printed)).toEqual(canonicalizeBlocks(blocks));
    expect(printBlocks(parseBlocks(printed))).toBe(printed);
  });
});
