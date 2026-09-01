'use client';

import { useCallback, useRef, useState } from 'react';
import { useModalA11y } from '@/builder/hooks/useModalA11y';
import { useBuilderStore } from '@/builder/store/builderStore';

interface SendTestModalProps {
  open: boolean;
  onClose: () => void;
}

const DEFAULT_RECIPIENT = process.env.NEXT_PUBLIC_TEST_EMAIL_DEFAULT?.trim() ?? '';

function parseRecipients(raw: string): string[] {
  return raw
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function SendTestModal({ open, onClose }: SendTestModalProps) {
  const template = useBuilderStore((s) => s.template);
  const dialogRef = useRef<HTMLDivElement>(null);

  const [to, setTo] = useState(DEFAULT_RECIPIENT);
  const [subject, setSubject] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const recipients = parseRecipients(to);
  const invalidEmails = recipients.filter((r) => !isValidEmail(r));
  const canSend =
    !!template &&
    template.blocks.length > 0 &&
    recipients.length > 0 &&
    invalidEmails.length === 0 &&
    !isSending;

  const handleClose = useCallback(() => {
    if (isSending) return;
    setError(null);
    setSuccess(null);
    onClose();
  }, [isSending, onClose]);

  useModalA11y({ open, onClose: handleClose, busy: isSending, dialogRef });

  const handleSend = async () => {
    if (!template) return;

    if (template.blocks.length === 0) {
      setError('Add at least one component to the canvas before sending.');
      return;
    }
    if (recipients.length === 0) {
      setError('Enter at least one recipient email address.');
      return;
    }
    if (invalidEmails.length > 0) {
      setError(`Invalid email address: ${invalidEmails.join(', ')}`);
      return;
    }

    setIsSending(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipients,
          subject: subject.trim() || undefined,
          name: template.name,
          meta: template.meta,
          blocks: template.blocks,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : `Send failed (${res.status})`);
      }

      setSuccess(
        `Sent to ${recipients.join(', ')}${data.id ? ` (id: ${data.id})` : ''}. Check the inbox (and spam).`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (isSending) return;
    if (e.target === e.currentTarget) handleClose();
  };

  if (!open) return null;

  return (
    <div className="import-modal-overlay" onClick={handleOverlayClick} role="presentation">
      <div
        ref={dialogRef}
        className="import-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="send-test-title"
        aria-modal="true"
        tabIndex={-1}
      >
        <div className="import-modal-header">
          <div>
            <h2 id="send-test-title">Send test email</h2>
            <p className="import-modal-subtitle">
              Renders the current canvas and sends it via Resend so you can preview in Gmail,
              Outlook, etc.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleClose}
            disabled={isSending}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <div className="import-modal-body">
          {isSending && (
            <div className="import-modal-progress" role="status" aria-live="polite">
              <span className="import-modal-spinner" aria-hidden="true" />
              <span>Sending test email…</span>
            </div>
          )}

          <label className="field">
            <span className="field-label">Recipients</span>
            <input
              type="text"
              className="field-input"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="you@example.com, teammate@example.com"
              autoFocus
              disabled={isSending}
            />
            <span className="field-help">
              Separate multiple addresses with commas or spaces. With the default Resend sender
              (onboarding@resend.dev), delivery only works to your verified account email until you
              verify a domain and set RESEND_FROM.
            </span>
          </label>

          <label className="field">
            <span className="field-label">Subject</span>
            <input
              type="text"
              className="field-input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={template?.name || 'Test email'}
              disabled={isSending}
            />
          </label>

          {invalidEmails.length > 0 && !error && (
            <div className="import-modal-error">Invalid email: {invalidEmails.join(', ')}</div>
          )}

          {error && <div className="import-modal-error">{error}</div>}
          {success && (
            <div className="import-modal-success" style={{ color: 'var(--success, #16a34a)' }}>
              {success}
            </div>
          )}
        </div>

        <div className="import-modal-footer">
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleClose} disabled={isSending}>
            {success ? 'Close' : 'Cancel'}
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleSend}
            disabled={!canSend}
          >
            {isSending ? 'Sending...' : 'Send test email'}
          </button>
        </div>
      </div>
    </div>
  );
}
