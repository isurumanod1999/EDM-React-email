'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDownIcon, ImportIcon } from '@/builder/components/icons';

interface ImportMenuProps {
  hasFigmaSession: boolean;
  sessionNodeName?: string;
  onFetch: () => void;
  onBuild: () => void;
  onBatch: () => void;
  onScreenshot: () => void;
}

export function ImportMenu({
  hasFigmaSession,
  sessionNodeName,
  onFetch,
  onBuild,
  onBatch,
  onScreenshot,
}: ImportMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const run = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <div className="import-menu" ref={menuRef}>
      {hasFigmaSession && (
        <button
          type="button"
          className="btn btn-secondary btn-sm btn-figma import-menu-build-quick"
          onClick={onBuild}
          title={`Build components from "${sessionNodeName ?? 'loaded frame'}"`}
        >
          Build from Figma
          <span className="figma-session-badge" title={sessionNodeName} aria-hidden="true" />
        </button>
      )}

      <button
        type="button"
        className="btn btn-secondary btn-sm import-menu-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <ImportIcon />
        Import
        <ChevronDownIcon className="import-menu-chevron" />
      </button>

      {open && (
        <div className="import-menu-dropdown" role="menu">
          <button type="button" className="import-menu-item" role="menuitem" onClick={() => run(onFetch)}>
            Fetch from Figma
          </button>
          <button
            type="button"
            className="import-menu-item"
            role="menuitem"
            onClick={() => run(onBuild)}
            disabled={!hasFigmaSession}
            title={hasFigmaSession ? undefined : 'Fetch a Figma frame first'}
          >
            Build from Figma
            {hasFigmaSession && (
              <span className="import-menu-item-badge" aria-hidden="true" />
            )}
          </button>
          <button type="button" className="import-menu-item" role="menuitem" onClick={() => run(onBatch)}>
            Batch Import
          </button>
          <button type="button" className="import-menu-item" role="menuitem" onClick={() => run(onScreenshot)}>
            Screenshot Upload
          </button>
        </div>
      )}
    </div>
  );
}
