import { describe, expect, it } from 'vitest';
import { discoverLinkableTargets } from '@/lib/tagging/discoverTargets';
import { matchTaggingRows } from '@/lib/tagging/matchRows';
import type { TaggingRow } from '@/lib/tagging/types';
import type { TemplateBlock } from '@/lib/schema/template';

function baseBlocks(): TemplateBlock[] {
  return [
    {
      id: 'b-header',
      componentId: 'header',
      componentVersion: 1,
      label: 'header',
      props: { logoUrl: 'https://old.example/logo', logoAlt: 'Old' },
    },
    {
      id: 'b-img',
      componentId: 'image-block',
      componentVersion: 1,
      label: 'hero',
      props: { url: 'https://old.example/hero', altText: 'Old hero' },
    },
    {
      id: 'b-cta',
      componentId: 'cta-banner',
      componentVersion: 1,
      props: { buttonUrl: 'https://old.example/cta', buttonText: 'KEEP ME' },
    },
  ];
}

function figmaBlock(id: string, label: string, children: unknown[]): TemplateBlock {
  return {
    id,
    componentId: 'figma-react-email',
    componentVersion: 1,
    label,
    props: { tree: { type: 'Section', children } },
  } as TemplateBlock;
}

describe('matchTaggingRows', () => {
  it('proposes exact URL Label matches and leaves props untouched', () => {
    const blocks = baseBlocks();
    const snapshot = JSON.stringify(blocks);
    const targets = discoverLinkableTargets(blocks);
    const rows: TaggingRow[] = [
      {
        rowIndex: 2,
        finalUrl: 'https://new.example/logo',
        urlLabel: 'header-nissanlogo',
        altText: 'Nissan Icon',
        status: 'proposed',
        raw: {},
      },
      {
        rowIndex: 3,
        finalUrl: 'https://new.example/hero',
        urlLabel: 'hero',
        altText: 'Hero alt',
        status: 'proposed',
        raw: {},
      },
    ];

    const result = matchTaggingRows(rows, targets);
    expect(result.rows[0].status).toBe('proposed');
    expect(result.rows[0].targetId).toBe('b-header:logoUrl');
    expect(result.rows[1].status).toBe('proposed');
    expect(result.rows[1].targetId).toBe('b-img:url');
    expect(JSON.stringify(blocks)).toBe(snapshot);
  });

  it('marks unknown labels unmatched', () => {
    const targets = discoverLinkableTargets(baseBlocks());
    const rows: TaggingRow[] = [
      {
        rowIndex: 1,
        finalUrl: 'https://new.example/x',
        urlLabel: 'totally-unknown-label-xyz',
        status: 'proposed',
        raw: {},
      },
    ];
    const result = matchTaggingRows(rows, targets);
    expect(result.rows[0].status).toBe('unmatched');
    expect(result.rows[0].targetId).toBeUndefined();
  });

  it('keeps skipped rows skipped and excluded from apply candidates', () => {
    const targets = discoverLinkableTargets(baseBlocks());
    const rows: TaggingRow[] = [
      {
        rowIndex: 1,
        finalUrl: '',
        urlLabel: 'View Online',
        status: 'skipped',
        skipReason: 'CRM include',
        raw: {},
      },
      {
        rowIndex: 2,
        finalUrl: 'https://new.example/logo',
        urlLabel: 'header-nissanlogo',
        status: 'proposed',
        raw: {},
      },
    ];
    const result = matchTaggingRows(rows, targets);
    expect(result.rows[0].status).toBe('skipped');
    expect(result.rows[0].targetId).toBeUndefined();
    expect(result.rows[1].status).toBe('proposed');
  });

  it('matches a realistic Figma template where many images and buttons compete', () => {
    const blocks: TemplateBlock[] = [
      figmaBlock('b-header', 'Header', [{ type: 'Img', src: '/l.png', alt: 'Nissan logo', href: '' }]),
      figmaBlock('b-hero', 'Hero', [{ type: 'Img', src: '/h.png', alt: 'Patrol hero KV', href: '' }]),
      figmaBlock('b-open', 'Opening', [
        { type: 'Button', href: '#', label: 'Register your interest' },
      ]),
      figmaBlock('b-more', 'Nissan More', [{ type: 'Button', href: '#', label: 'Nissan MORE' }]),
      figmaBlock('b-footer', 'Footer', [
        { type: 'Link', href: '#', content: 'Warranty' },
        { type: 'Link', href: '#', content: 'Privacy policy' },
      ]),
    ];
    const targets = discoverLinkableTargets(blocks);
    const labels = [
      'header-nissanlogo',
      'hero',
      'cta1-RegisterYourInterest',
      'cta6-NissanMore',
      'footer_disclaimer_warranty',
      'footer_disclaimer_privacy',
    ];
    const rows: TaggingRow[] = labels.map((urlLabel, i) => ({
      rowIndex: i + 1,
      finalUrl: `https://new.example/${i}`,
      urlLabel,
      status: 'proposed',
      raw: {},
    }));

    const result = matchTaggingRows(rows, targets);

    expect(result.rows.map((r) => r.status)).toEqual(Array(labels.length).fill('proposed'));
    const byLabel = new Map(result.rows.map((r) => [r.urlLabel, r.targetId]));
    expect(byLabel.get('header-nissanlogo')).toBe('b-header:tree:0:href');
    expect(byLabel.get('hero')).toBe('b-hero:tree:0:href');
    expect(byLabel.get('cta1-RegisterYourInterest')).toBe('b-open:tree:0:href');
    expect(byLabel.get('cta6-NissanMore')).toBe('b-more:tree:0:href');
    expect(byLabel.get('footer_disclaimer_warranty')).toBe('b-footer:tree:0:href');
    expect(byLabel.get('footer_disclaimer_privacy')).toBe('b-footer:tree:1:href');
  });

  it('never maps two rows onto the same target', () => {
    const blocks: TemplateBlock[] = [
      figmaBlock('b-open', 'Opening', [
        { type: 'Button', href: '#', label: 'Register your interest' },
      ]),
      figmaBlock('b-second', 'Closing', [
        { type: 'Button', href: '#', label: 'Register your interest' },
      ]),
    ];
    const targets = discoverLinkableTargets(blocks);
    const rows: TaggingRow[] = ['cta1-RegisterYourInterest', 'cta2-RegisterYourInterest'].map(
      (urlLabel, i) => ({
        rowIndex: i + 1,
        finalUrl: `https://new.example/${i}`,
        urlLabel,
        status: 'proposed' as const,
        raw: {},
      })
    );

    const result = matchTaggingRows(rows, targets);
    const ids = result.rows.map((r) => r.targetId);
    expect(ids[0]).toBeDefined();
    expect(ids[1]).toBeDefined();
    expect(ids[0]).not.toBe(ids[1]);
  });

  it('maps ordered cta labels onto CTA targets', () => {
    const targets = discoverLinkableTargets(baseBlocks());
    const rows: TaggingRow[] = [
      {
        rowIndex: 1,
        finalUrl: 'https://new.example/cta',
        urlLabel: 'cta1-RegisterYourInterest',
        status: 'proposed',
        raw: {},
      },
    ];
    const result = matchTaggingRows(rows, targets);
    expect(result.rows[0].status).toBe('proposed');
    expect(result.rows[0].targetId).toBe('b-cta:buttonUrl');
  });
});
