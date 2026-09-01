import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { describe, it } from 'vitest';
import { buildPrimitivesFromFigma } from '@/lib/figma/figmaPrimitives';
import type { ParsedFigmaNode } from '@/lib/figma/parseFigmaNode';
import type { ReactEmailNode } from '@/lib/figma/types/reactEmailAst';

describe('scratch', () => {
  it('dumps tree', () => {
    const fixture = path.join(
      process.cwd(),
      'data/figma-debug/CTA_Banner-1787645515497.json'
    );
    const root = JSON.parse(readFileSync(fixture, 'utf8')).parsed as ParsedFigmaNode;
    const tree = buildPrimitivesFromFigma(root, undefined, []);

    const lines: string[] = [];
    (function walk(n: ReactEmailNode, d: number) {
      const s = (n as { style?: Record<string, unknown> }).style ?? {};
      const keep = ['backgroundColor', 'borderRadius', 'padding', 'width'];
      const shown = keep
        .filter((k) => s[k] !== undefined)
        .map((k) => `${k}=${String(s[k])}`)
        .join(' ');
      const label = (n as { label?: string; content?: string }).label ??
        (n as { content?: string }).content ?? '';
      lines.push(`${'  '.repeat(d)}${n.type} ${shown} ${label.slice(0, 28)}`);
      const kids = (n as { children?: ReactEmailNode[] }).children;
      if (Array.isArray(kids)) kids.forEach((c) => walk(c, d + 1));
    })(tree, 0);
    writeFileSync(path.join(process.cwd(), 'scratch-tree.txt'), lines.join('\n'), 'utf8');
  });
});
