import { describe, expect, it } from 'vitest';
import { collectImageNodeOutline } from './detectImageNodes';
import { normalizeOutermostImageNodeIds } from './resolveForceImageIds';
import { buildPrimitivesFromFigma } from './figmaPrimitives';
import { buildFigmaDesign, shouldTryRegistryLinks } from './buildFigmaDesign';
import type { ParsedFigmaNode } from './parseFigmaNode';
import type { ReactEmailNode } from './types/reactEmailAst';

function node(
  id: string,
  type: string,
  name: string,
  children: ParsedFigmaNode[] = [],
  extra: Partial<ParsedFigmaNode> = {}
): ParsedFigmaNode {
  return {
    id,
    nodeId: id,
    type,
    name,
    visible: true,
    children,
    ...extra,
  };
}

function collectAst(root: ReactEmailNode): ReactEmailNode[] {
  const out: ReactEmailNode[] = [];
  const walk = (current: ReactEmailNode) => {
    out.push(current);
    if ('children' in current) current.children.forEach(walk);
  };
  walk(root);
  return out;
}

describe('per-node Figma flatten selection', () => {
  const financeText = node('284:1391', 'TEXT', 'Finance copy', [], {
    text: '2.9% FINANCE',
    width: 200,
    height: 28,
  });
  const tag = node('284:1387', 'FRAME', 'Tag', [financeText], {
    width: 520,
    height: 64,
    backgroundColor: '#b42535',
  });
  const hidden = node('hidden', 'FRAME', 'Hidden', [], { visible: false });
  const root = node('284:1347', 'FRAME', '1-up', [tag, hidden], {
    width: 600,
    height: 760,
    layoutMode: 'VERTICAL',
  });

  it('outlines text-bearing containers with hierarchy and text preview', () => {
    const outline = collectImageNodeOutline(root);
    expect(outline).toContainEqual(
      expect.objectContaining({
        id: '284:1387',
        name: 'Tag',
        type: 'FRAME',
        depth: 1,
        childCount: 1,
        text: '2.9% FINANCE',
      })
    );
    expect(outline.some((entry) => entry.id === root.nodeId)).toBe(false);
    expect(outline.some((entry) => entry.id === 'hidden')).toBe(false);
  });

  it('keeps only valid outermost selected IDs in source-tree order', () => {
    expect(
      normalizeOutermostImageNodeIds(root, [
        financeText.nodeId!,
        root.nodeId!,
        'unknown:1',
        tag.nodeId!,
      ])
    ).toEqual([tag.nodeId]);
  });

  it('lowers a selected text-bearing container to one image without child text', () => {
    const withExport = {
      ...root,
      children: [{ ...tag, forcedExportUrl: '/images/uploads/finance-tag.png' }],
    };
    const built = buildPrimitivesFromFigma(
      withExport,
      undefined,
      [],
      new Set([tag.nodeId!])
    );
    const ast = collectAst(built);
    const images = ast.filter(
      (item): item is Extract<ReactEmailNode, { type: 'Img' }> => item.type === 'Img'
    );

    expect(images).toHaveLength(1);
    expect(images[0]).toMatchObject({
      src: '/images/uploads/finance-tag.png',
      width: 520,
      alt: '2.9% FINANCE',
    });
    expect(
      ast.some(
        (item) =>
          (item.type === 'Text' || item.type === 'Heading') &&
          item.content.includes('2.9% FINANCE')
      )
    ).toBe(false);
  });

  it('lets explicit layer modes outrank registry mapping', () => {
    expect(shouldTryRegistryLinks(true, false)).toBe(true);
    expect(shouldTryRegistryLinks(true, true)).toBe(false);
    expect(shouldTryRegistryLinks(false, false)).toBe(false);
  });

  it('fails the explicit build instead of leaving a hole when PNG export is missing', async () => {
    await expect(
      buildFigmaDesign({
        desktopNode: root,
        nodeName: '1-up',
        mode: 'primitives',
        imageNodeIds: [tag.nodeId!],
        forcePrimitiveBuild: true,
      })
    ).rejects.toThrow(/returned no PNG.*284:1387/);
  });

  it('keeps an explicitly flattened desktop subtree on both viewports', () => {
    const desktop = node(
      'desk-root',
      'FRAME',
      'Card',
      [
        node('desk-art', 'FRAME', 'Offer artwork', [], {
          forcedExportUrl: '/images/uploads/offer-desktop.png',
          width: 520,
          height: 64,
        }),
      ],
      { layoutMode: 'VERTICAL', width: 600 }
    );
    const mobile = node(
      'mobile-root',
      'FRAME',
      'Card',
      [
        node('mobile-art', 'FRAME', 'Offer artwork', [], {
          exportUrl: '/images/uploads/offer-mobile.png',
          width: 320,
          height: 48,
        }),
      ],
      { layoutMode: 'VERTICAL', width: 360 }
    );

    const built = buildPrimitivesFromFigma(
      desktop,
      mobile,
      [],
      new Set(['desk-art'])
    );
    const image = collectAst(built).find(
      (item): item is Extract<ReactEmailNode, { type: 'Img' }> =>
        item.type === 'Img'
    );

    expect(image).toMatchObject({
      src: '/images/uploads/offer-desktop.png',
      className: 'figma-forced-img-desk-art',
    });
    expect(image?.mobileSrc).toBeUndefined();
  });

  it('builds semantic copy, a normal image, flattened tags, and a structured CTA together', async () => {
    const mixedRoot = node(
      '284:1347',
      'FRAME',
      '1-up',
      [
        node('284:1350', 'TEXT', 'Heading', [], {
          text: 'ARIYA',
          fontSize: 40,
          width: 520,
          height: 48,
        }),
        node('284:1352', 'TEXT', 'Subheading', [], {
          text: 'ALL-ELECTRIC.',
          fontSize: 22,
          width: 520,
          height: 28,
        }),
        node('284:1364', 'IMAGE', 'Vehicle', [], {
          exportUrl: '/images/uploads/ariya.png',
          width: 520,
          height: 320,
        }),
        { ...tag, forcedExportUrl: '/images/uploads/finance-tag.png' },
        node(
          '284:1478',
          'FRAME',
          'Tag',
          [
            node('284:1482', 'TEXT', 'Charger copy', [], {
              text: 'FREE HOME CHARGER',
            }),
          ],
          {
            forcedExportUrl: '/images/uploads/charger-tag.png',
            width: 520,
            height: 44,
          }
        ),
        node(
          '284:1404',
          'FRAME',
          'CTA',
          [node('284:1405', 'TEXT', 'CTA label', [], { text: 'SEE OFFERS' })],
          {
            width: 290,
            height: 48,
            backgroundColor: '#ffffff',
            cornerRadius: 9999,
          }
        ),
      ],
      {
        width: 600,
        height: 760,
        layoutMode: 'VERTICAL',
        backgroundColor: '#000000',
        gap: 16,
      }
    );

    const result = await buildFigmaDesign({
      desktopNode: mixedRoot,
      nodeName: '1-up',
      mode: 'primitives',
      imageNodeIds: ['284:1387', '284:1478'],
      useRegistryLinks: true,
      forcePrimitiveBuild: true,
    });
    const tree = result.blocks[0].props.tree as ReactEmailNode;
    const ast = collectAst(tree);

    expect(result.mappingMode).toBe('primitives');
    expect(
      ast.filter((item) => item.type === 'Img').map((item) => item.src)
    ).toEqual(
      expect.arrayContaining([
        '/images/uploads/ariya.png',
        '/images/uploads/finance-tag.png',
        '/images/uploads/charger-tag.png',
      ])
    );
    expect(
      ast.filter((item) => item.type === 'Heading').map((item) => item.content)
    ).toContain('ARIYA');
    expect(
      ast.filter((item) => item.type === 'Text').map((item) => item.content)
    ).toContain('ALL-ELECTRIC.');
    expect(
      ast.filter((item) => item.type === 'Button').map((item) => item.label)
    ).toContain('SEE OFFERS');
    expect(
      ast.some(
        (item) =>
          (item.type === 'Text' || item.type === 'Heading') &&
          /FINANCE|CHARGER/.test(item.content)
      )
    ).toBe(false);
  });
});
