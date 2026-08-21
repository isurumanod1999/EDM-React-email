import { describe, expect, it } from 'vitest';
import { printBlocksWithIndex, selectionAtOffset, spanForSelection } from '@/lib/codeview/selectionIndex';
import type { ReactEmailNode } from '@/lib/figma/types/reactEmailAst';
import type { TemplateBlock } from '@/lib/schema/template';

function figmaBlock(id: string, tree: ReactEmailNode): TemplateBlock {
  return {
    id,
    componentId: 'figma-react-email',
    componentVersion: 1,
    props: { tree },
  };
}

describe('code selection index', () => {
  it('maps AST paths to spans and resolves click offsets', () => {
    const tree: ReactEmailNode = {
      type: 'Section',
      children: [
        {
          type: 'Row',
          children: [
            {
              type: 'Column',
              children: [
                { type: 'Text', content: 'Hello' },
                { type: 'Button', href: 'https://example.com', label: 'Go' },
              ],
            },
          ],
        },
      ],
    };

    const { source, index } = printBlocksWithIndex([figmaBlock('blk-1', tree)]);
    expect(source).toContain('<Text content="Hello"');

    const textSpan = spanForSelection(index, 'blk-1', '0.0.0');
    const buttonSpan = spanForSelection(index, 'blk-1', '0.0.1');
    expect(textSpan).toBeTruthy();
    expect(buttonSpan).toBeTruthy();

    if (!textSpan || !buttonSpan) return;

    const textHit = selectionAtOffset(index, textSpan.from + 2);
    expect(textHit).toEqual({ blockId: 'blk-1', nodePath: '0.0.0' });

    const buttonHit = selectionAtOffset(index, buttonSpan.from + 2);
    expect(buttonHit).toEqual({ blockId: 'blk-1', nodePath: '0.0.1' });
  });

  it('falls back to block span for registry components', () => {
    const blocks: TemplateBlock[] = [
      {
        id: 'hdr',
        componentId: 'header',
        componentVersion: 1,
        props: { logoUrl: 'https://cdn.example/logo.png' },
      },
    ];
    const { index } = printBlocksWithIndex(blocks);
    const span = spanForSelection(index, 'hdr', null);
    expect(span).toBeTruthy();
    if (!span) return;
    expect(selectionAtOffset(index, span.from + 1)).toEqual({
      blockId: 'hdr',
      nodePath: null,
    });
  });
});
