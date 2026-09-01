import { describe, expect, it } from 'vitest';
import { applyConfirmedMappings, parseTargetId } from '@/lib/tagging/applyMappings';
import type { EmailTemplateDocument } from '@/lib/schema/template';

function doc(overrides?: Partial<EmailTemplateDocument>): EmailTemplateDocument {
  return {
    schemaVersion: 1,
    id: 't1',
    name: 'Test',
    category: 'promotional',
    meta: { previewText: 'p', backgroundColor: '#fff', containerWidth: 600 },
    blocks: [
      {
        id: 'b-header',
        componentId: 'header',
        componentVersion: 1,
        props: {
          logoUrl: 'https://old.example/logo',
          logoAlt: 'Old',
        },
      },
      {
        id: 'b-cta',
        componentId: 'cta-banner',
        componentVersion: 1,
        props: {
          buttonUrl: 'https://old.example/cta',
          buttonText: 'KEEP ME',
        },
      },
      {
        id: 'b-foot',
        componentId: 'footer',
        componentVersion: 1,
        props: {
          socialLinks: [{ platform: 'facebook', url: 'https://old.social' }],
        },
      },
      {
        id: 'b-fig',
        componentId: 'figma-react-email',
        componentVersion: 1,
        props: {
          tree: {
            type: 'Section',
            children: [{ type: 'Img', src: '/a.png', alt: 'Old alt', href: 'https://old.img' }],
          },
        },
      },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('parseTargetId', () => {
  it('parses registry, social, and tree ids', () => {
    expect(parseTargetId('b1:logoUrl')).toEqual({
      blockId: 'b1',
      kind: 'url',
      propKey: 'logoUrl',
    });
    expect(parseTargetId('b1:social:2:url')).toEqual({
      blockId: 'b1',
      kind: 'social',
      socialIndex: 2,
      propKey: 'socialLinks',
    });
    expect(parseTargetId('b1:tree:0.1:href')).toEqual({
      blockId: 'b1',
      kind: 'tree',
      propKey: 'tree',
      treePath: '0.1',
    });
  });
});

describe('applyConfirmedMappings', () => {
  it('writes FINAL URL + alt and never overwrites CTA button text', () => {
    const tokenUrl =
      'https://www.nissan.com.au/?cid=x_<%= message.delivery.internalName %>';
    const result = applyConfirmedMappings(doc(), [
      {
        rowIndex: 1,
        targetId: 'b-header:logoUrl',
        finalUrl: tokenUrl,
        altText: 'Nissan Icon',
        urlLabel: 'header-nissanlogo',
      },
      {
        rowIndex: 2,
        targetId: 'b-cta:buttonUrl',
        finalUrl: 'https://new.example/cta',
        urlLabel: 'cta1',
      },
    ]);

    const header = result.template.blocks.find((b) => b.id === 'b-header')!;
    const cta = result.template.blocks.find((b) => b.id === 'b-cta')!;
    expect(header.props.logoUrl).toBe(tokenUrl);
    expect(header.props.logoAlt).toBe('Nissan Icon');
    expect(cta.props.buttonUrl).toBe('https://new.example/cta');
    expect(cta.props.buttonText).toBe('KEEP ME');
    expect(result.applied).toHaveLength(2);
  });

  it('writes social and tree href/alt', () => {
    const result = applyConfirmedMappings(doc(), [
      {
        rowIndex: 1,
        targetId: 'b-foot:social:0:url',
        finalUrl: 'https://new.social/fb',
        urlLabel: 'facebook',
      },
      {
        rowIndex: 2,
        targetId: 'b-fig:tree:0:href',
        finalUrl: 'https://new.img',
        altText: 'New alt',
        urlLabel: 'hero',
      },
    ]);
    const foot = result.template.blocks.find((b) => b.id === 'b-foot')!;
    const fig = result.template.blocks.find((b) => b.id === 'b-fig')!;
    const links = foot.props.socialLinks as { url: string }[];
    expect(links[0].url).toBe('https://new.social/fb');
    const tree = fig.props.tree as { children: { href: string; alt: string }[] };
    expect(tree.children[0].href).toBe('https://new.img');
    expect(tree.children[0].alt).toBe('New alt');
  });

  it('partial apply collects warnings for bad targets', () => {
    const result = applyConfirmedMappings(doc(), [
      {
        rowIndex: 1,
        targetId: 'missing:logoUrl',
        finalUrl: 'https://x',
        urlLabel: 'x',
      },
      {
        rowIndex: 2,
        targetId: 'b-header:logoUrl',
        finalUrl: 'https://ok',
        urlLabel: 'logo',
      },
    ]);
    expect(result.applied).toHaveLength(1);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.template.blocks[0].props.logoUrl).toBe('https://ok');
  });
});
