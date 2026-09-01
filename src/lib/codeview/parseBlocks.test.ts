import { describe, expect, it } from 'vitest';
import { printBlocks } from '@/lib/codeview/printBlocks';
import { parseBlocks, CodeViewParseError } from '@/lib/codeview/parseBlocks';
import type { TemplateBlock } from '@/lib/schema/template';
import type { ReactEmailNode } from '@/lib/figma/types/reactEmailAst';

function figmaBlock(id: string, tree: ReactEmailNode): TemplateBlock {
  return {
    id,
    componentId: 'figma-react-email',
    componentVersion: 1,
    label: 'figma',
    props: { tree, sourceFrame: 'frame-a' },
  };
}

describe('parseBlocks', () => {
  it('parses a registry Block', () => {
    const src = `<Block id="b-header" component="header" label="header" componentVersion={1} logoUrl="https://cdn.example/logo.png" logoAlt="Nissan" />`;
    expect(parseBlocks(src)).toEqual([
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
    ]);
  });

  it('parses figma-react-email with nested AST', () => {
    const tree: ReactEmailNode = {
      type: 'Section',
      style: { padding: 24 },
      children: [{ type: 'Text', content: 'Hi', style: { fontSize: 16 } }],
    };
    const printed = printBlocks([figmaBlock('b1', tree)]);
    expect(parseBlocks(printed)).toEqual([figmaBlock('b1', tree)]);
  });

  it('rejects unknown elements with line/column', () => {
    const src = `<Block id="a" component="figma-react-email">\n  <Wizard />\n</Block>`;
    try {
      parseBlocks(src);
      expect.fail('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(CodeViewParseError);
      const err = e as CodeViewParseError;
      expect(err.message).toMatch(/Wizard/);
      expect(err.line).toBeGreaterThanOrEqual(2);
    }
  });

  it('rejects identifiers in style values', () => {
    const src = `<Block id="a" component="figma-react-email">\n  <Text content="x" style={{color: theme}} />\n</Block>`;
    expect(() => parseBlocks(src)).toThrow(/Identifier/);
  });

  it('rejects imports and hooks-looking calls', () => {
    expect(() =>
      parseBlocks(`import X from "y";\n<Block id="a" component="header" />`)
    ).toThrow();
    expect(() =>
      parseBlocks(
        `<Block id="a" component="figma-react-email"><Text content={useState()} /></Block>`
      )
    ).toThrow(/call/i);
  });

  it('rejects figma Block with zero or multiple children', () => {
    expect(() =>
      parseBlocks(`<Block id="a" component="figma-react-email"></Block>`)
    ).toThrow(/exactly one child/);
    expect(() =>
      parseBlocks(
        `<Block id="a" component="figma-react-email"><Text content="a" /><Text content="b" /></Block>`
      )
    ).toThrow(/exactly one child/);
  });

  it('rejects children on registry blocks', () => {
    expect(() =>
      parseBlocks(`<Block id="a" component="header"><Text content="no" /></Block>`)
    ).toThrow(/cannot have children/);
  });

  it('rejects duplicate ids', () => {
    expect(() =>
      parseBlocks(
        `<Block id="same" component="header" />\n<Block id="same" component="header" />`
      )
    ).toThrow(/Duplicate/);
  });

  it('strips editor-only props from the printable round projection', () => {
    const dirty: TemplateBlock = {
      id: 'b1',
      componentId: 'figma-react-email',
      componentVersion: 1,
      props: {
        tree: { type: 'Section', children: [{ type: 'Text', content: 'A' }] },
        editable: true,
        blockId: 'b1',
        emitResponsiveStyles: false,
        sourceFrame: 's',
      },
    };
    const parsed = parseBlocks(printBlocks([dirty]));
    expect(parsed[0].props.editable).toBeUndefined();
    expect(parsed[0].props.blockId).toBeUndefined();
    expect(parsed[0].props.emitResponsiveStyles).toBeUndefined();
    expect(parsed[0].props.sourceFrame).toBe('s');
    expect(parsed[0].props.tree).toEqual({
      type: 'Section',
      children: [{ type: 'Text', content: 'A' }],
    });
  });
});
