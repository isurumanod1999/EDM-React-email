'use client';

import { useCallback, useRef, useState } from 'react';

interface ImageUploadFieldProps {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
  required?: boolean;
  hint?: string;
}

export function ImageUploadField({
  label,
  value,
  onChange,
  required,
  hint,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const uploadFile = useCallback(
    async (file: File) => {
      setIsUploading(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/assets/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? 'Upload failed');
        }

        onChange(data.url);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setIsUploading(false);
      }
    },
    [onChange]
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file) uploadFile(file);
    },
    [uploadFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  return (
    <div className="ai-upload-field">
      <label className="ai-upload-label">
        {label}
        {required && <span className="ai-upload-required"> *</span>}
      </label>
      {hint && <p className="ai-upload-hint">{hint}</p>}

      <div
        className={`ai-upload-dropzone ${isDragging ? 'ai-upload-dropzone-active' : ''} ${value ? 'ai-upload-dropzone-has-image' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !isUploading && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="ai-upload-input"
          onChange={(e) => handleFiles(e.target.files)}
        />

        {value ? (
          <div className="ai-upload-preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="Upload preview" className="ai-upload-preview-img" />
            <div className="ai-upload-preview-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  inputRef.current?.click();
                }}
                disabled={isUploading}
              >
                Replace
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(null);
                }}
                disabled={isUploading}
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="ai-upload-placeholder">
            {isUploading ? (
              <span>Uploading...</span>
            ) : (
              <>
                <span className="ai-upload-icon">+</span>
                <span>Drop image or click to upload</span>
                <span className="ai-upload-formats">PNG, JPEG, WebP, GIF</span>
              </>
            )}
          </div>
        )}
      </div>

      {error && <p className="ai-upload-error">{error}</p>}
    </div>
  );
}
