import { FIGMA_SKIP_ATTRS } from '@/lib/codeview/types';
import type { TemplateBlock } from '@/lib/schema/template';
import type { ReactEmailNode } from '@/lib/figma/types/reactEmailAst';

/** Drop undefined keys recursively so parse/print comparisons stay stable. */
export function stripUndefinedDeep<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map((v) => stripUndefinedDeep(v)) as T;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (v === undefined) continue;
    out[k] = stripUndefinedDeep(v);
  }
  return out as T;
}

/**
 * Canonical printable form of blocks: strip editor-only props that print omits.
 * Used for parse(print(doc)) ≅ doc comparisons (NFR4).
 */
export function canonicalizeBlocks(blocks: TemplateBlock[]): TemplateBlock[] {
  return blocks.map((block) => {
    const props = { ...block.props };
    if (block.componentId === 'figma-react-email') {
      for (const key of FIGMA_SKIP_ATTRS) {
        if (key === 'tree') continue;
        delete props[key];
      }
      if (props.tree) props.tree = stripUndefinedDeep(props.tree as ReactEmailNode);
    }
    const next: TemplateBlock = {
      id: block.id,
      componentId: block.componentId,
      componentVersion: block.componentVersion,
      props: stripUndefinedDeep(props),
    };
    if (block.label !== undefined) next.label = block.label;
    return next;
  });
}
