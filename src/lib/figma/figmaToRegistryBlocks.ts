import { getComponentDefinition } from '@/lib/registry';
import type { FieldType } from '@/lib/registry/types';
import type { ParsedFigmaNode } from './parseFigmaNode';
import { resolveComponentLink, type ComponentLink } from './componentLinks';
import { figmaToReactEmailTree } from './figmaToReactEmail';
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

/** Field groups that describe how a block looks rather than what it says. */
const PRESENTATION_GROUPS = new Set(['Layout', 'Style']);

/** Fallback for fields the registry declares without a group. */
const PRESENTATION_FIELD_TYPES = new Set<FieldType>(['color', 'number', 'select']);

/**
 * Defaults that are not declared registry fields but still only affect layout.
 * Anything else undeclared (`showLinks`, `socialTitle`, `showDivider`, …) is
 * treated as content and dropped.
 */
const PRESENTATION_ONLY_PROPS = new Set([
  'deskPadding',
  'mobPadding',
  'iconPadding',
  'align',
  'textAlign',
  'socialIconSize',
  'dividerColor',
  'linkColor',
  'imgBorderRadius',
  'cardBackgroundColor',
]);

/**
 * Merge the registry defaults a Figma-built block may safely inherit.
 *
 * Registry defaults are Nissan demo content so a hand-added block looks
 * finished the moment it lands on the canvas. A block built from Figma must
 * show only what the frame actually contains, so copy, links, logos and social
 * icons are never inherited — a footer holding one legal paragraph would
 * otherwise ship "Connect with us", Facebook/Instagram icons and
 * Manage preferences / Unsubscribe / Privacy Policy links the design never had.
 * Colours, padding and alignment still fall back to the registry so blocks keep
 * sane spacing when Figma does not specify it.
 */
function normalizeProps(
  componentId: string,
  props: Record<string, unknown>
): Record<string, unknown> {
  const extracted = Object.fromEntries(
    Object.entries(props).filter(([, value]) => value !== undefined)
  );

  const def = getComponentDefinition(componentId);
  if (!def) return extracted;

  const fields = new Map((def.fields ?? []).map((f) => [f.key, f]));
  const defaults = structuredClone(def.defaultProps as Record<string, unknown>);
  const presentation: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(defaults)) {
    const field = fields.get(key);
    const keep = field
      ? field.group
        ? PRESENTATION_GROUPS.has(field.group)
        : PRESENTATION_FIELD_TYPES.has(field.type)
      : PRESENTATION_ONLY_PROPS.has(key);
    if (keep) presentation[key] = value;
  }

  return { ...presentation, ...extracted };
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

/**
 * A salutation only counts when the line STARTS with one — an unanchored
 * `/hi/` also matches the "hi" inside "This month…", which promotes a whole
 * body paragraph to the greeting slot.
 */
const GREETING_LINE = /^\s*(hello|hi|hey|dear|greetings)\b/i;

function extractIntroCopy(node: ParsedFigmaNode): Record<string, unknown> {
  const texts = findAllTextNodes(node);
  const greetingNode = texts.find(
    (t) => GREETING_LINE.test(t.text ?? '') && (t.text?.trim().length ?? 0) <= 80
  );
  const greeting = greetingNode?.text?.trim();
  const bodyNodes = texts.filter((t) => t !== greetingNode);
  const body = bodyNodes.map((t) => t.text?.trim()).filter(Boolean).join('\n\n');
  return {
    greeting: greeting ?? 'Hello,',
    body: body || primaryText(node) || '',
    backgroundColor: node.backgroundColor,
    textAlign: node.textAlign ?? 'left',
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

/**
 * Registry components an automatic Figma match must never produce.
 *
 * The prebuilt Footer renders a fixed order (logo → social → links → legal) and
 * ships Nissan demo content, so mapping a Figma frame onto it can reorder the
 * design or introduce elements the selected frame never had. Rejecting the
 * match here rather than deleting the link in `componentLinks.ts` covers every
 * route into the component at once — layer name, emoji-prefixed name, master
 * component ID and user overrides — and leaves the Footer untouched for users
 * who add it by hand from the builder registry. Rejected nodes fall through to
 * the AST build, which reproduces only the visible Figma nodes.
 */
const REGISTRY_MATCH_BYPASS = new Set(['footer']);

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
): { raw: Record<string, unknown>; props: Record<string, unknown> } {
  const extractor = EXTRACTORS[link.registryComponentId];
  const raw = extractor ? extractor(node, mobileRoot, urls) : {};
  return { raw, props: normalizeProps(link.registryComponentId, raw) };
}

/**
 * Whether a registry component can actually carry everything the Figma node
 * holds.
 *
 * `requiredFields` only asks "did the fields this component HAS get filled?",
 * which happily accepts a text-only component for a frame that also contains a
 * headline, a CTA button and a background image — the extra content is silently
 * dropped. This checks the opposite direction: every source string must survive
 * into the props, and buttons/images must land in fields that render them as
 * such. When they don't, the caller falls back to the AST build, which
 * reproduces the frame faithfully.
 */
function normalizeForCompare(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

interface PropEntry {
  key: string;
  value: string;
}

function collectPropEntries(value: unknown, key = '', out: PropEntry[] = []): PropEntry[] {
  if (typeof value === 'string') {
    out.push({ key, value });
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectPropEntries(item, key, out));
  } else if (value && typeof value === 'object') {
    for (const [childKey, childValue] of Object.entries(value)) {
      collectPropEntries(childValue, childKey, out);
    }
  }
  return out;
}

const BUTTON_PROP_KEY = /^(cta\d*text|buttontext|buttonlabel|primarytext|secondarytext)$/i;
const IMAGE_PROP_KEY = /src$/i;

function retainsSourceContent(node: ParsedFigmaNode, raw: Record<string, unknown>): boolean {
  const entries = collectPropEntries(raw);
  const haystack = entries.map((e) => normalizeForCompare(e.value)).join(' \u241f ');

  const sourceTexts = findAllTextNodes(node)
    .map((t) => normalizeForCompare(t.text ?? ''))
    .filter((t) => t.length >= 2);
  if (sourceTexts.some((text) => !haystack.includes(text))) return false;

  const buttonLabels = findButtons(node)
    .map((b) => normalizeForCompare(b.text))
    .filter((label) => label.length > 0);
  if (buttonLabels.length > 0) {
    const buttonValues = entries
      .filter((e) => BUTTON_PROP_KEY.test(e.key))
      .map((e) => normalizeForCompare(e.value));
    if (!buttonLabels.some((label) => buttonValues.some((v) => v.includes(label)))) return false;
  }

  // Only descendants count: a fill on the frame itself is a background, not content.
  const hasSourceImage = findNodes(
    node,
    (n) => n.id !== node.id && Boolean(imageUrl(n) || n.imageRef || n.type === 'IMAGE')
  ).length > 0;
  if (hasSourceImage) {
    const hasImageProp = entries.some(
      (e) => IMAGE_PROP_KEY.test(e.key) && e.value.trim().length > 0
    );
    if (!hasImageProp) return false;
  }

  return true;
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

  if (REGISTRY_MATCH_BYPASS.has(link.registryComponentId)) return null;

  const mobileChild = matchMobileChild(target, mobileRoot, desktopRoot);
  const { raw, props } = extractPropsForLink(link, target, mobileChild ?? mobileRoot, urls);
  const confidence = scoreProps(link, props);
  if (confidence < 0.5) return null;
  if (!retainsSourceContent(target, raw)) return null;

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

function selectDecomposedMatches(matches: NodeMatch[]): NodeMatch[] | null {
  if (matches.length === 0) return null;

  const avgConfidence = matches.reduce((sum, m) => sum + m.confidence, 0) / matches.length;
  if (matches.length >= 2 && avgConfidence >= MIN_DECOMPOSE_AVG) {
    return matches;
  }

  const strong = matches.filter((m) => m.confidence >= MIN_REGISTRY_CONFIDENCE);
  if (strong.length >= 2 && strong.length / matches.length >= MIN_PARTIAL_MATCH_RATIO) {
    return strong;
  }

  return null;
}

function acceptDecomposedMatches(matches: NodeMatch[], context: string): RegistryBuildResult | null {
  const selected = selectDecomposedMatches(matches);
  if (!selected) return null;

  const reasoning =
    selected.length === matches.length
      ? `Matched ${selected.length} Figma sections to registry components (${selected.map((m) => m.link.label).join(', ')}) via component links.`
      : `${context}: matched ${selected.length}/${matches.length} linked sections with high confidence (${selected.map((m) => m.link.label).join(', ')}).`;
  return buildRegistryResult(selected, reasoning);
}

function buildMixedDecomposedResult(
  children: ParsedFigmaNode[],
  matches: NodeMatch[],
  mobileRoot: ParsedFigmaNode | undefined,
  desktopRoot: ParsedFigmaNode
): RegistryBuildResult {
  const registryByNodeId = new Map(matches.map((match) => [match.node.id, match]));
  const blocks: RegistryBuildBlock[] = [];

  for (const child of children) {
    const target = unwrapWrapper(child);
    const match = registryByNodeId.get(target.id);
    if (match) {
      blocks.push({
        componentId: match.link.registryComponentId,
        props: match.props,
        label: match.link.label,
      });
      continue;
    }

    const link = resolveComponentLink(target);
    if (link?.registryComponentId !== 'footer') continue;

    const mobileChild = matchMobileChild(target, mobileRoot, desktopRoot);
    const mobileTarget = mobileChild ? unwrapWrapper(mobileChild) : undefined;
    const built = figmaToReactEmailTree(target, mobileTarget);
    blocks.push({
      componentId: 'figma-react-email',
      props: {
        tree: built.tree,
        sourceFrame: target.name,
        mobileFrame: mobileTarget?.name ?? '',
      },
      label: target.name,
    });
  }

  const avgConfidence =
    matches.reduce((sum, match) => sum + match.confidence, 0) / matches.length;
  return {
    blocks,
    confidence: avgConfidence,
    mappingMode: 'registry',
    reasoning: `Matched ${matches.length} Figma sections to registry components and built the Footer from its design-derived AST in source order.`,
  };
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
      const selected = selectDecomposedMatches(matches);
      if (selected) {
        const hasFooter = children.some(
          (child) => resolveComponentLink(unwrapWrapper(child))?.registryComponentId === 'footer'
        );
        if (hasFooter) {
          return buildMixedDecomposedResult(children, selected, mobileNode, root);
        }
        return acceptDecomposedMatches(matches, 'Decomposed email frame');
      }
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
    const selected = selectDecomposedMatches(instanceMatches);
    if (selected) {
      // A footer among the walked sections is bypassed by matchNodeToRegistry,
      // so it never lands in `selected`. Inject it as a design-derived AST block
      // in place rather than dropping it from the email.
      const hasFooter = walkTargets.some(
        (child) => resolveComponentLink(unwrapWrapper(child))?.registryComponentId === 'footer'
      );
      if (hasFooter) {
        return buildMixedDecomposedResult(walkTargets, selected, mobileNode, root);
      }
      return acceptDecomposedMatches(
        instanceMatches,
        `Decomposed ${instanceMatches.length} linked Figma instance(s)`
      );
    }
  }

  return null;
}
