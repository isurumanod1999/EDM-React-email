'use client';

import { useToastStore } from '@/builder/store/toastStore';

export function BuilderToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div className="builder-toast-stack" role="status" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`builder-toast builder-toast--${toast.variant}`}
        >
          <span className="builder-toast-message">{toast.message}</span>
          <button
            type="button"
            className="builder-toast-dismiss"
            onClick={() => dismiss(toast.id)}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
