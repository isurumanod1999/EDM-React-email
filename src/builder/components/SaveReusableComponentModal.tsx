'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import type { TemplateBlock } from '@/lib/schema/template';
import { useModalA11y } from '@/builder/hooks/useModalA11y';
import { useBuilderStore } from '@/builder/store/builderStore';
import { pushToast } from '@/builder/store/toastStore';

interface SaveReusableComponentModalProps {
  block: TemplateBlock;
  open: boolean;
  onClose: () => void;
}

export function SaveReusableComponentModal({
  block,
  open,
  onClose,
}: SaveReusableComponentModalProps) {
  const saveBlockAsReusable = useBuilderStore((state) => state.saveBlockAsReusable);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(block.label ?? '');
    setDescription('');
    setError(null);
  }, [open, block.label]);

  const handleClose = useCallback(() => {
    if (saving) return;
    setError(null);
    onClose();
  }, [saving, onClose]);

  useModalA11y({ open, onClose: handleClose, busy: saving, dialogRef });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Enter a name for this reusable component.');
      return;
    }

    setSaving(true);
    setError(null);
    const result = await saveBlockAsReusable(block.id, {
      name: trimmedName,
      description: description.trim() || undefined,
    });
    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    pushToast(`"${trimmedName}" added to reusable components`, 'success');
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="import-modal-overlay"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <div
        ref={dialogRef}
        className="import-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-reusable-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="import-modal-header">
          <div>
            <h2 id="save-reusable-title">Add to components</h2>
            <p className="import-modal-subtitle">
              Save this canvas component so it can be reused without importing Figma again.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleClose}
            disabled={saving}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="import-modal-body">
            <label className="import-modal-field">
              <span>Component name</span>
              <input
                className="import-modal-input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={100}
                required
                disabled={saving}
              />
            </label>
            <label className="import-modal-field">
              <span>Description (optional)</span>
              <textarea
                className="import-modal-textarea"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={500}
                rows={3}
                disabled={saving}
              />
            </label>
            {error ? (
              <div className="import-modal-error" role="alert">
                {error}
              </div>
            ) : null}
          </div>
          <div className="import-modal-footer">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving || !name.trim()}>
              {saving ? 'Adding...' : 'Add to components'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
