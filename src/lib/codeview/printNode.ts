import type { ReactEmailNode } from '@/lib/figma/types/reactEmailAst';
import { renderTag, type AttrSpec } from '@/lib/codeview/printAttrs';
import { DEFAULT_MAX_LINE_LENGTH } from '@/lib/codeview/types';

function pad(level: number, size: number): string {
  return ' '.repeat(level * size);
}

/** Attributes for a node, in a readable, stable order. */
function attrsFor(node: ReactEmailNode): AttrSpec[] {
  switch (node.type) {
    case 'Section':
    case 'Container':
    case 'Row':
      return [
        ['style', node.style],
        ['mobileStyle', node.mobileStyle],
      ];
    case 'Column':
      return [
        ['className', node.className],
        ['align', node.align],
        ['style', node.style],
        ['mobileStyle', node.mobileStyle],
      ];
    case 'Text':
      return [
        ['content', node.content],
        ['html', node.html],
        ['mobileContent', node.mobileContent],
        ['mobileHtml', node.mobileHtml],
        ['href', node.href],
        ['style', node.style],
        ['mobileStyle', node.mobileStyle],
      ];
    case 'Heading':
      return [
        ['as', node.as],
        ['content', node.content],
        ['html', node.html],
        ['mobileContent', node.mobileContent],
        ['mobileHtml', node.mobileHtml],
        ['href', node.href],
        ['style', node.style],
        ['mobileStyle', node.mobileStyle],
      ];
    case 'Img':
      return [
        ['src', node.src],
        ['mobileSrc', node.mobileSrc],
        ['alt', node.alt],
        ['href', node.href],
        ['width', node.width],
        ['height', node.height],
        ['align', node.align],
        ['className', node.className],
        ['isIcon', node.isIcon],
        ['fullBleed', node.fullBleed],
        ['mobileStyle', node.mobileStyle],
      ];
    case 'Link':
      return [
        ['href', node.href],
        ['content', node.content],
        ['html', node.html],
        ['mobileContent', node.mobileContent],
        ['mobileHtml', node.mobileHtml],
        ['style', node.style],
        ['mobileStyle', node.mobileStyle],
      ];
    case 'Button':
      return [
        ['href', node.href],
        ['label', node.label],
        ['mobileLabel', node.mobileLabel],
        ['style', node.style],
        ['containerStyle', node.containerStyle],
        ['mobileStyle', node.mobileStyle],
      ];
    case 'Hr':
      return [
        ['style', node.style],
        ['mobileStyle', node.mobileStyle],
      ];
    case 'Spacer':
      return [['height', node.height]];
    case 'Preview':
      return [['content', node.content]];
    case 'Font':
      return [
        ['fontFamily', node.fontFamily],
        ['fallbackFontFamily', node.fallbackFontFamily],
        ['webFont', node.webFont],
        ['fontStyle', node.fontStyle],
        ['fontWeight', node.fontWeight],
      ];
    case 'CodeInline':
      return [['content', node.content], ['style', node.style]];
    case 'Markdown':
      return [
        ['content', node.content],
        ['markdownContainerStyles', node.markdownContainerStyles],
        ['markdownCustomStyles', node.markdownCustomStyles],
      ];
    case 'CodeBlock':
      return [
        ['code', node.code],
        ['language', node.language],
        ['themeName', node.themeName],
        ['lineNumbers', node.lineNumbers],
        ['fontFamily', node.fontFamily],
      ];
    default: {
      const _exhaustive: never = node;
      return _exhaustive;
    }
  }
}

function childrenOf(node: ReactEmailNode): ReactEmailNode[] | null {
  switch (node.type) {
    case 'Section':
    case 'Container':
    case 'Row':
    case 'Column':
      return node.children;
    default:
      return null;
  }
}

/**
 * Print one ReactEmailNode as JSX. Textual fields are always attributes (AD-22).
 */
export function printNode(
  node: ReactEmailNode,
  level = 0,
  indentSize = 2,
  maxLineLength = DEFAULT_MAX_LINE_LENGTH
): string {
  const indent = pad(level, indentSize);
  const attrs = attrsFor(node);
  const kids = childrenOf(node);

  if (!kids || kids.length === 0) {
    return renderTag(node.type, attrs, indent, true, indentSize, maxLineLength);
  }

  const open = renderTag(node.type, attrs, indent, false, indentSize, maxLineLength);
  const body = kids
    .map((child) => printNode(child, level + 1, indentSize, maxLineLength))
    .join('\n');
  return `${open}\n${body}\n${indent}</${node.type}>`;
}
