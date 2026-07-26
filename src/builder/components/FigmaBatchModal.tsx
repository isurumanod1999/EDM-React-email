'use client';

import { useCallback, useMemo, useState } from 'react';
import { useBuilderStore } from '@/builder/store/builderStore';

interface FigmaBatchModalProps {
  open: boolean;
  onClose: () => void;
}

type RowStatus = 'idle' | 'importing' | 'done' | 'error';

interface BatchBlock {
  componentId: string;
  props: Record<string, unknown>;
  label?: string;
}

interface BatchRow {
  id: string;
  label: string;
  desktopUrl: string;
  mobileUrl: string;
  status: RowStatus;
  error?: string;
  nodeName?: string;
  block?: BatchBlock;
}

const newRow = (): BatchRow => ({
  id: crypto.randomUUID(),
  label: '',
  desktopUrl: '',
  mobileUrl: '',
  status: 'idle',
});

/** Start with enough rows to cover a typical multi-component template. */
const makeInitialRows = () => [newRow(), newRow(), newRow(), newRow()];

export function FigmaBatchModal({ open, onClose }: FigmaBatchModalProps) {
  const addBlocksFromAi = useBuilderStore((s) => s.addBlocksFromAi);

  const [rows, setRows] = useState<BatchRow[]>(makeInitialRows);
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setRows(makeInitialRows());
    setIsRunning(false);
    setHasRun(false);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    if (isRunning) return; // don't close mid-import
    reset();
    onClose();
  }, [isRunning, onClose, reset]);

  const patchRow = useCallback((id: string, patch: Partial<BatchRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const addRow = useCallback(() => setRows((prev) => [...prev, newRow()]), []);
  const removeRow = useCallback(
    (id: string) => setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev)),
    []
  );

  const validRows = useMemo(() => rows.filter((r) => r.desktopUrl.trim()), [rows]);
  const doneRows = useMemo(() => rows.filter((r) => r.status === 'done' && r.block), [rows]);

  const importRow = useCallback(async (row: BatchRow): Promise<BatchBlock> => {
    const res = await fetch('/api/figma/import-build', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        figmaUrl: row.desktopUrl.trim(),
        mobileFigmaUrl: row.mobileUrl.trim() || undefined,
        label: row.label.trim() || undefined,
      }),
    });
    const data = (await res.json()) as {
      block?: BatchBlock;
      nodeName?: string;
      error?: string;
    };
    if (!res.ok || !data.block) throw new Error(data.error ?? 'Import failed');
    return { ...data.block, label: data.block.label ?? data.nodeName };
  }, []);

  const handleImportAll = useCallback(async () => {
    const targets = rows.filter((r) => r.desktopUrl.trim());
    if (targets.length === 0) {
      setError('Add at least one desktop frame URL.');
      return;
    }
    setError(null);
    setIsRunning(true);
    setRows((prev) =>
      prev.map((r) => (r.desktopUrl.trim() ? { ...r, status: 'importing', error: undefined } : r))
    );

    // Fire every import in parallel — the whole batch takes about as long as the
    // single slowest component instead of the sum of all of them.
    await Promise.all(
      targets.map(async (row) => {
        try {
          const block = await importRow(row);
          patchRow(row.id, { status: 'done', block, nodeName: block.label, error: undefined });
        } catch (e) {
          patchRow(row.id, {
            status: 'error',
            error: e instanceof Error ? e.message : 'Import failed',
          });
        }
      })
    );

    setIsRunning(false);
    setHasRun(true);
  }, [rows, importRow, patchRow]);

  const handleAddAll = useCallback(() => {
    const blocks = rows.filter((r) => r.status === 'done' && r.block).map((r) => r.block as BatchBlock);
    if (blocks.length === 0) return;
    addBlocksFromAi(blocks);
    reset();
    onClose();
  }, [rows, addBlocksFromAi, reset, onClose]);

  if (!open) return null;

  const statusLabel = (r: BatchRow): { text: string; cls: string } => {
    switch (r.status) {
      case 'importing':
        return { text: 'Importing…', cls: 'is-importing' };
      case 'done':
        return { text: `Ready — ${r.nodeName ?? 'built'}`, cls: 'is-done' };
      case 'error':
        return { text: r.error ?? 'Failed', cls: 'is-error' };
      default:
        return { text: '', cls: '' };
    }
  };

  return (
    <div className="import-modal-overlay" onClick={handleClose} role="presentation">
      <div
        className="import-modal import-modal-figma import-modal-batch"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="figma-batch-title"
        aria-modal="true"
      >
        <div className="import-modal-header import-modal-header-figma">
          <div>
            <div className="figma-badge">Figma · Batch</div>
            <h2 id="figma-batch-title">Import multiple components</h2>
            <p className="import-modal-subtitle">
              Add a row per component (desktop + optional mobile). All rows import in parallel.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleClose}
            disabled={isRunning}
          >
            ✕
          </button>
        </div>

        <div className="import-modal-body">
          <div className="figma-batch-rows">
            {rows.map((row, i) => {
              const st = statusLabel(row);
              return (
                <div key={row.id} className="figma-batch-row">
                  <div className="figma-batch-row-head">
                    <span className="figma-batch-index">{i + 1}</span>
                    <input
                      type="text"
                      className="import-modal-input figma-batch-label"
                      placeholder="Label (optional) — e.g. Header, Hero, Footer"
                      value={row.label}
                      onChange={(e) => patchRow(row.id, { label: e.target.value })}
                      disabled={isRunning}
                    />
                    {st.text && <span className={`figma-batch-status ${st.cls}`}>{st.text}</span>}
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm figma-batch-remove"
                      onClick={() => removeRow(row.id)}
                      disabled={isRunning || rows.length <= 1}
                      title="Remove row"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="figma-batch-urls">
                    <input
                      type="url"
                      className="import-modal-input"
                      placeholder="Desktop frame URL *"
                      value={row.desktopUrl}
                      onChange={(e) => patchRow(row.id, { desktopUrl: e.target.value })}
                      disabled={isRunning}
                    />
                    <input
                      type="url"
                      className="import-modal-input"
                      placeholder="Mobile frame URL (optional)"
                      value={row.mobileUrl}
                      onChange={(e) => patchRow(row.id, { mobileUrl: e.target.value })}
                      disabled={isRunning}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm figma-batch-add"
            onClick={addRow}
            disabled={isRunning}
          >
            + Add another component
          </button>

          {hasRun && (
            <div className="figma-batch-summary">
              {doneRows.length} ready
              {rows.some((r) => r.status === 'error') &&
                ` · ${rows.filter((r) => r.status === 'error').length} failed`}
            </div>
          )}

          {error && <div className="import-modal-error">{error}</div>}
        </div>

        <div className="import-modal-footer">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleClose}
            disabled={isRunning}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleImportAll}
            disabled={isRunning || validRows.length === 0}
          >
            {isRunning
              ? `Importing ${validRows.length}…`
              : hasRun
                ? 'Re-import'
                : `Import & build ${validRows.length || ''}`.trim()}
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm figma-btn-primary"
            onClick={handleAddAll}
            disabled={isRunning || doneRows.length === 0}
          >
            Add {doneRows.length || ''} to canvas
          </button>
        </div>
      </div>
    </div>
  );
}
