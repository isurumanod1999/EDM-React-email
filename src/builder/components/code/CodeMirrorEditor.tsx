'use client';

import { useEffect, useMemo, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { StateEffect, StateField } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView } from '@codemirror/view';
import type { CodeSelectionIndex, CodeSpan } from '@/lib/codeview/selectionIndex';
import { selectionAtOffset } from '@/lib/codeview/selectionIndex';

const setHighlight = StateEffect.define<CodeSpan | null>();

function lineHighlightDeco(doc: EditorView['state']['doc'], span: CodeSpan): DecorationSet {
  const fromLine = doc.lineAt(span.from).number;
  const toLine = doc.lineAt(Math.min(span.to, doc.length)).number;
  const marks = [];
  for (let lineNo = fromLine; lineNo <= toLine; lineNo++) {
    marks.push(
      Decoration.line({ class: 'cm-code-selection-highlight' }).range(doc.line(lineNo).from)
    );
  }
  return Decoration.set(marks, true);
}

const highlightField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const effect of tr.effects) {
      if (effect.is(setHighlight)) {
        if (!effect.value) return Decoration.none;
        return lineHighlightDeco(tr.state.doc, effect.value);
      }
    }
    return deco;
  },
  provide: (field) => EditorView.decorations.from(field),
});

interface CodeMirrorEditorProps {
  value: string;
  onChange: (value: string) => void;
  fontSize: number;
  wrap: boolean;
  highlightSpan?: CodeSpan | null;
  selectionIndex?: CodeSelectionIndex | null;
  onSelect?: (blockId: string, nodePath: string | null) => void;
}

/**
 * Real CodeMirror host. Loaded only through the dynamic wrapper so no
 * CodeMirror or language code lands in the main builder bundle (NFR3).
 */
export default function CodeMirrorEditor({
  value,
  onChange,
  fontSize,
  wrap,
  highlightSpan = null,
  selectionIndex = null,
  onSelect,
}: CodeMirrorEditorProps) {
  const viewRef = useRef<EditorView | null>(null);

  const clickSelectExtension = useMemo(() => {
    if (!selectionIndex || !onSelect) return [];
    return [
      EditorView.domEventHandlers({
        mousedown(event, view) {
          if (!event.altKey) return false;
          const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
          if (pos == null) return false;
          const hit = selectionAtOffset(selectionIndex, pos);
          if (!hit) return false;
          onSelect(hit.blockId, hit.nodePath);
          return true;
        },
      }),
    ];
  }, [selectionIndex, onSelect]);

  const extensions = useMemo(() => {
    const list = [
      javascript({ jsx: true }),
      highlightField,
      EditorView.theme({
        '&': { fontSize: `${fontSize}px` },
        '.cm-scroller': {
          fontFamily:
            "'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          lineHeight: '1.6',
        },
        '.cm-gutters': { borderRight: '1px solid rgba(255,255,255,0.08)' },
        '.cm-content': { caretColor: 'inherit' },
        '.cm-line.cm-code-selection-highlight': {
          backgroundColor: 'rgba(79, 70, 229, 0.12)',
        },
        '.cm-gutterElement.cm-code-selection-highlight': {
          backgroundColor: 'rgba(79, 70, 229, 0.18)',
          color: 'rgba(199, 210, 254, 0.95)',
        },
      }),
      ...clickSelectExtension,
    ];
    if (wrap) list.push(EditorView.lineWrapping);
    return list;
  }, [fontSize, wrap, clickSelectExtension]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const effects: StateEffect<unknown>[] = [setHighlight.of(highlightSpan)];
    if (highlightSpan && !view.hasFocus) {
      effects.push(EditorView.scrollIntoView(highlightSpan.from, { y: 'center' }));
    }

    view.dispatch({
      effects,
      selection: view.state.selection,
    });
  }, [highlightSpan]);

  return (
    <CodeMirror
      value={value}
      height="100%"
      theme="dark"
      extensions={extensions}
      onChange={onChange}
      onCreateEditor={(view) => {
        viewRef.current = view;
      }}
      basicSetup={{
        lineNumbers: true,
        foldGutter: true,
        highlightActiveLine: true,
        highlightActiveLineGutter: true,
        bracketMatching: true,
        closeBrackets: true,
        autocompletion: false,
        indentOnInput: true,
        highlightSelectionMatches: false,
        searchKeymap: true,
      }}
      className="code-editor-cm"
    />
  );
}
