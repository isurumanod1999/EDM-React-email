import { describe, expect, it } from 'vitest';
import { parseBlocks } from '@/lib/codeview/parseBlocks';
import { printNode } from '@/lib/codeview/printNode';
import type { ReactEmailNode } from '@/lib/figma/types/reactEmailAst';

describe('parseBlocks layout ergonomics', () => {
  it('accepts align on Column and text children inside layout nodes', () => {
    const src = `<Block id="x" component="figma-react-email">
  <Row>
    <Column align="center" style={{ width: '33%' }}>1/3</Column>
    <Column align="center" style={{ width: '33%' }}>2/3</Column>
    <Column align="center" style={{ width: '33%' }}>3/3</Column>
  </Row>
</Block>`;

    const blocks = parseBlocks(src);
    const tree = blocks[0].props.tree as ReactEmailNode;
    expect(tree.type).toBe('Row');
    if (tree.type !== 'Row') return;

    expect(tree.children).toHaveLength(3);
    const col0 = tree.children[0];
    expect(col0.type).toBe('Column');
    if (col0.type !== 'Column') return;
    expect(col0.align).toBe('center');
    expect(col0.children[0]).toEqual({ type: 'Text', content: '1/3' });

    const printed = printNode(tree, 1);
    expect(printed).toContain('align="center"');
    expect(printed).toContain('<Text content="1/3" />');
  });
});
