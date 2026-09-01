import type { FigmaNodeDocument, FigmaPaint, FigmaVariable } from './client';

function colorToCss(
  color: { r: number; g: number; b: number; a?: number },
  fillOpacity = 1,
  nodeOpacity = 1
): string {
  const toByte = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255);
  const r = toByte(color.r);
  const g = toByte(color.g);
  const b = toByte(color.b);
  const a = Math.min(1, Math.max(0, (color.a ?? 1) * fillOpacity * nodeOpacity));

  if (a >= 0.999) {
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  }
  return `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(3))})`;
}

/**
 * Resolve a Figma color variable/token to a raw color, following alias chains
 * (a token can point at another token, e.g. `button/bg` → `brand/red/500`).
 */
function resolveVariableColorValue(
  variableId: string,
  variables: Record<string, FigmaVariable>,
  depth = 0
): { r: number; g: number; b: number; a?: number } | undefined {
  if (depth > 8) return undefined;
  const variable = variables[variableId];
  if (!variable?.valuesByMode) return undefined;

  const modeValue = Object.values(variable.valuesByMode)[0];
  if (modeValue && typeof modeValue === 'object') {
    if ('r' in modeValue) {
      return modeValue as { r: number; g: number; b: number; a?: number };
    }
    // Alias to another variable: { type: 'VARIABLE_ALIAS', id: '...' }
    const aliasId = (modeValue as { type?: string; id?: string }).id;
    if (aliasId) return resolveVariableColorValue(aliasId, variables, depth + 1);
  }
  return undefined;
}

function resolveVariableColor(
  variableId: string,
  variables: Record<string, FigmaVariable>
): string | undefined {
  const color = resolveVariableColorValue(variableId, variables);
  return color ? colorToCss(color) : undefined;
}

function resolveBoundFillColor(
  node: FigmaNodeDocument,
  variables?: Record<string, FigmaVariable>
): string | undefined {
  if (!variables || !node.boundVariables?.fills) return undefined;

  const aliases = Array.isArray(node.boundVariables.fills)
    ? node.boundVariables.fills
    : [node.boundVariables.fills];

  for (const alias of aliases) {
    if (alias?.id) {
      const color = resolveVariableColor(alias.id, variables);
      if (color) return color;
    }
  }
  return undefined;
}

function colorSaturation(color: { r: number; g: number; b: number }): number {
  const max = Math.max(color.r, color.g, color.b);
  const min = Math.min(color.r, color.g, color.b);
  return max - min;
}

/** A solid stop color, resolving a token binding on the stop if present. */
function stopColor(
  stop: { color?: { r: number; g: number; b: number; a?: number }; boundVariables?: { color?: { id?: string } } },
  variables?: Record<string, FigmaVariable>
): { r: number; g: number; b: number; a?: number } | undefined {
  const bound = stop.boundVariables?.color?.id;
  if (bound && variables) {
    const resolved = resolveVariableColorValue(bound, variables);
    if (resolved) return resolved;
  }
  return stop.color;
}

/**
 * Approximate a gradient with a single representative color (email clients can't
 * reproduce CSS gradients reliably). Prefer the most saturated, fully-opaque
 * stop — that's the brand/accent color a CTA pill or banner is built around —
 * falling back to the paint's flattened color.
 */
function pickGradientColor(
  paint: FigmaPaint,
  nodeOpacity: number,
  variables?: Record<string, FigmaVariable>
): string | undefined {
  const resolved = (paint.gradientStops ?? [])
    .map((s) => stopColor(s, variables))
    .filter((c): c is { r: number; g: number; b: number; a?: number } => !!c);

  if (resolved.length === 0) {
    return paint.color ? colorToCss(paint.color, paint.opacity ?? 1, nodeOpacity) : undefined;
  }

  const opaque = resolved.filter((c) => (c.a ?? 1) >= 0.9);
  const pool = opaque.length > 0 ? opaque : resolved;
  const best = [...pool].sort((a, b) => colorSaturation(b) - colorSaturation(a))[0];

  return colorToCss(best, paint.opacity ?? 1, nodeOpacity);
}

export function extractSolidFromPaints(
  paints: FigmaPaint[] | undefined,
  nodeOpacity = 1,
  variables?: Record<string, FigmaVariable>
): string | undefined {
  if (!paints?.length) return undefined;

  for (const fill of paints) {
    if (fill.visible === false) continue;

    // Design-system fills bind their color to a variable at the PAINT level
    // (fill.boundVariables.color) — resolve that token before anything else.
    const boundId = fill.boundVariables?.color?.id;
    if (boundId && variables) {
      const tokenColor = resolveVariableColorValue(boundId, variables);
      if (tokenColor) return colorToCss(tokenColor, fill.opacity ?? 1, nodeOpacity);
    }

    if (fill.type === 'SOLID' && fill.color) {
      return colorToCss(fill.color, fill.opacity ?? 1, nodeOpacity);
    }

    if (fill.type?.startsWith('GRADIENT_')) {
      const gradient = pickGradientColor(fill, nodeOpacity, variables);
      if (gradient) return gradient;
    }
  }

  return undefined;
}

export function extractBackgroundColor(
  node: FigmaNodeDocument,
  variables?: Record<string, FigmaVariable>
): string | undefined {
  const nodeOpacity = node.opacity ?? 1;
  const fromVariable = resolveBoundFillColor(node, variables);
  if (fromVariable) return fromVariable;

  const isShape =
    node.type === 'RECTANGLE' ||
    node.type === 'ELLIPSE' ||
    node.type === 'VECTOR' ||
    node.type === 'POLYGON';

  if (isShape) {
    const fromFills = extractSolidFromPaints(node.fills, nodeOpacity, variables);
    if (fromFills) return fromFills;
  }

  const fromBackground = extractSolidFromPaints(node.background, nodeOpacity, variables);
  if (fromBackground) return fromBackground;

  if (node.backgroundColor) {
    return colorToCss(node.backgroundColor, 1, nodeOpacity);
  }

  return extractSolidFromPaints(node.fills, nodeOpacity, variables);
}

export function extractTextColor(
  node: FigmaNodeDocument,
  variables?: Record<string, FigmaVariable>
): string | undefined {
  return (
    resolveBoundFillColor(node, variables) ??
    extractSolidFromPaints(node.fills, node.opacity ?? 1, variables)
  );
}

export function extractStrokeColor(
  node: FigmaNodeDocument,
  variables?: Record<string, FigmaVariable>
): string | undefined {
  return extractSolidFromPaints(node.strokes, node.opacity ?? 1, variables);
}

export function extractImageRef(fills?: FigmaPaint[]): string | undefined {
  const fill = fills?.find((f) => f.type === 'IMAGE' && f.visible !== false && f.imageRef);
  return fill?.imageRef;
}
