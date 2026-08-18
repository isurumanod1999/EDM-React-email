'use client';

import { useCallback, useEffect, useRef } from 'react';

export type PreviewScrollSnapshot = { outer: number; inner: number };

export function readPreviewScroll(
  outerEl: HTMLElement | null,
  iframeEl: HTMLIFrameElement | null
): PreviewScrollSnapshot {
  return {
    outer: outerEl?.scrollTop ?? 0,
    inner: iframeEl?.contentWindow?.scrollY ?? 0,
  };
}

/** Re-apply scroll after iframe srcDoc reload (may need a few frames for layout). */
export function applyPreviewScroll(
  outerEl: HTMLElement | null,
  iframeEl: HTMLIFrameElement | null,
  snapshot: PreviewScrollSnapshot
) {
  if (outerEl) outerEl.scrollTop = snapshot.outer;
  const win = iframeEl?.contentWindow;
  if (!win) return;

  const y = snapshot.inner;
  const apply = () => win.scrollTo(0, y);
  apply();
  requestAnimationFrame(() => {
    apply();
    requestAnimationFrame(apply);
  });
}

/**
 * Keeps preview pane scroll position when the iframe reloads on template edits.
 * Tracks outer container + iframe document scroll continuously, restores on load.
 */
export function usePreviewScrollRestore() {
  const outerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const scrollRef = useRef<PreviewScrollSnapshot>({ outer: 0, inner: 0 });
  const innerCleanupRef = useRef<(() => void) | null>(null);

  const onOuterScroll = useCallback(() => {
    scrollRef.current.outer = outerRef.current?.scrollTop ?? 0;
  }, []);

  const handleIframeLoad = useCallback((afterLoad?: () => void) => {
    innerCleanupRef.current?.();
    innerCleanupRef.current = null;

    applyPreviewScroll(outerRef.current, iframeRef.current, scrollRef.current);

    const win = iframeRef.current?.contentWindow;
    if (win) {
      const onInnerScroll = () => {
        scrollRef.current.inner = win.scrollY;
      };
      win.addEventListener('scroll', onInnerScroll, { passive: true });
      innerCleanupRef.current = () => win.removeEventListener('scroll', onInnerScroll);
    }

    afterLoad?.();
  }, []);

  useEffect(() => () => innerCleanupRef.current?.(), []);

  return { outerRef, iframeRef, onOuterScroll, handleIframeLoad };
}
