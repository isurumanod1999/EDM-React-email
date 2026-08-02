'use client';

import { useEffect } from 'react';
import { useBuilderStore } from '@/builder/store/builderStore';

const LEAVE_MESSAGE = 'You have unsaved changes. Leave without saving?';

/** Returns true when navigation may proceed. */
export function confirmLeaveIfDirty(): boolean {
  const { isDirty } = useBuilderStore.getState();
  if (!isDirty) return true;
  return window.confirm(LEAVE_MESSAGE);
}

/**
 * Warn on tab close and intercept same-origin link clicks when the template is dirty.
 */
export function useUnsavedChangesGuard(enabled = true): void {
  const isDirty = useBuilderStore((s) => s.isDirty);

  useEffect(() => {
    if (!enabled || !isDirty) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [enabled, isDirty]);

  useEffect(() => {
    if (!enabled || !isDirty) return;

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as HTMLElement).closest('a');
      if (!anchor || anchor.target === '_blank') return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:'))
        return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search)
        return;

      if (!window.confirm(LEAVE_MESSAGE)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [enabled, isDirty]);
}
