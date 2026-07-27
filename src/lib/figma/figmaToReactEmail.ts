import type { CSSProperties } from 'react';
import type { ParsedFigmaNode } from './parseFigmaNode';
import {
  findAllTextNodes,
  findNodeByPath,
  findTextChild,
  findButtonBackgroundShape,
  getContentChildren,
  getTopLevelSections,
  hasTextDescendant,
  mapCounterAxisAlign,
  nodePath,
  normalizeColor,
  resolveEffectiveBackground,
  tryMapCompositeButton,
} from './parseFigmaNode';
import { buildPrimitivesFromFigma, countAstNodes } from './figmaPrimitives';
import type { ReactEmailNode } from './types/reactEmailAst';

const EMAIL_FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

const SKIP_TYPES = new Set(['VECTOR', 'ELLIPSE', 'STAR', 'POLYGON', 'BOOLEAN_OPERATION']);

const CONTAINER_TYPES = new Set(['FRAME', 'COMPONENT', 'INSTANCE', 'GROUP']);

export interface FigmaToReactEmailResult {
  tree: ReactEmailNode;
  warnings: string[];
  nodeCount: number;
}

function fontFamily(node: ParsedFigmaNode): string {
  if (node.fontFamily) {
    return `"${node.fontFamily}", ${EMAIL_FONT}`;
  }
  return EMAIL_FONT;
}

function paddingStyle(node: ParsedFigmaNode): CSSProperties | undefined {
  const { paddingTop, paddingRight, paddingBottom, paddingLeft } = node;
  if (
    paddingTop == null &&
    paddingRight == null &&
    paddingBottom == null &&
    paddingLeft == null
  ) {
    return undefined;
  }
  return {
    paddingTop: paddingTop ?? 0,
    paddingRight: paddingRight ?? 0,
    paddingBottom: paddingBottom ?? 0,
    paddingLeft: paddingLeft ?? 0,
  };
}

function formatPaddingShorthand(node: ParsedFigmaNode): string | undefined {
  const pt = node.paddingTop ?? 0;
  const pr = node.paddingRight ?? 0;
  const pb = node.paddingBottom ?? 0;
  const pl = node.paddingLeft ?? 0;
  if (pt === 0 && pr === 0 && pb === 0 && pl === 0) return undefined;
  if (pt === pr && pr === pb && pb === pl) return `${pt}px`;
  return `${pt}px ${pr}px ${pb}px ${pl}px`;
}

function nodeTextAlign(node: ParsedFigmaNode): CSSProperties['textAlign'] {
  return mapCounterAxisAlign(
    node.layoutMode,
    node.counterAxisAlign,
    node.primaryAxisAlign
  );
}

function isLightTextColor(color?: string): boolean {
  if (!color) return false;
  const c = color.replace(/\s/g, '').toLowerCase();
  if (c === '#fff' || c === '#ffffff' || c === 'white') return true;
  const rgb = c.match(/^rgba?\((\d+),(\d+),(\d+)/);
  if (rgb) {
    const [r, g, b] = rgb.slice(1, 4).map(Number);
    return r >= 200 && g >= 200 && b >= 200;
  }
  return false;
}

function inferDarkHeroBackground(node: ParsedFigmaNode): string | undefined {
  const name = node.name.toLowerCase();
  if (!/opening|hero|intro|banner|headline|offer/.test(name)) return undefined;
  const texts = findAllTextNodes(node);
  if (texts.length === 0) return undefined;
  if (texts.every((t) => isLightTextColor(t.color))) return '#000000';
  return undefined;
}

function sectionStyle(node: ParsedFigmaNode): CSSProperties {
  const backgroundColor =
    resolveEffectiveBackground(node) ?? inferDarkHeroBackground(node);
  const textAlign = nodeTextAlign(node);
  const padding = formatPaddingShorthand(node);

  const style: CSSProperties = {
    textAlign,
    width: '100%',
    ...(padding ? { padding } : paddingStyle(node)),
  };

  if (backgroundColor) {
    style.backgroundColor = backgroundColor;
  }

  if (node.width && node.width <= 600) {
    style.maxWidth = node.width;
  }

  return style;
}

function textStyle(node: ParsedFigmaNode, inheritAlign?: CSSProperties['textAlign']): CSSProperties {
  return {
    color: node.color ?? '#000000',
    fontSize: node.fontSize ?? 16,
    fontWeight: node.fontWeight ?? 400,
    textAlign: (node.textAlign as CSSProperties['textAlign']) ?? inheritAlign ?? 'left',
    fontFamily: fontFamily(node),
    margin: 0,
    lineHeight: node.lineHeight ? `${node.lineHeight}px` : '1.4',
    letterSpacing: node.letterSpacing ? `${node.letterSpacing}px` : undefined,
  };
}

function isVisualButton(node: ParsedFigmaNode): boolean {
  const textChild = findTextChild(node);
  if (!textChild?.text) return false;

  const shape = findButtonBackgroundShape(node);
  const bgNode = shape ?? (normalizeColor(node.backgroundColor) ? node : undefined);
  const bg = bgNode ? normalizeColor(bgNode.backgroundColor) : undefined;
  const radius = bgNode?.cornerRadius ?? node.cornerRadius ?? 0;
  const h = node.height ?? 0;
  const w = node.width ?? 0;

  if (!bg) return false;
  if (radius >= 16 && h >= 32 && h <= 88 && w >= 100) return true;
  if (h >= 36 && h <= 80 && w >= 200) return true;
  return false;
}

function isCtaPhrase(text: string): boolean {
  const t = text.trim();
  if (t.length > 60) return false;
  if (
    /^(see all|request a quote|shop now|buy now|learn more|get started|click here|view offer|order now|book now|sign up|register)/i.test(
      t
    )
  ) {
    return true;
  }
  if (t.length <= 40 && /see all offers|request a quote|get a quote/i.test(t)) return true;
  return false;
}

/** Multi-paragraph sections are never single buttons */
function isContentContainer(node: ParsedFigmaNode): boolean {
  const textNodes = findAllTextNodes(node);
  if (textNodes.length > 1) return true;

  const contentChildren = getContentChildren(node);
  const structural = contentChildren.filter(
    (c) =>
      c.type === 'TEXT' ||
      c.type === 'FRAME' ||
      c.type === 'INSTANCE' ||
      c.type === 'COMPONENT' ||
      c.type === 'GROUP'
  );

  if (structural.length > 2) return true;

  const longText = textNodes.some((t) => (t.text?.length ?? 0) > 80);
  if (longText && structural.length > 1) return true;

  const h = node.height ?? 0;
  if (h > 160 && textNodes.length >= 1 && structural.length >= 2) return true;

  return false;
}

function isButtonLike(node: ParsedFigmaNode): boolean {
  if (isContentContainer(node)) return false;

  const name = node.name.toLowerCase();
  const textChild = findTextChild(node);

  if (!textChild) return false;

  if (
    /button|cta|btn|call.?to.?action|primary|secondary|action|pill/.test(name)
  ) {
    return true;
  }

  if (textChild.text && isCtaPhrase(textChild.text)) return true;

  if (tryMapCompositeButton(node)) return true;

  if (isVisualButton(node)) return true;

  if (node.type !== 'RECTANGLE' && node.type !== 'FRAME' && node.type !== 'INSTANCE' && node.type !== 'COMPONENT') {
    return false;
  }

  const bgShape = findButtonBackgroundShape(node);
  const h = node.height ?? 0;
  const w = node.width ?? 0;
  if (bgShape && textChild && h > 0 && h <= 120 && w > 0) return true;

  if (normalizeColor(node.backgroundColor) && node.cornerRadius != null && h > 0 && h <= 120) {
    return true;
  }
  if (
    normalizeColor(node.backgroundColor) &&
    h > 0 &&
    h <= 72 &&
    w > 0 &&
    w <= 600
  ) {
    return true;
  }

  return false;
}

/** Unwrap a single inner content frame so parent padding/background apply correctly */
function unwrapContentWrapper(node: ParsedFigmaNode): ParsedFigmaNode {
  const contentChildren = getContentChildren(node);
  if (contentChildren.length !== 1) {
    return {
      ...node,
      children: node.children.map(unwrapContentWrapper),
    };
  }

  const wrapper = contentChildren[0];
  if (
    wrapper.type !== 'FRAME' &&
    wrapper.type !== 'GROUP' &&
    wrapper.type !== 'INSTANCE'
  ) {
    return {
      ...node,
      children: node.children.map(unwrapContentWrapper),
    };
  }

  if (!hasTextDescendant(wrapper)) {
    return {
      ...node,
      children: node.children.map(unwrapContentWrapper),
    };
  }

  const wrapperContent = getContentChildren(wrapper);
  const parentBg = normalizeColor(resolveEffectiveBackground(node));
  const wrapperBg = normalizeColor(resolveEffectiveBackground(wrapper));

  if (wrapperContent.length < 2 && findAllTextNodes(wrapper).length < 2) {
    return {
      ...node,
      children: node.children.map(unwrapContentWrapper),
    };
  }

  const merged: ParsedFigmaNode = {
    ...wrapper,
    paddingTop: (node.paddingTop ?? 0) + (wrapper.paddingTop ?? 0),
    paddingRight: (node.paddingRight ?? 0) + (wrapper.paddingRight ?? 0),
    paddingBottom: (node.paddingBottom ?? 0) + (wrapper.paddingBottom ?? 0),
    paddingLeft: (node.paddingLeft ?? 0) + (wrapper.paddingLeft ?? 0),
    gap: wrapper.gap ?? node.gap,
    layoutMode: wrapper.layoutMode ?? node.layoutMode,
    counterAxisAlign: wrapper.counterAxisAlign ?? node.counterAxisAlign,
    primaryAxisAlign: wrapper.primaryAxisAlign ?? node.primaryAxisAlign,
    backgroundColor:
      parentBg ??
      inferDarkHeroBackground(node) ??
      inferDarkHeroBackground(wrapper) ??
      wrapperBg ??
      wrapper.backgroundColor,
    children: wrapper.children.map(unwrapContentWrapper),
  };

  return merged;
}

function stripExportUrlForTextContainers(node: ParsedFigmaNode): ParsedFigmaNode {
  const hasText = hasTextDescendant(node);
  return {
    ...node,
    exportUrl: hasText ? undefined : node.exportUrl,
    children: node.children.map(stripExportUrlForTextContainers),
  };
}

function getImageSrc(node: ParsedFigmaNode): string | undefined {
  if (node.exportUrl && !hasTextDescendant(node)) return node.exportUrl;
  if (node.imageRef?.startsWith('/') || node.imageRef?.startsWith('http')) {
    return node.imageRef;
  }
  return node.imageRef;
}

/** Pixel-accurate build: export each Figma section as PNG, stack as React Email Section + Img */
function buildFidelityTree(
  desktopRoot: ParsedFigmaNode,
  mobileRoot: ParsedFigmaNode | undefined,
  warnings: string[]
): ReactEmailNode {
  const rootBg = resolveEffectiveBackground(desktopRoot);
  const sections = getTopLevelSections(desktopRoot);
  const sectionNodes: ReactEmailNode[] = [];

  for (const section of sections) {
    const src = section.exportUrl ?? getImageSrc(section);
    if (!src) {
      warnings.push(`Section "${section.name}" could not be exported — re-fetch from Figma.`);
      continue;
    }

    const mobileSection = mobileRoot?.children.find((c) => c.name === section.name);
    const mobileSrc = mobileSection?.exportUrl;
    const imgClass = `figma-section-${section.id.replace(/[:;]/g, '-')}`;

    sectionNodes.push({
      type: 'Section',
      style: {
        width: '100%',
        backgroundColor: resolveEffectiveBackground(section),
        textAlign: 'center',
      },
      children: [
        {
          type: 'Img',
          src,
          mobileSrc: mobileSrc && mobileSrc !== src ? mobileSrc : undefined,
          width: Math.min(section.width ?? 600, 600),
          height: section.height,
          alt: section.name,
          className: imgClass,
        },
      ],
    });
  }

  if (sectionNodes.length === 0) {
    const frameSrc = desktopRoot.exportUrl ?? getImageSrc(desktopRoot);
    if (!frameSrc) {
      warnings.push('No section exports available; falling back to primitive mapping.');
      return buildPrimitiveTree(desktopRoot, mobileRoot, warnings);
    }

    warnings.push('Using full-frame PNG for pixel-perfect design match.');
    return {
      type: 'Section',
      style: {
        maxWidth: 600,
        width: '100%',
        margin: '0 auto',
        backgroundColor: rootBg,
        textAlign: 'center',
      },
      children: [
        {
          type: 'Img',
          src: frameSrc,
          mobileSrc:
            mobileRoot?.exportUrl && mobileRoot.exportUrl !== frameSrc
              ? mobileRoot.exportUrl
              : undefined,
          width: Math.min(desktopRoot.width ?? 600, 600),
          height: desktopRoot.height,
          alt: desktopRoot.name,
          className: 'figma-frame-responsive',
        },
      ],
    };
  }

  return {
    type: 'Section',
    style: {
      maxWidth: 600,
      width: '100%',
      margin: '0 auto',
      backgroundColor: rootBg,
    },
    children: sectionNodes,
  };
}

/**
 * Walk Figma nodes and emit React Email primitives: Heading, Text, Button, Img, Row, Hr.
 * Does not wrap every nested frame in its own Section.
 */
function collectSemanticNodes(
  node: ParsedFigmaNode,
  warnings: string[],
  depth: number,
  path: string[],
  inheritAlign?: CSSProperties['textAlign']
): ReactEmailNode[] {
  if (!node.visible) return [];
  if ((node.width ?? 1) <= 0 || (node.height ?? 1) <= 0) return [];
  if (SKIP_TYPES.has(node.type)) return [];
  if (depth > 16) {
    warnings.push(`Skipped deep node: ${nodePath(node, path.slice(0, -1))}`);
    return [];
  }

  const align = nodeTextAlign(node) ?? inheritAlign;

  if (node.type === 'TEXT' && node.text?.trim()) {
    if (isCtaPhrase(node.text)) {
      return [mapCtaTextAsButton(node, align)];
    }
    return mapTextNodes(node, align);
  }

  if (node.type === 'LINE') {
    return [{ type: 'Hr', style: { borderColor: node.color ?? '#e5e5e5', margin: '12px 0' } }];
  }

  if (tryMapCompositeButton(node) || isButtonLike(node)) {
    return [mapButtonNode(node, align)];
  }

  const hasText = hasTextDescendant(node);
  const imageSrc = getImageSrc(node);
  const isRasterImage =
    !hasText &&
    (node.type === 'IMAGE' ||
      (node.imageRef && (node.type === 'RECTANGLE' || node.type === 'FRAME')) ||
      (node.exportUrl && !node.imageRef && (node.type === 'RECTANGLE' || node.type === 'FRAME')));

  if (isRasterImage && imageSrc) {
    const img = mapImageNode(node);
    if (img) return [img];
  }

  const contentChildren = getContentChildren(node);

  if (node.layoutMode === 'HORIZONTAL' && contentChildren.length > 1) {
    const parentWidth = node.width ?? 600;
    const columns: ReactEmailNode[] = contentChildren.map((child) => ({
      type: 'Column',
      style: {
        width: child.width
          ? `${Math.min(100, Math.round((child.width / parentWidth) * 100))}%`
          : `${Math.round(100 / contentChildren.length)}%`,
        verticalAlign: 'top',
      },
      children: collectSemanticNodes(
        child,
        warnings,
        depth + 1,
        [...path, child.name],
        align
      ),
    }));

    const rowNode: ReactEmailNode = {
      type: 'Row',
      style: { width: '100%' },
      children: columns,
    };

    const pad = paddingStyle(node);
    const bg = resolveEffectiveBackground(node);
    if (pad || bg) {
      return [
        {
          type: 'Section',
          style: {
            width: '100%',
            textAlign: align,
            backgroundColor: bg,
            ...pad,
          },
          children: [rowNode],
        },
      ];
    }

    return [rowNode];
  }

  if (contentChildren.length > 0) {
    const mapped = contentChildren.flatMap((child) =>
      collectSemanticNodes(child, warnings, depth + 1, [...path, child.name], align)
    );

    const pad = paddingStyle(node);
    const bg = resolveEffectiveBackground(node);
    const needsWrapper =
      mapped.length > 0 &&
      (pad != null || bg != null) &&
      node.type !== 'TEXT' &&
      !isButtonLike(node);

    if (needsWrapper) {
      return [
        {
          type: 'Section',
          style: {
            width: '100%',
            textAlign: align,
            backgroundColor: bg,
            ...pad,
          },
          children: applyGapToChildren(mapped, node.gap),
        },
      ];
    }

    return mapped;
  }

  return [];
}

function buildPrimitiveTree(
  desktopNode: ParsedFigmaNode,
  mobileNode: ParsedFigmaNode | undefined,
  warnings: string[]
): ReactEmailNode {
  let sourceNode =
    mobileNode != null ? applyMobileLayout(desktopNode, mobileNode) : desktopNode;

  sourceNode = unwrapContentWrapper(stripExportUrlForTextContainers(sourceNode));
  if (mobileNode) {
    mobileNode = unwrapContentWrapper(stripExportUrlForTextContainers(mobileNode));
  }

  const rootBackground =
    resolveEffectiveBackground(sourceNode) ?? inferDarkHeroBackground(sourceNode);
  const topSections = getTopLevelSections(sourceNode);
  const sectionsToMap = topSections.length > 0 ? topSections : [sourceNode];

  const allSemanticChildren = sectionsToMap.every(
    (s) => hasTextDescendant(s) || isButtonLike(s)
  );

  const sectionNodes: ReactEmailNode[] = [];

  if (sectionsToMap.length > 1 && allSemanticChildren) {
    const children = collectSemanticNodes(sourceNode, warnings, 0, [sourceNode.name]);
    if (children.length > 0) {
      sectionNodes.push({
        type: 'Section',
        style: {
          ...sectionStyle(sourceNode),
          backgroundColor: rootBackground ?? sectionStyle(sourceNode).backgroundColor,
        },
        children: applyGapToChildren(children, sourceNode.gap),
      });
    }
  } else {
    for (const section of sectionsToMap) {
      const children = collectSemanticNodes(section, warnings, 0, [section.name]);
      if (children.length === 0) continue;

      const style = sectionStyle(section);
      if (!style.backgroundColor && rootBackground) {
        style.backgroundColor = rootBackground;
      }

      sectionNodes.push({
        type: 'Section',
        style,
        children: applyGapToChildren(children, section.gap),
      });
    }
  }

  let tree: ReactEmailNode;

  if (sectionNodes.length === 0) {
    tree = {
      type: 'Section',
      style: {
        maxWidth: 600,
        margin: '0 auto',
        width: '100%',
        backgroundColor: rootBackground,
      },
      children: [],
    };
  } else if (sectionNodes.length === 1) {
    tree = ensureRootWrapper(sectionNodes[0], rootBackground);
  } else {
    tree = {
      type: 'Container',
      style: {
        maxWidth: 600,
        margin: '0 auto',
        width: '100%',
        backgroundColor: rootBackground,
      },
      children: sectionNodes,
    };
  }

  warnings.push(
    'Mapped Figma text to Heading/Text and buttons to React Email Button with design styles.'
  );

  return mergeMobileImages(tree, desktopNode, mobileNode, warnings);
}

/** Header/title text from Figma → React Email Heading */
function isHeadingText(node: ParsedFigmaNode): boolean {
  const name = node.name.toLowerCase();
  if (
    /header|title|headline|heading|\bh[1-3]\b|subject|hero|preheader|tagline|subheading|display/.test(
      name
    )
  ) {
    return true;
  }

  const fontSize = node.fontSize ?? 16;
  const fontWeight = node.fontWeight ?? 400;
  if (fontSize >= 28) return true;
  if (fontSize >= 20 && fontWeight >= 600) return true;

  return false;
}

function headingLevel(node: ParsedFigmaNode): 'h1' | 'h2' | 'h3' {
  const fontSize = node.fontSize ?? 16;
  const name = node.name.toLowerCase();
  if (/\bh1\b|hero|display/.test(name) || fontSize >= 32) return 'h1';
  if (/\bh3\b|subheading|tagline|preheader/.test(name) || fontSize < 24) return 'h3';
  return 'h2';
}

function mapTextNode(
  node: ParsedFigmaNode,
  inheritAlign?: CSSProperties['textAlign'],
  content?: string
): ReactEmailNode {
  const text = content ?? node.text ?? '';
  const style = textStyle(node, inheritAlign);

  if (isHeadingText(node)) {
    return {
      type: 'Heading',
      content: text,
      as: headingLevel(node),
      style: {
        ...style,
        margin: style.margin ?? '0 0 16px 0',
        whiteSpace: 'pre-line' as const,
      },
    };
  }

  return {
    type: 'Text',
    content: text,
    style: {
      ...style,
      margin: style.margin ?? '0 0 16px 0',
      whiteSpace: 'pre-line' as const,
    },
  };
}

function mapTextNodes(
  node: ParsedFigmaNode,
  inheritAlign?: CSSProperties['textAlign']
): ReactEmailNode[] {
  const raw = node.text ?? '';
  const paragraphs = raw.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  if (paragraphs.length <= 1) {
    return [mapTextNode(node, inheritAlign)];
  }

  return paragraphs.map((paragraph, index) => {
    const mapped = mapTextNode(node, inheritAlign, paragraph);
    if (index > 0 && (mapped.type === 'Text' || mapped.type === 'Heading')) {
      return { ...mapped, style: { ...mapped.style, marginTop: 12 } };
    }
    return mapped;
  });
}

function mapCtaTextAsButton(
  node: ParsedFigmaNode,
  inheritAlign?: CSSProperties['textAlign']
): ReactEmailNode {
  const raw = node.text?.trim() ?? 'Click here';
  const isQuote = /quote/i.test(raw);
  const label = raw.toUpperCase();
  return {
    type: 'Button',
    href: '#',
    label,
    containerStyle: {
      textAlign: inheritAlign ?? 'center',
      width: '100%',
      paddingTop: 8,
      paddingBottom: 8,
    },
    style: {
      backgroundColor: isQuote ? '#ffffff' : '#c3002f',
      color: isQuote ? '#000000' : node.color ?? '#ffffff',
      borderRadius: 999,
      fontFamily: fontFamily(node),
      fontSize: node.fontSize ?? 14,
      fontWeight: node.fontWeight ?? 700,
      padding: '14px 28px',
      textTransform: 'uppercase' as const,
      textDecoration: 'none',
      width: '100%',
      maxWidth: '100%',
      display: 'inline-block',
      textAlign: 'center' as const,
      boxSizing: 'border-box' as const,
    },
  };
}

function mapButtonFromParts(
  container: ParsedFigmaNode,
  shape: ParsedFigmaNode,
  text: ParsedFigmaNode,
  inheritAlign?: CSSProperties['textAlign']
): ReactEmailNode {
  const pt = shape.paddingTop ?? container.paddingTop ?? 14;
  const pr = shape.paddingRight ?? container.paddingRight ?? 28;
  const pb = shape.paddingBottom ?? container.paddingBottom ?? 14;
  const pl = shape.paddingLeft ?? container.paddingLeft ?? 28;

  const align = inheritAlign ?? nodeTextAlign(container);
  const bg =
    normalizeColor(shape.backgroundColor) ??
    normalizeColor(container.backgroundColor) ??
    '#000000';
  const textColor = text.color ?? '#ffffff';
  const radius = shape.cornerRadius ?? container.cornerRadius ?? 4;
  const pillRadius = radius >= 16 ? 999 : radius;
  const containerW = container.width ?? 0;
  const shapeW = shape.width ?? containerW;
  const fullWidth = containerW > 0 && shapeW >= containerW * 0.75;
  const label = text.text?.trim() ?? container.name;
  const isUppercase = label === label.toUpperCase() && /[A-Z]/.test(label);

  return {
    type: 'Button',
    href: '#',
    label,
    containerStyle: {
      textAlign: align ?? 'center',
      width: '100%',
      paddingTop: 6,
      paddingBottom: 6,
    },
    style: {
      backgroundColor: bg,
      color: textColor,
      borderRadius: pillRadius,
      fontFamily: fontFamily(text),
      fontSize: text.fontSize ?? 14,
      fontWeight: text.fontWeight ?? 700,
      lineHeight: text.lineHeight ? `${text.lineHeight}px` : '1.2',
      padding: `${pt}px ${pr}px ${pb}px ${pl}px`,
      textAlign: 'center' as const,
      textTransform: isUppercase ? ('uppercase' as const) : undefined,
      textDecoration: 'none',
      width: fullWidth ? '100%' : shapeW ? `${shapeW}px` : undefined,
      maxWidth: '100%',
      display: 'inline-block',
      boxSizing: 'border-box' as const,
      border:
        shape.strokeColor && shape.strokeWeight
          ? `${shape.strokeWeight}px solid ${shape.strokeColor}`
          : 'none',
    },
  };
}

function mapButtonNode(
  node: ParsedFigmaNode,
  inheritAlign?: CSSProperties['textAlign']
): ReactEmailNode {
  const composite = tryMapCompositeButton(node);
  if (composite) {
    return mapButtonFromParts(node, composite.shape, composite.text, inheritAlign);
  }

  const textChild = findTextChild(node);
  const bgShape = findButtonBackgroundShape(node);

  if (bgShape && textChild) {
    return mapButtonFromParts(node, bgShape, textChild, inheritAlign);
  }

  if (!textChild) {
    return mapButtonFromParts(
      node,
      { ...node, backgroundColor: node.backgroundColor ?? '#000000' },
      { ...node, text: node.name, color: '#ffffff' },
      inheritAlign
    );
  }

  return mapButtonFromParts(
    node,
    { ...node, backgroundColor: resolveEffectiveBackground(node) ?? node.backgroundColor ?? '#000000' },
    textChild,
    inheritAlign
  );
}

function mapImageNode(node: ParsedFigmaNode, imgClass?: string): ReactEmailNode | null {
  const src = getImageSrc(node);
  if (!src) return null;

  return {
    type: 'Img',
    src,
    width: node.width,
    height: node.height,
    alt: node.name,
    className: imgClass,
  };
}

function applyGapToChildren(
  children: ReactEmailNode[],
  gap?: number
): ReactEmailNode[] {
  if (!gap || gap <= 0 || children.length <= 1) return children;

  const result: ReactEmailNode[] = [];
  for (let i = 0; i < children.length; i++) {
    if (i > 0) {
      result.push({ type: 'Spacer', height: gap });
    }
    result.push(children[i]);
  }
  return result;
}

function mapNode(
  node: ParsedFigmaNode,
  warnings: string[],
  depth: number,
  path: string[],
  inheritAlign?: CSSProperties['textAlign']
): ReactEmailNode[] {
  if (!node.visible) return [];
  if ((node.width ?? 1) <= 0 || (node.height ?? 1) <= 0) return [];

  if (SKIP_TYPES.has(node.type)) {
    warnings.push(`Skipped unsupported node: ${nodePath(node, path.slice(0, -1))} (${node.type})`);
    return [];
  }

  if (depth > 12) {
    warnings.push(`Skipped deep node: ${nodePath(node, path.slice(0, -1))}`);
    return [];
  }

  const textAlign = nodeTextAlign(node);
  const effectiveAlign = textAlign ?? inheritAlign;

  if (node.type === 'TEXT' && node.text) {
    return [mapTextNode(node, effectiveAlign)];
  }

  if (node.type === 'LINE') {
    return [{ type: 'Hr', style: { borderColor: node.color ?? '#cccccc', margin: '8px 0' } }];
  }

  if (node.type === 'GROUP') {
    const composite = tryMapCompositeButton(node);
    if (composite) {
      return [mapButtonFromParts(node, composite.shape, composite.text, effectiveAlign)];
    }

    return getContentChildren(node).flatMap((child) =>
      mapNode(child, warnings, depth + 1, [...path, child.name], effectiveAlign)
    );
  }

  if (node.type === 'IMAGE' || (node.type === 'RECTANGLE' && node.imageRef)) {
    const img = mapImageNode(node, `figma-img-${node.id.replace(/[:;]/g, '-')}`);
    return img ? [img] : [];
  }

  if (isButtonLike(node)) {
    return [mapButtonNode(node, effectiveAlign)];
  }

  const contentChildren = getContentChildren(node);

  if (node.layoutMode === 'HORIZONTAL' && contentChildren.length > 0) {
    const parentWidth = node.width ?? 600;
    const columnNodes: ReactEmailNode[] = contentChildren.map((child) => {
      const widthPct = child.width
        ? `${Math.min(100, Math.round((child.width / parentWidth) * 100))}%`
        : `${Math.round(100 / contentChildren.length)}%`;

      return {
        type: 'Column',
        style: {
          width: widthPct,
          verticalAlign: 'top',
        },
        children: mapNode(child, warnings, depth + 1, [...path, child.name], effectiveAlign),
      };
    });

    return [
      {
        type: 'Section',
        style: sectionStyle(node),
        children: [
          {
            type: 'Row',
            style: { width: '100%' },
            children: columnNodes,
          },
        ],
      },
    ];
  }

  if (CONTAINER_TYPES.has(node.type) && contentChildren.length > 0) {
    const mappedChildren = contentChildren.flatMap((child) =>
      mapNode(child, warnings, depth + 1, [...path, child.name], effectiveAlign)
    );

    return [
      {
        type: 'Section',
        style: sectionStyle(node),
        children: applyGapToChildren(mappedChildren, node.gap),
      },
    ];
  }

  if (node.backgroundColor && node.type === 'RECTANGLE') {
    return [
      {
        type: 'Section',
        style: {
          backgroundColor: node.backgroundColor,
          width: node.width ? `${node.width}px` : '100%',
          height: node.height,
        },
        children: [],
      },
    ];
  }

  return [];
}

function buildPathList(node: ParsedFigmaNode, parentPath: string[] = []): string[][] {
  const current = [...parentPath, node.name];
  const paths = [current];
  for (const child of node.children) {
    paths.push(...buildPathList(child, current));
  }
  return paths;
}

function applyMobileLayout(
  desktop: ParsedFigmaNode,
  mobile: ParsedFigmaNode
): ParsedFigmaNode {
  function walk(desk: ParsedFigmaNode, mob: ParsedFigmaNode | undefined): ParsedFigmaNode {
    if (!mob) return desk;

    return {
      ...desk,
      paddingTop: mob.paddingTop ?? desk.paddingTop,
      paddingRight: mob.paddingRight ?? desk.paddingRight,
      paddingBottom: mob.paddingBottom ?? desk.paddingBottom,
      paddingLeft: mob.paddingLeft ?? desk.paddingLeft,
      gap: mob.gap ?? desk.gap,
      backgroundColor: resolveEffectiveBackground(mob) ?? resolveEffectiveBackground(desk),
      children: desk.children.map((child) => {
        const mobileChild = mob.children.find((c) => c.name === child.name);
        return walk(child, mobileChild);
      }),
    };
  }

  return walk(desktop, mobile);
}

function mergeMobileImages(
  tree: ReactEmailNode,
  desktopRoot: ParsedFigmaNode,
  mobileRoot: ParsedFigmaNode | undefined,
  warnings: string[]
): ReactEmailNode {
  if (!mobileRoot) return tree;
  const mobile = mobileRoot;

  const paths = buildPathList(desktopRoot);
  let swapCount = 0;

  function walk(node: ReactEmailNode): ReactEmailNode {
    if (node.type === 'Img') {
      const matchingPath = paths.find((p) => {
        const desk = findNodeByPath(desktopRoot, p);
        return desk?.name === node.alt;
      });

      if (matchingPath) {
        const mobileMatch = findNodeByPath(mobile, matchingPath);
        const mobileSrc = mobileMatch?.exportUrl ?? (mobileMatch ? getImageSrc(mobileMatch) : undefined);
        if (mobileSrc && mobileSrc !== node.src) {
          swapCount += 1;
          return { ...node, mobileSrc, className: node.className ?? 'figma-img-responsive' };
        }
      }
      return node;
    }

    if ('children' in node && Array.isArray(node.children)) {
      return {
        ...node,
        children: node.children.map(walk),
      } as ReactEmailNode;
    }

    return node;
  }

  const merged = walk(tree);
  if (swapCount > 0) {
    warnings.push(`Applied ${swapCount} mobile image swap(s) for matching nodes.`);
  }
  return merged;
}

function ensureRootWrapper(tree: ReactEmailNode, rootBg?: string): ReactEmailNode {
  const rootStyle: CSSProperties = {
    maxWidth: 600,
    width: '100%',
    margin: '0 auto',
  };

  if (rootBg) {
    rootStyle.backgroundColor = rootBg;
  }

  if (tree.type === 'Section') {
    return {
      ...tree,
      style: {
        ...tree.style,
        ...rootStyle,
        backgroundColor: tree.style?.backgroundColor ?? rootBg,
      },
    };
  }

  return {
    type: 'Section',
    style: rootStyle,
    children: [tree],
  };
}

function countNodes(node: ReactEmailNode): number {
  let count = 1;
  if ('children' in node && Array.isArray(node.children)) {
    for (const child of node.children) {
      count += countNodes(child);
    }
  }
  return count;
}

export type FigmaToReactEmailMode = 'fidelity' | 'primitives';

export function figmaToReactEmailTree(
  desktopNode: ParsedFigmaNode,
  mobileNode?: ParsedFigmaNode,
  options?: {
    desktopUrl?: string;
    mobileUrl?: string;
    mode?: FigmaToReactEmailMode;
    /**
     * Mixed-mode image export: Figma nodeIds whose subtree should be flattened to
     * a single 2× PNG (icons / SVGs / vector art) instead of structured HTML.
     * Only applies to 'primitives' mode. Empty/absent → default behavior.
     */
    forceImageIds?: string[];
  }
): FigmaToReactEmailResult {
  const warnings: string[] = [];
  const mode = options?.mode ?? 'primitives';

  let desktop = desktopNode;
  let mobile = mobileNode;

  if (options?.desktopUrl) {
    desktop = { ...desktop, exportUrl: options.desktopUrl };
  }
  if (options?.mobileUrl && mobile) {
    mobile = { ...mobile, exportUrl: options.mobileUrl };
  }

  if (mode === 'primitives') {
    const forceImageIds =
      options?.forceImageIds && options.forceImageIds.length > 0
        ? new Set(options.forceImageIds)
        : undefined;
    const tree = buildPrimitivesFromFigma(desktop, mobile, warnings, forceImageIds);
    return {
      tree,
      warnings,
      nodeCount: countAstNodes(tree),
    };
  }

  warnings.push(
    'Design fidelity mode: each Figma section is exported as PNG and wrapped in React Email Section + Img.'
  );

  const tree = buildFidelityTree(desktop, mobile, warnings);

  return {
    tree,
    warnings,
    nodeCount: countNodes(tree),
  };
}
