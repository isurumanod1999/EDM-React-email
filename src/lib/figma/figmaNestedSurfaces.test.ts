import { describe, expect, it } from 'vitest';
import { buildPrimitivesFromFigma } from './figmaPrimitives';
import { figmaToReactEmailTree } from './figmaToReactEmail';
import { parseFigmaNode, type ParsedFigmaNode } from './parseFigmaNode';
import { detectImageNodeIds } from './detectImageNodes';
import type { FigmaNodeDocument } from './client';
import type { ReactEmailNode } from './types/reactEmailAst';

function textNode(): ParsedFigmaNode {
  return {
    id: 'text',
    type: 'TEXT',
    name: 'Heading',
    visible: true,
    text: 'Be the first to know',
    color: '#ffffff',
    children: [],
  };
}

function nestedCard(): ParsedFigmaNode {
  return {
    id: 'outer',
    type: 'FRAME',
    name: 'Icon CTA banner',
    visible: true,
    width: 600,
    height: 462,
    backgroundColor: '#0d0d0d',
    paddingTop: 8,
    paddingRight: 40,
    paddingBottom: 40,
    paddingLeft: 40,
    layoutMode: 'VERTICAL',
    children: [
      {
        id: 'inner',
        type: 'FRAME',
        name: 'Callout',
        visible: true,
        width: 520,
        height: 414,
        backgroundColor: '#1f1e1e',
        cornerRadius: 12,
        paddingTop: 32,
        paddingRight: 28,
        paddingBottom: 32,
        paddingLeft: 28,
        layoutMode: 'VERTICAL',
        children: [
          textNode(),
          {
            id: 'copy',
            type: 'TEXT',
            name: 'Body',
            visible: true,
            text: 'Find out more about this vehicle.',
            color: '#ffffff',
            children: [],
          },
        ],
      },
    ],
  };
}

function sections(node: ReactEmailNode): Extract<ReactEmailNode, { type: 'Section' }>[] {
  const found: Extract<ReactEmailNode, { type: 'Section' }>[] = [];
  if (node.type === 'Section') found.push(node);
  if ('children' in node && Array.isArray(node.children)) {
    for (const child of node.children) found.push(...sections(child));
  }
  return found;
}

describe('nested Figma surfaces', () => {
  it('preserves contrasting outer and rounded inner backgrounds', () => {
    const tree = buildPrimitivesFromFigma(nestedCard(), undefined, []);
    const boxes = sections(tree);

    const outer = boxes.find((node) => node.style?.backgroundColor === '#0d0d0d');
    const inner = boxes.find((node) => node.style?.backgroundColor === '#1f1e1e');

    expect(outer?.style?.padding).toBe('8px 40px 40px 40px');
    expect(inner?.style).toMatchObject({
      padding: '32px 28px 32px 28px',
      borderRadius: 12,
    });
  });

  it('still unwraps a transparent structural wrapper', () => {
    const root = nestedCard();
    root.children[0] = {
      ...root.children[0],
      backgroundColor: undefined,
      cornerRadius: undefined,
    };

    const boxes = sections(buildPrimitivesFromFigma(root, undefined, []));
    expect(boxes.filter((node) => node.style?.backgroundColor === '#0d0d0d')).toHaveLength(1);
    expect(boxes).toHaveLength(1);
  });

  it('keeps nested surfaces separate in the fidelity/legacy converter too', () => {
    const json = JSON.stringify(figmaToReactEmailTree(nestedCard()).tree);

    expect(json).toContain('#0d0d0d');
    expect(json).toContain('#1f1e1e');
  });
});

describe('corner radius fidelity', () => {
  function roundedTopCard(radii: number[]): ParsedFigmaNode {
    return parseFigmaNode({
      id: '1:1',
      name: 'Card',
      type: 'FRAME',
      absoluteBoundingBox: { x: 0, y: 0, width: 520, height: 300 },
      fills: [{ type: 'SOLID', color: { r: 0.12, g: 0.12, b: 0.12, a: 1 } }],
      rectangleCornerRadii: radii,
      paddingTop: 24,
      layoutMode: 'VERTICAL',
      children: [
        {
          id: '1:2',
          name: 'Body',
          type: 'TEXT',
          characters: 'Card copy',
          absoluteBoundingBox: { x: 0, y: 0, width: 520, height: 20 },
          style: { fontSize: 16 },
        },
      ],
    } as FigmaNodeDocument);
  }

  it('preserves corners rounded on one edge only', () => {
    const parsed = roundedTopCard([12, 12, 0, 0]);
    expect(parsed.cornerRadii).toEqual([12, 12, 0, 0]);

    const boxes = sections(buildPrimitivesFromFigma(parsed, undefined, []));
    expect(boxes.some((node) => node.style?.borderRadius === '12px 12px 0px 0px')).toBe(true);
  });

  it('keeps a uniform radius as a single value', () => {
    const parsed = roundedTopCard([12, 12, 12, 12]);
    expect(parsed.cornerRadii).toBeUndefined();

    const boxes = sections(buildPrimitivesFromFigma(parsed, undefined, []));
    expect(boxes.some((node) => node.style?.borderRadius === 12)).toBe(true);
  });
});

describe('icon glyphs built from vector art', () => {
  /**
   * An imported icon: a 44×44 frame of vector paths. After import each path
   * carries its own render, which previously made the whole-icon detector treat
   * the glyph as a photo and export only fragments of it.
   */
  function importedIconCard(): ParsedFigmaNode {
    return {
      id: 'card',
      nodeId: 'card',
      type: 'FRAME',
      name: 'Card',
      visible: true,
      width: 264,
      height: 56,
      layoutMode: 'HORIZONTAL',
      children: [
        {
          id: 'icon',
          nodeId: 'icon',
          type: 'FRAME',
          name: 'charger_24dp',
          visible: true,
          width: 44,
          height: 44,
          children: [
            {
              id: 'path-1',
              nodeId: 'path-1',
              type: 'VECTOR',
              name: 'Vector',
              visible: true,
              width: 32,
              height: 32,
              imageRef: '/images/uploads/figma-export-part-1.png',
              exportUrl: '/images/uploads/figma-export-part-1.png',
              children: [],
            },
            {
              id: 'path-2',
              nodeId: 'path-2',
              type: 'VECTOR',
              name: 'Vector',
              visible: true,
              width: 7,
              height: 19,
              imageRef: '/images/uploads/figma-export-part-2.png',
              exportUrl: '/images/uploads/figma-export-part-2.png',
              children: [],
            },
          ],
        },
        {
          id: 'label',
          nodeId: 'label',
          type: 'TEXT',
          name: 'Label',
          visible: true,
          text: 'What’s the charging time?',
          color: '#ffffff',
          children: [],
        },
      ],
    };
  }

  it('exports the whole icon frame rather than individual vector paths', () => {
    const ids = detectImageNodeIds(importedIconCard());

    expect(ids).toEqual(['icon']);
    expect(ids).not.toContain('path-1');
    expect(ids).not.toContain('path-2');
  });

  it('renders one image for the icon when the frame is rasterized', () => {
    const root = importedIconCard();
    root.children[0] = {
      ...root.children[0],
      forcedExportUrl: '/images/uploads/figma-icon-whole.png',
    };

    const tree = buildPrimitivesFromFigma(root, undefined, [], new Set(['icon']));
    const imgs: Extract<ReactEmailNode, { type: 'Img' }>[] = [];
    (function walk(node: ReactEmailNode) {
      if (node.type === 'Img') imgs.push(node);
      if ('children' in node && Array.isArray(node.children)) node.children.forEach(walk);
    })(tree);

    expect(imgs).toHaveLength(1);
    expect(imgs[0].src).toBe('/images/uploads/figma-icon-whole.png');
    expect(imgs[0].isIcon).toBe(true);
  });
});
