import type { TemplateBlock } from '@/lib/schema/template';
import type { ReactEmailNode } from '@/lib/figma/types/reactEmailAst';
import { printNode } from '@/lib/codeview/printNode';
import { renderTag, type AttrSpec } from '@/lib/codeview/printAttrs';
import {
  BLOCK_RESERVED_ATTRS,
  DEFAULT_MAX_LINE_LENGTH,
  FIGMA_SKIP_ATTRS,
  type PrintOptions,
} from '@/lib/codeview/types';

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
 * Project template blocks as a single React Email–style JSX document.
 * Deterministic: same blocks → identical string (AD-20 projection; FR1).
 */
export function printBlocks(blocks: TemplateBlock[], options: PrintOptions = {}): string {
  const indentSize = options.indentSize ?? 2;
  const maxLineLength = options.maxLineLength ?? DEFAULT_MAX_LINE_LENGTH;
  const chunks: string[] = [];

  for (const block of blocks) {
    const isFigma = block.componentId === 'figma-react-email';
    const attrs = blockAttrs(block, isFigma ? FIGMA_SKIP_ATTRS : new Set());

    if (!isFigma) {
      chunks.push(renderTag('Block', attrs, '', true, indentSize, maxLineLength));
      continue;
    }

    const open = renderTag('Block', attrs, '', false, indentSize, maxLineLength);
    const tree = block.props.tree as ReactEmailNode | undefined;
    if (!tree || typeof tree !== 'object' || !('type' in tree)) {
      chunks.push(`${open}\n</Block>`);
      continue;
    }
    chunks.push(`${open}\n${printNode(tree, 1, indentSize, maxLineLength)}\n</Block>`);
  }

  return chunks.join('\n\n');
}
