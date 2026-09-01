'use client';

import { useMemo, useRef, useState } from 'react';
import { pushToast } from '@/builder/store/toastStore';
import { useBuilderStore } from '@/builder/store/builderStore';
import { discoverLinkableTargets } from '@/lib/tagging/discoverTargets';
import { matchTaggingRows } from '@/lib/tagging/matchRows';
import type { LinkableTarget, TaggingRow, TaggingRowStatus } from '@/lib/tagging/types';

type ChecklistMark = 'pass' | 'fail' | null;
type ChecklistState = Record<string, { desktop: ChecklistMark; mobile: ChecklistMark }>;

interface AppliedItem {
  targetId: string;
  finalUrl: string;
  urlLabel: string;
  displayName: string;
}

/**
 * Post-compose tagging panel: upload → match → rematch/confirm → apply → checklist.
 */
export function TaggingPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const template = useBuilderStore((s) => s.template);
  const setTemplate = useBuilderStore((s) => s.setTemplate);
  const viewMode = useBuilderStore((s) => s.viewMode);
  const setViewMode = useBuilderStore((s) => s.setViewMode);

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sheetName, setSheetName] = useState<string | undefined>();
  const [rows, setRows] = useState<TaggingRow[]>([]);
  const [targets, setTargets] = useState<LinkableTarget[]>([]);
  const [unmatchedTargetIds, setUnmatchedTargetIds] = useState<string[]>([]);
  const [appliedItems, setAppliedItems] = useState<AppliedItem[]>([]);
  const [checklist, setChecklist] = useState<ChecklistState>({});
  const [tab, setTab] = useState<'mappings' | 'checklist'>('mappings');

  const targetById = useMemo(() => {
    const m = new Map<string, LinkableTarget>();
    for (const t of targets) m.set(t.id, t);
    return m;
  }, [targets]);

  const openPicker = () => inputRef.current?.click();

  const runMatch = (parsedRows: TaggingRow[]) => {
    if (!template) return;
    const discovered = discoverLinkableTargets(template.blocks);
    const matched = matchTaggingRows(parsedRows, discovered);
    setTargets(matched.targets);
    setRows(matched.rows);
    setUnmatchedTargetIds(matched.unmatchedTargetIds);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!template) {
      pushToast('Open a composed template before uploading tagging', 'error');
      return;
    }
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/tagging/parse', { method: 'POST', body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Parse failed');
      }
      const parsed = (data.rows ?? []) as TaggingRow[];
      setSheetName(data.sheetName);
      setOpen(true);
      setTab('mappings');
      runMatch(parsed);
      const skipped = parsed.filter((r) => r.status === 'skipped').length;
      pushToast(
        `Tagging sheet loaded (${parsed.length - skipped} apply-ready, ${skipped} skipped)`,
        'success'
      );
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Tagging parse failed', 'error', 6000);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const rematchRow = (rowIndex: number, targetId: string) => {
    setRows((prev) => {
      const taken = new Set(
        prev.filter((r) => r.rowIndex !== rowIndex && r.targetId).map((r) => r.targetId!)
      );
      if (targetId && taken.has(targetId)) {
        pushToast('That target is already mapped to another row', 'error');
        return prev;
      }
      return prev.map((r) => {
        if (r.rowIndex !== rowIndex || r.status === 'skipped') return r;
        if (!targetId) {
          return { ...r, targetId: undefined, status: 'unmatched' as TaggingRowStatus };
        }
        return { ...r, targetId, status: 'proposed' as TaggingRowStatus };
      });
    });
    // Refresh unmatched list from local state after update
    setTimeout(() => {
      setRows((current) => {
        const claimed = new Set(current.map((r) => r.targetId).filter(Boolean) as string[]);
        setUnmatchedTargetIds(targets.filter((t) => !claimed.has(t.id)).map((t) => t.id));
        return current;
      });
    }, 0);
  };

  const confirmAllProposed = () => {
    setRows((prev) =>
      prev.map((r) =>
        r.status === 'proposed' && r.targetId
          ? { ...r, status: 'confirmed' as TaggingRowStatus }
          : r
      )
    );
    pushToast('Mappings confirmed (not written yet — click Apply)', 'success');
  };

  const clearAll = () => {
    setRows([]);
    setTargets([]);
    setUnmatchedTargetIds([]);
    setSheetName(undefined);
    setAppliedItems([]);
    setChecklist({});
  };

  const applyConfirmed = async () => {
    if (!template) return;
    const mappings = rows
      .filter((r) => (r.status === 'confirmed' || r.status === 'proposed') && r.targetId)
      .map((r) => ({
        rowIndex: r.rowIndex,
        targetId: r.targetId!,
        finalUrl: r.finalUrl,
        altText: r.altText,
        urlLabel: r.urlLabel,
      }));

    if (mappings.length === 0) {
      pushToast('Confirm at least one mapping before apply', 'error');
      return;
    }

    setBusy(true);
    try {
      const res = await fetch('/api/tagging/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: template.id, mappings }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Apply failed');
      }

      if (data.template) {
        setTemplate(data.template);
      }

      const applied: AppliedItem[] = (data.applied ?? []).map(
        (m: { targetId: string; finalUrl: string; urlLabel: string }) => ({
          targetId: m.targetId,
          finalUrl: m.finalUrl,
          urlLabel: m.urlLabel,
          displayName: targetById.get(m.targetId)?.displayName ?? m.targetId,
        })
      );
      setAppliedItems(applied);
      setChecklist((prev) => {
        const next = { ...prev };
        for (const item of applied) {
          if (!next[item.targetId]) next[item.targetId] = { desktop: null, mobile: null };
        }
        return next;
      });
      setRows((prev) =>
        prev.map((r) =>
          mappings.some((m) => m.rowIndex === r.rowIndex)
            ? { ...r, status: 'applied' as TaggingRowStatus }
            : r
        )
      );

      const warnings = (data.warnings as string[] | undefined) ?? [];
      if (warnings.length) {
        pushToast(`Applied with warnings: ${warnings[0]}`, 'error', 8000);
      } else {
        pushToast(`Applied ${applied.length} URL(s) and saved`, 'success');
      }
      setTab('checklist');
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Apply failed', 'error', 6000);
    } finally {
      setBusy(false);
    }
  };

  const setMark = (targetId: string, ctx: 'desktop' | 'mobile', mark: ChecklistMark) => {
    setChecklist((prev) => ({
      ...prev,
      [targetId]: {
        desktop: prev[targetId]?.desktop ?? null,
        mobile: prev[targetId]?.mobile ?? null,
        [ctx]: mark,
      },
    }));
  };

  const checklistIncomplete = appliedItems.some((item) => {
    const m = checklist[item.targetId];
    return !m || m.desktop === null || m.mobile === null;
  });

  const skippedCount = rows.filter((r) => r.status === 'skipped').length;
  const unmatchedCount = rows.filter((r) => r.status === 'unmatched').length;

  return (
    <div className="tagging-panel" style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        hidden
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={() => {
          if (rows.length || appliedItems.length) setOpen((o) => !o);
          else openPicker();
        }}
        disabled={busy || !template}
        title="Upload campaign tagging Excel after the template is built"
      >
        {busy ? 'Working…' : 'Tagging'}
      </button>
      {rows.length === 0 && appliedItems.length === 0 && (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={openPicker}
          disabled={busy || !template}
          style={{ marginLeft: 4 }}
          title="Upload .xlsx"
        >
          Upload
        </button>
      )}

      {open && (
        <div className="tagging-popover">
          <div className="tagging-popover-head">
            <span className="tagging-popover-title">{sheetName ?? 'Tagging'}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={openPicker} disabled={busy}>
                Re-upload
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
          </div>

          <div className="tagging-tabs">
            <button
              type="button"
              className={`btn btn-sm ${tab === 'mappings' ? 'btn-secondary' : 'btn-ghost'}`}
              onClick={() => setTab('mappings')}
            >
              Mappings
            </button>
            <button
              type="button"
              className={`btn btn-sm ${tab === 'checklist' ? 'btn-secondary' : 'btn-ghost'}`}
              onClick={() => setTab('checklist')}
            >
              Checklist{appliedItems.length ? ` (${appliedItems.length})` : ''}
            </button>
          </div>

          {tab === 'mappings' && (
            <>
              {(skippedCount > 0 || unmatchedCount > 0) && (
                <p className="tagging-notice">
                  {skippedCount > 0 && (
                    <span>
                      {skippedCount} skipped (Mirror/Unsubscribe/empty — not applied).{' '}
                    </span>
                  )}
                  {unmatchedCount > 0 && (
                    <span>{unmatchedCount} unmatched — rematch or leave unapplied.</span>
                  )}
                </p>
              )}

              <div className="tagging-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => template && runMatch(rows.map((r) => ({ ...r, targetId: undefined, status: r.status === 'skipped' ? 'skipped' : 'proposed' })))}
                  disabled={busy || rows.length === 0}
                >
                  Rematch all
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={confirmAllProposed}
                  disabled={busy || !rows.some((r) => r.status === 'proposed' && r.targetId)}
                >
                  Confirm proposed
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => void applyConfirmed()}
                  disabled={busy}
                >
                  Apply & save
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={clearAll}>
                  Clear
                </button>
              </div>

              <table className="tagging-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>URL Label</th>
                    <th>Status</th>
                    <th>Target</th>
                    <th>FINAL URL / reason</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.rowIndex}>
                      <td className="tagging-muted">{row.rowIndex}</td>
                      <td className="tagging-label">{row.urlLabel || '—'}</td>
                      <td>
                        <span className={`tagging-status tagging-status-${row.status}`}>
                          {row.status}
                        </span>
                      </td>
                      <td>
                        {row.status === 'skipped' ? (
                          <span className="tagging-muted">—</span>
                        ) : (
                          <select
                            className="tagging-select"
                            value={row.targetId ?? ''}
                            onChange={(e) => rematchRow(row.rowIndex, e.target.value)}
                          >
                            <option value="">— unmatched —</option>
                            {targets.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.displayName}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td
                        className="tagging-url"
                        title={row.status === 'skipped' ? row.skipReason : row.finalUrl}
                      >
                        {row.status === 'skipped' ? row.skipReason : row.finalUrl}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {unmatchedTargetIds.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <strong>Unmatched targets ({unmatchedTargetIds.length})</strong>
                  <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                    {unmatchedTargetIds.slice(0, 12).map((id) => (
                      <li key={id}>{targetById.get(id)?.displayName ?? id}</li>
                    ))}
                    {unmatchedTargetIds.length > 12 && (
                      <li>…and {unmatchedTargetIds.length - 12} more</li>
                    )}
                  </ul>
                </div>
              )}
            </>
          )}

          {tab === 'checklist' && (
            <>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
                <span>Preview context:</span>
                <button
                  type="button"
                  className={`btn btn-sm ${viewMode === 'desktop' ? 'btn-secondary' : 'btn-ghost'}`}
                  onClick={() => setViewMode('desktop')}
                >
                  Desktop
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${viewMode === 'mobile' ? 'btn-secondary' : 'btn-ghost'}`}
                  onClick={() => setViewMode('mobile')}
                >
                  Mobile
                </button>
                {appliedItems.length > 0 && (
                  <span
                    className={checklistIncomplete ? 'tagging-warn' : 'tagging-ok'}
                    style={{ marginLeft: 'auto' }}
                  >
                    {checklistIncomplete ? 'Checklist incomplete' : 'Checklist complete'}
                  </span>
                )}
              </div>

              {appliedItems.length === 0 ? (
                <p className="tagging-muted" style={{ margin: 0 }}>
                  Apply mappings first to populate the click checklist.
                </p>
              ) : (
                <table className="tagging-table">
                  <thead>
                    <tr>
                      <th>Target</th>
                      <th>FINAL URL</th>
                      <th>Desktop</th>
                      <th>Mobile</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appliedItems.map((item) => {
                      const marks = checklist[item.targetId] ?? { desktop: null, mobile: null };
                      return (
                        <tr key={item.targetId}>
                          <td>
                            <div>{item.displayName}</div>
                            <div className="tagging-label tagging-muted">{item.urlLabel}</div>
                          </td>
                          <td className="tagging-url" title={item.finalUrl}>
                            <a href={item.finalUrl} target="_blank" rel="noreferrer">
                              {item.finalUrl}
                            </a>
                          </td>
                          <td>
                            <MarkButtons
                              value={marks.desktop}
                              onChange={(m) => setMark(item.targetId, 'desktop', m)}
                            />
                          </td>
                          <td>
                            <MarkButtons
                              value={marks.mobile}
                              onChange={(m) => setMark(item.targetId, 'mobile', m)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              <p className="tagging-muted" style={{ margin: '10px 0 0' }}>
                Checklist is session verification only — hrefs stay on block props.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MarkButtons({
  value,
  onChange,
}: {
  value: ChecklistMark;
  onChange: (m: ChecklistMark) => void;
}) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      <button
        type="button"
        className={`btn btn-sm ${value === 'pass' ? 'btn-secondary' : 'btn-ghost'}`}
        onClick={() => onChange(value === 'pass' ? null : 'pass')}
      >
        Pass
      </button>
      <button
        type="button"
        className={`btn btn-sm ${value === 'fail' ? 'btn-secondary' : 'btn-ghost'}`}
        onClick={() => onChange(value === 'fail' ? null : 'fail')}
      >
        Fail
      </button>
    </span>
  );
}
