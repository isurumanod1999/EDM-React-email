import type { CSSProperties } from 'react';

/**
 * Pure mobile-typography helpers, kept free of any React Email imports.
 *
 * `@react-email/components` is listed in `serverComponentsExternalPackages`, so
 * importing it from a client component leaves every export `undefined` during
 * the SSR pass. The builder's customizer needs `autoMobileStyle` on the client,
 * hence this module.
 */

export function parsePx(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const m = value.match(/^([\d.]+)px$/);
    if (m) return parseFloat(m[1]);
  }
  return undefined;
}

/**
 * Desktop→mobile font-size scale used when a node has NO explicit mobile style
 * (e.g. desktop-only imports, or campaigns built before mobile support). Large
 * display type shrinks hardest (a 42px headline overflows a phone); readable
 * body/legal copy (≤17px) is left untouched. Mirrors how a designer down-scales
 * a desktop artboard to mobile.
 */
export function scaleMobileFontSize(fs: number): number {
  if (fs >= 40) return Math.round(fs * 0.62); // 42 → 26
  if (fs >= 32) return Math.round(fs * 0.7); //  36 → 25
  if (fs >= 26) return Math.round(fs * 0.78); // 28 → 22
  if (fs >= 22) return Math.round(fs * 0.85); // 24 → 20
  if (fs >= 20) return 18; //                    20/21 → 18
  if (fs >= 18) return 16; //                    18/19 → 16
  return fs; //                                  ≤17px: keep
}

/** Proportional mobile typography derived from a node's inline desktop style. */
export function autoMobileStyle(style?: CSSProperties): CSSProperties | undefined {
  const fs = parsePx(style?.fontSize);
  if (!fs) return undefined;
  const mfs = scaleMobileFontSize(fs);
  if (mfs >= fs) return undefined;
  const out: CSSProperties = { fontSize: `${mfs}px` };
  const lh = parsePx(style?.lineHeight);
  if (lh) out.lineHeight = `${Math.round(mfs * (lh / fs))}px`;
  return out;
}
