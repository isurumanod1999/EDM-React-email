import { describe, expect, it } from 'vitest';
import type { ParsedFigmaNode } from './parseFigmaNode';
import { figmaToReactEmailTree } from './figmaToReactEmail';

/** Minimal replica of Nissan 1-up node 139:779 — image + copy in one vertical card. */
function oneUpCard(): ParsedFigmaNode {
  const imageInstance: ParsedFigmaNode = {
    id: '139:781',
    nodeId: '139:781',
    type: 'INSTANCE',
    name: 'Image',
    visible: true,
    width: 600,
    height: 338,
    layoutMode: 'VERTICAL',
    exportUrl: '/images/uploads/figma-export-hero.png',
    imageRef: '5bd0fade71e8bf42881545159707978cd14b605c',
    children: [
      {
        id: '139:782',
        type: 'FRAME',
        name: 'Aspect ratio keeper',
        visible: true,
        width: 496,
        height: 338,
        children: [],
      },
    ],
  };

  const headlineFrame: ParsedFigmaNode = {
    id: '139:784',
    type: 'FRAME',
    name: 'Frame 1618868492',
    visible: true,
    width: 520,
    height: 68,
    layoutMode: 'VERTICAL',
    paddingLeft: 12,
    paddingRight: 12,
    children: [
      {
        id: '139:785',
        type: 'TEXT',
        name: 'Headline',
        visible: true,
        text: 'THE LATEST TECHNOLOGY AT YOUR COMMAND',
        fontSize: 28,
        color: '#caa185',
        children: [],
      },
    ],
  };

  const bodyFrame: ParsedFigmaNode = {
    id: '139:786',
    type: 'FRAME',
    name: 'Frame 48098941',
    visible: true,
    width: 520,
    height: 96,
    layoutMode: 'VERTICAL',
    paddingLeft: 12,
    paddingRight: 12,
    children: [
      {
        id: '139:787',
        type: 'TEXT',
        name: 'Body',
        visible: true,
        text: 'The Monolith display features dual 14.3-inch screens*.',
        fontSize: 16,
        color: '#ffffff',
        children: [],
      },
    ],
  };

  return {
    id: '139:779',
    nodeId: '139:779',
    type: 'FRAME',
    name: '🟢 1-up',
    visible: true,
    width: 600,
    height: 630,
    layoutMode: 'VERTICAL',
    paddingTop: 40,
    paddingRight: 40,
    paddingBottom: 40,
    paddingLeft: 40,
    gap: 16,
    backgroundColor: '#000000',
    children: [
      {
        id: '139:780',
        type: 'FRAME',
        name: 'Frame 1618868494',
        visible: true,
        width: 600,
        height: 338,
        layoutMode: 'VERTICAL',
        exportUrl: '/images/uploads/figma-export-frame.png',
        children: [imageInstance],
      },
      {
        id: '139:783',
        type: 'FRAME',
        name: 'Frame 1618868493',
        visible: true,
        width: 520,
        height: 180,
        layoutMode: 'VERTICAL',
        gap: 16,
        children: [headlineFrame, bodyFrame],
      },
    ],
  };
}

function findImgs(node: unknown): string[] {
  if (!node || typeof node !== 'object') return [];
  const n = node as Record<string, unknown>;
  const out: string[] = n.type === 'Img' ? [String(n.src)] : [];
  if (Array.isArray(n.children)) {
    for (const c of n.children) out.push(...findImgs(c));
  }
  return out;
}

function collectPadding(node: unknown, out: string[] = []): string[] {
  if (!node || typeof node !== 'object') return out;
  const n = node as Record<string, unknown>;
  const style = n.style as Record<string, unknown> | undefined;
  if (style?.padding) out.push(String(style.padding));
  if (style?.paddingLeft) out.push(`pl:${style.paddingLeft}`);
  if (Array.isArray(n.children)) {
    for (const c of n.children) collectPadding(c, out);
  }
  return out;
}

describe('1-up card (node 139:779)', () => {
  it('uses the exported PNG for the hero image, not the raw Figma fill hash', () => {
    const imgs = findImgs(figmaToReactEmailTree(oneUpCard()).tree);
    expect(imgs.length).toBeGreaterThan(0);
    for (const src of imgs) {
      expect(src).toMatch(/^\/images\/uploads\//);
      expect(src).not.toMatch(/^[a-f0-9]{20,}$/i);
    }
  });

  it('applies the root frame horizontal inset to the copy block', () => {
    const pads = collectPadding(figmaToReactEmailTree(oneUpCard()).tree);
    expect(pads.some((p) => p.includes('40px'))).toBe(true);
  });

  it('keeps headline and body copy from the design', () => {
    const json = JSON.stringify(figmaToReactEmailTree(oneUpCard()).tree);
    expect(json).toContain('THE LATEST TECHNOLOGY');
    expect(json).toContain('Monolith display');
  });
});
