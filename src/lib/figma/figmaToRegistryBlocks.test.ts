import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/registry', () => ({
  getComponentDefinition: (id: string) => ({
    id,
    defaultProps: {},
  }),
}));

import { getLinkForNode, resolveComponentLink } from './componentLinks';
import { normalizeFigmaLayerName } from './figmaNameNormalize';
import type { ParsedFigmaNode } from './parseFigmaNode';
import { tryFigmaToRegistryBlocks } from './figmaToRegistryBlocks';

function frame(name: string, children: ParsedFigmaNode[] = [], extra: Partial<ParsedFigmaNode> = {}): ParsedFigmaNode {
  return {
    id: name,
    type: 'FRAME',
    name,
    visible: true,
    children,
    ...extra,
  };
}

function textNode(name: string, text: string, fontSize = 16): ParsedFigmaNode {
  return {
    id: name,
    type: 'TEXT',
    name,
    visible: true,
    text,
    fontSize,
    children: [],
  };
}

function imageNode(name: string, exportUrl: string): ParsedFigmaNode {
  return {
    id: name,
    type: 'RECTANGLE',
    name,
    visible: true,
    exportUrl,
    width: 600,
    height: 300,
    children: [],
  };
}

describe('figmaNameNormalize', () => {
  it('strips emoji and leading underscores from layer names', () => {
    expect(normalizeFigmaLayerName('🟢 1-up-Card')).toBe('1-up-Card');
    expect(normalizeFigmaLayerName('_1-up')).toBe('1-up');
  });
});

function buttonNode(name: string, text: string): ParsedFigmaNode {
  return {
    id: name,
    type: 'FRAME',
    name,
    visible: true,
    height: 44,
    cornerRadius: 8,
    children: [textNode(`${name}-label`, text, 12)],
  };
}

describe('componentLinks', () => {
  it('matches hero banner by layer name', () => {
    const link = getLinkForNode({ name: 'Hero Banner', type: 'INSTANCE' });
    expect(link?.registryComponentId).toBe('hero-banner');
  });

  it('matches header by layer name', () => {
    const link = getLinkForNode({ name: 'Header', type: 'FRAME' });
    expect(link?.registryComponentId).toBe('header');
  });

  it('matches by Figma master component ID when layer name is generic', () => {
    const link = getLinkForNode({
      name: 'Instance',
      type: 'INSTANCE',
      componentId: '16715:400',
    });
    expect(link?.registryComponentId).toBe('header');
  });

  it('matches footer by Figma master component ID', () => {
    expect(
      getLinkForNode({ name: 'Footer', type: 'INSTANCE', componentId: '8535:1312' })?.registryComponentId
    ).toBe('footer');
  });

  it('matches image block by 1UP full-width component ID', () => {
    expect(
      getLinkForNode({ name: 'Frame', type: 'INSTANCE', componentId: '2001:1619' })?.registryComponentId
    ).toBe('image-block');
  });

  it('disambiguates shared 2UP component ID using layer name', () => {
    expect(getLinkForNode({ name: '2UP-Standard', componentId: '2001:2397' })?.registryComponentId).toBe(
      'two-col-stacked'
    );
    expect(getLinkForNode({ name: '2UP Dual CTA', componentId: '2001:2397' })?.registryComponentId).toBe(
      'two-col-dual-cta'
    );
  });

  it('disambiguates shared 2UP component ID using button structure', () => {
    const dualCta = frame(
      '2UP',
      [
        frame('Col A', [
          buttonNode('CTA 1', 'Quote'),
          buttonNode('CTA 2', 'Book'),
          textNode('Title A', 'Ariya', 20),
        ]),
        frame('Col B', [
          buttonNode('CTA 3', 'Quote'),
          buttonNode('CTA 4', 'Book'),
          textNode('Title B', 'X-Trail', 20),
        ]),
      ],
      { componentId: '2001:2397', layoutMode: 'HORIZONTAL', type: 'INSTANCE' }
    );

    expect(resolveComponentLink(dualCta)?.registryComponentId).toBe('two-col-dual-cta');
  });

  it('matches Nissan design-system names', () => {
    expect(getLinkForNode({ name: 'Rich Text' })?.registryComponentId).toBe('text-block');
    expect(getLinkForNode({ name: 'call-out' })?.registryComponentId).toBe('three-col-icon');
    expect(getLinkForNode({ name: '2UP-Standard', componentId: '2001:2397' })?.registryComponentId).toBe(
      'two-col-stacked'
    );
    expect(getLinkForNode({ name: 'Opening' })?.registryComponentId).toBe('intro-copy');
    expect(getLinkForNode({ name: '🟢 1-up-Card' })?.registryComponentId).toBe('one-col-product');
  });
});

describe('tryFigmaToRegistryBlocks', () => {
  it('maps a single hero frame to hero-banner registry block', () => {
    const hero = frame('Hero', [
      imageNode('Hero Image', '/images/uploads/hero.png'),
      textNode('Headline', 'Discover Nissan MORE', 32),
      textNode('Subheadline', 'Up to 10 years warranty', 18),
      textNode('CTA Button', 'Explore Offers', 14),
    ]);

    const result = tryFigmaToRegistryBlocks(hero, undefined, {
      desktopUrl: '/images/uploads/hero.png',
    });

    expect(result).not.toBeNull();
    expect(result!.blocks).toHaveLength(1);
    expect(result!.blocks[0].componentId).toBe('hero-banner');
    expect(result!.blocks[0].props.headline).toBe('Discover Nissan MORE');
    expect(result!.mappingMode).toBe('registry');
  });

  it('decomposes stacked header + footer into multiple registry blocks', () => {
    const email = frame('Email', [
      frame('Header', [imageNode('Logo', '/images/uploads/logo.png')]),
      frame('Hero', [
        imageNode('Banner', '/images/uploads/banner.png'),
        textNode('Headline', 'Welcome', 28),
      ]),
      frame('Footer', [textNode('Copyright', '© 2026 Nissan', 12)]),
    ]);

    const result = tryFigmaToRegistryBlocks(email);

    expect(result).not.toBeNull();
    expect(result!.blocks.length).toBeGreaterThanOrEqual(2);
    expect(result!.blocks.map((b) => b.componentId)).toContain('header');
    expect(result!.blocks.map((b) => b.componentId)).toContain('hero-banner');
  });

  it('maps 2UP layout to two-col-stacked when columns have product content', () => {
    const twoUp = frame(
      '2UP-Standard',
      [
        frame('Product A', [
          imageNode('Image A', '/images/a.png'),
          textNode('Title A', 'Nissan Ariya', 24),
          textNode('Price A', 'From AUD 179,900', 14),
        ]),
        frame('Product B', [
          imageNode('Image B', '/images/b.png'),
          textNode('Title B', 'Nissan X-Trail', 24),
          textNode('Price B', 'From AUD 119,900', 14),
        ]),
      ],
      { layoutMode: 'HORIZONTAL', componentId: '2001:2397', type: 'INSTANCE' }
    );

    const result = tryFigmaToRegistryBlocks(twoUp);
    expect(result).not.toBeNull();
    expect(result!.blocks[0].componentId).toBe('two-col-stacked');
    expect(Array.isArray(result!.blocks[0].props.rows)).toBe(true);
  });

  it('maps 2UP dual-cta layout when each column has multiple buttons', () => {
    const twoUpDual = frame(
      '2UP',
      [
        frame('Product A', [
          imageNode('Image A', '/images/a.png'),
          textNode('Title A', 'Nissan Ariya', 24),
          buttonNode('CTA 1', 'REQUEST A QUOTE'),
          buttonNode('CTA 2', 'BOOK TEST DRIVE'),
        ]),
        frame('Product B', [
          imageNode('Image B', '/images/b.png'),
          textNode('Title B', 'Nissan X-Trail', 24),
          buttonNode('CTA 3', 'REQUEST A QUOTE'),
          buttonNode('CTA 4', 'BOOK TEST DRIVE'),
        ]),
      ],
      { layoutMode: 'HORIZONTAL', componentId: '2001:2397', type: 'INSTANCE' }
    );

    const result = tryFigmaToRegistryBlocks(twoUpDual);
    expect(result).not.toBeNull();
    expect(result!.blocks[0].componentId).toBe('two-col-dual-cta');
  });

  it('returns null when no link matches', () => {
    const generic = frame('Random Frame', [textNode('Text', 'Hello')]);
    expect(tryFigmaToRegistryBlocks(generic)).toBeNull();
  });

  it('rejects a text-only component for a frame that also has a button', () => {
    // "Opening" links to intro-copy by name, but intro-copy cannot render the
    // headline as a heading nor the CTA as a button — the AST build must win.
    const opening = frame('Opening', [
      frame('Copy', [
        textNode('Headline', 'Welcome to the Navarathon', 40),
        textNode('Body', '<Name>, this month go the distance for less.', 16),
      ]),
      frame('CTA', [buttonNode('CTA', 'See all offers')]),
    ]);

    expect(tryFigmaToRegistryBlocks(opening)).toBeNull();
  });

  it('rejects a registry match that would drop an image', () => {
    const intro = frame('Intro', [
      textNode('Body', 'Read our latest offers below.', 16),
      imageNode('Illustration', '/images/uploads/illustration.png'),
    ]);

    expect(tryFigmaToRegistryBlocks(intro)).toBeNull();
  });

  it('maps intro-copy when the frame really is only greeting + body', () => {
    const intro = frame('Intro Copy', [
      textNode('Greeting', 'Hello Sam,', 16),
      textNode('Body', 'This month, go the distance for less.', 16),
    ]);

    const result = tryFigmaToRegistryBlocks(intro);
    expect(result).not.toBeNull();
    expect(result!.blocks[0].componentId).toBe('intro-copy');
    // "This month" must not be promoted to the greeting by an unanchored /hi/.
    expect(result!.blocks[0].props.greeting).toBe('Hello Sam,');
    expect(result!.blocks[0].props.body).toBe('This month, go the distance for less.');
  });
});
