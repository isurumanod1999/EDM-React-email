'use client';

export type MobileDrawer = 'components' | 'properties' | null;

interface BuilderMobileNavProps {
  activeDrawer: MobileDrawer;
  onSelect: (drawer: MobileDrawer) => void;
}

/**
 * Bottom navigation for narrow viewports (Builder Polish #1).
 * Keeps the preview as the primary viewport; components/structure and properties open as drawers.
 */
export function BuilderMobileNav({ activeDrawer, onSelect }: BuilderMobileNavProps) {
  return (
    <nav className="builder-mobile-nav" aria-label="Editor panels">
      <button
        type="button"
        className={`builder-mobile-nav-btn${activeDrawer === 'components' ? ' is-active' : ''}`}
        onClick={() => onSelect(activeDrawer === 'components' ? null : 'components')}
        aria-pressed={activeDrawer === 'components'}
      >
        Components
      </button>
      <button
        type="button"
        className={`builder-mobile-nav-btn${activeDrawer === null ? ' is-active' : ''}`}
        onClick={() => onSelect(null)}
        aria-pressed={activeDrawer === null}
      >
        Preview
      </button>
      <button
        type="button"
        className={`builder-mobile-nav-btn${activeDrawer === 'properties' ? ' is-active' : ''}`}
        onClick={() => onSelect(activeDrawer === 'properties' ? null : 'properties')}
        aria-pressed={activeDrawer === 'properties'}
      >
        Properties
      </button>
    </nav>
  );
}
