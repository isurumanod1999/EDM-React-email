'use client';

import { useCallback, useRef, useState } from 'react';
import { FigmaConnectForm } from '@/builder/components/figma/FigmaConnectForm';
import { FigmaReviewPanel } from '@/builder/components/figma/FigmaReviewPanel';
import { ImportProgressBanner } from '@/builder/components/ImportProgressBanner';
import { useModalA11y } from '@/builder/hooks/useModalA11y';
import { useBuilderStore } from '@/builder/store/builderStore';
import { toFigmaSession, type FigmaImportApiResult } from '@/builder/types/figmaSession';

interface FigmaFetchModalProps {
  open: boolean;
  onClose: () => void;
  onFetchComplete?: () => void;
}

type Step = 'connect' | 'review';

export function FigmaFetchModal({ open, onClose, onFetchComplete }: FigmaFetchModalProps) {
  const setFigmaSession = useBuilderStore((s) => s.setFigmaSession);
  const dialogRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState<Step>('connect');
  const [figmaUrl, setFigmaUrl] = useState('');
  const [mobileFigmaUrl, setMobileFigmaUrl] = useState('');
  const [buildAs, setBuildAs] = useState<'design' | 'image'>('design');
  const [hint, setHint] = useState('');
  const [previewSession, setPreviewSession] = useState<ReturnType<typeof toFigmaSession> | null>(
    null
  );
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStep('connect');
    setFigmaUrl('');
    setMobileFigmaUrl('');
    setBuildAs('design');
    setHint('');
    setPreviewSession(null);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    if (isFetching) return;
    reset();
    onClose();
  }, [isFetching, onClose, reset]);

  useModalA11y({ open, onClose: handleClose, busy: isFetching, dialogRef });

  const handleFetch = async () => {
    if (!figmaUrl.trim()) {
      setError('Paste a Figma frame URL with node-id.');
      return;
    }

    setIsFetching(true);
    setError(null);

    try {
      const res = await fetch('/api/figma/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          figmaUrl: figmaUrl.trim(),
          mobileFigmaUrl: mobileFigmaUrl.trim() || undefined,
        }),
      });

      const raw = await res.text();
      let data: FigmaImportApiResult & { error?: string };
      try {
        data = JSON.parse(raw) as FigmaImportApiResult & { error?: string };
      } catch {
        throw new Error(
          res.status === 504 || res.status === 408
            ? 'Fetch timed out — check your Figma token and try a smaller frame.'
            : res.ok
              ? 'Fetch returned an invalid response. Check the dev server terminal.'
              : `Fetch failed (${res.status}). Verify your Figma access token in .env.local and restart the dev server.`
        );
      }

      if (!res.ok) {
        throw new Error(data.error ?? 'Figma import failed');
      }

      const session = toFigmaSession(data, hint);
      setPreviewSession(session);
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Figma import failed');
    } finally {
      setIsFetching(false);
    }
  };

  const handleContinue = () => {
    if (!previewSession) return;
    const session = toFigmaSession(
      {
        desktopUrl: previewSession.desktopUrl,
        mobileUrl: previewSession.mobileUrl,
        designContext: previewSession.designContext,
        desktopNode: previewSession.desktopNode,
        mobileNode: previewSession.mobileNode,
        fileName: previewSession.fileName,
        nodeName: previewSession.nodeName,
        fileKey: previewSession.fileKey,
      },
      hint
    );
    setFigmaSession({ ...session, buildAs });
    reset();
    onClose();
    onFetchComplete?.();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (isFetching) return;
    if (e.target === e.currentTarget) handleClose();
  };

  if (!open) return null;

  return (
    <div className="import-modal-overlay" onClick={handleOverlayClick} role="presentation">
      <div
        ref={dialogRef}
        className="import-modal import-modal-figma"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="figma-fetch-title"
        aria-modal="true"
        tabIndex={-1}
      >
        <div className="import-modal-header import-modal-header-figma">
          <div>
            <div className="figma-badge">Figma</div>
            <h2 id="figma-fetch-title">Fetch from Figma</h2>
            <p className="import-modal-subtitle">
              Pull design data via Figma API — build components in the next step
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleClose}
            disabled={isFetching}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <div className="figma-steps">
          <span className={`figma-step ${step === 'connect' ? 'active' : 'done'}`}>1. Connect</span>
          <span className={`figma-step ${step === 'review' ? 'active' : ''}`}>2. Review</span>
        </div>

        <div className="import-modal-body">
          {isFetching && (
            <ImportProgressBanner message="Fetching design data from Figma — this may take a few seconds." />
          )}

          {step === 'connect' && (
            <>
              <FigmaConnectForm
                figmaUrl={figmaUrl}
                mobileFigmaUrl={mobileFigmaUrl}
                onFigmaUrlChange={setFigmaUrl}
                onMobileFigmaUrlChange={setMobileFigmaUrl}
              />
              <div className="import-modal-field">
                <label className="import-field-label" htmlFor="figma-fetch-build-as">
                  Build as
                </label>
                <select
                  id="figma-fetch-build-as"
                  className="import-modal-input"
                  value={buildAs}
                  onChange={(e) => setBuildAs(e.target.value as 'design' | 'image')}
                  disabled={isFetching}
                >
                  <option value="design">Design — structured HTML/CSS (editable)</option>
                  <option value="image">Image — flatten whole component to one PNG</option>
                </select>
                <p className="import-field-hint">
                  {buildAs === 'image'
                    ? 'Renders the entire component as a single full-frame image — no design context or CSS. Best for CSS-heavy components (custom fonts, gradients, overlap) email clients render inconsistently. You can still change this in the next step.'
                    : 'Builds editable Heading, Text, and Button primitives from the Figma tree. You can switch to Image in the next step.'}
                </p>
              </div>
            </>
          )}

          {step === 'review' && previewSession && (
            <FigmaReviewPanel
              session={previewSession}
              hint={hint}
              onHintChange={setHint}
              onChangeFrame={() => setStep('connect')}
            />
          )}

          {error && <div className="import-modal-error">{error}</div>}
        </div>

        <div className="import-modal-footer">
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleClose} disabled={isFetching}>
            Cancel
          </button>

          {step === 'connect' && (
            <button
              type="button"
              className="btn btn-primary btn-sm figma-btn-primary"
              onClick={handleFetch}
              disabled={isFetching || !figmaUrl.trim()}
            >
              {isFetching ? 'Fetching...' : 'Fetch from Figma'}
            </button>
          )}

          {step === 'review' && (
            <button
              type="button"
              className="btn btn-primary btn-sm figma-btn-primary"
              onClick={handleContinue}
            >
              Continue to Build
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
