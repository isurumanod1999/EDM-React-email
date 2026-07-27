'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FigmaReviewPanel } from '@/builder/components/figma/FigmaReviewPanel';
import { ImportResultPanel } from '@/builder/components/ImportResultPanel';
import { useBuilderStore } from '@/builder/store/builderStore';
import type { AiBlock } from '@/lib/ai/schemas/analyzeResult';
import {
  collectImageNodeOutline,
  detectImageMergeClusters,
  detectImageNodeIds,
  type ImageNodeOutlineEntry,
} from '@/lib/figma/detectImageNodes';
import { findNodeIdsFromDesignHints } from '@/lib/figma/designContextImageHints';

interface FigmaBuildModalProps {
  open: boolean;
  onClose: () => void;
  onFetchAgain?: () => void;
}

interface BuildResponse {
  confidence: number;
  blocks: AiBlock[];
  reasoning: string;
  previewHtml?: string;
  warnings?: string[];
}

type Step = 'build' | 'result';

export function FigmaBuildModal({ open, onClose, onFetchAgain }: FigmaBuildModalProps) {
  const figmaSession = useBuilderStore((s) => s.figmaSession);
  const addBlocksFromAi = useBuilderStore((s) => s.addBlocksFromAi);
  const updateFigmaHint = useBuilderStore((s) => s.updateFigmaHint);
  const clearFigmaSession = useBuilderStore((s) => s.clearFigmaSession);

  const [step, setStep] = useState<Step>('build');
  const [isBuilding, setIsBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BuildResponse | null>(null);
  const [buildAs, setBuildAs] = useState<'design' | 'image'>('design');

  // ── Mixed-mode "smart image export" (local state only — passed as DIRECT build
  // params so nothing is persisted to the Figma session / builder store). ───────
  const [autoDetectImages, setAutoDetectImages] = useState(true);
  const [imageInstructions, setImageInstructions] = useState('');
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<ImageNodeOutlineEntry[]>([]);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);

  const contextHintIds = useMemo(() => {
    if (!figmaSession?.desktopNode) return [] as string[];
    return findNodeIdsFromDesignHints(
      figmaSession.desktopNode,
      figmaSession.designContext,
      imageInstructions
    );
  }, [figmaSession?.desktopNode, figmaSession?.designContext, imageInstructions]);

  const detectedImageIds = useMemo(() => {
    if (!figmaSession?.desktopNode) return [] as string[];
    const badges = detectImageNodeIds(figmaSession.desktopNode);
    const mergeAnchors = detectImageMergeClusters(figmaSession.desktopNode)
      .map((c) => c.nodeIds[0])
      .filter((id): id is string => Boolean(id));
    return [...new Set([...badges, ...mergeAnchors, ...contextHintIds])];
  }, [figmaSession?.desktopNode, contextHintIds]);

  const outlineById = useMemo(() => {
    if (!figmaSession?.desktopNode) return new Map<string, ImageNodeOutlineEntry>();
    const outline = collectImageNodeOutline(figmaSession.desktopNode);
    return new Map(outline.map((n) => [n.id, n] as const));
  }, [figmaSession?.desktopNode]);

  /** Layers shown in the export checklist (auto-detected + AI suggestions). */
  const imageExportChoices = useMemo(() => {
    const ids = new Set<string>([...detectedImageIds, ...selectedImageIds, ...suggestions.map((s) => s.id)]);
    return [...ids]
      .map((id) => outlineById.get(id))
      .filter((n): n is ImageNodeOutlineEntry => Boolean(n));
  }, [detectedImageIds, selectedImageIds, suggestions, outlineById]);

  // Default the build mode to whatever was chosen in the Fetch step (if any),
  // while still letting the user change it here before building.
  useEffect(() => {
    if (open && figmaSession?.buildAs) setBuildAs(figmaSession.buildAs);
  }, [open, figmaSession?.buildAs]);

  // Seed the export checklist from heuristic detection whenever the frame loads.
  useEffect(() => {
    if (!open || !figmaSession) return;
    const badges = detectImageNodeIds(figmaSession.desktopNode);
    const mergeAnchors = detectImageMergeClusters(figmaSession.desktopNode)
      .map((c) => c.nodeIds[0])
      .filter((id): id is string => Boolean(id));
    const hints = findNodeIdsFromDesignHints(
      figmaSession.desktopNode,
      figmaSession.designContext
    );
    setSelectedImageIds([...new Set([...badges, ...mergeAnchors, ...hints])]);
    setSuggestions([]);
    setSuggestError(null);
  }, [open, figmaSession?.desktopNode, figmaSession?.designContext, figmaSession?.fetchedAt]);

  const reset = useCallback(() => {
    setStep('build');
    setIsBuilding(false);
    setError(null);
    setResult(null);
    setBuildAs('design');
    setAutoDetectImages(true);
    setImageInstructions('');
    setSuggesting(false);
    setSuggestError(null);
    setSuggestions([]);
    setSelectedImageIds([]);
  }, []);

  const toggleImageId = useCallback((id: string) => {
    setSelectedImageIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  // Ask the AI classifier which nodes to rasterize, using the already-parsed
  // frame outline + the user's free-form instruction. Best-effort: on any error
  // the route returns 200 with an empty list and we fall back to auto-detect.
  const handleSuggest = useCallback(async () => {
    if (!figmaSession) return;
    setSuggesting(true);
    setSuggestError(null);
    try {
      const outline = collectImageNodeOutline(figmaSession.desktopNode);
      const res = await fetch('/api/figma/classify-image-nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes: outline, instruction: imageInstructions.trim() }),
      });
      const data = (await res.json()) as { ids?: string[]; error?: string };
      const ids = data.ids ?? [];
      const byId = new Map(outline.map((n) => [n.id, n] as const));
      const picked = ids
        .map((id) => byId.get(id))
        .filter((n): n is ImageNodeOutlineEntry => Boolean(n));
      setSuggestions(picked);
      setSelectedImageIds((prev) => [...new Set([...prev, ...ids])]);
      if (picked.length === 0) {
        setSuggestError(
          data.error
            ? `AI unavailable (${data.error}). Auto-detect will still run.`
            : 'AI suggested no image nodes — auto-detect will still run.'
        );
      }
    } catch {
      setSuggestError('Could not reach the AI classifier. Auto-detect will still run.');
    } finally {
      setSuggesting(false);
    }
  }, [figmaSession, imageInstructions]);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const handleBuildReactEmail = async () => {
    if (!figmaSession || isBuilding) return;

    setIsBuilding(true);
    setError(null);

    let payload: string;
    try {
      payload = JSON.stringify({
        desktopNode: figmaSession.desktopNode,
        mobileNode: figmaSession.mobileNode,
        nodeName: figmaSession.nodeName,
        fileName: figmaSession.fileName,
        desktopUrl: figmaSession.desktopUrl,
        mobileUrl: figmaSession.mobileUrl,
        mode: 'primitives',
        buildAs,
        fileKey: figmaSession.fileKey,
        designContext: figmaSession.designContext,
        autoDetectImages: false,
        imageInstructions: imageInstructions.trim() || undefined,
        imageNodeIds: selectedImageIds.length > 0 ? selectedImageIds : undefined,
      });
    } catch {
      setError('Could not serialize the Figma design for build. Re-fetch the frame and try again.');
      setIsBuilding(false);
      return;
    }

    try {
      const res = await fetch('/api/figma/build-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });

      const raw = await res.text();
      let data: BuildResponse & { error?: string };
      try {
        data = JSON.parse(raw) as BuildResponse & { error?: string };
      } catch {
        throw new Error(
          res.ok
            ? 'Build returned an invalid response. Check the dev server terminal.'
            : `Build failed (${res.status}). The server may have timed out — try fewer icon exports or re-fetch.`
        );
      }

      if (!res.ok) {
        throw new Error(data.error ?? 'React Email build failed');
      }

      setResult(data);
      setStep('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'React Email build failed');
    } finally {
      setIsBuilding(false);
    }
  };

  const handleConfirm = () => {
    if (!result?.blocks.length) return;
    addBlocksFromAi(result.blocks);
    clearFigmaSession();
    handleClose();
  };

  if (!open) return null;

  if (!figmaSession) {
    return (
      <div className="import-modal-overlay" onClick={handleClose} role="presentation">
        <div
          className="import-modal import-modal-figma"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <div className="import-modal-header import-modal-header-figma">
            <h2>Build from Figma</h2>
          </div>
          <div className="import-modal-body">
            <p className="import-field-hint">
              No Figma design loaded. Fetch a frame first.
            </p>
          </div>
          <div className="import-modal-footer">
            <button type="button" className="btn btn-ghost btn-sm" onClick={handleClose}>
              Close
            </button>
            {onFetchAgain && (
              <button
                type="button"
                className="btn btn-primary btn-sm figma-btn-primary"
                onClick={onFetchAgain}
              >
                Fetch from Figma
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="import-modal-overlay"
      onClick={(e) => {
        if (isBuilding) return;
        if (e.target === e.currentTarget) handleClose();
      }}
      role="presentation"
    >
      <div
        className="import-modal import-modal-figma"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="figma-build-title"
        aria-modal="true"
      >
        <div className="import-modal-header import-modal-header-figma">
          <div>
            <div className="figma-badge">React Email</div>
            <h2 id="figma-build-title">Build React Email Components</h2>
            <p className="import-modal-subtitle">
              {figmaSession.nodeName} — Heading, Text, Button from Figma data
            </p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleClose}>
            ✕
          </button>
        </div>

        <div className="import-modal-body">
          {isBuilding && (
            <div className="import-modal-building" role="status" aria-live="polite">
              Building React Email… exporting icons from Figma can take up to a minute.
            </div>
          )}
          {step === 'build' && (
            <>
              <FigmaReviewPanel
                session={figmaSession}
                hint={figmaSession.hint ?? ''}
                onHintChange={updateFigmaHint}
                showHint={false}
              />
              <div className="import-modal-field">
                <label className="import-field-label" htmlFor="figma-build-as">
                  Build as
                </label>
                <select
                  id="figma-build-as"
                  className="import-modal-input"
                  value={buildAs}
                  onChange={(e) => setBuildAs(e.target.value as 'design' | 'image')}
                >
                  <option value="design">Design — structured HTML/CSS (editable)</option>
                  <option value="image">Image — flatten whole component to one PNG</option>
                </select>
                <p className="import-field-hint">
                  {buildAs === 'image'
                    ? 'Renders the entire component as a single full-frame image — no design context or CSS is used. Best for CSS-heavy components (custom fonts, gradients, overlap) that email clients render inconsistently.'
                    : 'Reads text and buttons directly from the Figma API tree — Heading, Text, and Button primitives with Figma font size, weight, color, and radius. Fully editable.'}
                </p>
              </div>

              {buildAs === 'design' && (
                <div className="import-modal-field figma-smart-image">
                  <label className="import-field-label">Smart image export</label>

                  <label className="figma-smart-image-check">
                    <input
                      type="checkbox"
                      checked={autoDetectImages}
                      onChange={(e) => {
                        const on = e.target.checked;
                        setAutoDetectImages(on);
                        if (on && figmaSession) {
                          const badges = detectImageNodeIds(figmaSession.desktopNode);
                          const mergeAnchors = detectImageMergeClusters(figmaSession.desktopNode)
                            .map((c) => c.nodeIds[0])
                            .filter((id): id is string => Boolean(id));
                          setSelectedImageIds([...new Set([...badges, ...mergeAnchors])]);
                        } else if (!on) {
                          setSelectedImageIds([]);
                        }
                      }}
                    />
                    Auto-detect icons &amp; SVGs → 2× images
                  </label>

                  <textarea
                    className="import-modal-input figma-smart-image-instructions"
                    placeholder='Paste a design-context line or instruction — e.g. export INSTANCE "Icon-badge" 56×56px as 2× image'
                    value={imageInstructions}
                    onChange={(e) => setImageInstructions(e.target.value)}
                    rows={2}
                  />

                  <div className="figma-smart-image-actions">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleSuggest}
                      disabled={suggesting}
                    >
                      {suggesting ? 'Asking AI…' : 'Suggest with AI'}
                    </button>
                  </div>

                  {suggestError && (
                    <p className="import-field-hint figma-smart-image-error">{suggestError}</p>
                  )}

                  {imageExportChoices.length > 0 && (
                    <div className="figma-smart-image-list">
                      <div className="figma-smart-image-list-title">Export as 2× PNG</div>
                      {imageExportChoices.map((n) => (
                        <label key={n.id} className="figma-smart-image-item">
                          <input
                            type="checkbox"
                            checked={selectedImageIds.includes(n.id)}
                            onChange={() => toggleImageId(n.id)}
                          />
                          <span className="figma-smart-image-name">{n.name}</span>
                          <span className="figma-smart-image-meta">
                            {n.type} · {Math.round(n.width ?? 0)}×{Math.round(n.height ?? 0)}
                            {detectedImageIds.includes(n.id) ? ' · auto' : ''}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}

                  <p className="import-field-hint">
                    Layers from design context (e.g.{' '}
                    <code>INSTANCE &quot;Icon-badge&quot; 56×56px</code>) are matched automatically on
                    build. Each match exports as one crisp 2× PNG; text and CTAs stay HTML. Re-build
                    re-exports icons from Figma.
                  </p>
                </div>
              )}
            </>
          )}

          {step === 'result' && result && (
            <ImportResultPanel
              confidence={result.confidence}
              reasoning={result.reasoning}
              blocks={result.blocks}
              previewHtml={result.previewHtml}
              warnings={result.warnings}
              buildMode="react-email"
            />
          )}

          {error && <div className="import-modal-error">{error}</div>}
        </div>

        <div className="import-modal-footer">
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleClose}>
            Cancel
          </button>

          {step === 'build' && (
            <button
              type="button"
              className="btn btn-primary btn-sm figma-btn-primary"
              onClick={handleBuildReactEmail}
              disabled={isBuilding}
            >
              {isBuilding ? 'Building...' : 'Build React Email'}
            </button>
          )}

          {step === 'result' && (
            <>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setResult(null);
                  setStep('build');
                }}
              >
                Back
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm figma-btn-primary"
                onClick={handleConfirm}
              >
                Add to canvas
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
