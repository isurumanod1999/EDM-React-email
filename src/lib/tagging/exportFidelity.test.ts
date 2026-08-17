import { describe, expect, it } from 'vitest';
import { applyConfirmedMappings } from '@/lib/tagging/applyMappings';
import type { EmailTemplateDocument } from '@/lib/schema/template';

/**
 * Story 1.5 — Vitest in this repo does not transform .tsx email components, so we
 * assert the prop→HTML contract that ImageBlock / CtaBanner / export use:
 * `url` + `altText` on image blocks and `buttonUrl` + `buttonText` on CTAs.
 */
function proofHtmlFromAppliedProps(template: EmailTemplateDocument): string {
  const parts: string[] = [];
  for (const block of template.blocks) {
    const p = block.props;
    if (typeof p.url === 'string') {
      parts.push(`<a href="${p.url}">`);
    }
    if (typeof p.altText === 'string') {
      parts.push(`<img alt="${p.altText}" />`);
    }
    if (typeof p.url === 'string') {
      parts.push('</a>');
    }
    if (typeof p.buttonUrl === 'string') {
      const label = typeof p.buttonText === 'string' ? p.buttonText : '';
      parts.push(`<a href="${p.buttonUrl}">${label}</a>`);
    }
  }
  return parts.join('');
}

describe('tagging export fidelity (Story 1.5)', () => {
  it('applied CTA URL and image alt appear in export-shaped HTML', () => {
    const tokenUrl =
      'https://www.nissan.com.au/vehicles?cid=crm_<%= message.delivery.internalName %>';

    const template: EmailTemplateDocument = {
      schemaVersion: 1,
      id: 'export-proof',
      name: 'Export proof',
      category: 'promotional',
      meta: { previewText: 'proof', backgroundColor: '#ffffff', containerWidth: 600 },
      blocks: [
        {
          id: 'b-img',
          componentId: 'image-block',
          componentVersion: 1,
          props: {
            imgSrc: 'https://cdn.example/hero.png',
            altText: 'placeholder',
            url: 'https://old.example',
            imgWidth: 600,
          },
        },
        {
          id: 'b-cta',
          componentId: 'cta-banner',
          componentVersion: 1,
          props: {
            headline: 'Act',
            buttonText: 'Register',
            buttonUrl: 'https://old.cta',
          },
        },
      ],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    const applied = applyConfirmedMappings(template, [
      {
        rowIndex: 1,
        targetId: 'b-img:url',
        finalUrl: 'https://www.nissan.com.au/hero',
        altText: '1% Finance~. Hurry, ends Dec 21',
        urlLabel: 'hero',
      },
      {
        rowIndex: 2,
        targetId: 'b-cta:buttonUrl',
        finalUrl: tokenUrl,
        urlLabel: 'cta1-RegisterYourInterest',
      },
    ]);

    const html = proofHtmlFromAppliedProps(applied.template);

    expect(html).toContain('https://www.nissan.com.au/hero');
    expect(html).toContain('1% Finance~. Hurry, ends Dec 21');
    expect(html).toContain(tokenUrl);
    expect(html).toContain('<%= message.delivery.internalName %>');
    expect(html).toContain('Register');
    expect(applied.template.blocks.find((b) => b.id === 'b-cta')!.props.buttonText).toBe(
      'Register'
    );
  });
});
