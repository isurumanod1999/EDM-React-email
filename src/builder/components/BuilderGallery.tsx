'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { TemplateSummary } from '@/lib/schema/template';
import { formatCategoryLabel } from '@/builder/utils/props';
import { BuilderToastContainer } from '@/builder/components/BuilderToastContainer';
import { pushToast } from '@/builder/store/toastStore';
import '@/builder/builder.css';

async function readApiError(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data.error === 'string') return data.error;
  } catch {
    /* ignore */
  }
  return fallback;
}

type CardAction = 'duplicate' | 'delete';

export function BuilderGallery() {
  const router = useRouter();
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyAction, setBusyAction] = useState<{ id: string; action: CardAction } | null>(
    null
  );

  const fetchTemplates = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/templates');
      if (!res.ok) {
        throw new Error(await readApiError(res, 'Failed to load templates'));
      }
      const data = await res.json();
      setTemplates(data.templates ?? []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          useDefaults: true,
          name: 'Untitled Template',
          category: 'newsletter',
        }),
      });
      if (!res.ok) {
        throw new Error(await readApiError(res, 'Failed to create template'));
      }
      const data = await res.json();
      router.push(`/builder/${data.template.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create template';
      pushToast(message, 'error', 6000);
      setCreating(false);
    }
  };

  const handleDuplicate = async (id: string, name: string) => {
    setBusyAction({ id, action: 'duplicate' });
    try {
      const res = await fetch(`/api/templates/${id}/duplicate`, { method: 'POST' });
      if (!res.ok) {
        throw new Error(await readApiError(res, 'Duplicate failed'));
      }
      const data = await res.json();
      pushToast(`Duplicated "${name}"`, 'success');
      router.push(`/builder/${data.template.id}`);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Duplicate failed', 'error', 6000);
      setBusyAction(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;

    setBusyAction({ id, action: 'delete' });
    try {
      const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        throw new Error(await readApiError(res, 'Delete failed'));
      }
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      pushToast(`Deleted "${name}"`, 'success');
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Delete failed', 'error', 6000);
    } finally {
      setBusyAction(null);
    }
  };

  const isCardBusy = (id: string) => busyAction?.id === id;

  return (
    <div className="gallery-page">
      <div className="gallery-header">
        <div>
          <h1 className="gallery-title">Email Template Builder</h1>
          <p className="gallery-subtitle">
            Create, edit, and preview email templates with drag-and-drop components
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          <Link href="/" className="btn btn-secondary">
            ← Home
          </Link>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCreate}
            disabled={creating || loading}
          >
            {creating ? 'Creating…' : '+ New Template'}
          </button>
        </div>
      </div>

      {loading && <div className="loading-state">Loading templates…</div>}

      {loadError && !loading ? (
        <div className="gallery-error-banner" role="alert">
          <span>{loadError}</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={fetchTemplates}>
            Retry
          </button>
        </div>
      ) : null}

      {!loading && !loadError && templates.length === 0 ? (
        <div className="gallery-empty">
          <p className="gallery-empty-title">No templates yet</p>
          <p className="gallery-empty-text">
            Create your first email template and start building with drag-and-drop components.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCreate}
            disabled={creating}
          >
            {creating ? 'Creating…' : 'Create first template'}
          </button>
        </div>
      ) : null}

      {!loading && !loadError && templates.length > 0 ? (
        <div className="gallery-grid">
          {templates.map((template) => {
            const busy = isCardBusy(template.id);
            const duplicating = busy && busyAction?.action === 'duplicate';
            const deleting = busy && busyAction?.action === 'delete';

            return (
              <article key={template.id} className="gallery-card">
                <div>
                  <span className="category-tag">{formatCategoryLabel(template.category)}</span>
                </div>
                <h2 className="gallery-card-title">{template.name}</h2>
                {template.description ? (
                  <p className="gallery-card-meta">{template.description}</p>
                ) : null}
                <p className="gallery-card-meta">
                  {template.blockCount} block{template.blockCount !== 1 ? 's' : ''} · Updated{' '}
                  {new Date(template.updatedAt).toLocaleDateString()}
                </p>
                <div className="gallery-card-actions">
                  <Link
                    href={`/builder/${template.id}`}
                    className="btn btn-primary btn-sm"
                    aria-disabled={busy}
                    tabIndex={busy ? -1 : undefined}
                    style={busy ? { pointerEvents: 'none', opacity: 0.5 } : undefined}
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleDuplicate(template.id, template.name)}
                    disabled={busy || creating}
                  >
                    {duplicating ? 'Duplicating…' : 'Duplicate'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm btn-danger"
                    onClick={() => handleDelete(template.id, template.name)}
                    disabled={busy || creating}
                  >
                    {deleting ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      <BuilderToastContainer />
    </div>
  );
}
