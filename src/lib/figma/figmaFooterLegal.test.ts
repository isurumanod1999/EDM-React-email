import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { buildPrimitivesFromFigma } from '@/lib/figma/figmaPrimitives';
import type { ParsedFigmaNode } from '@/lib/figma/parseFigmaNode';
import { getContentChildren, isBackgroundRect } from '@/lib/figma/parseFigmaNode';
import type { ReactEmailNode } from '@/lib/figma/types/reactEmailAst';

function collect(tree: ReactEmailNode): ReactEmailNode[] {
  const out: ReactEmailNode[] = [];
  (function walk(n: ReactEmailNode) {
    out.push(n);
    if ('children' in n && Array.isArray(n.children)) n.children.forEach(walk);
  })(tree);
  return out;
}

describe('Nissan Footer 760:885 — legal copy and social row', () => {
  const fixturePath = path.join(process.cwd(), 'data/figma-debug/Footer-1787305710730.json');
  const root = JSON.parse(readFileSync(fixturePath, 'utf8')).parsed as ParsedFigmaNode;

  it('does not drop disclaimer TEXT because the layer name contains "based"', () => {
    const contentFrame = root.children[0].children[0];
    const legal = contentFrame.children.find((c) => c.id === '760:898');
    expect(legal?.type).toBe('TEXT');
    expect(isBackgroundRect(legal!, contentFrame)).toBe(false);
    expect(getContentChildren(contentFrame).some((c) => c.id === '760:898')).toBe(true);
  });

  it('builds Follow us, legal paragraphs, and a horizontal social icon row', () => {
    const tree = buildPrimitivesFromFigma(root, undefined, []);
    const nodes = collect(tree);
    const texts = nodes.filter((n): n is Extract<ReactEmailNode, { type: 'Text' }> => n.type === 'Text');
    const rows = nodes.filter((n): n is Extract<ReactEmailNode, { type: 'Row' }> => n.type === 'Row');
    const iconImgs = nodes.filter(
      (n): n is Extract<ReactEmailNode, { type: 'Img' }> => n.type === 'Img' && !!n.isIcon
    );

    expect(texts.some((t) => t.content === 'Follow us:')).toBe(true);
    expect(texts.some((t) => t.content.includes('Patrol Ti'))).toBe(true);
    expect(texts.some((t) => t.html?.includes('Nissan.com.au/warranty'))).toBe(true);
    expect(iconImgs.length).toBeGreaterThanOrEqual(4);

    const socialRow = rows.find((r) => r.children?.length === 4);
    expect(socialRow).toBeDefined();
    expect(socialRow!.style?.width).toBe('208px');
    expect(socialRow!.attrs).toMatchObject({ cellSpacing: 0, cellPadding: 0, align: 'left' });
    for (const col of socialRow!.children ?? []) {
      if (col.type !== 'Column') continue;
      expect(col.className).not.toBe('figma-col-stack');
      expect(col.align).toBe('left');
      expect(col.style?.width).toBe('40px');
    }
    const rowIcons = (socialRow!.children ?? []).flatMap((c) =>
      c.type === 'Column' ? c.children.filter((n) => n.type === 'Img') : []
    );
    expect(rowIcons.every((img) => img.type === 'Img' && img.align === 'left')).toBe(true);
  });
});
