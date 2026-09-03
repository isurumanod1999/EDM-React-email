'use client';

import { useCallback, useRef, useState } from 'react';
import { useDismissableMenu } from '@/builder/hooks/useDismissableMenu';
import { DuplicateIcon, MoreIcon } from '@/builder/components/icons';

interface ToolbarOverflowMenuProps {
  showAdvanced: boolean;
  onToggleAdvanced: (next: boolean) => void;
  onDuplicate: () => void;
  duplicateDisabled?: boolean;
}

export function ToolbarOverflowMenu({
  showAdvanced,
  onToggleAdvanced,
  onDuplicate,
  duplicateDisabled = false,
}: ToolbarOverflowMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useDismissableMenu(open, menuRef, close);

  return (
    <div className="toolbar-menu" ref={menuRef}>
      <button
        type="button"
        className="btn btn-secondary btn-sm btn-icon"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="More actions"
        title="More actions"
      >
        <MoreIcon />
      </button>

      {open && (
        <div className="toolbar-menu-dropdown" role="menu">
          <button
            type="button"
            className="toolbar-menu-item"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onDuplicate();
            }}
            disabled={duplicateDisabled}
          >
            <DuplicateIcon />
            Duplicate template
          </button>

          <div className="toolbar-menu-separator" role="separator" />

          <label className="toolbar-menu-item toolbar-menu-item--checkbox">
            <input
              type="checkbox"
              checked={showAdvanced}
              onChange={(event) => onToggleAdvanced(event.target.checked)}
            />
            Show advanced properties
          </label>
        </div>
      )}
    </div>
  );
}
