'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export default function PreviewPage() {
  const params = useParams();
  const template = params.template as string;
  const [html, setHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

  useEffect(() => {
    async function fetchEmail() {
      try {
        setLoading(true);
        const response = await fetch(`/api/email/${template}`);
        if (!response.ok) {
          throw new Error('Failed to fetch email');
        }
        const data = await response.json();
        setHtml(data.html);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchEmail();
  }, [template]);

  const templateNames: Record<string, string> = {
    'two-col-dual-cta': 'Two Column Dual CTA',
    'two-col-stacked': 'Two Column Stacked',
    'complete-email': 'Complete Email Example',
    'all-components': 'All Components Showcase',
    'nissan': 'Nissan Email Template',
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-primary)',
    }}>
      {/* Header */}
      <header style={{
        padding: '16px 24px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--bg-secondary)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <a
            href="/"
            style={{
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              fontSize: '0.9rem',
            }}
          >
            ← Back
          </a>
          <h1 style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}>
            {templateNames[template] || template}
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <a
            href="http://localhost:3005"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              backgroundColor: 'var(--accent)',
              color: '#fff',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
            title="Requires npm run email:dev and email:resend:setup"
          >
            Send via React Email
          </a>
          <button
            onClick={() => setViewMode('desktop')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: viewMode === 'desktop' ? 'var(--accent)' : 'var(--bg-card)',
              color: viewMode === 'desktop' ? '#fff' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Desktop
          </button>
          <button
            onClick={() => setViewMode('mobile')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: viewMode === 'mobile' ? 'var(--accent)' : 'var(--bg-card)',
              color: viewMode === 'mobile' ? '#fff' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Mobile
          </button>
          <ThemeToggle />
        </div>
      </header>

      {/* Preview Area */}
      <main style={{
        padding: '40px 24px',
        display: 'flex',
        justifyContent: 'center',
      }}>
        {loading ? (
          <div style={{
            padding: '60px',
            textAlign: 'center',
            color: 'var(--text-secondary)',
          }}>
            Loading email preview...
          </div>
        ) : error ? (
          <div style={{
            padding: '60px',
            textAlign: 'center',
            color: '#ef4444',
          }}>
            Error: {error}
          </div>
        ) : (
          <div style={{
            width: viewMode === 'desktop' ? '100%' : '360px',
            maxWidth: '700px',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            transition: 'width 0.3s ease',
          }}>
            <iframe
              srcDoc={html}
              style={{
                width: '100%',
                height: '800px',
                border: 'none',
              }}
              title="Email Preview"
            />
          </div>
        )}
      </main>
    </div>
  );
}

