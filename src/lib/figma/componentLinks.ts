/**
 * Maps Figma component instances / layer names to builder registry components.
 *
 * Extend this file when design-system components are added in Figma:
 * - `namePatterns` match layer or instance names (case-insensitive, after normalization)
 * - `figmaComponentIds` match Figma master component IDs when known
 * - Add prop extractors in `figmaToRegistryBlocks.ts`
 *
 * Lookup order in `resolveComponentLink()`:
 * 1. User overrides (`FIGMA_COMPONENT_ID_OVERRIDES`)
 * 2. Layer name patterns (most reliable for Nissan DS naming)
 * 3. Figma master component ID (with structural disambiguation when IDs collide)
 */
import { FIGMA_MASTER_COMPONENT_IDS } from './figmaComponentIds';
import { findButtons, findColumnNodes } from './figmaNodeExtract';
import { normalizeFigmaLayerName, normalizedLayerKey } from './figmaNameNormalize';
import type { ParsedFigmaNode } from './parseFigmaNode';

export interface ComponentLink {
  registryComponentId: string;
  /** Human label for build reasoning */
  label: string;
  /** Figma master component IDs (from INSTANCE.componentId) */
  figmaComponentIds?: string[];
  /** Regex tested against normalized node.name */
  namePatterns: RegExp[];
  /** Registry field keys that must resolve for a confident match */
  requiredFields: string[];
}

export const COMPONENT_LINKS: ComponentLink[] = [
  {
    registryComponentId: 'header',
    label: 'Header',
    figmaComponentIds: FIGMA_MASTER_COMPONENT_IDS.header,
    namePatterns: [/^header$/i, /^logo.?header$/i, /^email.?header$/i, /^nav.?header$/i],
    requiredFields: ['logoSrc'],
  },
  {
    registryComponentId: 'hero-banner',
    label: 'Hero Banner',
    figmaComponentIds: FIGMA_MASTER_COMPONENT_IDS['hero-banner'],
    namePatterns: [
      /^hero$/i,
      /^hero.?banner$/i,
      /^hero.?section$/i,
      /^main.?banner$/i,
      /^banner.?hero$/i,
      /^nissan.?more.?banner$/i,
    ],
    requiredFields: ['imgSrc', 'headline'],
  },
  {
    registryComponentId: 'promo-block',
    label: 'Promo Block',
    namePatterns: [/^promo$/i, /^promo.?block$/i, /^promotion$/i, /^promo.?banner$/i],
    requiredFields: ['imgSrc', 'title'],
  },
  {
    registryComponentId: 'cta-banner',
    label: 'CTA Banner',
    namePatterns: [/^cta$/i, /^cta.?banner$/i, /^call.?to.?action$/i, /^action.?banner$/i],
    requiredFields: ['headline', 'buttonText'],
  },
  {
    registryComponentId: 'section-title',
    label: 'Section Title',
    figmaComponentIds: FIGMA_MASTER_COMPONENT_IDS['section-title'],
    namePatterns: [
      /^section.?title$/i,
      /^section.?header$/i,
      /^title.?bar$/i,
      /^preheader$/i,
      /^pre.?header$/i,
    ],
    requiredFields: ['title'],
  },
  {
    registryComponentId: 'intro-copy',
    label: 'Intro Copy',
    namePatterns: [
      /^intro$/i,
      /^intro.?copy$/i,
      /^greeting$/i,
      /^opening.?copy$/i,
      /^opening$/i,
    ],
    requiredFields: ['body'],
  },
  {
    registryComponentId: 'footer',
    label: 'Footer',
    figmaComponentIds: FIGMA_MASTER_COMPONENT_IDS.footer,
    namePatterns: [/^footer$/i, /^email.?footer$/i, /^legal.?footer$/i],
    requiredFields: [],
  },
  {
    registryComponentId: 'image-block',
    label: 'Image Block',
    figmaComponentIds: FIGMA_MASTER_COMPONENT_IDS['image-block'],
    namePatterns: [
      /^image$/i,
      /^image.?block$/i,
      /^full.?width.?image$/i,
      /^1up.?full.?width$/i,
      /^photo$/i,
      /^sep.?retail.?gif/i,
    ],
    requiredFields: ['imgSrc'],
  },
  {
    registryComponentId: 'button-row',
    label: 'Button Row',
    namePatterns: [/^button.?row$/i, /^cta.?row$/i, /^dual.?cta$/i, /^buttons$/i],
    requiredFields: ['primaryText'],
  },
  {
    registryComponentId: 'testimonial',
    label: 'Testimonial',
    namePatterns: [/^testimonial$/i, /^quote$/i, /^customer.?quote$/i],
    requiredFields: ['quote', 'authorName'],
  },
  {
    registryComponentId: 'text-block',
    label: 'Text Block',
    figmaComponentIds: FIGMA_MASTER_COMPONENT_IDS['text-block'],
    namePatterns: [
      /^text.?block$/i,
      /^body.?copy$/i,
      /^copy.?block$/i,
      /^content.?block$/i,
      /^rich.?text$/i,
      /^rich_text$/i,
    ],
    requiredFields: ['content'],
  },
  {
    registryComponentId: 'divider',
    label: 'Divider',
    namePatterns: [/^divider$/i, /^separator$/i, /^hr$/i],
    requiredFields: [],
  },
  {
    registryComponentId: 'spacer',
    label: 'Spacer',
    namePatterns: [/^spacer$/i, /^whitespace$/i, /^gap$/i],
    requiredFields: ['height'],
  },
  {
    registryComponentId: 'one-col-product',
    label: 'One Col Product',
    figmaComponentIds: FIGMA_MASTER_COMPONENT_IDS['one-col-product'],
    namePatterns: [
      /^1.?up$/i,
      /^1up$/i,
      /^1.?up.?card$/i,
      /^1.?up.?full.?width$/i,
      /^one.?col.?product$/i,
      /^featured.?product$/i,
    ],
    requiredFields: ['rows'],
  },
  {
    registryComponentId: 'two-col-stacked',
    label: 'Two Col Stacked',
    figmaComponentIds: FIGMA_MASTER_COMPONENT_IDS['two-col-stacked'],
    namePatterns: [
      /^2up$/i,
      /^2.?up$/i,
      /^2up.?standard$/i,
      /^two.?col.?stacked$/i,
      /^2.?col.?stacked$/i,
    ],
    requiredFields: ['rows'],
  },
  {
    registryComponentId: 'two-col-dual-cta',
    label: '2-Col Dual CTA',
    figmaComponentIds: FIGMA_MASTER_COMPONENT_IDS['two-col-dual-cta'],
    namePatterns: [
      /^2up.?dual.?cta$/i,
      /^two.?col.?dual.?cta$/i,
      /^dual.?cta.?2up$/i,
      /^2up.?dual$/i,
    ],
    requiredFields: ['rows'],
  },
  {
    registryComponentId: 'three-col-icon',
    label: 'Three Col Icon',
    figmaComponentIds: FIGMA_MASTER_COMPONENT_IDS['three-col-icon'],
    namePatterns: [
      /^call.?out$/i,
      /^call-out$/i,
      /^3up$/i,
      /^3.?up$/i,
      /^three.?col.?icon$/i,
      /^3.?col.?icon$/i,
      /^icon.?row$/i,
    ],
    requiredFields: ['rows'],
  },
  {
    registryComponentId: 'stats-row',
    label: 'Stats Row',
    namePatterns: [/^stats.?row$/i, /^statistics$/i, /^numbers.?row$/i],
    requiredFields: ['stats'],
  },
  {
    registryComponentId: 'order-card',
    label: 'Order Card',
    namePatterns: [
      /^order.?card$/i,
      /^order.?details$/i,
      /^order.?summary$/i,
      /^transaction.?details$/i,
    ],
    requiredFields: ['rows'],
  },
];

/** User-editable overrides: map Figma componentId → registry id */
export const FIGMA_COMPONENT_ID_OVERRIDES: Record<string, string> = {
  // Example: 'abc123def456': 'hero-banner',
};

export function registerFigmaComponentOverride(
  figmaComponentId: string,
  registryComponentId: string
): void {
  FIGMA_COMPONENT_ID_OVERRIDES[figmaComponentId] = registryComponentId;
}

export type LinkLookupNode = Pick<ParsedFigmaNode, 'name'> &
  Partial<Pick<ParsedFigmaNode, 'componentId' | 'type' | 'children' | 'layoutMode' | 'width'>>;

function matchNamePatterns(node: LinkLookupNode): ComponentLink | undefined {
  const normalized = normalizeFigmaLayerName(node.name);
  const key = normalizedLayerKey(node.name);

  const matches = COMPONENT_LINKS.filter((link) =>
    link.namePatterns.some((p) => p.test(normalized) || p.test(key))
  );

  if (matches.length === 0) return undefined;

  if (matches.length === 1) {
    // Generic "2UP" + shared master ID needs structure to pick stacked vs dual-cta.
    if (
      node.componentId === '2001:2397' &&
      matches[0].registryComponentId === 'two-col-stacked' &&
      /^2up$/i.test(key)
    ) {
      return undefined;
    }
    return matches[0];
  }

  return disambiguateByStructure(node, matches);
}

function linksForComponentId(componentId: string): ComponentLink[] {
  return COMPONENT_LINKS.filter((l) => l.figmaComponentIds?.includes(componentId));
}

/** Disambiguate when multiple registry links share the same Figma master component ID. */
function disambiguateByStructure(
  node: LinkLookupNode,
  candidates: ComponentLink[]
): ComponentLink | undefined {
  if (candidates.length <= 1) return candidates[0];

  const registryIds = new Set(candidates.map((c) => c.registryComponentId));
  const key = normalizedLayerKey(node.name);

  if (registryIds.has('two-col-stacked') && registryIds.has('two-col-dual-cta')) {
    if (/dual.?cta|2.?cta|two.?cta/i.test(key)) {
      return candidates.find((c) => c.registryComponentId === 'two-col-dual-cta');
    }
    if (/2up.?standard/i.test(key)) {
      return candidates.find((c) => c.registryComponentId === 'two-col-stacked');
    }

    if (node.children && node.children.length > 0) {
      const cols = findColumnNodes(node as ParsedFigmaNode);
      if (cols.length >= 2) {
        const buttonCounts = cols.map((col) => findButtons(col).length);
        const avgButtons = buttonCounts.reduce((sum, n) => sum + n, 0) / buttonCounts.length;
        const multiButtonCols = buttonCounts.filter((n) => n >= 2).length;
        if (avgButtons >= 1.75 || multiButtonCols >= 2) {
          return candidates.find((c) => c.registryComponentId === 'two-col-dual-cta');
        }
        return candidates.find((c) => c.registryComponentId === 'two-col-stacked');
      }
    }
  }

  return candidates[0];
}

/**
 * Resolve the best registry link for a Figma node.
 * Prefers layer names over raw component IDs to avoid master-ID collisions.
 */
export function resolveComponentLink(node: LinkLookupNode): ComponentLink | undefined {
  if (node.componentId) {
    const overrideId = FIGMA_COMPONENT_ID_OVERRIDES[node.componentId];
    if (overrideId) {
      return COMPONENT_LINKS.find((l) => l.registryComponentId === overrideId);
    }
  }

  const byName = matchNamePatterns(node);
  if (byName) return byName;

  if (node.componentId) {
    const candidates = linksForComponentId(node.componentId);
    if (candidates.length === 1) return candidates[0];
    if (candidates.length > 1) return disambiguateByStructure(node, candidates);
  }

  return undefined;
}

/** @deprecated Use resolveComponentLink — kept for existing imports */
export function getLinkForNode(node: LinkLookupNode): ComponentLink | undefined {
  return resolveComponentLink(node);
}
