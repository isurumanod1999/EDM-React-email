import { getComponentDefinition } from '@/lib/registry';
import type { ParsedFigmaNode } from './parseFigmaNode';
import { resolveComponentLink, type ComponentLink } from './componentLinks';
import {
  bodyTextNodes,
  findAllTextNodes,
  findButtons,
  findColumnNodes,
  findImageByName,
  findLargestImage,
  findNodes,
  findPrimaryButton,
  headlineText,
  imageUrl,
  matchMobileChild,
  mobileImageUrl,
  nodeArea,
  primaryText,
  rankTextNodes,
  textByNamePattern,
  unwrapWrapper,
  visibleChildren,
  walkNodes,
} from './figmaNodeExtract';

export interface RegistryBuildBlock {
  componentId: string;
  props: Record<string, unknown>;
  label?: string;
}

export interface RegistryBuildResult {
  blocks: RegistryBuildBlock[];
  confidence: number;
  reasoning: string;
  mappingMode: 'registry';
}

export interface RegistryBuildUrls {
  desktopUrl?: string;
  mobileUrl?: string;
}

function normalizeProps(
  componentId: string,
  props: Record<string, unknown>
): Record<string, unknown> {
  const def = getComponentDefinition(componentId);
  if (!def) return props;
  return { ...structuredClone(def.defaultProps as Record<string, unknown>), ...props };
}

function scoreProps(link: ComponentLink, props: Record<string, unknown>): number {
  if (link.requiredFields.length === 0) return 1;
  const filled = link.requiredFields.filter((key) => {
    const v = props[key];
    if (v === undefined || v === null) return false;
    if (key === 'rows' && Array.isArray(v)) return v.length > 0;
    if (key === 'stats' && Array.isArray(v)) return v.length > 0;
    if (typeof v === 'string') return v.trim().length > 0;
    return true;
  });
  return filled.length / link.requiredFields.length;
}

function extractProductColumn(col: ParsedFigmaNode): Record<string, unknown> {
  const img = findLargestImage(col);
  const title = headlineText(col) ?? '';
  const subtitle = bodyTextNodes(col, title)[0]?.text?.trim() ?? '';
  const price = textByNamePattern(col, /price|from aud|label|from \$/i) ?? '';
  const cta = findPrimaryButton(col);
  return {
    deskImgSrc: img ? (imageUrl(img) ?? '') : '',
    imgWidth: img?.width ?? 250,
    altText: img?.name ?? title ?? 'Product',
    url: cta?.url ?? 'https://example.com',
    title,
    subtitle,
    price,
    ctaText: cta?.text ?? 'EXPLORE NOW',
    backgroundColor: col.backgroundColor,
    width: img?.width ?? 250,
  };
}

function extractDualCtaColumn(col: ParsedFigmaNode): Record<string, unknown> {
  const base = extractProductColumn(col);
  const buttons = findButtons(col);
  return {
    headerTitle: base.title,
    headerSubtitle: base.subtitle,
    imgSrc: base.deskImgSrc,
    imgWidth: base.imgWidth,
    altText: base.altText,
    url: base.url,
    labelText: base.price,
    title: base.title,
    subtitle: base.subtitle,
    cta1Text: buttons[0]?.text ?? 'REQUEST A QUOTE',
    cta2Text: buttons[1]?.text ?? 'BOOK TEST DRIVE',
    backgroundColor: base.backgroundColor,
    width: base.width,
  };
}

function extractIconColumn(col: ParsedFigmaNode): Record<string, unknown> {
  const icons = findNodes(
    col,
    (n) => Boolean(imageUrl(n)) && nodeArea(n) <= 120 * 120
  ).sort((a, b) => nodeArea(a) - nodeArea(b));
  const icon = icons[0];
  const texts = rankTextNodes(col);
  const html = texts
    .map((t) => {
      const weight = (t.fontWeight ?? 400) >= 600 ? 'strong' : 'span';
      return `<${weight}>${t.text?.trim() ?? ''}</${weight}>`;
    })
    .join('<br/>');
  return {
    iconSrc: icon ? imageUrl(icon) : '',
    iconWidth: icon?.width ?? 32,
    iconHeight: icon?.height ?? 32,
    text: html,
    backgroundColor: col.backgroundColor,
    width: col.width ?? 160,
    iconPadding: '20px 16px 12px 16px',
  };
}

function extractHeader(
  node: ParsedFigmaNode,
  mobileRoot?: ParsedFigmaNode,
  urls?: RegistryBuildUrls
): Record<string, unknown> {
  const logoNode =
    findImageByName(node, /logo/i) ?? findLargestImage(node);
  const mobileChild = matchMobileChild(node, mobileRoot);
  const props: Record<string, unknown> = {
    logoSrc: logoNode ? imageUrl(logoNode) : urls?.desktopUrl,
    logoAlt: logoNode?.name ?? 'Logo',
    backgroundColor: node.backgroundColor,
  };
  if (mobileChild) {
    const mobLogo = findImageByName(mobileChild, /logo/i) ?? findLargestImage(mobileChild);
    if (mobLogo && imageUrl(mobLogo)) props.logoSrc = imageUrl(mobLogo);
  }
  return props;
}

function extractHeroBanner(
  node: ParsedFigmaNode,
  mobileRoot?: ParsedFigmaNode,
  urls?: RegistryBuildUrls
): Record<string, unknown> {
  const imgNode =
    findImageByName(node, /hero|banner|image|photo/i) ?? findLargestImage(node);
  const headline =
    headlineText(node) ?? '';
  const subheadline =
    textByNamePattern(node, /subhead|subtitle|sub.?title|body|description|copy/i) ??
    bodyTextNodes(node, headline)[0]?.text?.trim() ??
    '';
  const cta = findPrimaryButton(node);

  const props: Record<string, unknown> = {
    imgSrc: imgNode ? imageUrl(imgNode) : urls?.desktopUrl,
    imgWidth: imgNode?.width ?? 600,
    altText: imgNode?.name ?? node.name,
    headline: headline ?? '',
    subheadline: subheadline ?? '',
    ctaText: cta?.text,
    ctaUrl: cta?.url ?? 'https://example.com',
    backgroundColor: node.backgroundColor,
    textAlign: node.textAlign ?? 'center',
  };

  const mobImg = mobileImageUrl(node, mobileRoot);
  if (mobImg) props.mobileSrc = mobImg;

  return props;
}

function extractPromoBlock(
  node: ParsedFigmaNode,
  mobileRoot?: ParsedFigmaNode,
  urls?: RegistryBuildUrls
): Record<string, unknown> {
  const imgNode = findImageByName(node, /promo|banner|image/i) ?? findLargestImage(node);
  const title =
    textByNamePattern(node, /title|headline|heading/i) ??
    findAllTextNodes(node).sort((a, b) => (b.fontSize ?? 0) - (a.fontSize ?? 0))[0]?.text?.trim();
  const subtitle = textByNamePattern(node, /sub|body|description|copy/i);
  const cta = findPrimaryButton(node);

  return {
    imgSrc: imgNode ? imageUrl(imgNode) : urls?.desktopUrl,
    imgWidth: imgNode?.width ?? 520,
    altText: imgNode?.name ?? 'Promo',
    title: title ?? '',
    subtitle: subtitle ?? '',
    ctaText: cta?.text ?? 'LEARN MORE',
    ctaUrl: cta?.url ?? 'https://example.com',
    backgroundColor: node.backgroundColor,
  };
}

function extractCtaBanner(node: ParsedFigmaNode): Record<string, unknown> {
  const texts = findAllTextNodes(node).sort((a, b) => (b.fontSize ?? 0) - (a.fontSize ?? 0));
  const cta = findPrimaryButton(node);
  return {
    headline: texts[0]?.text?.trim() ?? '',
    subtext: texts[1]?.text?.trim() ?? '',
    buttonText: cta?.text ?? 'Get Started',
    buttonUrl: cta?.url ?? 'https://example.com',
    backgroundColor: node.backgroundColor,
    headlineColor: texts[0]?.color,
    subtextColor: texts[1]?.color,
  };
}

function extractSectionTitle(node: ParsedFigmaNode): Record<string, unknown> {
  const title =
    textByNamePattern(node, /title|heading|section/i) ?? primaryText(node) ?? node.name;
  return {
    title,
    backgroundColor: node.backgroundColor,
    color: findAllTextNodes(node)[0]?.color,
    textAlign: node.textAlign ?? 'center',
  };
}

function extractIntroCopy(node: ParsedFigmaNode): Record<string, unknown> {
  const texts = findAllTextNodes(node);
  const greeting = texts.find((t) => /hello|hi|dear|greeting/i.test(t.text ?? ''))?.text?.trim();
  const bodyNodes = texts.filter((t) => t !== texts.find((x) => x.text === greeting));
  const body = bodyNodes.map((t) => t.text?.trim()).filter(Boolean).join('\n\n');
  return {
    greeting: greeting ?? 'Hello,',
    body: body || primaryText(node) || '',
    backgroundColor: node.backgroundColor,
    textAlign: node.textAlign ?? 'left',
  };
}

function extractFooter(node: ParsedFigmaNode): Record<string, unknown> {
  const texts = findAllTextNodes(node);
  const copyright =
    texts.find((t) => /©|copyright|\d{4}/i.test(t.text ?? ''))?.text?.trim() ??
    texts[texts.length - 1]?.text?.trim() ??
    '';
  const legal = texts.find((t) => /terms|conditions|legal|warranty/i.test(t.text ?? ''))?.text?.trim();
  const logoNode = findImageByName(node, /logo/i);
  return {
    logoSrc: logoNode ? imageUrl(logoNode) : undefined,
    copyright,
    legalText: legal ?? '',
    backgroundColor: node.backgroundColor,
  };
}

function extractImageBlock(
  node: ParsedFigmaNode,
  mobileRoot?: ParsedFigmaNode,
  urls?: RegistryBuildUrls
): Record<string, unknown> {
  const imgNode = findLargestImage(node) ?? node;
  const mob = mobileImageUrl(node, mobileRoot);
  return {
    imgSrc: imageUrl(imgNode) ?? urls?.desktopUrl ?? '',
    mobileSrc: mob ?? urls?.mobileUrl,
    imgWidth: imgNode.width ?? 520,
    altText: imgNode.name ?? node.name,
    backgroundColor: node.backgroundColor,
    align: 'center',
  };
}

function extractButtonRow(node: ParsedFigmaNode): Record<string, unknown> {
  const buttons = findButtons(node);
  return {
    primaryText: buttons[0]?.text ?? 'Get Started',
    primaryUrl: buttons[0]?.url ?? 'https://example.com',
    secondaryText: buttons[1]?.text,
    secondaryUrl: buttons[1]?.url ?? 'https://example.com',
    backgroundColor: node.backgroundColor,
    align: node.textAlign ?? 'center',
  };
}

function extractTestimonial(node: ParsedFigmaNode): Record<string, unknown> {
  const quoteNode =
    findAllTextNodes(node).find((t) => (t.text?.length ?? 0) > 40) ??
    findAllTextNodes(node)[0];
  const authorNode = findAllTextNodes(node).find(
    (t) => t !== quoteNode && (t.text?.length ?? 0) <= 40
  );
  const avatar = findImageByName(node, /avatar|photo|profile/i);
  return {
    quote: quoteNode?.text?.trim() ?? '',
    authorName: authorNode?.text?.trim() ?? 'Customer',
    authorTitle: textByNamePattern(node, /title|role|position/i),
    avatarSrc: avatar ? imageUrl(avatar) : undefined,
    backgroundColor: node.backgroundColor,
  };
}

function extractTextBlock(node: ParsedFigmaNode): Record<string, unknown> {
  const paragraphs = findAllTextNodes(node)
    .map((t) => t.text?.trim())
    .filter(Boolean)
    .map((t) => `<p>${t}</p>`)
    .join('');
  return {
    content: paragraphs || `<p>${primaryText(node) ?? ''}</p>`,
    backgroundColor: node.backgroundColor,
    textAlign: node.textAlign ?? 'left',
    color: findAllTextNodes(node)[0]?.color,
  };
}

function extractDivider(node: ParsedFigmaNode): Record<string, unknown> {
  return {
    backgroundColor: node.backgroundColor ?? '#ffffff',
    lineColor: node.strokeColor ?? '#e5e5e5',
    lineHeight: node.strokeWeight ?? 1,
  };
}

function extractSpacer(node: ParsedFigmaNode): Record<string, unknown> {
  return {
    height: Math.round(node.height ?? 32),
    backgroundColor: node.backgroundColor ?? '#ffffff',
  };
}

function extractOneColProduct(
  node: ParsedFigmaNode,
  mobileRoot?: ParsedFigmaNode,
  urls?: RegistryBuildUrls
): Record<string, unknown> {
  const col = findColumnNodes(node)[0] ?? node;
  const img = findLargestImage(col);
  const title = headlineText(col) ?? '';
  const subtitle =
    bodyTextNodes(col, title)
      .map((t) => t.text?.trim())
      .filter(Boolean)
      .join(' ') ?? '';
  const cta = findPrimaryButton(col);
  const price = textByNamePattern(col, /price|from aud|label/i) ?? '';
  const mobImg = mobileImageUrl(col, mobileRoot);

  return {
    rows: [
      {
        deskImgSrc: img ? (imageUrl(img) ?? urls?.desktopUrl ?? '') : (urls?.desktopUrl ?? ''),
        mobImgSrc: mobImg ?? urls?.mobileUrl,
        imgWidth: img?.width ?? 520,
        altText: img?.name ?? title ?? 'Product',
        url: cta?.url ?? 'https://example.com',
        productTitle: title,
        productSubtitle: subtitle,
        productPrice: price,
        showButton: Boolean(cta),
        ctaText: cta?.text ?? 'LEARN MORE',
        ctaUrl: cta?.url ?? 'https://example.com',
        width: img?.width ?? 520,
        backgroundColor: col.backgroundColor ?? node.backgroundColor,
      },
    ],
    backgroundColor: node.backgroundColor,
  };
}

function extractTwoColStacked(node: ParsedFigmaNode): Record<string, unknown> {
  const cols = findColumnNodes(node);
  if (cols.length < 2) {
    return { rows: [], backgroundColor: node.backgroundColor };
  }
  return {
    rows: [
      {
        product1: extractProductColumn(cols[0]),
        product2: extractProductColumn(cols[1]),
      },
    ],
    backgroundColor: node.backgroundColor,
  };
}

function extractTwoColDualCta(node: ParsedFigmaNode): Record<string, unknown> {
  const cols = findColumnNodes(node);
  if (cols.length < 2) {
    return { rows: [], backgroundColor: node.backgroundColor };
  }
  return {
    rows: [
      {
        product1: extractDualCtaColumn(cols[0]),
        product2: extractDualCtaColumn(cols[1]),
      },
    ],
    backgroundColor: node.backgroundColor,
    textAlign: node.textAlign ?? 'center',
  };
}

function extractThreeColIcon(node: ParsedFigmaNode): Record<string, unknown> {
  let cols = findColumnNodes(node);
  if (cols.length < 3) {
    cols = findNodes(
      node,
      (n) =>
        (n.type === 'INSTANCE' || n.type === 'FRAME') &&
        rankTextNodes(n).length > 0 &&
        n.id !== node.id
    ).filter((n) => visibleChildren(n).some((c) => imageUrl(c) || c.imageRef));
  }
  if (cols.length < 3) {
    return { rows: [], backgroundColor: node.backgroundColor };
  }
  return {
    rows: [
      {
        left: extractIconColumn(cols[0]),
        center: extractIconColumn(cols[1]),
        right: extractIconColumn(cols[2]),
      },
    ],
    backgroundColor: node.backgroundColor,
  };
}

function extractStatsRow(node: ParsedFigmaNode): Record<string, unknown> {
  const cols = findColumnNodes(node);
  const stats = cols.map((col) => {
    const texts = rankTextNodes(col);
    return {
      value: texts[0]?.text?.trim() ?? '',
      label: texts[1]?.text?.trim() ?? '',
    };
  });
  return {
    stats: stats.filter((s) => s.value || s.label),
    backgroundColor: node.backgroundColor,
  };
}

function extractOrderCard(node: ParsedFigmaNode): Record<string, unknown> {
  const texts = findAllTextNodes(node);
  const rows: { label: string; value: string }[] = [];

  for (let i = 0; i < texts.length - 1; i += 2) {
    const label = texts[i]?.text?.trim() ?? '';
    const value = texts[i + 1]?.text?.trim() ?? '';
    if (label && value) rows.push({ label, value });
  }

  if (rows.length === 0 && texts.length >= 2) {
    rows.push({
      label: texts[0]?.text?.trim() ?? 'Label',
      value: texts[1]?.text?.trim() ?? '',
    });
  }

  return {
    rows,
    backgroundColor: node.backgroundColor,
    cardBackgroundColor: node.backgroundColor ?? '#333333',
  };
}

const EXTRACTORS: Record<
  string,
  (node: ParsedFigmaNode, mobileRoot?: ParsedFigmaNode, urls?: RegistryBuildUrls) => Record<string, unknown>
> = {
  header: extractHeader,
  'hero-banner': extractHeroBanner,
  'promo-block': extractPromoBlock,
  'cta-banner': extractCtaBanner,
  'section-title': extractSectionTitle,
  'intro-copy': extractIntroCopy,
  footer: extractFooter,
  'image-block': extractImageBlock,
  'button-row': extractButtonRow,
  testimonial: extractTestimonial,
  'text-block': extractTextBlock,
  divider: extractDivider,
  spacer: extractSpacer,
  'one-col-product': extractOneColProduct,
  'two-col-stacked': extractTwoColStacked,
  'two-col-dual-cta': extractTwoColDualCta,
  'three-col-icon': extractThreeColIcon,
  'stats-row': extractStatsRow,
  'order-card': extractOrderCard,
};

function extractPropsForLink(
  link: ComponentLink,
  node: ParsedFigmaNode,
  mobileRoot?: ParsedFigmaNode,
  urls?: RegistryBuildUrls
): Record<string, unknown> {
  const extractor = EXTRACTORS[link.registryComponentId];
  const raw = extractor ? extractor(node, mobileRoot, urls) : {};
  return normalizeProps(link.registryComponentId, raw);
}

export interface NodeMatch {
  link: ComponentLink;
  node: ParsedFigmaNode;
  confidence: number;
  props: Record<string, unknown>;
}

export function matchNodeToRegistry(
  node: ParsedFigmaNode,
  mobileRoot?: ParsedFigmaNode,
  urls?: RegistryBuildUrls,
  desktopRoot?: ParsedFigmaNode
): NodeMatch | null {
  const target = unwrapWrapper(node);
  const link = resolveComponentLink(target);
  if (!link) return null;

  const mobileChild = matchMobileChild(target, mobileRoot, desktopRoot);
  const props = extractPropsForLink(link, target, mobileChild ?? mobileRoot, urls);
  const confidence = scoreProps(link, props);
  if (confidence < 0.5) return null;

  return { link, node: target, confidence, props };
}

/** Collect top-level linkable sections without matching nested duplicates. */
function collectLinkableSections(root: ParsedFigmaNode): ParsedFigmaNode[] {
  const rootUnwrapped = unwrapWrapper(root);
  const direct = visibleChildren(rootUnwrapped);
  if (direct.length >= 2) {
    return direct.filter((child) => resolveComponentLink(unwrapWrapper(child)));
  }

  const matches: ParsedFigmaNode[] = [];
  walkNodes(rootUnwrapped, (node, depth) => {
    if (depth === 0) return;
    if (depth > 4) return;
    if (node.type === 'TEXT') return;
    if (resolveComponentLink(unwrapWrapper(node))) {
      matches.push(node);
    }
  });

  return matches.filter((node, _i, arr) => {
    return !arr.some(
      (other) => other !== node && other.id !== node.id && isDescendant(other, node)
    );
  });
}

function isDescendant(ancestor: ParsedFigmaNode, node: ParsedFigmaNode): boolean {
  let found = false;
  walkNodes(ancestor, (n) => {
    if (n.id === node.id) found = true;
  });
  return found;
}

const MIN_REGISTRY_CONFIDENCE = 0.65;
const MIN_DECOMPOSE_AVG = 0.65;
const MIN_PARTIAL_MATCH_RATIO = 0.5;

function buildRegistryResult(
  matches: NodeMatch[],
  reasoning: string
): RegistryBuildResult {
  const avgConfidence = matches.reduce((sum, m) => sum + m.confidence, 0) / matches.length;
  return {
    blocks: matches.map((m) => ({
      componentId: m.link.registryComponentId,
      props: m.props,
      label: m.link.label,
    })),
    confidence: avgConfidence,
    mappingMode: 'registry',
    reasoning,
  };
}

function acceptDecomposedMatches(matches: NodeMatch[], context: string): RegistryBuildResult | null {
  if (matches.length === 0) return null;

  const avgConfidence = matches.reduce((sum, m) => sum + m.confidence, 0) / matches.length;
  if (matches.length >= 2 && avgConfidence >= MIN_DECOMPOSE_AVG) {
    return buildRegistryResult(
      matches,
      `Matched ${matches.length} Figma sections to registry components (${matches.map((m) => m.link.label).join(', ')}) via component links.`
    );
  }

  const strong = matches.filter((m) => m.confidence >= MIN_REGISTRY_CONFIDENCE);
  if (strong.length >= 2 && strong.length / matches.length >= MIN_PARTIAL_MATCH_RATIO) {
    return buildRegistryResult(
      strong,
      `${context}: matched ${strong.length}/${matches.length} linked sections with high confidence (${strong.map((m) => m.link.label).join(', ')}).`
    );
  }

  return null;
}

/**
 * Try to map a Figma frame to editable registry blocks via component links.
 * Returns null when confidence is too low — caller should fall back to AST build.
 */
export function tryFigmaToRegistryBlocks(
  desktopNode: ParsedFigmaNode,
  mobileNode?: ParsedFigmaNode,
  urls?: RegistryBuildUrls
): RegistryBuildResult | null {
  const root = unwrapWrapper(desktopNode);
  const children = visibleChildren(root);
  const linkableSections = collectLinkableSections(desktopNode);

  // Decompose: email frames often stack Header / Hero / Footer as direct children.
  if (children.length >= 2) {
    const matches: NodeMatch[] = [];
    for (const child of children) {
      const match = matchNodeToRegistry(child, mobileNode, urls, root);
      if (match) matches.push(match);
    }

    if (matches.length >= 2) {
      const partial = acceptDecomposedMatches(matches, 'Decomposed email frame');
      if (partial) return partial;
    }
  }

  // Single component frame or one matched child wrapping the whole design.
  const singleMatch =
    matchNodeToRegistry(root, mobileNode, urls, root) ??
    (children.length === 1 ? matchNodeToRegistry(children[0], mobileNode, urls, root) : null);

  if (singleMatch && singleMatch.confidence >= MIN_REGISTRY_CONFIDENCE) {
    return {
      blocks: [
        {
          componentId: singleMatch.link.registryComponentId,
          props: singleMatch.props,
          label: singleMatch.link.label,
        },
      ],
      confidence: singleMatch.confidence,
      mappingMode: 'registry',
      reasoning: `Matched Figma "${singleMatch.node.name}" to registry component "${singleMatch.link.label}" via component link (${Math.round(singleMatch.confidence * 100)}% field coverage).`,
    };
  }

  // Walk for nested INSTANCE nodes (design-system components inside a page frame).
  const instanceMatches: NodeMatch[] = [];
  const walkTargets = linkableSections.length > 0 ? linkableSections : children.length > 0 ? children : [root];
  for (const child of walkTargets) {
    const match = matchNodeToRegistry(child, mobileNode, urls, root);
    if (match && match.confidence >= MIN_REGISTRY_CONFIDENCE) {
      instanceMatches.push(match);
    }
  }

  if (instanceMatches.length >= 1) {
    const partial = acceptDecomposedMatches(
      instanceMatches,
      `Decomposed ${instanceMatches.length} linked Figma instance(s)`
    );
    if (partial) return partial;
  }

  return null;
}
