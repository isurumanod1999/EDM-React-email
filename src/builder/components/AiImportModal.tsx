'use client';

import { useCallback, useRef, useState } from 'react';
import { ImageUploadField } from '@/builder/components/ImageUploadField';
import { OllamaStatusBanner } from '@/builder/components/figma/OllamaStatusBanner';
import { ImportProgressBanner } from '@/builder/components/ImportProgressBanner';
import { ImportResultPanel } from '@/builder/components/ImportResultPanel';
import { useModalA11y } from '@/builder/hooks/useModalA11y';
import { useBuilderStore } from '@/builder/store/builderStore';
import type { AiBlock } from '@/lib/ai/schemas/analyzeResult';

interface AiImportModalProps {
  open: boolean;
  onClose: () => void;
}

interface AnalyzeResponse {
  confidence: number;
  blocks: AiBlock[];
  reasoning: string;
  previewHtml?: string;
}

export function AiImportModal({ open, onClose }: AiImportModalProps) {
  const addBlocksFromAi = useBuilderStore((s) => s.addBlocksFromAi);
  const dialogRef = useRef<HTMLDivElement>(null);

  const [desktopUrl, setDesktopUrl] = useState<string | null>(null);
  const [mobileUrl, setMobileUrl] = useState<string | null>(null);
  const [hint, setHint] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);

  const reset = useCallback(() => {
    setDesktopUrl(null);
    setMobileUrl(null);
    setHint('');
    setError(null);
    setResult(null);
  }, []);

  const handleClose = useCallback(() => {
    if (isAnalyzing) return;
    reset();
    onClose();
  }, [isAnalyzing, onClose, reset]);

  useModalA11y({ open, onClose: handleClose, busy: isAnalyzing, dialogRef });

  const handleAnalyze = async () => {
    if (!desktopUrl) {
      setError('Upload a desktop screenshot first.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/ai/analyze-component', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          desktopUrl,
          mobileUrl: mobileUrl ?? undefined,
          hint: hint.trim() || undefined,
        }),
      });

      const raw = await res.text();
      let data: AnalyzeResponse & { error?: string };
      try {
        data = JSON.parse(raw) as AnalyzeResponse & { error?: string };
      } catch {
        throw new Error(
          res.status === 504 || res.status === 408
            ? 'Analysis timed out — try a smaller screenshot or check that Ollama/Gemini is running.'
            : res.ok
              ? 'Analysis returned an invalid response. Check the dev server terminal.'
              : `Analysis failed (${res.status}). Check AI status above and try again.`
        );
      }

      if (!res.ok) {
        throw new Error(data.error ?? 'Analysis failed');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirm = () => {
    if (!result?.blocks.length) return;
    addBlocksFromAi(result.blocks);
    handleClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (isAnalyzing) return;
    if (e.target === e.currentTarget) handleClose();
  };

  if (!open) return null;

  return (
    <div className="import-modal-overlay" onClick={handleOverlayClick} role="presentation">
      <div
        ref={dialogRef}
        className="import-modal import-modal-ai"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="screenshot-upload-title"
        aria-modal="true"
        tabIndex={-1}
      >
        <div className="import-modal-header">
          <div>
            <h2 id="screenshot-upload-title">Screenshot Upload</h2>
            <p className="import-modal-subtitle">Upload screenshots to map them to email components</p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleClose}
            disabled={isAnalyzing}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <div className="import-modal-body">
          <OllamaStatusBanner />

          {isAnalyzing && (
            <ImportProgressBanner message="Analyzing screenshots with AI — this may take 30–60 seconds." />
          )}

          <div className="import-modal-uploads">
            <ImageUploadField
              label="Desktop screenshot"
              value={desktopUrl}
              onChange={setDesktopUrl}
              required
              hint="Export the desktop frame from Figma as PNG"
            />
            <ImageUploadField
              label="Mobile screenshot"
              value={mobileUrl}
              onChange={setMobileUrl}
              hint="Optional — improves responsive layout detection"
            />
          </div>

          <div className="import-modal-field">
            <label className="import-field-label" htmlFor="ai-hint">
              Hint (optional)
            </label>
            <textarea
              id="ai-hint"
              className="import-modal-textarea"
              placeholder='e.g. "Hero banner with red CTA"'
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              rows={2}
              disabled={isAnalyzing}
            />
          </div>

          {error && <div className="import-modal-error">{error}</div>}

          {result && (
            <ImportResultPanel
              confidence={result.confidence}
              reasoning={result.reasoning}
              blocks={result.blocks}
              previewHtml={result.previewHtml}
            />
          )}
        </div>

        <div className="import-modal-footer">
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleClose} disabled={isAnalyzing}>
            Cancel
          </button>
          {!result ? (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleAnalyze}
              disabled={isAnalyzing || !desktopUrl}
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze'}
            </button>
          ) : (
            <button type="button" className="btn btn-primary btn-sm" onClick={handleConfirm}>
              Add to canvas
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
