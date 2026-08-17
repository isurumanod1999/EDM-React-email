'use client';

import dynamic from 'next/dynamic';

const CodeMirrorEditor = dynamic(() => import('@/builder/components/code/CodeMirrorEditor'), {
  ssr: false,
  loading: () => <div className="code-editor-loading">Loading editor…</div>,
});

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  fontSize?: number;
  wrap?: boolean;
}

/** Lazy CodeMirror boundary — never SSR (NFR2/NFR3). */
export function CodeEditor({ value, onChange, fontSize = 13, wrap = false }: CodeEditorProps) {
  return (
    <CodeMirrorEditor value={value} onChange={onChange} fontSize={fontSize} wrap={wrap} />
  );
}
