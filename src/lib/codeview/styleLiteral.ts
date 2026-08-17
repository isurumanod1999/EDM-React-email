import type { CSSProperties } from 'react';

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/** Stable key order so print is deterministic. */
function sortedEntries(obj: Record<string, unknown>): Array<[string, unknown]> {
  return Object.keys(obj)
    .sort()
    .map((k) => [k, obj[k]] as [string, unknown]);
}

/**
 * Print a JSON-compatible literal for use inside a JSX expression.
 * Spaced/rounded formatting keeps generated code scannable.
 */
export function printJsLiteral(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return `[${value.map((v) => printJsLiteral(v)).join(', ')}]`;
  }
  if (typeof value === 'object') {
    const entries = sortedEntries(value as Record<string, unknown>);
    if (entries.length === 0) return '{}';
    const body = entries
      .map(([k, v]) => `${IDENTIFIER.test(k) ? k : JSON.stringify(k)}: ${printJsLiteral(v)}`)
      .join(', ');
    return `{ ${body} }`;
  }
  return JSON.stringify(String(value));
}

/** Print a React CSSProperties object as `{ a: 1, b: "2" }`. */
export function printStyleLiteral(style: CSSProperties | undefined): string | undefined {
  if (!style || Object.keys(style).length === 0) return undefined;
  return printJsLiteral(style as Record<string, unknown>);
}
