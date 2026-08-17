'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useBuilderStore } from '@/builder/store/builderStore';
import { printBlocks, parseBlocks, CodeViewParseError } from '@/lib/codeview';
import { CodeEditor } from '@/builder/components/code/CodeEditor';
import { CodePreviewPane } from '@/builder/components/code/CodePreviewPane';
import { pushToast } from '@/builder/store/toastStore';

const DEBOUNCE_MS = 450;
const MIN_FONT = 11;
const MAX_FONT = 20;
const MIN_SPLIT = 22;
const MAX_SPLIT = 75;
const FONT_KEY = 'edm.codeview.fontSize';
const WRAP_KEY = 'edm.codeview.wrap';
const SPLIT_KEY = 'edm.codeview.split';
const LAYOUT_KEY = 'edm.codeview.layout';

type Layout = 'split' | 'code';

/**
 * Full-screen React Email JSX view of the whole template.
 * Valid edits debounce-apply to the canvas; invalid edits keep the last good state.
 */
export function CodePanel() {
  const template = useBuilderStore((s) => s.template);
  const replaceBlocks = useBuilderStore((s) => s.replaceBlocks);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [source, setSource] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [codeDirty, setCodeDirty] = useState(false);
  const [fontSize, setFontSize] = useState(13);
  const [wrap, setWrap] = useState(false);
  const [layout, setLayout] = useState<Layout>('split');
  const [splitPct, setSplitPct] = useState(42);
  const [dragging, setDragging] = useState(false);
  const lastAppliedRef = useRef('');
  const blocksSigRef = useRef('');
  const bodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
    const savedFont = Number(window.localStorage.getItem(FONT_KEY));
    if (savedFont >= MIN_FONT && savedFont <= MAX_FONT) setFontSize(savedFont);
    setWrap(window.localStorage.getItem(WRAP_KEY) === '1');
    const savedSplit = Number(window.localStorage.getItem(SPLIT_KEY));
    if (savedSplit >= MIN_SPLIT && savedSplit <= MAX_SPLIT) setSplitPct(savedSplit);
    if (window.localStorage.getItem(LAYOUT_KEY) === 'code') setLayout('code');
  }, []);

  const blocksSignature = useMemo(
    () => (template ? JSON.stringify(template.blocks) : ''),
    [template]
  );

  // Sync printed code when the canvas changes and the editor is clean.
  useEffect(() => {
    if (!open || !template) return;
    if (codeDirty) return;
    if (blocksSigRef.current === blocksSignature) return;
    blocksSigRef.current = blocksSignature;
    const printed = printBlocks(template.blocks);
    setSource(printed);
    lastAppliedRef.current = printed;
    setError(null);
  }, [open, template, blocksSignature, codeDirty]);

  // Debounced parse → apply
  useEffect(() => {
    if (!open || !template) return;
    if (source === lastAppliedRef.current) {
      setError(null);
      setCodeDirty(false);
      return;
    }

    const handle = window.setTimeout(() => {
      try {
        const blocks = parseBlocks(source);
        replaceBlocks(blocks);
        lastAppliedRef.current = source;
        blocksSigRef.current = JSON.stringify(blocks);
        setError(null);
        setCodeDirty(false);
      } catch (e) {
        setCodeDirty(true);
        if (e instanceof CodeViewParseError) {
          setError(`Line ${e.line}:${e.column} — ${e.message}`);
        } else {
          setError(e instanceof Error ? e.message : 'Parse failed');
        }
      }
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(handle);
  }, [source, open, template, replaceBlocks]);

  const resetFromCanvas = useCallback(() => {
    if (!template) return;
    const printed = printBlocks(template.blocks);
    setSource(printed);
    lastAppliedRef.current = printed;
    blocksSigRef.current = JSON.stringify(template.blocks);
    setError(null);
    setCodeDirty(false);
  }, [template]);

  const openPanel = () => {
    if (!template) {
      pushToast('Open a template first', 'error');
      return;
    }
    resetFromCanvas();
    setOpen(true);
  };

  // Reformat what is typed: parse, then re-print canonically.
  const reformat = () => {
    try {
      const printed = printBlocks(parseBlocks(source));
      setSource(printed);
      setError(null);
    } catch (e) {
      if (e instanceof CodeViewParseError) {
        setError(`Line ${e.line}:${e.column} — ${e.message}`);
      } else {
        setError(e instanceof Error ? e.message : 'Parse failed');
      }
    }
  };

  const changeFont = (next: number) => {
    const clamped = Math.min(MAX_FONT, Math.max(MIN_FONT, next));
    setFontSize(clamped);
    window.localStorage.setItem(FONT_KEY, String(clamped));
  };

  const toggleWrap = () => {
    setWrap((prev) => {
      window.localStorage.setItem(WRAP_KEY, prev ? '0' : '1');
      return !prev;
    });
  };

  const changeLayout = (next: Layout) => {
    setLayout(next);
    window.localStorage.setItem(LAYOUT_KEY, next);
  };

  const applySplit = useCallback((pct: number) => {
    const clamped = Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, pct));
    setSplitPct(clamped);
    window.localStorage.setItem(SPLIT_KEY, String(Math.round(clamped)));
  }, []);

  const onDividerMove = useCallback(
    (clientX: number) => {
      const rect = bodyRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) return;
      applySplit(((clientX - rect.left) / rect.width) * 100);
    },
    [applySplit]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.body.classList.add('code-modal-lock');
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('code-modal-lock');
    };
  }, [open]);

  const lineCount = source ? source.split('\n').length : 0;
  const status = error ? 'error' : codeDirty ? 'editing' : 'synced';
  const statusLabel =
    status === 'error' ? 'Not applied' : status === 'editing' ? 'Editing…' : 'Applied to canvas';

  const modal = (
    <div
      className="code-modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="code-modal" role="dialog" aria-modal="true" aria-label="React code editor">
        <header className="code-modal-head">
          <div className="code-modal-titles">
            <h2 className="code-modal-title">Template code</h2>
            <span className="code-modal-sub">
              {template?.blocks.length ?? 0} blocks · {lineCount} lines
            </span>
            <span className={`code-modal-status code-modal-status--${status}`}>{statusLabel}</span>
          </div>

          <div className="code-modal-tools">
            <div className="code-modal-zoom" role="group" aria-label="Editor font size">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => changeFont(fontSize - 1)}
                disabled={fontSize <= MIN_FONT}
                title="Smaller text"
              >
                A−
              </button>
              <span className="code-modal-zoom-value">{fontSize}px</span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => changeFont(fontSize + 1)}
                disabled={fontSize >= MAX_FONT}
                title="Larger text"
              >
                A+
              </button>
            </div>
            <button
              type="button"
              className={`btn btn-ghost btn-sm${wrap ? ' is-active' : ''}`}
              onClick={toggleWrap}
              title="Wrap long lines"
            >
              Wrap
            </button>
            <div className="code-modal-layout-switch" role="group" aria-label="Layout">
              <button
                type="button"
                className={`btn btn-ghost btn-sm${layout === 'split' ? ' is-active' : ''}`}
                onClick={() => changeLayout('split')}
                title="Preview on the left, code on the right"
              >
                Split
              </button>
              <button
                type="button"
                className={`btn btn-ghost btn-sm${layout === 'code' ? ' is-active' : ''}`}
                onClick={() => changeLayout('code')}
                title="Use the whole screen for code"
              >
                Code only
              </button>
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={reformat}>
              Format
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={resetFromCanvas}
              disabled={!codeDirty}
              title="Discard code edits and reprint from the canvas"
            >
              Reset
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(false)}>
              Done
            </button>
          </div>
        </header>

        <div
          ref={bodyRef}
          className={`code-modal-body${dragging ? ' is-dragging' : ''}`}
          style={
            layout === 'split'
              ? { gridTemplateColumns: `${splitPct}% 8px minmax(0, 1fr)` }
              : undefined
          }
        >
          {layout === 'split' && (
            <>
              <CodePreviewPane />
              <div
                className="code-modal-divider"
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize preview and code panes"
                aria-valuenow={Math.round(splitPct)}
                aria-valuemin={MIN_SPLIT}
                aria-valuemax={MAX_SPLIT}
                tabIndex={0}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setDragging(true);
                }}
                onPointerMove={(e) => {
                  if (dragging) onDividerMove(e.clientX);
                }}
                onPointerUp={(e) => {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                  setDragging(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowLeft') applySplit(splitPct - 2);
                  else if (e.key === 'ArrowRight') applySplit(splitPct + 2);
                }}
              />
            </>
          )}

          <section className="code-modal-pane code-modal-pane--code">
            <p className="code-modal-hint">
              Structured React Email JSX (11 node types). Valid edits apply to the canvas and preview
              automatically — move nodes between <code>&lt;Column&gt;</code>s, reorder{' '}
              <code>&lt;Block&gt;</code>s, or retype copy and styles. Invalid edits keep the last
              good state. <kbd>Esc</kbd> closes.
            </p>

            {error && (
              <div className="code-modal-error" role="alert">
                {error}
              </div>
            )}

            <div className="code-modal-editor">
              <CodeEditor
                value={source}
                onChange={(v) => {
                  setSource(v);
                  setCodeDirty(v !== lastAppliedRef.current);
                }}
                fontSize={fontSize}
                wrap={wrap}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );

  return (
    <div className="code-panel">
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={() => (open ? setOpen(false) : openPanel())}
        disabled={!template}
        title="View and edit the React Email JSX for this template"
      >
        Code
      </button>
      {open && mounted ? createPortal(modal, document.body) : null}
    </div>
  );
}
