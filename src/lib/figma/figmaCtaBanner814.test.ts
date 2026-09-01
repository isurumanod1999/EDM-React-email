import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { buildPrimitivesFromFigma } from '@/lib/figma/figmaPrimitives';
import type { ParsedFigmaNode } from '@/lib/figma/parseFigmaNode';
import type { ReactEmailNode } from '@/lib/figma/types/reactEmailAst';

function collect(tree: ReactEmailNode): ReactEmailNode[] {
  const out: ReactEmailNode[] = [];
  (function walk(n: ReactEmailNode) {
    out.push(n);
    if ('children' in n && Array.isArray(n.children)) n.children.forEach(walk);
  })(tree);
  return out;
}

describe('CTA Banner 139:814 — three transparent row buttons', () => {
  const fixturePath = path.join(
    process.cwd(),
    'data/figma-debug/CTA_Banner-1786335964458.json'
  );
  const root = JSON.parse(readFileSync(fixturePath, 'utf8')).parsed as ParsedFigmaNode;

  it('lays out Interior / Performance / Technology in one Row as transparent buttons', () => {
    const tree = buildPrimitivesFromFigma(root, undefined, []);
    const nodes = collect(tree);
    const buttons = nodes.filter((n): n is Extract<ReactEmailNode, { type: 'Button' }> => n.type === 'Button');
    const rows = nodes.filter((n): n is Extract<ReactEmailNode, { type: 'Row' }> => n.type === 'Row');

    expect(buttons.map((b) => b.label)).toEqual([
      'Interior ›',
      'PERFORMANCE ›',
      'Technology ›',
      'Register your interest',
    ]);

    for (const label of ['Interior ›', 'PERFORMANCE ›', 'Technology ›']) {
      const btn = buttons.find((b) => b.label === label)!;
      expect(btn.style?.backgroundColor).toBe('transparent');
      expect(btn.style?.border).toBeUndefined();
    }

    const solid = buttons.find((b) => b.label === 'Register your interest')!;
    expect(solid.style?.backgroundColor).toBe('#b42535');

    const rowWithThree = rows.find((r) => r.children?.length === 3);
    expect(rowWithThree).toBeDefined();
    const rowLabels = rowWithThree!.children!.flatMap((col) =>
      col.type === 'Column'
        ? col.children.filter((c) => c.type === 'Button').map((b) => b.label)
        : []
    );
    expect(rowLabels).toEqual(['Interior ›', 'PERFORMANCE ›', 'Technology ›']);
  });
});
