'use client';

import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true'
  );
}

interface UseModalA11yOptions {
  open: boolean;
  onClose: () => void;
  /** When true, Escape and overlay click should not close the modal. */
  busy?: boolean;
  dialogRef: RefObject<HTMLElement | null>;
}

/**
 * Focus trap, Escape-to-close, and focus restoration for import/send modals.
 */
export function useModalA11y({ open, onClose, busy = false, dialogRef }: UseModalA11yOptions) {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const dialog = dialogRef.current;
    if (dialog) {
      const focusable = getFocusableElements(dialog);
      (focusable[0] ?? dialog).focus();
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || busy) return;
      e.preventDefault();
      onClose();
    };

    const onFocusIn = (e: FocusEvent) => {
      const container = dialogRef.current;
      if (!container || e.target instanceof Node === false) return;
      if (container.contains(e.target as Node)) return;

      const focusable = getFocusableElements(container);
      (focusable[0] ?? container).focus();
    };

    const onTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const container = dialogRef.current;
      if (!container) return;

      const focusable = getFocusableElements(container);
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (e.shiftKey) {
        if (active === first || !container.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keydown', onTab);
    document.addEventListener('focusin', onFocusIn);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keydown', onTab);
      document.removeEventListener('focusin', onFocusIn);

      const prev = previousFocusRef.current;
      if (prev && document.contains(prev)) {
        prev.focus();
      }
    };
  }, [open, busy, onClose, dialogRef]);
}
