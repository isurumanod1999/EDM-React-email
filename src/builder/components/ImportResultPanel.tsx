'use client';

import { useState } from 'react';
import { useBuilderStore } from '@/builder/store/builderStore';
import type { AiBlock } from '@/lib/ai/schemas/analyzeResult';

interface ImportResultPanelProps {
  confidence: number;
  reasoning: string;
  blocks: AiBlock[] | { componentId: string; label?: string }[];
  previewHtml?: string;
  warnings?: string[];
  buildMode?: 'react-email' | 'ai';
  mappingMode?: 'registry' | 'primitives' | 'image';
}

export function ImportResultPanel({
  confidence,
  reasoning,
  blocks,
  previewHtml,
  warnings,
  buildMode,
  mappingMode,
}: ImportResultPanelProps) {
  const registry = useBuilderStore((s) => s.registry);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  const getComponentName = (id: string) =>
    registry.find((r) => r.id === id)?.name ?? id;

  const frameWidth = previewMode === 'desktop' ? '100%' : '375px';
  const frameMaxWidth = previewMode === 'desktop' ? '600px' : '375px';
  const showConfidence = buildMode !== 'react-email';

  return (
    <div className="import-result">
      <div className="import-result-header">
        {showConfidence && (
          <span
            className={`import-confidence ${confidence >= 0.7 ? 'high' : confidence >= 0.5 ? 'medium' : 'low'}`}
          >
            {Math.round(confidence * 100)}% match
          </span>
        )}
        {mappingMode === 'registry' && (
          <span className="import-confidence high">Registry components</span>
        )}
        {buildMode === 'react-email' && mappingMode !== 'registry' && (
          <span className="import-confidence high">React Email build</span>
        )}
        <span className="import-result-reasoning">{reasoning}</span>
      </div>

      {warnings && warnings.length > 0 && (
        <ul className="import-result-warnings">
          {warnings.map((warning, i) => (
            <li key={i}>{warning}</li>
          ))}
        </ul>
      )}

      <div className="import-result-blocks">
        {blocks.map((block, i) => (
          <span key={i} className="import-block-tag">
            {getComponentName(block.componentId)}
          </span>
        ))}
      </div>

      {previewHtml && (
        <div className="import-preview">
          <div className="import-preview-toolbar">
            <span>Preview</span>
            <div className="import-preview-toggle">
              <button
                type="button"
                className={`btn btn-secondary btn-sm btn-toggle ${previewMode === 'desktop' ? 'active' : ''}`}
                onClick={() => setPreviewMode('desktop')}
              >
                Desktop
              </button>
              <button
                type="button"
                className={`btn btn-secondary btn-sm btn-toggle ${previewMode === 'mobile' ? 'active' : ''}`}
                onClick={() => setPreviewMode('mobile')}
              >
                Mobile
              </button>
            </div>
          </div>
          <div
            className="import-preview-frame"
            style={{ width: frameWidth, maxWidth: frameMaxWidth }}
          >
            <iframe srcDoc={previewHtml} title="Import preview" />
          </div>
        </div>
      )}
    </div>
  );
}
