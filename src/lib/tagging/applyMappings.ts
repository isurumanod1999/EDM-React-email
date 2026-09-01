import type { EmailTemplateDocument, TemplateBlock } from '@/lib/schema/template';
import type { ReactEmailNode } from '@/lib/figma/types/reactEmailAst';
import { getNodeAtPath, parsePath, updateNodeAtPath } from '@/lib/tagging/treePaths';
import {
  CTA_TEXT_PROPS,
  URL_ALT_PROP,
  type ApplyMappingsResult,
  type ConfirmedMapping,
} from '@/lib/tagging/types';

export class ApplyMappingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApplyMappingError';
  }
}

interface ParsedTargetId {
  blockId: string;
  kind: 'url' | 'social' | 'tree';
  propKey?: string;
  socialIndex?: number;
  treePath?: string;
}

/** Parse `{blockId}:{propKey}` | `{blockId}:social:N:url` | `{blockId}:tree:path:href`. */
export function parseTargetId(targetId: string): ParsedTargetId {
  const social = /^([^:]+):social:(\d+):url$/.exec(targetId);
  if (social) {
    return {
      blockId: social[1],
      kind: 'social',
      socialIndex: Number(social[2]),
      propKey: 'socialLinks',
    };
  }

  const tree = /^([^:]+):tree:(.*):href$/.exec(targetId);
  if (tree) {
    return {
      blockId: tree[1],
      kind: 'tree',
      propKey: 'tree',
      treePath: tree[2],
    };
  }

  const colon = targetId.indexOf(':');
  if (colon <= 0 || colon === targetId.length - 1) {
    throw new ApplyMappingError(`Invalid target id: ${targetId}`);
  }
  return {
    blockId: targetId.slice(0, colon),
    kind: 'url',
    propKey: targetId.slice(colon + 1),
  };
}

function cloneBlocks(blocks: TemplateBlock[]): TemplateBlock[] {
  return blocks.map((b) => ({
    ...b,
    props: { ...b.props },
  }));
}

function applyOne(blocks: TemplateBlock[], mapping: ConfirmedMapping): void {
  const parsed = parseTargetId(mapping.targetId);
  const block = blocks.find((b) => b.id === parsed.blockId);
  if (!block) {
    throw new ApplyMappingError(`Block not found for target ${mapping.targetId}`);
  }

  if (parsed.kind === 'url' && parsed.propKey) {
    if (CTA_TEXT_PROPS.has(parsed.propKey)) {
      throw new ApplyMappingError(`Refusing to write CTA text prop ${parsed.propKey}`);
    }
    block.props[parsed.propKey] = mapping.finalUrl;
    const altKey = URL_ALT_PROP[parsed.propKey];
    if (altKey && mapping.altText !== undefined && mapping.altText !== '') {
      block.props[altKey] = mapping.altText;
    }
    return;
  }

  if (parsed.kind === 'social' && parsed.socialIndex !== undefined) {
    const links = Array.isArray(block.props.socialLinks)
      ? (block.props.socialLinks as Record<string, unknown>[]).map((l) => ({ ...l }))
      : [];
    if (!links[parsed.socialIndex]) {
      throw new ApplyMappingError(`Social index out of range for ${mapping.targetId}`);
    }
    links[parsed.socialIndex] = {
      ...links[parsed.socialIndex],
      url: mapping.finalUrl,
    };
    block.props.socialLinks = links;
    return;
  }

  if (parsed.kind === 'tree' && parsed.treePath !== undefined) {
    const tree = block.props.tree as ReactEmailNode | undefined;
    if (!tree || typeof tree !== 'object') {
      throw new ApplyMappingError(`Block ${block.id} has no tree`);
    }
    const path = parsePath(parsed.treePath);
    const node = getNodeAtPath(tree, path);
    if (!node) {
      throw new ApplyMappingError(`Tree path missing for ${mapping.targetId}`);
    }
    const next = updateNodeAtPath(tree, path, (n) => {
      const updated = { ...n, href: mapping.finalUrl } as ReactEmailNode;
      if (
        mapping.altText !== undefined &&
        mapping.altText !== '' &&
        updated.type === 'Img'
      ) {
        return { ...updated, alt: mapping.altText };
      }
      return updated;
    });
    block.props.tree = next;
    return;
  }

  throw new ApplyMappingError(`Unsupported target ${mapping.targetId}`);
}

/**
 * Write confirmed FINAL URL / Alt Text onto block props. Does not touch CTA text (AD-15).
 * Returns a new template document (caller persists).
 */
export function applyConfirmedMappings(
  template: EmailTemplateDocument,
  mappings: ConfirmedMapping[]
): ApplyMappingsResult {
  const warnings: string[] = [];
  if (mappings.length === 0) {
    warnings.push('No confirmed mappings to apply');
    return { template, applied: [], warnings };
  }

  const blocks = cloneBlocks(template.blocks);
  const applied: ConfirmedMapping[] = [];

  for (const mapping of mappings) {
    try {
      applyOne(blocks, mapping);
      applied.push(mapping);
    } catch (e) {
      warnings.push(e instanceof Error ? e.message : String(e));
    }
  }

  const next: EmailTemplateDocument = {
    ...template,
    blocks,
    updatedAt: new Date().toISOString(),
  };

  return { template: next, applied, warnings };
}
