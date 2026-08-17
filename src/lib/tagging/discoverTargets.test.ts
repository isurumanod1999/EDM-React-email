import { describe, expect, it } from 'vitest';
import { discoverLinkableTargets } from '@/lib/tagging/discoverTargets';
import type { TemplateBlock } from '@/lib/schema/template';

describe('discoverLinkableTargets', () => {
  it('discovers registry url props with stable {blockId}:{propKey} ids', () => {
    const blocks: TemplateBlock[] = [
      {
        id: 'b-header',
        componentId: 'header',
        componentVersion: 1,
        label: 'header',
        props: { logoUrl: 'https://example.com', logoAlt: 'Logo' },
      },
      {
        id: 'b-img',
        componentId: 'image-block',
        componentVersion: 1,
        label: 'hero',
        props: { url: 'https://example.com/h', altText: 'Hero' },
      },
      {
        id: 'b-cta',
        componentId: 'cta-banner',
        componentVersion: 1,
        props: { buttonUrl: 'https://example.com/c', buttonText: 'Go' },
      },
    ];

    const targets = discoverLinkableTargets(blocks);
    expect(targets.some((t) => t.id === 'b-header:logoUrl')).toBe(true);
    expect(targets.some((t) => t.id === 'b-img:url')).toBe(true);
    expect(targets.some((t) => t.id === 'b-cta:buttonUrl')).toBe(true);
    expect(targets.find((t) => t.id === 'b-header:logoUrl')?.altPropKey).toBe('logoAlt');
  });

  it('discovers social item targets as {blockId}:social:N:url', () => {
    const blocks: TemplateBlock[] = [
      {
        id: 'b-foot',
        componentId: 'footer',
        componentVersion: 1,
        props: {
          socialLinks: [
            { platform: 'facebook', url: 'https://facebook.com/x' },
            { platform: 'instagram', url: 'https://instagram.com/x' },
          ],
        },
      },
    ];
    const targets = discoverLinkableTargets(blocks);
    expect(targets.some((t) => t.id === 'b-foot:social:0:url')).toBe(true);
    expect(targets.some((t) => t.id === 'b-foot:social:1:url')).toBe(true);
  });

  it('discovers figma tree Img/Button href carriers', () => {
    const blocks: TemplateBlock[] = [
      {
        id: 'b-fig',
        componentId: 'figma-react-email',
        componentVersion: 1,
        label: 'Opening',
        props: {
          tree: {
            type: 'Section',
            children: [
              { type: 'Img', src: '/a.png', alt: 'Nissan logo', href: '' },
              { type: 'Button', href: '#', label: 'Register' },
            ],
          },
        },
      },
    ];
    const targets = discoverLinkableTargets(blocks);
    expect(targets.some((t) => t.id === 'b-fig:tree:0:href')).toBe(true);
    expect(targets.some((t) => t.id === 'b-fig:tree:1:href')).toBe(true);
  });
});
