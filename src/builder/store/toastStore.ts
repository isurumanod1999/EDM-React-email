import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastState {
  toasts: Toast[];
  push: (message: string, variant?: ToastVariant, durationMs?: number) => void;
  dismiss: (id: string) => void;
}

function nextToastId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push(message, variant = 'info', durationMs = 4000) {
    const id = nextToastId();
    set((state) => ({
      toasts: [...state.toasts, { id, message, variant }],
    }));
    if (durationMs > 0) {
      window.setTimeout(() => get().dismiss(id), durationMs);
    }
  },
  dismiss(id) {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));

/** Fire-and-forget helper for use outside React components. */
export function pushToast(
  message: string,
  variant: ToastVariant = 'info',
  durationMs = 4000
): void {
  useToastStore.getState().push(message, variant, durationMs);
}
