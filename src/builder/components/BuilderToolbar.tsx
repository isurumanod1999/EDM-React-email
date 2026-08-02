'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AiImportModal } from '@/builder/components/AiImportModal';
import { FigmaBatchModal } from '@/builder/components/FigmaBatchModal';
import { FigmaBuildModal } from '@/builder/components/FigmaBuildModal';
import { FigmaFetchModal } from '@/builder/components/FigmaFetchModal';
import { SendTestModal } from '@/builder/components/SendTestModal';
import { useBuilderStore } from '@/builder/store/builderStore';
import { pushToast } from '@/builder/store/toastStore';
import { confirmLeaveIfDirty } from '@/builder/hooks/useUnsavedChangesGuard';
import { downloadBlob } from '@/builder/utils/download';
import { sanitizeExportName } from '@/lib/export/sanitizeName';

export function BuilderToolbar() {
  const router = useRouter();
  const template = useBuilderStore((s) => s.template);
  const isDirty = useBuilderStore((s) => s.isDirty);
  const isSaving = useBuilderStore((s) => s.isSaving);
  const showAdvanced = useBuilderStore((s) => s.showAdvanced);
  const updateTemplateInfo = useBuilderStore((s) => s.updateTemplateInfo);
  const setShowAdvanced = useBuilderStore((s) => s.setShowAdvanced);
  const save = useBuilderStore((s) => s.save);
  const figmaSession = useBuilderStore((s) => s.figmaSession);
  const figmaBuildOpen = useBuilderStore((s) => s.figmaBuildModalOpen);
  const setFigmaBuildOpen = useBuilderStore((s) => s.setFigmaBuildModalOpen);

  const [isExporting, setIsExporting] = useState(false);
  const [aiImportOpen, setAiImportOpen] = useState(false);
  const [figmaFetchOpen, setFigmaFetchOpen] = useState(false);
  const [figmaBatchOpen, setFigmaBatchOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);

  const handleDuplicate = async () => {
    if (!template) return;
    if (!confirmLeaveIfDirty()) return;
    const res = await fetch(`/api/templates/${template.id}/duplicate`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      pushToast('Template duplicated', 'success');
      router.push(`/builder/${data.template.id}`);
      return;
    }
    const err = await res.json().catch(() => ({}));
    pushToast(typeof err.error === 'string' ? err.error : 'Duplicate failed', 'error', 6000);
  };

  const handleExport = async () => {
    if (!template || isExporting) return;

    if (template.blocks.length === 0) {
      pushToast('Add at least one component to the canvas before exporting.', 'info');
      return;
    }

    setIsExporting(true);

    try {
      const res = await fetch('/api/email/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: template.name,
          meta: template.meta,
          blocks: template.blocks,
        }),
      });

      const contentType = res.headers.get('Content-Type') ?? '';

      if (!res.ok) {
        const err =
          contentType.includes('application/json')
            ? await res.json().catch(() => ({}))
            : {};
        throw new Error(
          typeof err.error === 'string' ? err.error : `Export failed (${res.status})`
        );
      }

      if (!contentType.includes('application/zip')) {
        throw new Error('Export did not return a ZIP file. Try again.');
      }

      const blob = await res.blob();
      if (blob.size === 0) {
        throw new Error('Export file is empty. Try again.');
      }

      const disposition = res.headers.get('Content-Disposition') ?? '';
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? `${sanitizeExportName(template.name)}.zip`;

      downloadBlob(blob, filename);
      pushToast(`Exported ${filename}`, 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed';
      pushToast(message, 'error', 6000);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <header className="builder-toolbar">
      <div className="builder-toolbar-left">
        <Link href="/builder" className="btn btn-ghost btn-sm">
          ← Templates
        </Link>
        {template && (
          <div className="builder-toolbar-title">
            <input
              value={template.name}
              onChange={(e) => updateTemplateInfo({ name: e.target.value })}
              aria-label="Template name"
            />
          </div>
        )}
        {isDirty && <span className="status-badge dirty">Unsaved</span>}
      </div>

      <div className="builder-toolbar-right">
        <label className="field-checkbox-row" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <input
            type="checkbox"
            checked={showAdvanced}
            onChange={(e) => setShowAdvanced(e.target.checked)}
          />
          Advanced
        </label>
        <button
          type="button"
          className="btn btn-secondary btn-sm btn-figma"
          onClick={() => setFigmaFetchOpen(true)}
          title="Fetch design details from Figma via API"
        >
          Fetch from Figma
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm btn-figma"
          onClick={() => setFigmaBuildOpen(true)}
          disabled={!figmaSession}
          title={
            figmaSession
              ? `Build components from "${figmaSession.nodeName}"`
              : 'Fetch a Figma frame first'
          }
        >
          Build from Figma
          {figmaSession && (
            <span className="figma-session-badge" title={figmaSession.nodeName}>
              ●
            </span>
          )}
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm btn-figma"
          onClick={() => setFigmaBatchOpen(true)}
          title="Import several Figma components at once (parallel)"
        >
          Batch Import
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setAiImportOpen(true)}
          title="Upload screenshots to generate email components"
        >
          Screenshot Upload
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setSendOpen(true)}
          disabled={!template || template.blocks.length === 0}
          title={
            template && template.blocks.length === 0
              ? 'Add components to the canvas first'
              : 'Send a test email via Resend'
          }
        >
          Send email
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleExport}
          disabled={isExporting || !template || template.blocks.length === 0}
          title={
            template && template.blocks.length === 0
              ? 'Add components to the canvas first'
              : 'Download ZIP with HTML and img folder'
          }
        >
          {isExporting ? 'Exporting...' : 'Export'}
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={handleDuplicate}>
          Duplicate
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => save()}
          disabled={isSaving || !isDirty}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <FigmaFetchModal
        open={figmaFetchOpen}
        onClose={() => setFigmaFetchOpen(false)}
        onFetchComplete={() => setFigmaBuildOpen(true)}
      />
      <FigmaBuildModal
        open={figmaBuildOpen}
        onClose={() => setFigmaBuildOpen(false)}
        onFetchAgain={() => {
          setFigmaBuildOpen(false);
          setFigmaFetchOpen(true);
        }}
      />
      <FigmaBatchModal open={figmaBatchOpen} onClose={() => setFigmaBatchOpen(false)} />
      <AiImportModal open={aiImportOpen} onClose={() => setAiImportOpen(false)} />
      <SendTestModal open={sendOpen} onClose={() => setSendOpen(false)} />
    </header>
  );
}
