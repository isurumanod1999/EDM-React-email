import type { TemplateBlock } from '@/lib/schema/template';
import type { PrintOptions } from '@/lib/codeview/types';
import { printBlocksWithIndex } from '@/lib/codeview/selectionIndex';

/**
 * Project template blocks as a single React Email–style JSX document.
 * Deterministic: same blocks → identical string (AD-20 projection; FR1).
 */
export function printBlocks(blocks: TemplateBlock[], options: PrintOptions = {}): string {
  return printBlocksWithIndex(blocks, options).source;
}

export { printBlocksWithIndex } from '@/lib/codeview/selectionIndex';
