'use client';

import { useCallback, useRef, useState } from 'react';
import { ComponentPalette } from './ComponentPalette';
import { BlockCanvas } from './BlockCanvas';

/** Percent of the rail height given to the components list. */
const MIN_PERCENT = 20;
const MAX_PERCENT = 75;
const DEFAULT_PERCENT = 46;
const KEYBOARD_STEP = 3;

const clamp = (value: number) =>
  Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, value));

/**
 * Components and structure share the left rail so the centre column can be
 * given over entirely to the preview. The split between them is draggable
 * because template sizes vary — a 20-block email needs the room a 3-block one
 * does not.
 */
export function BuilderLeftRail({ className }: { className?: string }) {
  const railRef = useRef<HTMLElement>(null);
  const [componentsPercent, setComponentsPercent] = useState(DEFAULT_PERCENT);
  const [isResizing, setIsResizing] = useState(false);

  const applyPointer = useCallback((clientY: number) => {
    const rail = railRef.current;
    if (!rail) return;
    const rect = rail.getBoundingClientRect();
    if (rect.height === 0) return;
    setComponentsPercent(clamp(((clientY - rect.top) / rect.height) * 100));
  }, []);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsResizing(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isResizing) return;
    applyPointer(event.clientY);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isResizing) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsResizing(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    const delta = event.key === 'ArrowUp' ? -KEYBOARD_STEP : KEYBOARD_STEP;
    setComponentsPercent((current) => clamp(current + delta));
  };

  return (
    <aside
      ref={railRef}
      className={`builder-panel builder-panel--palette${
        className ? ` ${className}` : ''
      }${isResizing ? ' is-resizing' : ''}`}
    >
      <ComponentPalette style={{ flexBasis: `${componentsPercent}%` }} />
      <div
        className="rail-divider"
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize components and structure"
        aria-valuenow={Math.round(componentsPercent)}
        aria-valuemin={MIN_PERCENT}
        aria-valuemax={MAX_PERCENT}
        tabIndex={0}
        title="Drag to resize — double-click to reset"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        onDoubleClick={() => setComponentsPercent(DEFAULT_PERCENT)}
      />
      <BlockCanvas />
    </aside>
  );
}
