'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import type { FieldDefinition } from '@/lib/registry/types';
import { getNestedValue } from '@/builder/utils/props';

interface FieldRendererProps {
  field: FieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  selected?: boolean;
}

function FieldShell({
  fieldKey,
  selected,
  children,
}: {
  fieldKey: string;
  selected?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!selected || !ref.current) return;
    ref.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selected]);

  return (
    <div
      ref={ref}
      className={selected ? 'field field--selected' : 'field'}
      data-field-key={fieldKey}
    >
      {children}
    </div>
  );
}

export function FieldRenderer({ field, value, onChange, selected }: FieldRendererProps) {
  const id = `field-${field.key.replace(/\./g, '-')}`;

  if (field.type === 'boolean') {
    return (
      <FieldShell fieldKey={field.key} selected={selected}>
        <label className="field-checkbox-row" htmlFor={id}>
          <input
            id={id}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span className="field-label" style={{ margin: 0 }}>
            {field.label}
          </span>
        </label>
      </FieldShell>
    );
  }

  if (field.type === 'select' && field.options) {
    return (
      <FieldShell fieldKey={field.key} selected={selected}>
        <label className="field-label" htmlFor={id}>
          {field.label}
        </label>
        <select
          id={id}
          className="field-select"
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
        >
          {field.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FieldShell>
    );
  }

  if (field.type === 'number') {
    return (
      <FieldShell fieldKey={field.key} selected={selected}>
        <label className="field-label" htmlFor={id}>
          {field.label}
        </label>
        <input
          id={id}
          type="number"
          className="field-input"
          value={value === undefined || value === null ? '' : Number(value)}
          onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
          placeholder={field.placeholder}
        />
      </FieldShell>
    );
  }

  if (field.type === 'color') {
    return (
      <FieldShell fieldKey={field.key} selected={selected}>
        <label className="field-label" htmlFor={id}>
          {field.label}
        </label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="color"
            value={String(value ?? '#000000')}
            onChange={(e) => onChange(e.target.value)}
            style={{ width: 40, height: 36, padding: 2, cursor: 'pointer' }}
          />
          <input
            type="text"
            className="field-input"
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#000000"
          />
        </div>
      </FieldShell>
    );
  }

  if (field.type === 'richtext' || field.type === 'json') {
    const displayValue =
      field.type === 'json' && typeof value === 'object'
        ? JSON.stringify(value, null, 2)
        : String(value ?? '');

    return (
      <FieldShell fieldKey={field.key} selected={selected}>
        <label className="field-label" htmlFor={id}>
          {field.label}
        </label>
        <textarea
          id={id}
          className="field-textarea"
          value={displayValue}
          onChange={(e) => {
            if (field.type === 'json') {
              try {
                onChange(JSON.parse(e.target.value));
              } catch {
                onChange(e.target.value);
              }
            } else {
              onChange(e.target.value);
            }
          }}
          placeholder={field.placeholder}
          rows={field.type === 'json' ? 8 : 4}
        />
        {field.helpText && <p className="field-help">{field.helpText}</p>}
      </FieldShell>
    );
  }

  const inputType = field.type === 'url' || field.type === 'image' ? 'url' : 'text';

  return (
    <FieldShell fieldKey={field.key} selected={selected}>
      <label className="field-label" htmlFor={id}>
        {field.label}
      </label>
      <input
        id={id}
        type={inputType}
        className="field-input"
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
      />
      {field.helpText && <p className="field-help">{field.helpText}</p>}
    </FieldShell>
  );
}

export function getFieldValue(props: Record<string, unknown>, key: string): unknown {
  return getNestedValue(props, key);
}
