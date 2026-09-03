'use client';

import Link from 'next/link';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import '@/app/home.css';

const WORKFLOW = [
  {
    number: '01',
    title: 'Import',
    description: 'Start from a registry component, Figma frame, batch, or screenshot.',
  },
  {
    number: '02',
    title: 'Customize',
    description: 'Compose blocks and refine copy, imagery, links, and layout properties.',
  },
  {
    number: '03',
    title: 'Preview',
    description: 'Review the rendered React Email HTML in desktop and mobile widths.',
  },
  {
    number: '04',
    title: 'Export',
    description: 'Download the HTML and image package or send a configured test email.',
  },
];

export function HomePage() {
  return (
    <div className="home">
      <nav className="home-nav">
        <div className="home-brand">
          <span className="home-brand-mark" aria-hidden />
          Email Studio
        </div>
        <ThemeToggle />
      </nav>

      <main>
        <section className="home-hero">
          <span className="home-badge">Internal email production workspace</span>
          <h1>
            Figma to <span className="accent">production-ready email</span>
          </h1>
          <p className="home-hero-sub">
            Turn reusable components and Figma designs into editable React Email templates,
            preview the rendered HTML, and package approved work for delivery.
          </p>
          <Link href="/builder" className="btn btn-primary">
            Open Workspace <span aria-hidden>→</span>
          </Link>
        </section>

        <section className="home-section home-workflow" aria-labelledby="workflow-heading">
          <div className="home-section-header">
            <div>
              <span className="home-eyebrow">Working path</span>
              <h2 id="workflow-heading">Import → Customize → Preview → Export</h2>
            </div>
          </div>
          <ol className="home-workflow-list">
            {WORKFLOW.map((step) => (
              <li key={step.title} className="home-workflow-step">
                <span className="home-workflow-number">{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </li>
            ))}
          </ol>
          <p className="home-workflow-note">
            The workspace keeps advanced import, tagging, code, test-send, and export tools
            available without claiming deferred authentication or real-inbox QA.
          </p>
        </section>
      </main>

      <footer className="home-footer">
        <div>
          <strong>Email Studio</strong>
          <span>React Email workspace for internal production</span>
        </div>
      </footer>
    </div>
  );
}
