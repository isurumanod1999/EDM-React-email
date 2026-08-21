import type { ReactEmailNode } from '@/lib/figma/types/reactEmailAst';
import { printNodeToBuffer } from '@/lib/codeview/printNode';
import type { TemplateBlock } from '@/lib/schema/template';
import { renderTag, type AttrSpec } from '@/lib/codeview/printAttrs';
import { computeSpan, createPrintBuffer } from '@/lib/codeview/printBuffer';
import type { CodeSpan } from '@/lib/codeview/printBuffer';
import {
  BLOCK_RESERVED_ATTRS,
  DEFAULT_MAX_LINE_LENGTH,
  FIGMA_SKIP_ATTRS,
  type PrintOptions,
} from '@/lib/codeview/types';

export type { CodeSpan } from '@/lib/codeview/printBuffer';

export type CodeSelectionIndex = {
  /** Entire `<Block …>` for each template block. */
  blocks: Record<string, CodeSpan>;
  /** Figma AST element spans keyed as `blockId:nodePath` (empty path = tree root). */
  nodes: Record<string, CodeSpan>;
};

function pathKey(blockId: string, nodePath: string | null | undefined): string {
  return `${blockId}:${nodePath ?? ''}`;
}

export function spanForSelection(
  index: CodeSelectionIndex,
  blockId: string | null,
  nodePath: string | null
): CodeSpan | null {
  if (!blockId) return null;
  if (nodePath != null) {
    const nodeSpan = index.nodes[pathKey(blockId, nodePath)];
    if (nodeSpan) return nodeSpan;
  }
  return index.blocks[blockId] ?? null;
}

/** Deepest AST node (or block) containing `offset`. */
export function selectionAtOffset(
  index: CodeSelectionIndex,
  offset: number
): { blockId: string; nodePath: string | null } | null {
  let best: { blockId: string; nodePath: string | null; size: number } | null = null;

  for (const [key, span] of Object.entries(index.nodes)) {
    if (offset < span.from || offset >= span.to) continue;
    const size = span.to - span.from;
    const colon = key.indexOf(':');
    const blockId = key.slice(0, colon);
    const nodePath = key.slice(colon + 1);
    if (!best || size < best.size) {
      best = { blockId, nodePath: nodePath || null, size };
    }
  }

  if (best) {
    return { blockId: best.blockId, nodePath: best.nodePath };
  }

  for (const [blockId, span] of Object.entries(index.blocks)) {
    if (offset >= span.from && offset < span.to) {
      return { blockId, nodePath: null };
    }
  }

  return null;
}

function blockAttrs(block: TemplateBlock, skip: Set<string>): AttrSpec[] {
  const parts: AttrSpec[] = [
    ['id', block.id],
    ['component', block.componentId],
    ['label', block.label],
    ['componentVersion', block.componentVersion],
  ];

  for (const key of Object.keys(block.props).sort()) {
    if (skip.has(key) || BLOCK_RESERVED_ATTRS.has(key)) continue;
    parts.push([key, block.props[key]]);
  }
  return parts;
}

/**
 * Print blocks and record source spans for block + AST node selection sync.
 */
export function printBlocksWithIndex(
  blocks: TemplateBlock[],
  options: PrintOptions = {}
): { source: string; index: CodeSelectionIndex } {
  const indentSize = options.indentSize ?? 2;
  const maxLineLength = options.maxLineLength ?? DEFAULT_MAX_LINE_LENGTH;
  const index: CodeSelectionIndex = { blocks: {}, nodes: {} };
  const out = createPrintBuffer();

  for (let bi = 0; bi < blocks.length; bi++) {
    if (bi > 0) out.append('\n\n');

    const block = blocks[bi];
    const blockFrom = out.length();
    const isFigma = block.componentId === 'figma-react-email';
    const attrs = blockAttrs(block, isFigma ? FIGMA_SKIP_ATTRS : new Set());

    if (!isFigma) {
      out.append(renderTag('Block', attrs, '', true, indentSize, maxLineLength));
      index.blocks[block.id] = computeSpan(out.toString(), blockFrom, out.length());
      continue;
    }

    const open = renderTag('Block', attrs, '', false, indentSize, maxLineLength);
    out.append(`${open}\n`);
    const tree = block.props.tree as ReactEmailNode | undefined;
    if (tree && typeof tree === 'object' && 'type' in tree) {
      printNodeToBuffer(tree, [], 1, indentSize, maxLineLength, out, block.id, index.nodes);
    }
    out.append('\n</Block>');
    index.blocks[block.id] = computeSpan(out.toString(), blockFrom, out.length());
  }

  return { source: out.toString(), index };
}
