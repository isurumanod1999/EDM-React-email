'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { TemplateSummary } from '@/lib/schema/template';
import { formatCategoryLabel } from '@/builder/utils/props';
import '@/app/home.css';

const DEMO_TEMPLATES = [
  {
    name: 'Nissan Email Template',
    description: 'Nissan MORE campaign with Qashqai, Patrol, Ariya & X-Trail',
    path: '/preview/nissan',
    featured: true,
  },
  {
    name: 'All Components Showcase',
    description: 'Complete email demonstrating all reusable blocks',
    path: '/preview/all-components',
  },
  {
    name: 'Complete Email',
    description: 'Header, intro, product sections, and footer',
    path: '/preview/complete-email',
  },
  {
    name: 'Two Column Dual CTA',
    description: 'Side-by-side products with dual call-to-action buttons',
    path: '/preview/two-col-dual-cta',
  },
  {
    name: 'Two Column Stacked',
    description: 'Stacked product cards with prices and CTAs',
    path: '/preview/two-col-stacked',
  },
];

const COMPONENTS = [
  { name: 'Header', desc: 'Logo header' },
  { name: 'HeroBanner', desc: 'Hero image + CTA' },
  { name: 'SectionTitle', desc: 'Section heading' },
  { name: 'IntroCopy', desc: 'Intro text' },
  { name: 'TextBlock', desc: 'Rich text content' },
  { name: 'PromoBlock', desc: 'Promo banner' },
  { name: 'ImageBlock', desc: 'Standalone image' },
  { name: 'ButtonRow', desc: 'Dual CTA buttons' },
  { name: 'CtaBanner', desc: 'Full-width CTA' },
  { name: 'StatsRow', desc: '3-col statistics' },
  { name: 'Testimonial', desc: 'Customer quote' },
  { name: 'Divider', desc: 'Line separator' },
  { name: 'Spacer', desc: 'Vertical space' },
  { name: 'Footer', desc: 'Email footer' },
  { name: 'OrderCard', desc: 'Order details' },
  { name: 'TwoColDualCta', desc: '2-col dual CTAs' },
  { name: 'TwoColStacked', desc: '2-col products' },
  { name: 'OneColProduct', desc: 'Featured product' },
  { name: 'ThreeColIcon', desc: '3-col features' },
];

export function HomePage() {
  const [builderTemplates, setBuilderTemplates] = useState<TemplateSummary[]>([]);
  const [componentCount, setComponentCount] = useState(18);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [templatesRes, registryRes] = await Promise.all([
          fetch('/api/templates'),
          fetch('/api/registry'),
        ]);

        if (templatesRes.ok) {
          const data = await templatesRes.json();
          setBuilderTemplates(data.templates ?? []);
        }

        if (registryRes.ok) {
          const data = await registryRes.json();
          setComponentCount(data.total ?? 11);
        }
      } catch {
        // Homepage still renders with defaults
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="home">
      <nav className="home-nav">
        <Link href="/" className="home-brand">
          <span className="home-brand-mark" aria-hidden />
          Email Studio
        </Link>
        <div className="home-nav-links">
          <Link href="/builder" className="home-nav-link">
            Templates
          </Link>
          <Link href="/preview/nissan" className="home-nav-link">
            Demos
          </Link>
          <Link href="/builder" className="home-nav-link primary">
            Open Builder
          </Link>
        </div>
      </nav>

      <section className="home-hero">
        <span className="home-badge">Visual Email Builder</span>
        <h1>
          Design emails that render <span className="accent">everywhere</span>
        </h1>
        <p className="home-hero-sub">
          Compose cross-client HTML emails from reusable React Email blocks. Import from
          Figma, fine-tune every element on canvas, send test emails with Resend, and export
          production-ready HTML.
        </p>
        <div className="home-hero-actions">
          <Link href="/builder" className="btn btn-primary">
            Create Template
          </Link>
          <Link href="/builder" className="btn btn-secondary">
            Browse Templates
          </Link>
        </div>
      </section>

      <section className="home-section">
        <div className="home-stats">
          <div className="home-stat">
            <div className="home-stat-value">{componentCount}</div>
            <div className="home-stat-label">Components</div>
          </div>
          <div className="home-stat">
            <div className="home-stat-value">{builderTemplates.length}</div>
            <div className="home-stat-label">Saved Templates</div>
          </div>
          <div className="home-stat">
            <div className="home-stat-value">{DEMO_TEMPLATES.length}</div>
            <div className="home-stat-label">Demo Emails</div>
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="home-section-header">
          <div>
            <h2>Your Templates</h2>
            <p>Templates created in the visual builder</p>
          </div>
          <Link href="/builder" className="btn btn-secondary btn-sm">
            View all →
          </Link>
        </div>

        {loading ? (
          <div className="home-loading">Loading templates...</div>
        ) : builderTemplates.length === 0 ? (
          <div className="home-empty">
            No saved templates yet.{' '}
            <Link href="/builder">Create your first template →</Link>
          </div>
        ) : (
          <div className="home-grid">
            {builderTemplates.slice(0, 6).map((template) => (
              <Link
                key={template.id}
                href={`/builder/${template.id}`}
                className="home-card home-card-featured"
              >
                <span className="home-card-tag builder">
                  {formatCategoryLabel(template.category)}
                </span>
                <h3>{template.name}</h3>
                {template.description && <p>{template.description}</p>}
                <span className="home-card-footer">
                  {template.blockCount} blocks · Edit in builder →
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="home-section">
        <div className="home-section-header">
          <div>
            <h2>Demo Previews</h2>
            <p>Static example emails built with React Email</p>
          </div>
        </div>
        <div className="home-grid">
          {DEMO_TEMPLATES.map((template) => (
            <Link
              key={template.path}
              href={template.path}
              className={`home-card ${template.featured ? 'home-card-featured' : ''}`}
            >
              {template.featured && (
                <span className="home-card-tag featured">Featured</span>
              )}
              {!template.featured && (
                <span className="home-card-tag demo">Demo</span>
              )}
              <h3>{template.name}</h3>
              <p>{template.description}</p>
              <span className="home-card-footer">Preview email →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-section">
        <div className="home-section-header">
          <div>
            <h2>Component Library</h2>
            <p>Reusable blocks available in the builder palette</p>
          </div>
        </div>
        <div className="home-components">
          {COMPONENTS.map((component) => (
            <div key={component.name} className="home-component-chip">
              <code>{component.name}</code>
              <span>{component.desc}</span>
            </div>
          ))}
        </div>
      </section>

      <footer className="home-footer">
        Email Studio · Built with React Email, Next.js &amp; Resend
      </footer>
    </div>
  );
}
