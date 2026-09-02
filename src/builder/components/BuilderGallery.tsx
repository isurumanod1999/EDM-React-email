'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { TemplateSummary } from '@/lib/schema/template';
import { formatCategoryLabel } from '@/builder/utils/props';
import { BuilderToastContainer } from '@/builder/components/BuilderToastContainer';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
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
type SortOption = 'updated-desc' | 'updated-asc' | 'name-asc' | 'name-desc';

export function BuilderGallery() {
  const router = useRouter();
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('updated-desc');
  const [busyAction, setBusyAction] = useState<{ id: string; action: CardAction } | null>(
    null
  );

  const filteredTemplates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = q
      ? templates.filter(
          (t) =>
            t.name.toLowerCase().includes(q) ||
            (t.description?.toLowerCase().includes(q) ?? false)
        )
      : [...templates];

    list.sort((a, b) => {
      switch (sortBy) {
        case 'updated-asc':
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'updated-desc':
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

    return list;
  }, [templates, searchQuery, sortBy]);

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
          <span className="gallery-eyebrow">Overview → Workspace</span>
          <h1 className="gallery-title">Template Workspace</h1>
          <p className="gallery-subtitle">
            Choose a template to continue into the editor, or start a new production draft.
          </p>
        </div>
        <div className="gallery-header-actions">
          <Link href="/" className="btn btn-secondary">
            ← Overview
          </Link>
          <ThemeToggle />
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
        <>
          <div className="gallery-controls">
            <input
              type="search"
              className="gallery-search"
              placeholder="Search templates…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search templates"
            />
            <select
              className="gallery-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              aria-label="Sort templates"
            >
              <option value="updated-desc">Recently updated</option>
              <option value="updated-asc">Oldest updated</option>
              <option value="name-asc">Name A–Z</option>
              <option value="name-desc">Name Z–A</option>
            </select>
          </div>

          {filteredTemplates.length === 0 ? (
            <div className="gallery-empty gallery-empty-filtered">
              <p className="gallery-empty-title">No matches</p>
              <p className="gallery-empty-text">
                No templates match &ldquo;{searchQuery.trim()}&rdquo;. Try a different search.
              </p>
            </div>
          ) : (
            <div className="gallery-grid">
              {filteredTemplates.map((template) => {
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
          )}
        </>
      ) : null}

      <BuilderToastContainer />
    </div>
  );
}
