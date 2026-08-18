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
};

export const STYLE_BAG_ATTRS = new Set([
  'style',
  'mobileStyle',
  'containerStyle',
  'markdownContainerStyles',
  'markdownCustomStyles',
]);

/** Block wrapper reserved + common printable attrs are open for registry props. */
export const BLOCK_ATTR_RESERVED = new Set(['id', 'component', 'label', 'componentVersion']);
