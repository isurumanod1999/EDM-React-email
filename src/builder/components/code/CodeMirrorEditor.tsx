'use client';

import { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { EditorView } from '@codemirror/view';

interface CodeMirrorEditorProps {
  value: string;
  onChange: (value: string) => void;
  /** Editor font size in px. */
  fontSize: number;
  wrap: boolean;
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
}: CodeMirrorEditorProps) {
  const extensions = useMemo(() => {
    const list = [
      javascript({ jsx: true }),
      EditorView.theme({
        '&': { fontSize: `${fontSize}px` },
        '.cm-scroller': {
          fontFamily:
            "'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          lineHeight: '1.6',
        },
        '.cm-gutters': { borderRight: '1px solid rgba(255,255,255,0.08)' },
      }),
    ];
    if (wrap) list.push(EditorView.lineWrapping);
    return list;
  }, [fontSize, wrap]);

  return (
    <CodeMirror
      value={value}
      height="100%"
      theme="dark"
      extensions={extensions}
      onChange={onChange}
      basicSetup={{
        lineNumbers: true,
        foldGutter: true,
        highlightActiveLine: true,
        highlightActiveLineGutter: true,
        bracketMatching: true,
        closeBrackets: true,
        autocompletion: false,
        indentOnInput: true,
        highlightSelectionMatches: true,
        searchKeymap: true,
      }}
      className="code-editor-cm"
    />
  );
}
