import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Mirrors the real `hero-banner` registry entry: Nissan demo defaults plus the
 * field groups that mark which of them are content vs presentation.
 */
vi.mock('@/lib/registry', () => ({
  getComponentDefinition: (id: string) =>
    id === 'hero-banner'
      ? {
          id: 'hero-banner',
          defaultProps: {
            backgroundColor: '#1a1a1a',
            imgSrc: '/images/demo-hero.png',
            imgWidth: 700,
            altText: 'Nissan MORE',
            headline: 'Nissan MORE',
            subheadline: 'Up to 10 year warranty on selected models.',
            ctaText: 'EXPLORE OFFERS',
            deskPadding: '32px 0',
            showBadge: true,
          },
          fields: [
            { key: 'imgSrc', label: 'Image URL', type: 'image', group: 'Content' },
            { key: 'imgWidth', label: 'Image Width (px)', type: 'number', group: 'Layout' },
            { key: 'altText', label: 'Alt Text', type: 'text', group: 'Content' },
            { key: 'headline', label: 'Headline', type: 'text', group: 'Content' },
            { key: 'subheadline', label: 'Subheadline', type: 'text', group: 'Content' },
            { key: 'ctaText', label: 'Button Label', type: 'text', group: 'Content' },
            { key: 'backgroundColor', label: 'Background', type: 'color', group: 'Style' },
          ],
        }
      : undefined,
}));

import { FIGMA_COMPONENT_ID_OVERRIDES, registerFigmaComponentOverride } from './componentLinks';
import { FIGMA_MASTER_COMPONENT_IDS } from './figmaComponentIds';
import { tryFigmaToRegistryBlocks } from './figmaToRegistryBlocks';
import type { ParsedFigmaNode } from './parseFigmaNode';

function node(partial: Partial<ParsedFigmaNode> & { name: string }): ParsedFigmaNode {
  return {
    id: partial.name,
    type: 'FRAME',
    visible: true,
    children: [],
    ...partial,
  } as ParsedFigmaNode;
}

const NISSAN_LEGAL =
  '^ Google built-in is a trademark of Google LLC.\n1. Whichever occurs first, when servicing at authorised Nissan dealers. Warranty protection will remain 5 year/unlimited km warranty. 10 year/300,000km warranty may not apply.';

/** A footer laid out exactly the way the prebuilt component renders it. */
function footerFrame(overrides: Partial<ParsedFigmaNode> = {}): ParsedFigmaNode {
  return node({
    name: 'Footer',
    type: 'INSTANCE',
    backgroundColor: '#000000',
    children: [
      node({
        name: 'Logo',
        type: 'RECTANGLE',
        exportUrl: '/images/uploads/figma-logo.png',
        width: 120,
        height: 40,
        y: 0,
      }),
      node({ name: 'Description', type: 'TEXT', text: NISSAN_LEGAL, fontSize: 12, y: 80 }),
    ],
    ...overrides,
  });
}

function componentIds(result: ReturnType<typeof tryFigmaToRegistryBlocks>): string[] {
  return (result?.blocks ?? []).map((b) => b.componentId);
}

describe('automatic Figma footer matches never use the prebuilt Footer', () => {
  afterEach(() => {
    for (const key of Object.keys(FIGMA_COMPONENT_ID_OVERRIDES)) {
      delete FIGMA_COMPONENT_ID_OVERRIDES[key];
    }
  });

  it('rejects a frame named Footer', () => {
    expect(tryFigmaToRegistryBlocks(footerFrame())).toBeNull();
  });

  it('rejects a frame whose emoji-prefixed name normalizes to Footer', () => {
    expect(tryFigmaToRegistryBlocks(footerFrame({ name: '🟢 Footer' }))).toBeNull();
  });

  it('rejects a generic instance carrying a known Footer master component ID', () => {
    const frame = footerFrame({
      name: 'Frame 1618868494',
      componentId: FIGMA_MASTER_COMPONENT_IDS.footer[0],
    });

    expect(tryFigmaToRegistryBlocks(frame)).toBeNull();
  });

  it('rejects a component ID a user has mapped to the Footer', () => {
    registerFigmaComponentOverride('9911:2200', 'footer');
    const frame = footerFrame({ name: 'Instance', componentId: '9911:2200' });

    expect(tryFigmaToRegistryBlocks(frame)).toBeNull();
  });

  it('rejects the footer even when its logo sits above the legal copy', () => {
    // The old structure guard only refused the reversed layout; the layout the
    // component happens to reproduce must be refused too, so the build always
    // follows the Figma design rather than the component's fixed order.
    expect(tryFigmaToRegistryBlocks(footerFrame())).toBeNull();
  });

  it('leaves the other sections of a full email on the registry path', () => {
    const email = node({
      name: 'Email',
      children: [
        node({
          name: 'Header',
          children: [
            node({
              name: 'Logo',
              type: 'RECTANGLE',
              exportUrl: '/images/uploads/logo.png',
              width: 160,
              height: 40,
            }),
          ],
        }),
        node({
          name: 'Hero Banner',
          children: [
            node({
              name: 'Hero Image',
              type: 'RECTANGLE',
              exportUrl: '/images/uploads/hero.png',
              width: 600,
              height: 300,
            }),
            node({ name: 'Headline', type: 'TEXT', text: 'Discover Nissan MORE', fontSize: 32 }),
          ],
        }),
        footerFrame({ name: '🟢 Footer' }),
      ],
    });

    const ids = componentIds(tryFigmaToRegistryBlocks(email));

    expect(ids).toContain('header');
    expect(ids).toContain('hero-banner');
    expect(ids).not.toContain('footer');
  });
});

describe('Figma-built blocks only carry Figma content', () => {
  /** A hero the registry can represent: one image plus one headline. */
  function heroFrame(): ParsedFigmaNode {
    return node({
      name: 'Hero Banner',
      type: 'INSTANCE',
      backgroundColor: '#000000',
      children: [
        node({
          name: 'Hero Image',
          type: 'RECTANGLE',
          exportUrl: '/images/uploads/figma-hero.png',
          width: 600,
          height: 300,
        }),
        node({ name: 'Headline', type: 'TEXT', text: 'Discover Nissan MORE', fontSize: 32 }),
      ],
    });
  }

  function buildHero(): Record<string, unknown> {
    const result = tryFigmaToRegistryBlocks(heroFrame());
    expect(result).not.toBeNull();
    expect(result!.blocks[0].componentId).toBe('hero-banner');
    return result!.blocks[0].props;
  }

  it('does not inherit demo copy or button labels from the registry', () => {
    const props = buildHero();

    expect(props.ctaText).toBeUndefined();
    expect(props.subheadline).toBe('');
    expect(props.showBadge).toBeUndefined();
  });

  it('keeps presentation defaults so spacing stays sane', () => {
    expect(buildHero().deskPadding).toBe('32px 0');
  });

  it('lets Figma win over registry defaults it does specify', () => {
    const props = buildHero();

    expect(props.backgroundColor).toBe('#000000');
    expect(props.imgSrc).toBe('/images/uploads/figma-hero.png');
    expect(props.imgWidth).toBe(600);
    expect(props.headline).toBe('Discover Nissan MORE');
  });
});
