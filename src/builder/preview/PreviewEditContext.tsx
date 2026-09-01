import * as React from 'react';
import { fieldPath } from '@/lib/preview/selectionIdentity';

/**
 * Module-level (not React context) because palette email components are
 * imported by `/api/registry` on the RSC runtime, where `createContext` is
 * not available. `render()` walks the tree synchronously, so a bind-on-render
 * scope is enough for preview annotation.
 */
let activeBlockId: string | null = null;

export function PreviewEditScope({
  blockId,
  children,
}: {
  blockId: string;
  children: React.ReactNode;
}) {
  return <BindPreviewBlock blockId={blockId}>{children}</BindPreviewBlock>;
}

function BindPreviewBlock({
  blockId,
  children,
}: {
  blockId: string;
  children: React.ReactNode;
}) {
  activeBlockId = blockId;
  return (
    <>
      {children}
      <ClearPreviewEdit />
    </>
  );
}

function ClearPreviewEdit() {
  activeBlockId = null;
  return null;
}

/** Editor-only data attrs for a registry field. Empty outside editable preview. */
export function useSelectable(fieldKey: string): Record<string, string> {
  if (!activeBlockId) return {};
  return {
    'data-block-id': activeBlockId,
    'data-node-path': fieldPath(fieldKey),
  };
}
