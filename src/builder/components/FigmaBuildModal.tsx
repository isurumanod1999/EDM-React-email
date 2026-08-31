'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FigmaReviewPanel } from '@/builder/components/figma/FigmaReviewPanel';
import { OllamaStatusBanner } from '@/builder/components/figma/OllamaStatusBanner';
import { ImportProgressBanner } from '@/builder/components/ImportProgressBanner';
import { ImportResultPanel } from '@/builder/components/ImportResultPanel';
import { useModalA11y } from '@/builder/hooks/useModalA11y';
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
  mappingMode?: 'registry' | 'primitives' | 'image';
}

type Step = 'build' | 'result';

export function FigmaBuildModal({ open, onClose, onFetchAgain }: FigmaBuildModalProps) {
  const figmaSession = useBuilderStore((s) => s.figmaSession);
  const addBlocksFromAi = useBuilderStore((s) => s.addBlocksFromAi);
  const updateFigmaHint = useBuilderStore((s) => s.updateFigmaHint);
  const clearFigmaSession = useBuilderStore((s) => s.clearFigmaSession);

  const dialogRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState<Step>('build');
  const [isBuilding, setIsBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BuildResponse | null>(null);
  const [buildAs, setBuildAs] = useState<'design' | 'image'>('design');

  const [autoDetectImages, setAutoDetectImages] = useState(true);
  const [imageInstructions, setImageInstructions] = useState('');
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<ImageNodeOutlineEntry[]>([]);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [initialImageIds, setInitialImageIds] = useState<string[]>([]);
  const [explicitLayerIds, setExplicitLayerIds] = useState<string[]>([]);
  const [layerSearch, setLayerSearch] = useState('');

  const busy = isBuilding || suggesting;

  const contextHintIds = useMemo(() => {
    if (!figmaSession?.desktopNode) return [] as string[];
    return findNodeIdsFromDesignHints(
      figmaSession.desktopNode,
      figmaSession.designContext
    );
  }, [figmaSession?.desktopNode, figmaSession?.designContext]);

  const instructionHintIds = useMemo(() => {
    if (!figmaSession?.desktopNode || !imageInstructions.trim()) return [] as string[];
    return findNodeIdsFromDesignHints(
      figmaSession.desktopNode,
      undefined,
      imageInstructions
    );
  }, [figmaSession?.desktopNode, imageInstructions]);

  const detectedImageIds = useMemo(() => {
    if (!figmaSession?.desktopNode) return [] as string[];
    const badges = detectImageNodeIds(figmaSession.desktopNode);
    const mergeAnchors = detectImageMergeClusters(figmaSession.desktopNode)
      .map((c) => c.nodeIds[0])
      .filter((id): id is string => Boolean(id));
    return [...new Set([...badges, ...mergeAnchors, ...contextHintIds])];
  }, [figmaSession?.desktopNode, contextHintIds]);

  const layerOutline = useMemo(() => {
    if (!figmaSession?.desktopNode) return [] as ImageNodeOutlineEntry[];
    return collectImageNodeOutline(figmaSession.desktopNode);
  }, [figmaSession?.desktopNode]);

  const outlineById = useMemo(
    () => new Map(layerOutline.map((node) => [node.id, node] as const)),
    [layerOutline]
  );

  const effectiveSelectedImageIds = useMemo(
    () => [...new Set([...selectedImageIds, ...instructionHintIds])],
    [instructionHintIds, selectedImageIds]
  );

  const imageExportChoices = useMemo(() => {
    const query = layerSearch.trim().toLowerCase();
    if (!query) return layerOutline;
    return layerOutline.filter((node) =>
      [node.name, node.type, node.id, node.text ?? ''].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
  }, [layerOutline, layerSearch]);

  useEffect(() => {
    if (open && figmaSession?.buildAs) setBuildAs(figmaSession.buildAs);
  }, [open, figmaSession?.buildAs]);

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
    const defaults = [...new Set([...badges, ...mergeAnchors, ...hints])];
    setInitialImageIds(defaults);
    setSelectedImageIds(defaults);
    setExplicitLayerIds([]);
    setSuggestions([]);
    setSuggestError(null);
    setLayerSearch('');
  }, [open, figmaSession]);

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
    setInitialImageIds([]);
    setExplicitLayerIds([]);
    setLayerSearch('');
  }, []);

  const toggleImageId = useCallback(
    (id: string) => {
      const nextIsImage = !selectedImageIds.includes(id);
      const defaultIsImage = initialImageIds.includes(id);
      setSelectedImageIds((prev) =>
        nextIsImage ? [...prev, id] : prev.filter((value) => value !== id)
      );
      setExplicitLayerIds((prev) =>
        nextIsImage === defaultIsImage
          ? prev.filter((value) => value !== id)
          : [...new Set([...prev, id])]
      );
    },
    [initialImageIds, selectedImageIds]
  );

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
    if (busy) return;
    reset();
    onClose();
  }, [busy, onClose, reset]);

  useModalA11y({ open, onClose: handleClose, busy, dialogRef });

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
        imageNodeIds:
          effectiveSelectedImageIds.length > 0 ? effectiveSelectedImageIds : undefined,
        forcePrimitiveBuild:
          explicitLayerIds.length > 0 ||
          Boolean(imageInstructions.trim()) ||
          suggestions.length > 0,
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
          res.status === 504 || res.status === 408
            ? 'Build timed out — try fewer icon exports or re-fetch the frame.'
            : res.ok
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

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (busy) return;
    if (e.target === e.currentTarget) handleClose();
  };

  if (!open) return null;

  if (!figmaSession) {
    return (
      <div className="import-modal-overlay" onClick={handleOverlayClick} role="presentation">
        <div
          ref={dialogRef}
          className="import-modal import-modal-figma"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="figma-build-empty-title"
          tabIndex={-1}
        >
          <div className="import-modal-header import-modal-header-figma">
            <h2 id="figma-build-empty-title">Build from Figma</h2>
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
    <div className="import-modal-overlay" onClick={handleOverlayClick} role="presentation">
      <div
        ref={dialogRef}
        className="import-modal import-modal-figma"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="figma-build-title"
        aria-modal="true"
        tabIndex={-1}
      >
        <div className="import-modal-header import-modal-header-figma">
          <div>
            <div className="figma-badge">React Email</div>
            <h2 id="figma-build-title">Build React Email Components</h2>
            <p className="import-modal-subtitle">
              {figmaSession.nodeName} — Heading, Text, Button from Figma data
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleClose}
            disabled={busy}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <div className="import-modal-body">
          <OllamaStatusBanner />

          {isBuilding && (
            <ImportProgressBanner message="Building React Email… exporting icons from Figma can take up to a minute." />
          )}
          {suggesting && !isBuilding && (
            <ImportProgressBanner message="Asking AI which layers to export as images…" />
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
                  disabled={busy}
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
                      disabled={busy}
                      onChange={(e) => {
                        const on = e.target.checked;
                        setAutoDetectImages(on);
                        if (on && figmaSession) {
                          const badges = detectImageNodeIds(figmaSession.desktopNode);
                          const mergeAnchors = detectImageMergeClusters(figmaSession.desktopNode)
                            .map((c) => c.nodeIds[0])
                            .filter((id): id is string => Boolean(id));
                          const defaults = [...new Set([...badges, ...mergeAnchors])];
                          setInitialImageIds(defaults);
                          setSelectedImageIds(defaults);
                        } else if (!on) {
                          setInitialImageIds([]);
                          setSelectedImageIds([]);
                        }
                        setExplicitLayerIds([]);
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
                    disabled={busy}
                  />

                  <div className="figma-smart-image-actions">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleSuggest}
                      disabled={busy}
                    >
                      {suggesting ? 'Asking AI…' : 'Suggest with AI'}
                    </button>
                  </div>

                  {suggestError && (
                    <p className="import-field-hint figma-smart-image-error">{suggestError}</p>
                  )}

                  <div className="figma-smart-image-list">
                    <label className="figma-smart-image-list-title" htmlFor="figma-layer-search">
                      Choose layers to flatten
                    </label>
                    <input
                      id="figma-layer-search"
                      type="search"
                      className="import-modal-input figma-layer-search"
                      placeholder="Search name, type, text, or node ID"
                      value={layerSearch}
                      onChange={(event) => setLayerSearch(event.target.value)}
                      disabled={busy}
                    />
                    <div className="figma-smart-image-list-head" aria-hidden="true">
                      <span>Mode / layer</span>
                      <span>{imageExportChoices.length} shown</span>
                    </div>
                    {imageExportChoices.length > 0 ? (
                      imageExportChoices.map((n) => {
                        const imageMode = effectiveSelectedImageIds.includes(n.id);
                        const instructionSelected = instructionHintIds.includes(n.id);
                        return (
                          <label
                            key={n.id}
                            className={`figma-smart-image-item${imageMode ? ' is-image' : ''}`}
                            style={{ paddingLeft: 10 + Math.min(n.depth - 1, 8) * 14 }}
                          >
                            <input
                              type="checkbox"
                              checked={imageMode}
                              onChange={() => toggleImageId(n.id)}
                              disabled={busy || instructionSelected}
                              aria-label={`${imageMode ? 'Image' : 'Design'} mode for ${n.name}`}
                              title={
                                instructionSelected
                                  ? 'Selected by the image instruction; remove that instruction to use Design.'
                                  : undefined
                              }
                            />
                            <span className="figma-smart-image-copy">
                              <span className="figma-smart-image-name">
                                {n.name || '(unnamed layer)'}
                              </span>
                              <span className="figma-smart-image-meta">
                                <strong>{imageMode ? 'Image' : 'Design'}</strong> · {n.type} ·{' '}
                                {Math.round(n.width ?? 0)}×{Math.round(n.height ?? 0)} · {n.id}
                                {detectedImageIds.includes(n.id) ? ' · auto' : ''}
                                {instructionSelected ? ' · instruction' : ''}
                                {n.childCount > 0 ? ` · ${n.childCount} children` : ''}
                              </span>
                              {n.text && (
                                <span className="figma-smart-image-text" title={n.text}>
                                  {n.text}
                                </span>
                              )}
                            </span>
                          </label>
                        );
                      })
                    ) : (
                      <p className="import-field-hint figma-layer-empty">
                        No layers match “{layerSearch}”.
                      </p>
                    )}
                  </div>

                  <p className="import-field-hint">
                    Unchecked layers stay editable Design. Checked layers become one crisp 2× PNG,
                    including their children, and their text is no longer editable. Selecting a
                    parent makes selected descendants part of that parent image. Auto-detected icons
                    are preselected; re-build re-exports chosen layers from Figma.
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
              mappingMode={result.mappingMode}
            />
          )}

          {error && <div className="import-modal-error">{error}</div>}
        </div>

        <div className="import-modal-footer">
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleClose} disabled={busy}>
            Cancel
          </button>

          {step === 'build' && (
            <button
              type="button"
              className="btn btn-primary btn-sm figma-btn-primary"
              onClick={handleBuildReactEmail}
              disabled={busy}
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
