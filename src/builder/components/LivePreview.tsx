'use client';

import { useCallback, useEffect } from 'react';
import { useBuilderStore } from '@/builder/store/builderStore';
import { useTemplatePreview } from '@/builder/hooks/useTemplatePreview';
import { usePreviewScrollRestore } from '@/builder/hooks/usePreviewScrollRestore';
import { usePreviewSelectionBridge } from '@/builder/hooks/usePreviewSelectionBridge';

const FIGMA_BLOCK_ID = 'figma-react-email';

export function LivePreview() {
  const template = useBuilderStore((s) => s.template);
  const viewMode = useBuilderStore((s) => s.viewMode);
  const setViewMode = useBuilderStore((s) => s.setViewMode);
  const selectedBlockId = useBuilderStore((s) => s.selectedBlockId);

  const { html, loading, isPending, isStale, error, retry } = useTemplatePreview(
    template,
    400,
    true
  );

  const { outerRef, iframeRef, onOuterScroll, handleIframeLoad } = usePreviewScrollRestore();
  const { pushHighlight } = usePreviewSelectionBridge(iframeRef);

  const onIframeLoad = useCallback(() => {
    handleIframeLoad(pushHighlight);
  }, [handleIframeLoad, pushHighlight]);

  const frameWidth = viewMode === 'desktop' ? '100%' : '375px';
  const maxWidth = viewMode === 'desktop' ? '700px' : '375px';

  const selectedBlock = template?.blocks.find((b) => b.id === selectedBlockId);
  const isFigmaBlock = selectedBlock?.componentId === FIGMA_BLOCK_ID;
  const hasBlocks = (template?.blocks.length ?? 0) > 0;
  const showInitialLoad = (loading || isPending) && !html;

  return (
    <div className="builder-preview-section">
      <div className="builder-preview-toolbar">
        <span className="builder-preview-label">
          Preview
          {isStale ? <span className="builder-preview-stale-label">Updating…</span> : null}
          {hasBlocks && !isStale ? (
            <span className="builder-preview-hint">
              {isFigmaBlock
                ? 'Click an element to customize'
                : 'Click any component to edit it'}
            </span>
          ) : null}
        </span>
        <div className="builder-preview-viewport" role="group" aria-label="Preview width">
          <button
            type="button"
            className={`btn btn-secondary btn-sm btn-toggle${viewMode === 'desktop' ? ' active' : ''}`}
            onClick={() => setViewMode('desktop')}
            aria-pressed={viewMode === 'desktop'}
          >
            Desktop
          </button>
          <button
            type="button"
            className={`btn btn-secondary btn-sm btn-toggle${viewMode === 'mobile' ? ' active' : ''}`}
            onClick={() => setViewMode('mobile')}
            aria-pressed={viewMode === 'mobile'}
          >
            Mobile
          </button>
        </div>
      </div>

      <div
        ref={outerRef}
        className="builder-preview-frame-wrap"
        onScroll={onOuterScroll}
      >
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
                    onLoad={onIframeLoad}
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
