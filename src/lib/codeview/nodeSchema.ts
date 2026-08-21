import type { ReactEmailNode } from '@/lib/figma/types/reactEmailAst';

export const AST_ELEMENT_NAMES = new Set([
  'Section',
  'Container',
  'Row',
  'Column',
  'Text',
  'Heading',
  'Img',
  'Link',
  'Button',
  'Hr',
  'Spacer',
  'Preview',
  'Font',
  'CodeInline',
  'Markdown',
  'CodeBlock',
  'Html',
  'Body',
  'Head',
  'Tailwind',
]);

/** Human-readable list for UI hints and parse errors. */
export const REACT_EMAIL_COMPONENT_NAMES = [...AST_ELEMENT_NAMES].sort().join(', ');

export const BLOCK_ELEMENT_NAME = 'Block';

/** Attrs allowed on each AST node type (plus style bags handled separately). */
export const NODE_ATTR_WHITELIST: Record<ReactEmailNode['type'], Set<string>> = {
  Section: new Set(['style', 'mobileStyle']),
  Container: new Set(['style', 'mobileStyle']),
  Row: new Set(['style', 'mobileStyle']),
  Column: new Set(['style', 'mobileStyle', 'className', 'align']),
  Text: new Set([
    'content',
    'html',
    'mobileContent',
    'mobileHtml',
    'href',
    'style',
    'mobileStyle',
  ]),
  Heading: new Set([
    'content',
    'html',
    'mobileContent',
    'mobileHtml',
    'as',
    'href',
    'style',
    'mobileStyle',
  ]),
  Img: new Set([
    'src',
    'mobileSrc',
    'width',
    'height',
    'alt',
    'href',
    'className',
    'align',
    'isIcon',
    'fullBleed',
    'mobileStyle',
  ]),
  Link: new Set([
    'href',
    'content',
    'html',
    'mobileContent',
    'mobileHtml',
    'style',
    'mobileStyle',
  ]),
  Button: new Set([
    'href',
    'label',
    'mobileLabel',
    'style',
    'containerStyle',
    'mobileStyle',
  ]),
  Hr: new Set(['style', 'mobileStyle']),
  Spacer: new Set(['height']),
  Preview: new Set(['content']),
  Font: new Set(['fontFamily', 'fallbackFontFamily', 'webFont', 'fontStyle', 'fontWeight']),
  CodeInline: new Set(['content', 'style']),
  Markdown: new Set(['content', 'markdownContainerStyles', 'markdownCustomStyles']),
  CodeBlock: new Set(['code', 'language', 'themeName', 'lineNumbers', 'fontFamily']),
  Html: new Set(['lang', 'dir', 'style']),
  Body: new Set(['style']),
  Head: new Set([]),
  Tailwind: new Set(['config']),
};

export const STYLE_BAG_ATTRS = new Set([
  'style',
  'mobileStyle',
  'containerStyle',
  'markdownContainerStyles',
  'markdownCustomStyles',
]);

/** Accepted on every element that renders real markup. */
const COMMON_HTML_ATTRS = ['className', 'id', 'title', 'dir', 'lang', 'role'];

/** React Email `Section`/`Container`/`Row` all render a `<table>`. */
const TABLE_HTML_ATTRS = [
  ...COMMON_HTML_ATTRS,
  'align',
  'bgcolor',
  'border',
  'cellPadding',
  'cellSpacing',
  'width',
  'height',
  'summary',
];

/** `Column` renders a `<td>`. */
const CELL_HTML_ATTRS = [
  ...COMMON_HTML_ATTRS,
  'bgcolor',
  'colSpan',
  'rowSpan',
  'headers',
  'scope',
  'abbr',
  'valign',
  'width',
  'height',
];

const ANCHOR_HTML_ATTRS = [...COMMON_HTML_ATTRS, 'target', 'rel', 'download', 'name'];

/**
 * Attributes passed straight through to the underlying HTML element.
 *
 * React Email components are thin wrappers over real tags, so documented markup
 * such as `<Row cellSpacing={0}>` or `<Column colSpan={2}>` must parse. Anything
 * listed here is collected into the node's `attrs` bag rather than rejected.
 * Names already claimed by `NODE_ATTR_WHITELIST` stay first-class.
 */
export const HTML_PASSTHROUGH_ATTRS: Partial<Record<ReactEmailNode['type'], Set<string>>> = {
  Section: new Set(TABLE_HTML_ATTRS),
  Container: new Set(TABLE_HTML_ATTRS),
  Row: new Set(TABLE_HTML_ATTRS),
  Column: new Set(CELL_HTML_ATTRS),
  Text: new Set(COMMON_HTML_ATTRS),
  Heading: new Set(COMMON_HTML_ATTRS),
  Img: new Set([...COMMON_HTML_ATTRS, 'border', 'loading', 'srcSet', 'sizes']),
  Link: new Set(ANCHOR_HTML_ATTRS),
  Button: new Set(ANCHOR_HTML_ATTRS),
  Hr: new Set(COMMON_HTML_ATTRS),
  Html: new Set(COMMON_HTML_ATTRS),
  Body: new Set([...COMMON_HTML_ATTRS, 'bgcolor']),
};

/** `data-*` / `aria-*` are always safe to forward. */
export function isDataOrAriaAttr(name: string): boolean {
  return name.startsWith('data-') || name.startsWith('aria-');
}

/** True when `name` should be collected into the node's HTML `attrs` bag. */
export function isPassthroughAttr(type: ReactEmailNode['type'], name: string): boolean {
  if (isDataOrAriaAttr(name)) return true;
  return HTML_PASSTHROUGH_ATTRS[type]?.has(name) ?? false;
}

/** Block wrapper reserved + common printable attrs are open for registry props. */
export const BLOCK_ATTR_RESERVED = new Set(['id', 'component', 'label', 'componentVersion']);
