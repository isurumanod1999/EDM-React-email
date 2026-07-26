'use client';

import { useState } from 'react';
import { useBuilderStore } from '@/builder/store/builderStore';

interface SendTestModalProps {
  open: boolean;
  onClose: () => void;
}

function parseRecipients(raw: string): string[] {
  return raw
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function SendTestModal({ open, onClose }: SendTestModalProps) {
  const template = useBuilderStore((s) => s.template);

  const [to, setTo] = useState('isuru.senanayake@akqa.com');
  const [subject, setSubject] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!open) return null;

  const recipients = parseRecipients(to);
  const canSend =
    !!template && template.blocks.length > 0 && recipients.length > 0 && !isSending;

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

  const handleClose = () => {
    setError(null);
    setSuccess(null);
    onClose();
  };

  return (
    <div className="import-modal-overlay" onClick={handleClose} role="presentation">
      <div
        className="import-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="send-test-title"
        aria-modal="true"
      >
        <div className="import-modal-header">
          <div>
            <h2 id="send-test-title">Send test email</h2>
            <p className="import-modal-subtitle">
              Renders the current canvas and sends it via Resend so you can preview in Gmail,
              Outlook, etc.
            </p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleClose}>
            ✕
          </button>
        </div>

        <div className="import-modal-body">
          <label className="field">
            <span className="field-label">Recipients</span>
            <input
              type="text"
              className="field-input"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="you@example.com, teammate@example.com"
              autoFocus
            />
            <span className="field-help">
              Separate multiple addresses with commas or spaces. Using the default Resend sender,
              delivery only works to your account email (isuru.senanayake@akqa.com) until you verify
              a domain.
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
            />
          </label>

          {error && <div className="import-modal-error">{error}</div>}
          {success && (
            <div className="import-modal-success" style={{ color: 'var(--success, #16a34a)' }}>
              {success}
            </div>
          )}
        </div>

        <div className="import-modal-footer">
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleClose}>
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
