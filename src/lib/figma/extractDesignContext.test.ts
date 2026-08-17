import { describe, expect, it } from 'vitest';

import type { FigmaNodeDocument } from './client';
import { extractDesignContext } from './extractDesignContext';

function doc(
  partial: Partial<FigmaNodeDocument> & { name: string }
): FigmaNodeDocument {
  return {
    id: partial.name,
    type: 'FRAME',
    ...partial,
  };
}

function box(x: number, y: number, width: number, height: number) {
  return { x, y, width, height };
}

/**
 * A footer whose social row is switched off in Figma — the layer still ships in
 * the REST payload, so the summary must drop it the same way the parser does.
 */
function footerWithHiddenSocial(): FigmaNodeDocument {
  return doc({
    name: 'Footer',
    type: 'INSTANCE',
    absoluteBoundingBox: box(0, 0, 600, 200),
    clipsContent: true,
    children: [
      doc({
        name: 'Description',
        type: 'TEXT',
        characters: 'Terms and conditions apply.',
        absoluteBoundingBox: box(0, 0, 600, 40),
      }),
      doc({
        name: 'Social',
        visible: false,
        absoluteBoundingBox: box(0, 60, 600, 40),
        children: [
          doc({
            name: 'facebook',
            type: 'TEXT',
            characters: 'Follow us on Facebook',
            absoluteBoundingBox: box(0, 60, 40, 40),
          }),
        ],
      }),
    ],
  });
}

/** Both social variants live in the slot; only the first one is on screen. */
function footerWithClippedSocial(clipsContent: boolean): FigmaNodeDocument {
  return doc({
    name: 'Footer',
    type: 'INSTANCE',
    absoluteBoundingBox: box(0, 0, 600, 100),
    clipsContent,
    children: [
      doc({
        name: 'Description',
        type: 'TEXT',
        characters: 'Terms and conditions apply.',
        absoluteBoundingBox: box(0, 0, 600, 40),
      }),
      doc({
        name: 'Social Variant B',
        absoluteBoundingBox: box(0, 140, 600, 40),
        children: [
          doc({
            name: 'instagram',
            type: 'TEXT',
            characters: 'Follow us on Instagram',
            absoluteBoundingBox: box(0, 140, 40, 40),
          }),
        ],
      }),
    ],
  });
}

describe('extractDesignContext honours Figma visibility', () => {
  it('keeps the layers the design actually shows', () => {
    const context = extractDesignContext(footerWithHiddenSocial());

    expect(context).toContain('Frame: "Footer"');
    expect(context).toContain('Terms and conditions apply.');
  });

  it('omits a hidden layer and everything inside it', () => {
    const context = extractDesignContext(footerWithHiddenSocial());

    expect(context).not.toContain('Social');
    expect(context).not.toContain('facebook');
    expect(context).not.toContain('Follow us on Facebook');
  });

  it('omits a layer pushed fully past the clipped bottom edge', () => {
    const context = extractDesignContext(footerWithClippedSocial(true));

    expect(context).toContain('Terms and conditions apply.');
    expect(context).not.toContain('Social Variant B');
    expect(context).not.toContain('Follow us on Instagram');
  });

  it('keeps an overflowing layer when the frame does not clip its content', () => {
    const context = extractDesignContext(footerWithClippedSocial(false));

    expect(context).toContain('Social Variant B');
    expect(context).toContain('Follow us on Instagram');
  });
});
