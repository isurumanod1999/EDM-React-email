'use client';

import { useEffect, useRef } from 'react';
import {
  sanitizeRichHtml,
  htmlToPlainText,
  escapeHtml,
} from '@/builder/lib/sanitizeHtml';

interface RichTextEditorProps {
  /** Current stored HTML (empty when the node is still plain text). */
  value: string;
  /** Plain-text fallback used to seed the editor when there's no HTML yet. */
  plainFallback: string;
  /** Emits sanitized HTML + its plain-text projection on every edit. */
  onChange: (html: string, plain: string) => void;
  /** Show block controls (lists). Off for inline-only contexts like links. */
  allowBlocks?: boolean;
  placeholder?: string;
}

const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48];

export function RichTextEditor({
  value,
  plainFallback,
  onChange,
  allowBlocks = true,
  placeholder,
}: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Seed the editable DOM once. The component is remounted per node (keyed by
  // node path at the call site), so this runs with the right initial content
  // and never fights the caret mid-typing.
  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = value && value.trim() ? value : escapeHtml(plainFallback ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = () => {
    if (!ref.current) return;
    const html = sanitizeRichHtml(ref.current.innerHTML);
    onChange(html, htmlToPlainText(html));
  };

  const exec = (command: string, arg?: string) => {
    ref.current?.focus();
    // execCommand is deprecated but remains the only cross-browser way to do
    // selection-based rich editing without a heavy editor dependency.
    document.execCommand(command, false, arg);
    emit();
  };

  const wrapSelection = (apply: (span: HTMLSpanElement) => void) => {
    ref.current?.focus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    const span = document.createElement('span');
    apply(span);
    try {
      range.surroundContents(span);
    } catch {
      // Selection crosses element boundaries — extract then re-insert.
      const frag = range.extractContents();
      span.appendChild(frag);
      range.insertNode(span);
    }
    sel.removeAllRanges();
    emit();
  };

  const setFontSize = (px: string) => {
    if (!px) return;
    wrapSelection((span) => {
      span.style.fontSize = `${px}px`;
    });
  };

  const setColor = (color: string) => {
    wrapSelection((span) => {
      span.style.color = color;
    });
  };

  const setLink = () => {
    const url = window.prompt('Link URL (leave blank to remove):', 'https://');
    if (url == null) return;
    if (url.trim() === '') {
      exec('unlink');
      return;
    }
    exec('createLink', url.trim());
  };

  const clearFormatting = () => {
    ref.current?.focus();
    document.execCommand('removeFormat');
    document.execCommand('unlink');
    emit();
  };

  const onPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    const clean = html ? sanitizeRichHtml(html) : escapeHtml(text);
    document.execCommand('insertHTML', false, clean);
    emit();
  };

  // Keep the editor selection alive when a toolbar control is clicked.
  const hold = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div className="fc-rte">
      <div className="fc-rte-toolbar" role="toolbar" aria-label="Text formatting">
        <button type="button" className="fc-rte-btn" onMouseDown={hold} onClick={() => exec('bold')} title="Bold" aria-label="Bold">
          <b>B</b>
        </button>
        <button type="button" className="fc-rte-btn" onMouseDown={hold} onClick={() => exec('italic')} title="Italic" aria-label="Italic">
          <i>I</i>
        </button>
        <button type="button" className="fc-rte-btn" onMouseDown={hold} onClick={() => exec('underline')} title="Underline" aria-label="Underline">
          <u>U</u>
        </button>
        <button type="button" className="fc-rte-btn" onMouseDown={hold} onClick={() => exec('strikeThrough')} title="Strikethrough" aria-label="Strikethrough">
          <s>S</s>
        </button>

        <span className="fc-rte-sep" />

        {allowBlocks && (
          <>
            <button type="button" className="fc-rte-btn" onMouseDown={hold} onClick={() => exec('insertUnorderedList')} title="Bullet list" aria-label="Bullet list">
              •≡
            </button>
            <button type="button" className="fc-rte-btn" onMouseDown={hold} onClick={() => exec('insertOrderedList')} title="Numbered list" aria-label="Numbered list">
              1≡
            </button>
            <span className="fc-rte-sep" />
          </>
        )}

        <button type="button" className="fc-rte-btn" onMouseDown={hold} onClick={setLink} title="Insert link" aria-label="Insert link">
          🔗
        </button>

        <select
          className="fc-rte-select"
          defaultValue=""
          onMouseDown={hold}
          onChange={(e) => {
            setFontSize(e.target.value);
            e.target.value = '';
          }}
          title="Font size"
          aria-label="Font size"
        >
          <option value="" disabled>
            A±
          </option>
          {FONT_SIZES.map((s) => (
            <option key={s} value={s}>
              {s}px
            </option>
          ))}
        </select>

        <label className="fc-rte-color" title="Text color" onMouseDown={hold}>
          <span>A</span>
          <input type="color" onChange={(e) => setColor(e.target.value)} aria-label="Text color" />
        </label>

        <span className="fc-rte-sep" />

        <button type="button" className="fc-rte-btn" onMouseDown={hold} onClick={clearFormatting} title="Clear formatting" aria-label="Clear formatting">
          ⌫
        </button>
      </div>

      <div
        ref={ref}
        className="fc-rte-content"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={emit}
        onBlur={emit}
        onPaste={onPaste}
      />
    </div>
  );
}
