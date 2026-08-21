'use client';

import { useCallback, useEffect, type RefObject } from 'react';
import { useBuilderStore } from '@/builder/store/builderStore';

/**
 * Syncs preview iframe selection highlights with builder store selection.
 * Listens for click-to-select messages from the editable preview bridge.
 */
export function usePreviewSelectionBridge(iframeRef: RefObject<HTMLIFrameElement | null>) {
  const selectNode = useBuilderStore((s) => s.selectNode);
  const selectedBlockId = useBuilderStore((s) => s.selectedBlockId);
  const selectedNodePath = useBuilderStore((s) => s.selectedNodePath);

  const pushHighlight = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      {
        source: 'figma-customizer-parent',
        type: 'highlight',
        blockId: selectedBlockId,
        nodePath: selectedNodePath,
      },
      '*'
    );
  }, [iframeRef, selectedBlockId, selectedNodePath]);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const data = e.data as
        | { source?: string; type?: string; blockId?: string; nodePath?: string }
        | undefined;
      if (!data || data.source !== 'figma-customizer') return;

      if (data.type === 'select' && data.blockId) {
        selectNode(data.blockId, data.nodePath ?? null);
      } else if (data.type === 'ready') {
        pushHighlight();
      }
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [selectNode, pushHighlight]);

  useEffect(() => {
    pushHighlight();
  }, [pushHighlight]);

  return { pushHighlight };
}
