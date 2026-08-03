'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { ImportProgressBanner } from '@/builder/components/ImportProgressBanner';
import { useModalA11y } from '@/builder/hooks/useModalA11y';
import { useBuilderStore } from '@/builder/store/builderStore';

interface FigmaBatchModalProps {
  open: boolean;
  onClose: () => void;
}

type RowStatus = 'idle' | 'importing' | 'done' | 'error';
type BuildAs = 'design' | 'image';

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
  buildAs: BuildAs;
  /** Mixed-mode: auto-detect icons/SVGs → 2× images (default ON). */
  autoDetectImages: boolean;
  /** Mixed-mode: free-form guidance for the AI image classifier (optional). */
  imageInstructions: string;
  status: RowStatus;
  error?: string;
  nodeName?: string;
  block?: BatchBlock;
  blocks?: BatchBlock[];
}

/**
 * Max number of components imported at the same time. Each import is heavy
 * (multiple Figma API calls + 2× image downloads + build + render), so we cap
 * concurrency to avoid overwhelming the dev server — firing all at once made 5+
 * component batches crash/reload the page. 3 keeps a strong parallel speedup
 * while staying safely under that threshold.
 */
const BATCH_CONCURRENCY = 3;

const newRow = (): BatchRow => ({
  id: crypto.randomUUID(),
  label: '',
  desktopUrl: '',
  mobileUrl: '',
  buildAs: 'design',
  autoDetectImages: true,
  imageInstructions: '',
  status: 'idle',
});

/** Start with enough rows to cover a typical multi-component template. */
const makeInitialRows = () => [newRow(), newRow(), newRow(), newRow()];

export function FigmaBatchModal({ open, onClose }: FigmaBatchModalProps) {
  const addBlocksFromAi = useBuilderStore((s) => s.addBlocksFromAi);
  const dialogRef = useRef<HTMLDivElement>(null);

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
    if (isRunning) return;
    reset();
    onClose();
  }, [isRunning, onClose, reset]);

  useModalA11y({ open, onClose: handleClose, busy: isRunning, dialogRef });

  const patchRow = useCallback((id: string, patch: Partial<BatchRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const addRow = useCallback(() => setRows((prev) => [...prev, newRow()]), []);
  const removeRow = useCallback(
    (id: string) => setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev)),
    []
  );

  const validRows = useMemo(() => rows.filter((r) => r.desktopUrl.trim()), [rows]);
  const doneRows = useMemo(
    () => rows.filter((r) => r.status === 'done' && (r.blocks?.length ?? r.block)),
    [rows]
  );

  const importRow = useCallback(async (row: BatchRow): Promise<BatchBlock[]> => {
    const res = await fetch('/api/figma/import-build', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        figmaUrl: row.desktopUrl.trim(),
        mobileFigmaUrl: row.mobileUrl.trim() || undefined,
        label: row.label.trim() || undefined,
        buildAs: row.buildAs,
        autoDetectImages: row.autoDetectImages,
        imageInstructions: row.imageInstructions.trim() || undefined,
      }),
    });
    const data = (await res.json()) as {
      block?: BatchBlock;
      blocks?: BatchBlock[];
      nodeName?: string;
      error?: string;
    };
    const blocks = data.blocks ?? (data.block ? [data.block] : []);
    if (!res.ok || blocks.length === 0) {
      const msg =
        res.status === 504 || res.status === 408
          ? 'Import timed out — try fewer rows or simpler frames.'
          : (data.error ?? 'Import failed');
      throw new Error(msg);
    }
    return blocks.map((b) => ({ ...b, label: b.label ?? data.nodeName }));
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

    // Import with BOUNDED concurrency (a worker pool), NOT all at once. Each
    // import triggers several Figma API calls, multiple 2× image downloads, a
    // tree build and a render — firing 5+ simultaneously overwhelmed the dev
    // server (it would stall/crash, the HMR socket would reconnect, and the
    // browser did a full page reload — dropping the modal and all progress).
    // A small pool keeps most of the parallel speedup while staying well under
    // that threshold. Rows still show live per-row status as they complete.
    const queue = [...targets];
    const runWorker = async () => {
      for (;;) {
        const row = queue.shift();
        if (!row) return;
        try {
          const blocks = await importRow(row);
          patchRow(row.id, {
            status: 'done',
            blocks,
            block: blocks[0],
            nodeName: blocks[0]?.label,
            error: undefined,
          });
        } catch (e) {
          patchRow(row.id, {
            status: 'error',
            error: e instanceof Error ? e.message : 'Import failed',
          });
        }
      }
    };
    const poolSize = Math.min(BATCH_CONCURRENCY, targets.length);
    await Promise.all(Array.from({ length: poolSize }, runWorker));

    setIsRunning(false);
    setHasRun(true);
  }, [rows, importRow, patchRow]);

  const handleAddAll = useCallback(() => {
    const blocks = rows.flatMap((r) =>
      r.blocks?.length ? r.blocks : r.block ? [r.block] : []
    );
    if (blocks.length === 0) return;
    addBlocksFromAi(blocks);
    reset();
    onClose();
  }, [rows, addBlocksFromAi, reset, onClose]);

  if (!open) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (isRunning) return;
    if (e.target === e.currentTarget) handleClose();
  };

  const importingCount = rows.filter((r) => r.status === 'importing').length;

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
    <div className="import-modal-overlay" onClick={handleOverlayClick} role="presentation">
      <div
        ref={dialogRef}
        className="import-modal import-modal-figma import-modal-batch"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="figma-batch-title"
        aria-modal="true"
        tabIndex={-1}
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
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <div className="import-modal-body">
          {isRunning && (
            <ImportProgressBanner
              message={`Importing ${importingCount || validRows.length} component(s) — each row may take up to a minute.`}
            />
          )}
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
                    <select
                      className="import-modal-input figma-batch-mode"
                      value={row.buildAs}
                      onChange={(e) => patchRow(row.id, { buildAs: e.target.value as BuildAs })}
                      disabled={isRunning}
                      title="Design = structured HTML/CSS. Image = flatten the whole component to one PNG (best for CSS-heavy components)."
                    >
                      <option value="design">Design (structured)</option>
                      <option value="image">Image (flatten)</option>
                    </select>
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
                  {row.buildAs === 'design' && (
                    <div className="figma-batch-smart-image">
                      <label
                        className="figma-batch-smart-check"
                        title="Export icons/SVGs/vector art as crisp 2× PNGs; keep text & layout structured."
                      >
                        <input
                          type="checkbox"
                          checked={row.autoDetectImages}
                          onChange={(e) =>
                            patchRow(row.id, { autoDetectImages: e.target.checked })
                          }
                          disabled={isRunning}
                        />
                        Auto-detect icons → 2× images
                      </label>
                      <input
                        type="text"
                        className="import-modal-input figma-batch-instructions"
                        placeholder="Image instructions (optional) — e.g. badges & social icons as images"
                        value={row.imageInstructions}
                        onChange={(e) =>
                          patchRow(row.id, { imageInstructions: e.target.value })
                        }
                        disabled={isRunning}
                      />
                    </div>
                  )}
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
