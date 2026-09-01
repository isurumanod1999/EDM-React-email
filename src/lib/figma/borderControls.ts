import type { CSSProperties } from 'react';
import type { ReactEmailNode } from './types/reactEmailAst';

const BORDER_STYLE_KEYS = [
  'border',
  'borderTop',
  'borderRight',
  'borderBottom',
  'borderLeft',
  'borderColor',
  'borderWidth',
  'borderStyle',
] as const;

/** Swap the color token of a `1px solid #989898` shorthand, keeping width and style. */
function recolorBorder(value: unknown, color: string): unknown {
  if (typeof value !== 'string') return value;
  return value.replace(/(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|[a-zA-Z]+)\s*$/, color);
}

function overrideBorders(
  style: CSSProperties | undefined,
  hide: boolean,
  color: string | undefined
): CSSProperties | undefined {
  if (!style) return style;
  let changed = false;
  const next: Record<string, unknown> = { ...style };
  for (const key of BORDER_STYLE_KEYS) {
    if (next[key] == null) continue;
    changed = true;
    if (hide) delete next[key];
    else if (color) next[key] = key === 'borderColor' ? color : recolorBorder(next[key], color);
  }
  return changed ? (next as CSSProperties) : style;
}

/**
 * Apply a Figma block's border controls over its imported tree.
 *
 * Figma decides which borders a design has, but a designer still needs to
 * recolor or drop them without hand-editing the AST JSON. Returns a copy so the
 * imported tree is never mutated and clearing the controls restores the design.
 */
export function applyBorderControls(
  node: ReactEmailNode,
  hide: boolean,
  color: string | undefined
): ReactEmailNode {
  const styled = node as { style?: CSSProperties; mobileStyle?: CSSProperties };
  const next = { ...node } as ReactEmailNode & {
    style?: CSSProperties;
    mobileStyle?: CSSProperties;
  };
  next.style = overrideBorders(styled.style, hide, color);
  next.mobileStyle = overrideBorders(styled.mobileStyle, hide, color);
  if ('children' in next && Array.isArray(next.children)) {
    (next as { children: ReactEmailNode[] }).children = next.children.map((child) =>
      applyBorderControls(child, hide, color)
    );
  }
  return next;
}
