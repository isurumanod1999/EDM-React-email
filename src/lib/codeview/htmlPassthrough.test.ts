import { describe, expect, it } from 'vitest';
import { parseBlocks } from '@/lib/codeview/parseBlocks';
import { printBlocks } from '@/lib/codeview/printBlocks';
import type { ReactEmailNode } from '@/lib/figma/types/reactEmailAst';

function treeOf(source: string): ReactEmailNode {
  return parseBlocks(source)[0].props.tree as ReactEmailNode;
}

describe('HTML pass-through attributes', () => {
  // Mirrors https://react.email/components/grid — Row/Column carry raw table
  // attributes, which used to be rejected outright.
  it('accepts table attributes copied from the React Email docs', () => {
    const source = `
<Block id="grid" component="figma-react-email">
  <Section>
    <Row cellSpacing={0} cellPadding={0} border={0} align="center">
      <Column colSpan={2} valign="top" width={300}>
        <Text content="Left" />
      </Column>
      <Column align="right" width={300}>
        <Text content="Right" />
      </Column>
    </Row>
  </Section>
</Block>`;

    const tree = treeOf(source);
    expect(tree.type).toBe('Section');
    if (tree.type !== 'Section') return;

    const row = tree.children[0];
    expect(row.type).toBe('Row');
    if (row.type !== 'Row') return;
    expect(row.attrs).toEqual({
      cellSpacing: 0,
      cellPadding: 0,
      border: 0,
      align: 'center',
    });

    const first = row.children[0];
    expect(first.type).toBe('Column');
    if (first.type !== 'Column') return;
    expect(first.attrs).toEqual({ colSpan: 2, valign: 'top', width: 300 });

    // `align` stays first-class on Column, so it must not land in the bag.
    const second = row.children[1];
    if (second.type !== 'Column') return;
    expect(second.align).toBe('right');
    expect(second.attrs).toEqual({ width: 300 });
  });

  it('round-trips pass-through attributes as plain JSX', () => {
    const source = `
<Block id="rt" component="figma-react-email">
  <Section>
    <Row cellPadding={0} cellSpacing={0}>
      <Column width={200}>
        <Link href="https://example.com" content="Open" target="_blank" rel="noopener" />
      </Column>
    </Row>
  </Section>
</Block>`;

    const printed = printBlocks(parseBlocks(source));
    expect(printed).toContain('cellPadding={0}');
    expect(printed).toContain('target="_blank"');
    expect(printed).toContain('rel="noopener"');

    // Printing what we parsed must be stable.
    expect(printBlocks(parseBlocks(printed))).toBe(printed);
  });

  it('forwards data- and aria- attributes', () => {
    const tree = treeOf(`
<Block id="d" component="figma-react-email">
  <Section data-testid="hero" aria-label="Hero">
    <Text content="Hi" />
  </Section>
</Block>`);

    if (tree.type !== 'Section') return;
    expect(tree.attrs).toEqual({ 'data-testid': 'hero', 'aria-label': 'Hero' });
  });

  // The exact snippet from https://react.email/components/grid: a bare fragment,
  // no <Block> envelope, and text sitting directly inside <Column>.
  it('accepts the docs Grid snippet pasted verbatim', () => {
    const blocks = parseBlocks(`
<>
  <Row cellSpacing={8}>
    <Column
      align="center"
      style={{
        width: '50%',
        height: 40,
        backgroundColor: 'rgb(52,211,153,0.6)',
      }}
    >
      1/2
    </Column>
    <Column align="center" style={{ width: '50%' }}>
      1/2
    </Column>
  </Row>
  <Row>
    <Column align="center" style={{ width: '33.333333%' }}>
      1/3
    </Column>
    <Column align="center" style={{ width: '66.666667%' }}>
      2/3
    </Column>
  </Row>
</>`);

    // Each top-level node becomes its own block.
    expect(blocks).toHaveLength(2);
    expect(blocks.every((b) => b.componentId === 'figma-react-email')).toBe(true);

    const row = blocks[0].props.tree as ReactEmailNode;
    expect(row.type).toBe('Row');
    if (row.type !== 'Row') return;
    expect(row.attrs).toEqual({ cellSpacing: 8 });
    expect(row.children).toHaveLength(2);

    const col = row.children[0];
    expect(col.type).toBe('Column');
    if (col.type !== 'Column') return;
    expect(col.align).toBe('center');
    expect(col.style?.backgroundColor).toBe('rgb(52,211,153,0.6)');
    // Bare JSX text becomes a Text node.
    expect(col.children).toEqual([{ type: 'Text', content: '1/2' }]);
  });

  it('re-printing a bare paste yields stable <Block> markup', () => {
    const printed = printBlocks(
      parseBlocks(`
<>
  <Row cellSpacing={8}>
    <Column align="center">1/2</Column>
  </Row>
</>`)
    );
    expect(printed).toContain('<Block');
    expect(printed).toContain('component="figma-react-email"');
    expect(printBlocks(parseBlocks(printed))).toBe(printed);
  });

  it('flattens fragments nested inside a layout container', () => {
    const tree = treeOf(`
<Block id="frag" component="figma-react-email">
  <Section>
    <>
      <Text content="one" />
      <Text content="two" />
    </>
  </Section>
</Block>`);

    if (tree.type !== 'Section') return;
    expect(tree.children).toEqual([
      { type: 'Text', content: 'one' },
      { type: 'Text', content: 'two' },
    ]);
  });

  it('still rejects attributes that are not real HTML props', () => {
    expect(() =>
      parseBlocks(`
<Block id="bad" component="figma-react-email">
  <Section notARealProp="x">
    <Text content="Hi" />
  </Section>
</Block>`)
    ).toThrow(/notARealProp/);
  });
});
