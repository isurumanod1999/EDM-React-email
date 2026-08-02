'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useBuilderStore } from '@/builder/store/builderStore';
import { useTemplatePreview } from '@/builder/hooks/useTemplatePreview';

const FIGMA_BLOCK_ID = 'figma-react-email';

export function LivePreview() {
  const template = useBuilderStore((s) => s.template);
  const viewMode = useBuilderStore((s) => s.viewMode);
  const setViewMode = useBuilderStore((s) => s.setViewMode);
  const selectNode = useBuilderStore((s) => s.selectNode);
  const selectedBlockId = useBuilderStore((s) => s.selectedBlockId);
  const selectedNodePath = useBuilderStore((s) => s.selectedNodePath);

  const { html, loading, isPending, isStale, error, retry } = useTemplatePreview(
    template,
    400,
    true
  );

  const iframeRef = useRef<HTMLIFrameElement | null>(null);

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
  }, [selectedBlockId, selectedNodePath]);

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
  }, [pushHighlight, html]);

  const frameWidth = viewMode === 'desktop' ? '100%' : '375px';
  const maxWidth = viewMode === 'desktop' ? '700px' : '375px';

  const selectedBlock = template?.blocks.find((b) => b.id === selectedBlockId);
  const isFigmaBlock = selectedBlock?.componentId === FIGMA_BLOCK_ID;
  const hasBlocks = (template?.blocks.length ?? 0) > 0;
  const showInitialLoad = (loading || isPending) && !html;

  return (
    <div className="builder-preview-section">
      <div className="builder-preview-toolbar">
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Live Preview
          {isStale && (
            <span className="builder-preview-stale-label">· Updating…</span>
          )}
          {hasBlocks && !isStale && (
            <span style={{ marginLeft: 8, color: 'var(--accent)', fontWeight: 500 }}>
              {isFigmaBlock
                ? '· Click an element to customize'
                : '· Click any component to edit it'}
            </span>
          )}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            className={`btn btn-secondary btn-sm btn-toggle ${viewMode === 'desktop' ? 'active' : ''}`}
            onClick={() => setViewMode('desktop')}
          >
            Desktop
          </button>
          <button
            type="button"
            className={`btn btn-secondary btn-sm btn-toggle ${viewMode === 'mobile' ? 'active' : ''}`}
            onClick={() => setViewMode('mobile')}
          >
            Mobile
          </button>
        </div>
      </div>

      <div className="builder-preview-frame-wrap">
        {!hasBlocks ? (
          <div className="canvas-empty" style={{ maxWidth: 400 }}>
            Add components to see a live preview
          </div>
        ) : (
          <div className="builder-preview-stage">
            {error ? (
              <div className="builder-preview-error-banner" role="alert">
                <span>{error}</span>
                <button type="button" className="btn btn-secondary btn-sm" onClick={retry}>
                  Retry render
                </button>
              </div>
            ) : null}

            <div
              className={`builder-preview-frame${isStale ? ' is-stale' : ''}`}
              style={{ width: frameWidth, maxWidth }}
            >
              {showInitialLoad ? (
                <div className="builder-preview-placeholder" aria-busy="true">
                  <span className="builder-preview-spinner" aria-hidden="true" />
                  <span>Rendering preview…</span>
                </div>
              ) : html ? (
                <>
                  <iframe
                    ref={iframeRef}
                    srcDoc={html}
                    title="Email Preview"
                    onLoad={pushHighlight}
                  />
                  {isStale ? (
                    <div className="builder-preview-loading-overlay" aria-busy="true">
                      <span className="builder-preview-spinner" aria-hidden="true" />
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
