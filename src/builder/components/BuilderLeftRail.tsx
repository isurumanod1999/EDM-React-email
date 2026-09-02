'use client';

import { ComponentPalette } from './ComponentPalette';
import { BlockCanvas } from './BlockCanvas';

/**
 * Components and structure share one rail so a palette item can be dragged
 * straight onto the block list without either view being hidden.
 */
export function BuilderLeftRail({ className }: { className?: string }) {
  return (
    <aside
      className={`builder-panel builder-panel--palette${className ? ` ${className}` : ''}`}
    >
      <ComponentPalette />
      <BlockCanvas />
    </aside>
  );
}
