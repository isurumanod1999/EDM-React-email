import * as acorn from 'acorn';
import jsx from 'acorn-jsx';
import type { CSSProperties } from 'react';
import type { TemplateBlock } from '@/lib/schema/template';
import type { HtmlAttrs, ReactEmailNode } from '@/lib/figma/types/reactEmailAst';
import { generateId } from '@/lib/utils/id';
import { evaluateLiteral } from '@/lib/codeview/evaluateLiteral';
import { fail, CodeViewParseError } from '@/lib/codeview/parseError';
import {
  AST_ELEMENT_NAMES,
  BLOCK_ATTR_RESERVED,
  BLOCK_ELEMENT_NAME,
  NODE_ATTR_WHITELIST,
  REACT_EMAIL_COMPONENT_NAMES,
  STYLE_BAG_ATTRS,
  isPassthroughAttr,
} from '@/lib/codeview/nodeSchema';

const JsxParser = acorn.Parser.extend(jsx() as never);

type Loc = { start: { line: number; column: number } };

type JsxName = { type: string; name?: string; object?: JsxName; property?: JsxName };

type JsxAttr = {
  type: string;
  name?: { name: string; loc?: Loc | null };
  value?: AnyNode | null;
  loc?: Loc | null;
};

type AnyNode = {
  type: string;
  loc?: Loc | null;
  openingElement?: {
    name: JsxName;
    attributes: JsxAttr[];
    selfClosing?: boolean;
    loc?: Loc | null;
  };
  closingElement?: { name: JsxName };
  children?: AnyNode[];
  expression?: AnyNode;
  value?: unknown;
  name?: string;
};

function elementName(name: JsxName): string {
  if (name.type === 'JSXIdentifier') return name.name ?? '';
  if (name.type === 'JSXMemberExpression') {
    return `${elementName(name.object!)}.${elementName(name.property!)}`;
  }
  return '';
}

function withOffset(node: AnyNode | null | undefined, lineOffset: number): AnyNode | null {
  if (!node?.loc) return node ?? null;
  return {
    ...node,
    loc: {
      start: {
        line: Math.max(1, node.loc.start.line - lineOffset),
        column: node.loc.start.column,
      },
    },
  };
}

function readAttrs(attributes: JsxAttr[], lineOffset: number): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const raw of attributes) {
    const a = withOffset(raw as AnyNode, lineOffset);
    if (raw.type === 'JSXSpreadAttribute') {
      fail('JSX spread attributes are not allowed', a);
    }
    if (raw.type !== 'JSXAttribute' || !raw.name) {
      fail('Unsupported JSX attribute', a);
    }
    const key = raw.name.name;
    if (raw.value == null) {
      out[key] = true;
      continue;
    }
    if (raw.value.type === 'Literal') {
      out[key] = raw.value.value;
      continue;
    }
    if (raw.value.type === 'JSXExpressionContainer') {
      out[key] = evaluateLiteral(withOffset(raw.value.expression, lineOffset));
      continue;
    }
    fail(`Unsupported attribute value for "${key}"`, withOffset(raw.value, lineOffset));
  }
  return out;
}

function elementChildren(node: AnyNode): AnyNode[] {
  return (node.children ?? []).filter((c) => {
    if (c.type === 'JSXText') return /\S/.test(String(c.value ?? ''));
    if (c.type === 'JSXExpressionContainer' && c.expression?.type === 'JSXEmptyExpression') {
      return false;
    }
    return c.type === 'JSXElement' || c.type === 'JSXFragment';
  });
}

/**
 * Expand `<>...</>` wrappers in place. Fragments are pure grouping syntax with
 * no email output, and docs snippets lean on them heavily, so they must not
 * reach the node parser.
 */
function flattenFragments(nodes: AnyNode[]): AnyNode[] {
  const out: AnyNode[] = [];
  for (const node of nodes) {
    if (node.type === 'JSXFragment') {
      out.push(...flattenFragments(elementChildren(node)));
      continue;
    }
    out.push(node);
  }
  return out;
}

function parseLayoutChildren(node: AnyNode, lineOffset: number): ReactEmailNode[] {
  const out: ReactEmailNode[] = [];
  for (const raw of flattenFragments(elementChildren(node))) {
    if (raw.type === 'JSXText') {
      const text = String(raw.value ?? '').replace(/\s+/g, ' ').trim();
      if (!text) continue;
      out.push({ type: 'Text', content: text });
      continue;
    }
    out.push(parseAstNode(raw, lineOffset));
  }
  return out;
}

function columnAlign(value: unknown): 'left' | 'center' | 'right' | undefined {
  if (value === 'left' || value === 'center' || value === 'right') return value;
  return undefined;
}

function styleOf(value: unknown): CSSProperties | undefined {
  if (value == null) return undefined;
  if (typeof value !== 'object' || Array.isArray(value)) {
    fail('Style attributes must be object literals');
  }
  return value as CSSProperties;
}

function parseAstNode(node: AnyNode, lineOffset: number): ReactEmailNode {
  const n = withOffset(node, lineOffset)!;
  if (node.type !== 'JSXElement' || !node.openingElement) {
    fail('Expected a JSX element', n);
  }
  const typeName = elementName(node.openingElement.name);
  if (typeName.includes('.')) {
    fail(`Member components like "${typeName}" are not allowed`, n);
  }
  if (!AST_ELEMENT_NAMES.has(typeName)) {
    fail(`Unknown element <${typeName}>. Allowed: ${REACT_EMAIL_COMPONENT_NAMES}`, n);
  }

  const type = typeName as ReactEmailNode['type'];
  const raw = readAttrs(node.openingElement.attributes, lineOffset);
  const whitelist = NODE_ATTR_WHITELIST[type];

  // First-class props stay in `attrs`; documented HTML props (cellPadding,
  // colSpan, target, data-*) go to the pass-through bag instead of erroring.
  const attrs: Record<string, unknown> = {};
  const passthrough: HtmlAttrs = {};
  for (const [key, value] of Object.entries(raw)) {
    if (whitelist.has(key)) {
      attrs[key] = value;
      continue;
    }
    if (isPassthroughAttr(type, key)) {
      passthrough[key] = value as HtmlAttrs[string];
      continue;
    }
    fail(`Attribute "${key}" is not allowed on <${typeName}>`, n);
  }
  const htmlAttrs = Object.keys(passthrough).length ? passthrough : undefined;

  const kids = parseLayoutChildren(node, lineOffset);

  switch (type) {
    case 'Section':
    case 'Container':
    case 'Row':
      return cleanNode({
        type: typeName as 'Section' | 'Container' | 'Row',
        style: styleOf(attrs.style),
        mobileStyle: styleOf(attrs.mobileStyle),
        attrs: htmlAttrs,
        children: kids,
      });
    case 'Column':
      return cleanNode({
        type: 'Column',
        style: styleOf(attrs.style),
        mobileStyle: styleOf(attrs.mobileStyle),
        className: attrs.className as string | undefined,
        align: columnAlign(attrs.align),
        attrs: htmlAttrs,
        children: kids,
      });
    case 'Text':
      if (kids.length) fail('<Text> cannot have children — use content/html attributes', n);
      return cleanNode({
        type: 'Text',
        content: typeof attrs.content === 'string' ? attrs.content : '',
        html: attrs.html as string | undefined,
        mobileContent: attrs.mobileContent as string | undefined,
        mobileHtml: attrs.mobileHtml as string | undefined,
        href: attrs.href as string | undefined,
        style: styleOf(attrs.style),
        mobileStyle: styleOf(attrs.mobileStyle),
        attrs: htmlAttrs,
      });
    case 'Heading':
      if (kids.length) fail('<Heading> cannot have children — use content/html attributes', n);
      return cleanNode({
        type: 'Heading',
        content: typeof attrs.content === 'string' ? attrs.content : '',
        html: attrs.html as string | undefined,
        mobileContent: attrs.mobileContent as string | undefined,
        mobileHtml: attrs.mobileHtml as string | undefined,
        as: attrs.as as 'h1' | 'h2' | 'h3' | undefined,
        href: attrs.href as string | undefined,
        style: styleOf(attrs.style),
        mobileStyle: styleOf(attrs.mobileStyle),
        attrs: htmlAttrs,
      });
    case 'Img':
      if (kids.length) fail('<Img> cannot have children', n);
      if (typeof attrs.src !== 'string') fail('<Img> requires a string src attribute', n);
      return cleanNode({
        type: 'Img',
        src: attrs.src,
        mobileSrc: attrs.mobileSrc as string | undefined,
        width: attrs.width as number | undefined,
        height: attrs.height as number | undefined,
        alt: attrs.alt as string | undefined,
        href: attrs.href as string | undefined,
        className: attrs.className as string | undefined,
        align: attrs.align as 'left' | 'center' | 'right' | undefined,
        isIcon: attrs.isIcon as boolean | undefined,
        fullBleed: attrs.fullBleed as boolean | undefined,
        mobileStyle: styleOf(attrs.mobileStyle),
        attrs: htmlAttrs,
      });
    case 'Link':
      if (kids.length) fail('<Link> cannot have children — use content/html attributes', n);
      if (typeof attrs.href !== 'string') fail('<Link> requires a string href attribute', n);
      return cleanNode({
        type: 'Link',
        href: attrs.href,
        content: typeof attrs.content === 'string' ? attrs.content : '',
        html: attrs.html as string | undefined,
        mobileContent: attrs.mobileContent as string | undefined,
        mobileHtml: attrs.mobileHtml as string | undefined,
        style: styleOf(attrs.style),
        mobileStyle: styleOf(attrs.mobileStyle),
        attrs: htmlAttrs,
      });
    case 'Button':
      if (kids.length) fail('<Button> cannot have children — use label attribute', n);
      if (typeof attrs.href !== 'string') fail('<Button> requires a string href attribute', n);
      if (typeof attrs.label !== 'string') fail('<Button> requires a string label attribute', n);
      return cleanNode({
        type: 'Button',
        href: attrs.href,
        label: attrs.label,
        mobileLabel: attrs.mobileLabel as string | undefined,
        style: styleOf(attrs.style),
        containerStyle: styleOf(attrs.containerStyle),
        mobileStyle: styleOf(attrs.mobileStyle),
        attrs: htmlAttrs,
      });
    case 'Hr':
      if (kids.length) fail('<Hr> cannot have children', n);
      return cleanNode({
        type: 'Hr',
        style: styleOf(attrs.style),
        mobileStyle: styleOf(attrs.mobileStyle),
        attrs: htmlAttrs,
      });
    case 'Spacer':
      if (kids.length) fail('<Spacer> cannot have children', n);
      if (typeof attrs.height !== 'number') fail('<Spacer> requires a numeric height attribute', n);
      return { type: 'Spacer', height: attrs.height };
    case 'Preview':
      if (kids.length) fail('<Preview> cannot have children — use content attribute', n);
      if (typeof attrs.content !== 'string') fail('<Preview> requires a string content attribute', n);
      return cleanNode({ type: 'Preview', content: attrs.content });
    case 'Font':
      if (kids.length) fail('<Font> cannot have children', n);
      if (typeof attrs.fontFamily !== 'string') {
        fail('<Font> requires a string fontFamily attribute', n);
      }
      if (
        typeof attrs.fallbackFontFamily !== 'string' &&
        !(
          Array.isArray(attrs.fallbackFontFamily) &&
          attrs.fallbackFontFamily.every((f) => typeof f === 'string')
        )
      ) {
        fail('<Font> requires fallbackFontFamily as a string or string array', n);
      }
      return cleanNode({
        type: 'Font',
        fontFamily: attrs.fontFamily,
        fallbackFontFamily: attrs.fallbackFontFamily as string | string[],
        webFont: attrs.webFont as { url: string; format: string } | undefined,
        fontStyle: attrs.fontStyle as string | undefined,
        fontWeight: attrs.fontWeight as number | string | undefined,
      });
    case 'CodeInline':
      if (kids.length) fail('<CodeInline> cannot have children — use content attribute', n);
      if (typeof attrs.content !== 'string') {
        fail('<CodeInline> requires a string content attribute', n);
      }
      return cleanNode({
        type: 'CodeInline',
        content: attrs.content,
        style: styleOf(attrs.style),
      });
    case 'Markdown':
      if (kids.length) fail('<Markdown> cannot have children — use content attribute', n);
      if (typeof attrs.content !== 'string') {
        fail('<Markdown> requires a string content attribute', n);
      }
      return cleanNode({
        type: 'Markdown',
        content: attrs.content,
        markdownContainerStyles: styleOf(attrs.markdownContainerStyles),
        markdownCustomStyles: styleOf(attrs.markdownCustomStyles) as
          | Record<string, CSSProperties>
          | undefined,
      });
    case 'CodeBlock':
      if (kids.length) fail('<CodeBlock> cannot have children', n);
      if (typeof attrs.code !== 'string') fail('<CodeBlock> requires a string code attribute', n);
      if (typeof attrs.language !== 'string') {
        fail('<CodeBlock> requires a string language attribute', n);
      }
      return cleanNode({
        type: 'CodeBlock',
        code: attrs.code,
        language: attrs.language,
        themeName: attrs.themeName as string | undefined,
        lineNumbers: attrs.lineNumbers as boolean | undefined,
        fontFamily: attrs.fontFamily as string | undefined,
      });
    case 'Html':
      return cleanNode({
        type: 'Html',
        lang: attrs.lang as string | undefined,
        dir: attrs.dir as string | undefined,
        style: styleOf(attrs.style),
        attrs: htmlAttrs,
        children: kids,
      });
    case 'Body':
      return cleanNode({
        type: 'Body',
        style: styleOf(attrs.style),
        attrs: htmlAttrs,
        children: kids,
      });
    case 'Head':
      return cleanNode({
        type: 'Head',
        children: kids,
      });
    case 'Tailwind':
      return cleanNode({
        type: 'Tailwind',
        config: attrs.config as Record<string, unknown> | undefined,
        children: kids,
      });
    default:
      fail(`Unhandled element <${typeName}>`, n);
  }
}

function cleanNode<T extends ReactEmailNode>(node: T): T {
  const out = { ...node } as Record<string, unknown>;
  for (const key of Object.keys(out)) {
    if (out[key] === undefined) delete out[key];
  }
  return out as T;
}

function parseBlock(node: AnyNode, lineOffset: number, seenIds: Set<string>): TemplateBlock {
  const n = withOffset(node, lineOffset)!;
  if (node.type !== 'JSXElement' || !node.openingElement) {
    fail('Top-level elements must be <Block>', n);
  }
  const name = elementName(node.openingElement.name);
  if (name !== BLOCK_ELEMENT_NAME) {
    fail(`Top-level element must be <Block>, got <${name}>`, n);
  }

  const attrs = readAttrs(node.openingElement.attributes, lineOffset);
  if (typeof attrs.component !== 'string' || !attrs.component) {
    fail('<Block> requires a string component attribute', n);
  }

  const id = typeof attrs.id === 'string' && attrs.id ? attrs.id : generateId();
  if (seenIds.has(id)) fail(`Duplicate Block id "${id}"`, n);
  seenIds.add(id);

  const label = typeof attrs.label === 'string' ? attrs.label : undefined;
  const componentVersion =
    typeof attrs.componentVersion === 'number' ? attrs.componentVersion : 1;

  const props: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (BLOCK_ATTR_RESERVED.has(key)) continue;
    if (STYLE_BAG_ATTRS.has(key)) {
      props[key] = styleOf(value);
      continue;
    }
    props[key] = value;
  }

  const kids = flattenFragments(elementChildren(node));

  if (attrs.component === 'figma-react-email') {
    if (kids.length !== 1) {
      fail(
        kids.length === 0
          ? '<Block component="figma-react-email"> requires exactly one child AST element'
          : `<Block component="figma-react-email"> requires exactly one child, got ${kids.length}`,
        n
      );
    }
    props.tree = parseAstNode(kids[0], lineOffset);
  } else if (kids.length > 0) {
    fail(
      `<Block component="${attrs.component}"> cannot have children (registry blocks are props-only)`,
      n
    );
  }

  const block: TemplateBlock = {
    id,
    componentId: attrs.component as string,
    componentVersion,
    props,
  };
  if (label !== undefined) block.label = label;
  return block;
}

function isBlockElement(node: AnyNode): boolean {
  if (node.type !== 'JSXElement' || !node.openingElement) return false;
  return elementName(node.openingElement.name) === BLOCK_ELEMENT_NAME;
}

/**
 * Wrap a bare top-level React Email component in a synthetic block.
 *
 * Snippets copied from react.email are plain component markup with no `<Block>`
 * envelope, so requiring one by hand would make every paste fail. Each bare root
 * becomes its own block, matching how blocks are reordered in the builder.
 * Re-printing emits the explicit `<Block>` form.
 */
function wrapBareNode(node: AnyNode, lineOffset: number, seenIds: Set<string>): TemplateBlock {
  const tree = parseAstNode(node, lineOffset);
  let id = generateId();
  while (seenIds.has(id)) id = generateId();
  seenIds.add(id);
  return {
    id,
    componentId: 'figma-react-email',
    componentVersion: 1,
    props: { tree },
  };
}

/**
 * Parse a code-view JSX document into template blocks.
 * Static analysis only — never evaluates user code (AD-24).
 */
export function parseBlocks(source: string): TemplateBlock[] {
  const trimmed = source.trim();
  if (!trimmed) return [];

  // Fragment wrap so multiple top-level <Block>s form one expression.
  // Leading `(\n<>\n` shifts user line 1 → parser line 3.
  const lineOffset = 2;
  const wrapped = `(\n<>\n${source}\n</>\n)`;

  let expr: AnyNode;
  try {
    expr = JsxParser.parseExpressionAt(wrapped, 0, {
      ecmaVersion: 'latest',
      locations: true,
    }) as unknown as AnyNode;
  } catch (e) {
    if (e instanceof CodeViewParseError) throw e;
    const err = e as { message?: string; loc?: { line: number; column: number } };
    const line = Math.max(1, (err.loc?.line ?? 1) - lineOffset);
    const column = (err.loc?.column ?? 0) + 1;
    throw new CodeViewParseError(err.message ?? 'Syntax error', line, column);
  }

  let roots: AnyNode[] = [];
  if (expr.type === 'JSXFragment') {
    roots = flattenFragments(elementChildren(expr));
  } else if (expr.type === 'JSXElement') {
    roots = [expr];
  } else {
    fail('Document must be JSX <Block> elements', withOffset(expr, lineOffset));
  }

  const seenIds = new Set<string>();
  return roots.map((r) => {
    if (isBlockElement(r)) return parseBlock(r, lineOffset, seenIds);
    return wrapBareNode(r, lineOffset, seenIds);
  });
}

export { CodeViewParseError };
