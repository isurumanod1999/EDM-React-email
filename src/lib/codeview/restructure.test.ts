import { describe, expect, it } from 'vitest';
import { printBlocks } from '@/lib/codeview/printBlocks';
import { parseBlocks } from '@/lib/codeview/parseBlocks';
import type { TemplateBlock } from '@/lib/schema/template';
import type { ReactEmailNode } from '@/lib/figma/types/reactEmailAst';

describe('restructure via code', () => {
  it('moves a Text node between Column siblings', () => {
    const tree: ReactEmailNode = {
      type: 'Section',
      children: [
        {
          type: 'Row',
          children: [
            {
              type: 'Column',
              children: [
                { type: 'Text', content: 'left' },
                { type: 'Text', content: 'move-me' },
              ],
            },
            {
              type: 'Column',
              children: [{ type: 'Text', content: 'right' }],
            },
          ],
        },
      ],
    };
    const blocks: TemplateBlock[] = [
      {
        id: 'layout',
        componentId: 'figma-react-email',
        componentVersion: 1,
        props: { tree },
      },
    ];

    let src = printBlocks(blocks);
    // Move move-me from first column into second by editing the printed JSX.
    src = src.replace(
      `<Text content="left" />\n        <Text content="move-me" />`,
      `<Text content="left" />`
    );
    src = src.replace(
      `<Text content="right" />`,
      `<Text content="right" />\n        <Text content="move-me" />`
    );

    const parsed = parseBlocks(src);
    const next = parsed[0].props.tree as ReactEmailNode;
    expect(next.type).toBe('Section');
    if (next.type !== 'Section') return;
    const row = next.children[0];
    expect(row.type).toBe('Row');
    if (row.type !== 'Row') return;
    const col0 = row.children[0];
    const col1 = row.children[1];
    expect(col0.type).toBe('Column');
    expect(col1.type).toBe('Column');
    if (col0.type !== 'Column' || col1.type !== 'Column') return;
    expect(col0.children.map((c) => (c.type === 'Text' ? c.content : ''))).toEqual(['left']);
    expect(col1.children.map((c) => (c.type === 'Text' ? c.content : ''))).toEqual([
      'right',
      'move-me',
    ]);
    expect(parsed[0].id).toBe('layout');
  });

  it('reorders Blocks and preserves ids', () => {
    const blocks: TemplateBlock[] = [
      {
        id: 'a',
        componentId: 'header',
        componentVersion: 1,
        props: { logoUrl: 'https://a' },
      },
      {
        id: 'b',
        componentId: 'cta-banner',
        componentVersion: 1,
        props: { buttonUrl: 'https://b', buttonText: 'Go' },
      },
    ];
    const printed = printBlocks(blocks);
    const swapped = printed.split('\n\n').reverse().join('\n\n');
    const parsed = parseBlocks(swapped);
    expect(parsed.map((b) => b.id)).toEqual(['b', 'a']);
  });

  it('rejects duplicate ids after restructure', () => {
    expect(() =>
      parseBlocks(
        `<Block id={"x"} component={"header"} />\n\n<Block id={"x"} component={"header"} />`
      )
    ).toThrow(/Duplicate/);
  });
});
