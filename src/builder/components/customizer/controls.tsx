'use client';

import type { CSSProperties } from 'react';

/**
 * Small, reusable inputs for the component customizer inspector. They mirror the
 * styling of the registry-driven FieldRenderer (same `.field` / `.field-input`
 * classes) but operate directly on plain values, so they can edit arbitrary AST
 * node fields and CSS properties.
 */

interface BaseProps {
  label: string;
}

export function TextControl({
  label,
  value,
  onChange,
  placeholder,
}: BaseProps & {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <input
        className="field-input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function TextAreaControl({
  label,
  value,
  onChange,
}: BaseProps & { value: string; onChange: (v: string) => void }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <textarea
        className="field-textarea"
        value={value}
        rows={3}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function ColorControl({
  label,
  value,
  onChange,
}: BaseProps & { value: string | undefined; onChange: (v: string | undefined) => void }) {
  const current = value ?? '';
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="color"
          value={isHex(current) ? current : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: 40, height: 36, padding: 2, cursor: 'pointer', flexShrink: 0 }}
        />
        <input
          className="field-input"
          value={current}
          placeholder="#000000 / transparent"
          onChange={(e) => onChange(e.target.value === '' ? undefined : e.target.value)}
        />
      </div>
    </div>
  );
}

export function NumberControl({
  label,
  value,
  onChange,
  min,
  suffix = 'px',
}: BaseProps & {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  min?: number;
  suffix?: string;
}) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type="number"
          className="field-input"
          min={min}
          value={value === undefined ? '' : value}
          onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        />
        {suffix && (
          <span
            style={{
              position: 'absolute',
              right: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '0.72rem',
              color: 'var(--text-secondary)',
              pointerEvents: 'none',
            }}
          >
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

export function SelectControl({
  label,
  value,
  options,
  onChange,
}: BaseProps & {
  value: string | undefined;
  options: { value: string; label: string }[];
  onChange: (v: string | undefined) => void;
}) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <select
        className="field-select"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? undefined : e.target.value)}
      >
        <option value="">Default</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Top / Right / Bottom / Left numeric editor for padding or margin. */
export function SpacingControl({
  label,
  sides,
  onChange,
}: BaseProps & {
  sides: BoxSides;
  onChange: (sides: BoxSides) => void;
}) {
  const fields: { key: keyof BoxSides; abbr: string }[] = [
    { key: 'top', abbr: 'T' },
    { key: 'right', abbr: 'R' },
    { key: 'bottom', abbr: 'B' },
    { key: 'left', abbr: 'L' },
  ];
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <div className="fc-spacing-grid">
        {fields.map(({ key, abbr }) => (
          <label key={key} className="fc-spacing-cell">
            <span className="fc-spacing-abbr">{abbr}</span>
            <input
              type="number"
              min={0}
              className="field-input"
              value={sides[key] ?? 0}
              onChange={(e) =>
                onChange({ ...sides, [key]: e.target.value === '' ? 0 : Number(e.target.value) })
              }
            />
          </label>
        ))}
      </div>
    </div>
  );
}

// ── value helpers ────────────────────────────────────────────────────────────

export interface BoxSides {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

function isHex(v: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim());
}

/** Parse a CSS length to a number (px assumed). Returns undefined if unparsable. */
export function pxToNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const m = value.trim().match(/^-?\d*\.?\d+/);
    if (m) return Number(m[0]);
  }
  return undefined;
}

export function toPx(n: number | undefined): string | undefined {
  return n === undefined ? undefined : `${n}px`;
}

function parseShorthand(value: unknown): BoxSides {
  if (typeof value === 'number') {
    return { top: value, right: value, bottom: value, left: value };
  }
  if (typeof value === 'string') {
    const parts = value
      .trim()
      .split(/\s+/)
      .map((p) => pxToNumber(p) ?? 0);
    const [a = 0, b = a, c = a, d = b] = parts;
    // CSS order: top right bottom left
    return { top: a, right: b, bottom: c, left: d };
  }
  return { top: 0, right: 0, bottom: 0, left: 0 };
}

/** Read effective T/R/B/L for a box property (`padding` | `margin`). */
export function readSpacing(
  style: CSSProperties | undefined,
  base: 'padding' | 'margin'
): BoxSides {
  const s = (style ?? {}) as Record<string, unknown>;
  const sides = parseShorthand(s[base]);
  const map: Record<keyof BoxSides, string> = {
    top: `${base}Top`,
    right: `${base}Right`,
    bottom: `${base}Bottom`,
    left: `${base}Left`,
  };
  (Object.keys(map) as (keyof BoxSides)[]).forEach((side) => {
    const v = pxToNumber(s[map[side]]);
    if (v !== undefined) sides[side] = v;
  });
  return sides;
}

/**
 * Build a style patch that writes the four side properties (as numbers) and
 * clears the shorthand, so the edit is unambiguous. `undefined` shorthand is
 * dropped by the store's updateNodeStyle.
 */
export function spacingPatch(
  base: 'padding' | 'margin',
  sides: BoxSides
): Record<string, number | undefined> {
  return {
    [base]: undefined,
    [`${base}Top`]: sides.top,
    [`${base}Right`]: sides.right,
    [`${base}Bottom`]: sides.bottom,
    [`${base}Left`]: sides.left,
  };
}
