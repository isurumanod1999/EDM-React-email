'use client';

import { useCallback } from 'react';
import { useBuilderStore } from '@/builder/store/builderStore';
import { useTemplatePreview } from '@/builder/hooks/useTemplatePreview';
import { usePreviewScrollRestore } from '@/builder/hooks/usePreviewScrollRestore';
import { usePreviewSelectionBridge } from '@/builder/hooks/usePreviewSelectionBridge';

/**
 * Read-only live preview for the code view's left pane.
 *
 * Valid code edits land on the store via `replaceBlocks`, so this re-renders
 * from the same template the canvas uses — no separate render path.
 */
export function CodePreviewPane() {
  const template = useBuilderStore((s) => s.template);
  const viewMode = useBuilderStore((s) => s.viewMode);
  const setViewMode = useBuilderStore((s) => s.setViewMode);
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

  const hasBlocks = (template?.blocks.length ?? 0) > 0;
  const showInitialLoad = (loading || isPending) && !html;

  return (
    <section className="code-modal-pane code-modal-pane--preview">
      <div className="code-modal-pane-head">
        <span className="code-modal-pane-title">
          Preview
          {isStale && <span className="code-modal-pane-stale"> · updating…</span>}
        </span>
        <div className="code-modal-device">
          <button
            type="button"
            className={`btn btn-secondary btn-sm btn-toggle${viewMode === 'desktop' ? ' active' : ''}`}
            onClick={() => setViewMode('desktop')}
          >
            Desktop
          </button>
          <button
            type="button"
            className={`btn btn-secondary btn-sm btn-toggle${viewMode === 'mobile' ? ' active' : ''}`}
            onClick={() => setViewMode('mobile')}
          >
            Mobile
          </button>
        </div>
      </div>

      <div ref={outerRef} className="code-modal-preview-stage" onScroll={onOuterScroll}>
        {error ? (
          <div className="code-modal-preview-error" role="alert">
            <span>{error}</span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={retry}>
              Retry
            </button>
          </div>
        ) : null}

        {!hasBlocks ? (
          <div className="code-modal-preview-empty">Add components to see a preview</div>
        ) : (
          <div
            className={`code-modal-preview-frame${isStale ? ' is-stale' : ''}`}
            style={{ maxWidth: viewMode === 'desktop' ? 700 : 375 }}
          >
            {showInitialLoad ? (
              <div className="code-modal-preview-empty" aria-busy="true">
                Rendering preview…
              </div>
            ) : html ? (
              <iframe
                ref={iframeRef}
                srcDoc={html}
                title="Template preview"
                onLoad={onIframeLoad}
              />
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
