import type { TemplateBlock } from '@/lib/schema/template';
import type { ReactEmailNode } from '@/lib/figma/types/reactEmailAst';
import { nodeChildren, pathToString } from '@/lib/tagging/treePaths';
import {
  normalizeMatchKey,
  URL_ALT_PROP,
  type LinkableTarget,
} from '@/lib/tagging/types';

/** Known registry URL props (linkable-targets) — avoids importing React component registry. */
const KNOWN_URL_FIELDS: Array<{
  key: string;
  label: string;
  semantics: string[];
}> = [
  { key: 'logoUrl', label: 'Logo Link', semantics: ['logo', 'nissanlogo', 'headerlogo', 'headernissanlogo'] },
  { key: 'url', label: 'Link URL', semantics: ['hero', 'image', 'banner', 'img'] },
  { key: 'ctaUrl', label: 'Button URL', semantics: ['cta', 'cta1', 'button', 'primary'] },
  { key: 'buttonUrl', label: 'Button URL', semantics: ['cta', 'cta1', 'button', 'primary'] },
  { key: 'primaryUrl', label: 'Primary URL', semantics: ['cta', 'cta1', 'button', 'primary'] },
  { key: 'secondaryUrl', label: 'Secondary URL', semantics: ['cta2', 'secondary', 'button2'] },
  { key: 'unsubscribeUrl', label: 'Unsubscribe URL', semantics: ['unsubscribe'] },
  { key: 'privacyUrl', label: 'Privacy URL', semantics: ['privacy'] },
  { key: 'preferencesUrl', label: 'Preferences URL', semantics: ['preferences'] },
];

function uniqKeys(...parts: Array<string | undefined | null>): string[] {
  const out = new Set<string>();
  for (const p of parts) {
    const k = normalizeMatchKey(p);
    if (k) out.add(k);
  }
  return [...out];
}

function pushRegistryUrlTargets(block: TemplateBlock, out: LinkableTarget[]): void {
  for (const field of KNOWN_URL_FIELDS) {
    if (!(field.key in block.props)) continue;
    const current = block.props[field.key];
    const currentUrl = typeof current === 'string' ? current : undefined;
    out.push({
      id: `${block.id}:${field.key}`,
      blockId: block.id,
      componentId: block.componentId,
      propKey: field.key,
      kind: 'url',
      displayName: `${block.label || block.componentId} · ${field.label}`,
      currentUrl,
      altPropKey: URL_ALT_PROP[field.key],
      matchKeys: uniqKeys(
        field.key,
        field.label,
        block.label,
        block.componentId,
        ...field.semantics
      ),
    });
  }

  if ('socialLinks' in block.props && Array.isArray(block.props.socialLinks)) {
    const links = block.props.socialLinks as Record<string, unknown>[];
    links.forEach((item, index) => {
      if (!item || typeof item !== 'object') return;
      const platform = typeof item.platform === 'string' ? item.platform : `social${index}`;
      const url = typeof item.url === 'string' ? item.url : undefined;
      out.push({
        id: `${block.id}:social:${index}:url`,
        blockId: block.id,
        componentId: block.componentId,
        propKey: 'socialLinks',
        kind: 'social',
        displayName: `${block.label || block.componentId} · Social · ${platform}`,
        currentUrl: url,
        matchKeys: uniqKeys(platform, `social${platform}`, `social${index}`, block.label),
        nodeType: 'social',
      });
    });
  }
}

/**
 * Semantics are derived from the node's own label so a target only claims a
 * keyword it actually evidences. Blanket keywords (every Img claiming "hero"
 * and "logo") made every label ambiguous, which forced rows to unmatched.
 */
function treeSemantics(
  nodeType: ReactEmailNode['type'],
  label: string | undefined,
  blockLabel: string | undefined
): string[] {
  const text = `${label ?? ''} ${blockLabel ?? ''}`;
  if (nodeType === 'Button' || nodeType === 'Link') return ['cta', 'button'];
  if (nodeType !== 'Img') return [];
  if (/logo/i.test(text)) return ['logo', 'nissanlogo', 'headernissanlogo'];
  const out = ['image', 'img', 'banner'];
  if (/hero|kv|key\s?visual/i.test(text)) out.push('hero');
  return out;
}

function treeNodeLabel(node: ReactEmailNode): string | undefined {
  if (node.type === 'Img') return node.alt;
  if (node.type === 'Button') return node.label;
  if (node.type === 'Link') return node.content;
  if (node.type === 'Text' || node.type === 'Heading') return node.content;
  return undefined;
}

function walkTreeHrefTargets(
  block: TemplateBlock,
  node: ReactEmailNode,
  path: number[],
  out: LinkableTarget[]
): void {
  const pathStr = pathToString(path);
  const canLink =
    node.type === 'Img' ||
    node.type === 'Button' ||
    node.type === 'Link' ||
    node.type === 'Text' ||
    node.type === 'Heading';

  if (canLink && 'href' in node) {
    const href = typeof node.href === 'string' ? node.href : undefined;
    const isCarrier = node.type === 'Img' || node.type === 'Button' || node.type === 'Link';
    if (isCarrier || href !== undefined) {
      const label = treeNodeLabel(node);
      const semantic = treeSemantics(node.type, label, block.label);
      out.push({
        id: `${block.id}:tree:${pathStr}:href`,
        blockId: block.id,
        componentId: block.componentId,
        propKey: 'tree',
        kind: 'tree',
        displayName: `${block.label || 'Figma'} · ${node.type}${label ? ` · ${label.slice(0, 40)}` : ''}${pathStr ? ` @${pathStr}` : ''}`,
        currentUrl: href,
        matchKeys: uniqKeys(
          block.label,
          block.componentId,
          node.type,
          label,
          pathStr,
          ...semantic
        ),
        nodeType: node.type,
      });
    }
  }

  const children = nodeChildren(node);
  if (!children) return;
  children.forEach((child, i) => walkTreeHrefTargets(block, child, [...path, i], out));
}

/**
 * Enumerate linkable URL destinations on template blocks without mutating props.
 */
export function discoverLinkableTargets(blocks: TemplateBlock[]): LinkableTarget[] {
  const out: LinkableTarget[] = [];
  for (const block of blocks) {
    pushRegistryUrlTargets(block, out);
    if (block.componentId === 'figma-react-email') {
      const tree = block.props.tree as ReactEmailNode | undefined;
      if (tree && typeof tree === 'object' && 'type' in tree) {
        walkTreeHrefTargets(block, tree, [], out);
      }
    }
  }
  return out;
}
