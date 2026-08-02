'use client';

interface ImportProgressBannerProps {
  message: string;
}

/** Spinner + status text for long-running import/build/analyze operations. */
export function ImportProgressBanner({ message }: ImportProgressBannerProps) {
  return (
    <div className="import-modal-progress" role="status" aria-live="polite">
      <span className="import-modal-spinner" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
