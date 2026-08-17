import { describe, expect, it } from 'vitest';
import { parseFigmaNode } from './parseFigmaNode';
import { figmaToReactEmailTree } from './figmaToReactEmail';
import { applyBorderControls } from './borderControls';
import type { FigmaNodeDocument } from './client';

const GREY_STROKE = [
  {
    blendMode: 'NORMAL',
    type: 'SOLID',
    color: { r: 0.596, g: 0.596, b: 0.596, a: 1 },
  },
];

/**
 * The Nissan footer shape: a frame carrying a 1px rule on its top edge only.
 * Figma still reports a uniform `strokeWeight` alongside the per-side weights.
 */
function ruledFrame(overrides: Partial<FigmaNodeDocument> = {}): FigmaNodeDocument {
  return {
    id: '1:1',
    name: 'Frame 1618868353',
    type: 'FRAME',
    absoluteBoundingBox: { x: 0, y: 0, width: 520, height: 200 },
    strokes: GREY_STROKE,
    strokeWeight: 1,
    individualStrokeWeights: { top: 1, right: 0, bottom: 0, left: 0 },
    children: [
      {
        id: '1:2',
        name: 'Legal',
        type: 'TEXT',
        characters: 'Terms and conditions apply.',
        absoluteBoundingBox: { x: 0, y: 0, width: 520, height: 40 },
        style: { fontSize: 12 },
      },
    ],
    ...overrides,
  } as FigmaNodeDocument;
}

describe('Figma strokes become the borders the design actually draws', () => {
  it('keeps a one-sided rule one-sided instead of boxing the frame', () => {
    const parsed = parseFigmaNode(ruledFrame());

    expect(parsed.strokeSides).toEqual({ top: 1, right: 0, bottom: 0, left: 0 });

    const json = JSON.stringify(figmaToReactEmailTree(parsed).tree);
    expect(json).toContain('borderTop');
    expect(json).not.toMatch(/"border":/);
    expect(json).not.toContain('borderBottom');
    expect(json).not.toContain('borderLeft');
    expect(json).not.toContain('borderRight');
  });

  it('leaves a genuinely uniform border as a single shorthand', () => {
    const parsed = parseFigmaNode(
      ruledFrame({ individualStrokeWeights: { top: 2, right: 2, bottom: 2, left: 2 } })
    );

    expect(parsed.strokeSides).toBeUndefined();
    expect(JSON.stringify(figmaToReactEmailTree(parsed).tree)).toMatch(/"border":/);
  });

  it('draws nothing when every side is zero, even with a stroke paint', () => {
    const parsed = parseFigmaNode(
      ruledFrame({ individualStrokeWeights: { top: 0, right: 0, bottom: 0, left: 0 } })
    );

    expect(parsed.strokeWeight).toBeUndefined();
    expect(JSON.stringify(figmaToReactEmailTree(parsed).tree)).not.toContain('border');
  });
});

describe('border controls on a Figma-built block', () => {
  const tree = figmaToReactEmailTree(parseFigmaNode(ruledFrame())).tree;

  it('hides every border without touching the content', () => {
    const out = JSON.stringify(applyBorderControls(tree, true, undefined));

    expect(out).not.toContain('border');
    expect(out).toContain('Terms and conditions apply.');
  });

  it('recolors the border while keeping its width and side', () => {
    const out = JSON.stringify(applyBorderControls(tree, false, '#ff0000'));

    expect(out).toContain('borderTop');
    expect(out).toContain('1px solid #ff0000');
    expect(out).not.toContain('#989898');
  });

  it('never mutates the imported tree, so clearing the control restores the design', () => {
    const snapshot = JSON.stringify(tree);

    applyBorderControls(tree, true, undefined);
    applyBorderControls(tree, false, '#ff0000');

    expect(JSON.stringify(tree)).toBe(snapshot);
  });
});
