/** Reserved `<Block>` attributes — not taken from `props`. */
export const BLOCK_RESERVED_ATTRS = new Set(['id', 'component', 'label']);

/** Props never printed as attributes (tree becomes the child; rest are editor/runtime-only). */
export const FIGMA_SKIP_ATTRS = new Set([
  'tree',
  'editable',
  'blockId',
  'emitResponsiveStyles',
]);

/** Wrap attributes one-per-line past this width. */
export const DEFAULT_MAX_LINE_LENGTH = 100;

export interface PrintOptions {
  /** Spaces per indent level. Default 2. */
  indentSize?: number;
  /** Column at which an element breaks to one attribute per line. Default 100. */
  maxLineLength?: number;
}
