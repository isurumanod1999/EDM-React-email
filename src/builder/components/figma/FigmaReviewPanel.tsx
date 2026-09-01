'use client';

import { useState } from 'react';
import type { FigmaSession } from '@/builder/types/figmaSession';

interface FigmaReviewPanelProps {
  session: FigmaSession;
  hint: string;
  onHintChange: (value: string) => void;
  onChangeFrame?: () => void;
  showHint?: boolean;
}

export function FigmaReviewPanel({
  session,
  hint,
  onHintChange,
  onChangeFrame,
  showHint = true,
}: FigmaReviewPanelProps) {
  const [showContext, setShowContext] = useState(false);

  return (
    <div className="figma-review">
      <div className="figma-loaded-card">
        <div className="figma-loaded-info">
          <strong>{session.nodeName}</strong>
          <span>{session.fileName}</span>
        </div>
        {onChangeFrame && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onChangeFrame}>
            Change
          </button>
        )}
      </div>

      <div className="figma-thumbs">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={session.desktopUrl} alt="Desktop frame" className="figma-thumb" />
        {session.mobileUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={session.mobileUrl} alt="Mobile frame" className="figma-thumb" />
        )}
      </div>

      {session.designContext && (
        <div className="figma-context-section">
          <button
            type="button"
            className="figma-context-toggle"
            onClick={() => setShowContext((v) => !v)}
          >
            {showContext ? '▼' : '▶'} Design structure from Figma
          </button>
          {showContext && (
            <pre className="figma-context-pre">{session.designContext}</pre>
          )}
        </div>
      )}

      {showHint && (
        <div className="import-modal-field">
          <label className="import-field-label" htmlFor="figma-hint">
            Hint for AI (optional)
          </label>
          <textarea
            id="figma-hint"
            className="import-modal-textarea"
            placeholder='e.g. "Two-column product row with red CTA"'
            value={hint}
            onChange={(e) => onHintChange(e.target.value)}
            rows={2}
          />
        </div>
      )}
    </div>
  );
}
