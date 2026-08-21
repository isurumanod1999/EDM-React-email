'use client';

import dynamic from 'next/dynamic';
import type { CodeSelectionIndex, CodeSpan } from '@/lib/codeview/selectionIndex';

const CodeMirrorEditor = dynamic(() => import('@/builder/components/code/CodeMirrorEditor'), {
  ssr: false,
  loading: () => <div className="code-editor-loading">Loading editor…</div>,
});

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  fontSize?: number;
  wrap?: boolean;
  highlightSpan?: CodeSpan | null;
  selectionIndex?: CodeSelectionIndex | null;
  onSelect?: (blockId: string, nodePath: string | null) => void;
}

/** Lazy CodeMirror boundary — never SSR (NFR2/NFR3). */
export function CodeEditor({
  value,
  onChange,
  fontSize = 13,
  wrap = false,
  highlightSpan = null,
  selectionIndex = null,
  onSelect,
}: CodeEditorProps) {
  return (
    <CodeMirrorEditor
      value={value}
      onChange={onChange}
      fontSize={fontSize}
      wrap={wrap}
      highlightSpan={highlightSpan}
      selectionIndex={selectionIndex}
      onSelect={onSelect}
    />
  );
}
