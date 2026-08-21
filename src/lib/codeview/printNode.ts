import type { ReactEmailNode } from '@/lib/figma/types/reactEmailAst';
import { renderTag, type AttrSpec } from '@/lib/codeview/printAttrs';
import { computeSpan, type PrintBuffer } from '@/lib/codeview/printBuffer';
import { DEFAULT_MAX_LINE_LENGTH } from '@/lib/codeview/types';

function pathToString(path: number[]): string {
  return path.join('.');
}

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
    case 'Html':
      return [
        ['lang', node.lang],
        ['dir', node.dir],
        ['style', node.style],
      ];
    case 'Body':
      return [['style', node.style]];
    case 'Head':
      return [];
    case 'Tailwind':
      return [['config', node.config]];
    default: {
      const _exhaustive: never = node;
      return _exhaustive;
    }
  }
}

/**
 * Pass-through HTML attributes, flattened back into ordinary JSX attributes so
 * printed code reads like the React Email docs (`cellPadding={0}`), not a bag.
 * Sorted for deterministic output.
 */
function htmlAttrsFor(node: ReactEmailNode): AttrSpec[] {
  const bag = 'attrs' in node ? node.attrs : undefined;
  if (!bag) return [];
  return Object.keys(bag)
    .sort()
    .map((key) => [key, bag[key]] as AttrSpec);
}

function childrenOf(node: ReactEmailNode): ReactEmailNode[] | null {
  switch (node.type) {
    case 'Section':
    case 'Container':
    case 'Row':
    case 'Column':
    case 'Html':
    case 'Body':
    case 'Head':
    case 'Tailwind':
      return node.children;
    default:
      return null;
  }
}

/**
 * Print one ReactEmailNode into `out`, optionally recording AST spans for selection sync.
 */
export function printNodeToBuffer(
  node: ReactEmailNode,
  path: number[],
  level: number,
  indentSize: number,
  maxLineLength: number,
  out: PrintBuffer,
  blockId?: string,
  nodeIndex?: Record<string, ReturnType<typeof computeSpan>>
): void {
  const from = out.length();
  const indent = pad(level, indentSize);
  const attrs = [...attrsFor(node), ...htmlAttrsFor(node)];
  const kids = childrenOf(node);

  if (!kids || kids.length === 0) {
    out.append(renderTag(node.type, attrs, indent, true, indentSize, maxLineLength));
  } else {
    out.append(renderTag(node.type, attrs, indent, false, indentSize, maxLineLength));
    out.append('\n');
    kids.forEach((child, i) => {
      printNodeToBuffer(
        child,
        [...path, i],
        level + 1,
        indentSize,
        maxLineLength,
        out,
        blockId,
        nodeIndex
      );
      if (i < kids.length - 1) out.append('\n');
    });
    out.append(`\n${indent}</${node.type}>`);
  }

  if (blockId && nodeIndex) {
    nodeIndex[`${blockId}:${pathToString(path)}`] = computeSpan(out.toString(), from, out.length());
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
  const parts: string[] = [];
  const out: PrintBuffer = {
    length: () => parts.join('').length,
    append(text: string) {
      parts.push(text);
    },
    toString: () => parts.join(''),
  };
  printNodeToBuffer(node, [], level, indentSize, maxLineLength, out);
  return out.toString();
}
