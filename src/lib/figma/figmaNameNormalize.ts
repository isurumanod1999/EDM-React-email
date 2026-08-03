/**
 * Normalize Figma layer names for component-link matching.
 * Strips leading emoji/status markers, underscores, and extra whitespace.
 */
export function normalizeFigmaLayerName(name: string): string {
  return name
    .replace(/^[\s_🟢🔴🟡⚪️✅❌]+/u, '')
    .replace(/^[_\s]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Lowercase normalized name for loose comparisons (Opening vs opening). */
export function normalizedLayerKey(name: string): string {
  return normalizeFigmaLayerName(name).toLowerCase();
}
