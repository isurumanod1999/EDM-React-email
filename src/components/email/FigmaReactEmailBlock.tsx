import * as React from 'react';
import {
  Section,
  Container,
  Row,
  Column,
  Text,
  Heading,
  Img,
  Link,
  Button,
  Hr,
  Head,
  Preview,
  Font,
  CodeInline,
  Markdown,
  CodeBlock,
  dracula,
  oneLight,
  oneDark,
  nightOwl,
  xonokai,
} from '@/lib/email/react-email';
import {
  RESPONSIVE_COL_CLASS,
  type ReactEmailNode,
  type FigmaReactEmailBlockProps,
} from '@/lib/figma/types/reactEmailAst';
import { autoMobileStyle } from '@/components/email/mobileTypography';
import { applyBorderControls } from '@/lib/figma/borderControls';

const EMAIL_FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

const CODE_THEMES = {
  dracula,
  oneLight,
  oneDark,
  nightOwl,
  xonokai,
} as const;

/**
 * A solid background color safe to mirror onto a table's `bgcolor` attribute.
 * Only opaque hex / named / fully-opaque rgb values qualify — transparent or
 * semi-transparent fills are skipped (bgcolor can't express alpha and would
 * paint an unwanted solid block).
 */
function emailBgColor(bg: React.CSSProperties['backgroundColor']): string | undefined {
  if (typeof bg !== 'string') return undefined;
  const c = bg.trim().toLowerCase();
  if (!c || c === 'transparent') return undefined;
  const rgba = c.match(/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*([\d.]+)\s*)?\)$/);
  if (rgba) return rgba[1] !== undefined && parseFloat(rgba[1]) < 1 ? undefined : bg;
  // Hex or named color — treat as opaque.
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(c) || /^[a-z]+$/.test(c)) return bg;
  return undefined;
}

/** Editor-only context threaded through the render so nodes can be selected. */
interface RenderCtx {
  editable: boolean;
  blockId?: string;
  /**
   * Per-block prefix for responsive class names. REQUIRED so that two Figma
   * blocks in the same email don't emit the same path-based class (e.g.
   * `figma-rsp-0-0`) — colliding classes let one block's media rule override
   * another's, which silently discards manual mobile edits.
   */
  ns: string;
}

/**
 * Data attributes that let the live preview map a clicked DOM element back to
 * its AST node. Returned empty (no attributes) unless `editable`, so the
 * exported email markup stays clean. React Email forwards `data-*` props to the
 * underlying HTML element.
 */
function editAttrs(ctx: RenderCtx, path: number[]): Record<string, string> {
  if (!ctx.editable) return {};
  return {
    'data-node-path': path.join('.'),
    ...(ctx.blockId ? { 'data-block-id': ctx.blockId } : {}),
  };
}

/**
 * Wrap text content in an anchor when an href is set. Color/decoration inherit
 * so the design's own styling is preserved — the text just becomes clickable,
 * and the href is emitted into the exported HTML.
 */
function linkWrap(href: string | undefined, content: React.ReactNode): React.ReactNode {
  if (!href) return content;
  return (
    <Link href={href} style={{ color: 'inherit', textDecoration: 'inherit' }}>
      {content}
    </Link>
  );
}

/** Deterministic class for a node, derived from its block namespace + render path. */
function responsiveClass(ns: string, path: number[]): string {
  return `figma-rsp-${ns}-${path.length ? path.join('-') : 'root'}`;
}

/**
 * Deterministic base class for a node that renders SEPARATE desktop/mobile
 * variants (text content or a button label). The `-desk`/`-mob` suffixes are
 * appended at render time and swapped by a media query — the exact same
 * show/hide mechanism used for responsive `Img` (mobileSrc) swaps.
 */
function swapClass(prefix: 'txt' | 'btn', ns: string, path: number[]): string {
  return `figma-${prefix}-${ns}-${path.length ? path.join('-') : 'root'}`;
}

/**
 * The value a text-like node renders (rich HTML wins over plain content), used
 * to decide whether a distinct mobile override exists.
 */
function textLikeRender(node: {
  content?: string;
  html?: string;
}): string | undefined {
  return node.html ?? node.content;
}

/**
 * True when a Text/Heading/Link node carries phone-only content that actually
 * differs from its desktop text — the only case where we pay for a dual render.
 */
function hasDistinctMobileContent(node: ReactEmailNode): boolean {
  if (node.type !== 'Text' && node.type !== 'Heading' && node.type !== 'Link') return false;
  const n = node as { content?: string; html?: string; mobileContent?: string; mobileHtml?: string };
  const mob = n.mobileHtml ?? n.mobileContent;
  if (mob == null || mob === '') return false;
  return mob !== textLikeRender(n);
}

/** True when a Button carries a phone-only label distinct from its desktop label. */
function hasDistinctMobileLabel(node: ReactEmailNode): boolean {
  if (node.type !== 'Button') return false;
  const n = node as { label: string; mobileLabel?: string };
  return n.mobileLabel != null && n.mobileLabel !== '' && n.mobileLabel !== n.label;
}

/** Keep only class-safe characters so the namespace is a valid CSS identifier. */
function sanitizeNs(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '-');
}

/** Short deterministic hash of a tree, for a stable fallback namespace. */
function hashTree(tree: ReactEmailNode): string {
  const s = JSON.stringify(tree);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

const TYPO_NODE_TYPES = new Set(['Text', 'Heading', 'Link', 'Button']);

/**
 * The ≤600px style override for a node.
 *  - An explicit `mobileStyle` (a mobile Figma frame, or a manual per-viewport
 *    edit in the customizer) always wins and is honoured for ANY node type.
 *  - Otherwise, typography nodes fall back to proportional auto-scaling so
 *    desktop-only / legacy trees still read correctly on mobile.
 */
export function nodeMobileStyle(node: ReactEmailNode): React.CSSProperties | undefined {
  const explicit = (node as { mobileStyle?: React.CSSProperties }).mobileStyle;
  if (explicit && Object.keys(explicit).length > 0) return explicit;
  if (!TYPO_NODE_TYPES.has(node.type)) return undefined;
  return autoMobileStyle((node as { style?: React.CSSProperties }).style);
}

function styleToCss(style: React.CSSProperties): string {
  return Object.entries(style)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}: ${v} !important;`)
    .join(' ');
}

interface ResponsiveInfo {
  imgClasses: Set<string>;
  /** Base classes for text nodes that swap desktop/mobile CONTENT (block-level). */
  textClasses: Set<string>;
  /** Base classes for buttons that swap desktop/mobile LABEL (inline-block). */
  btnClasses: Set<string>;
  hasStackColumns: boolean;
  mobileRules: string[];
}

function collectResponsiveInfo(
  node: ReactEmailNode,
  ns: string,
  path: number[] = [],
  info: ResponsiveInfo = {
    imgClasses: new Set(),
    textClasses: new Set(),
    btnClasses: new Set(),
    hasStackColumns: false,
    mobileRules: [],
  }
): ResponsiveInfo {
  if (node.type === 'Img' && node.mobileSrc && node.className) {
    info.imgClasses.add(node.className);
  }
  // Text/Heading/Link with a distinct phone-only override and Button with a
  // distinct mobile label each render two variants; register their base class so
  // the desktop/mobile show-hide media query is emitted below.
  if (hasDistinctMobileContent(node)) {
    info.textClasses.add(swapClass('txt', ns, path));
  }
  if (hasDistinctMobileLabel(node)) {
    info.btnClasses.add(swapClass('btn', ns, path));
  }
  if (node.type === 'Column' && node.className === RESPONSIVE_COL_CLASS) {
    info.hasStackColumns = true;
  }
  const mobile = nodeMobileStyle(node);
  if (mobile) {
    info.mobileRules.push(`      .${responsiveClass(ns, path)} { ${styleToCss(mobile)} }`);
  }
  if ('children' in node && Array.isArray(node.children)) {
    node.children.forEach((child, i) => collectResponsiveInfo(child, ns, [...path, i], info));
  }
  return info;
}

/**
 * Build the responsive CSS text for one Figma tree (image swap, column stacking,
 * and ≤600px typography). Returned as a plain string so it can be hoisted into
 * the document <head> by the composer, rather than emitted per-block in <body>.
 */
export function buildFigmaResponsiveCss(tree: ReactEmailNode, blockId?: string): string {
  const ns = sanitizeNs(blockId ?? `t${hashTree(tree)}`);
  const { imgClasses, textClasses, btnClasses, hasStackColumns, mobileRules } =
    collectResponsiveInfo(tree, ns);
  if (
    imgClasses.size === 0 &&
    textClasses.size === 0 &&
    btnClasses.size === 0 &&
    !hasStackColumns &&
    mobileRules.length === 0
  )
    return '';

  // Show the `-desk` variant by default and hide `-mob`; flip at ≤600px. Setting
  // `max-height:0; overflow:hidden` on the hidden variant defends against email
  // clients that ignore `display:none`. `display` differs by element kind: block
  // for images and text content, inline-block for buttons (so a swapped button
  // keeps its pill shape and centering instead of stretching full-width).
  const swapRule = (cls: string, display: string) => `
    .${cls}-desk { display: ${display} !important; }
    .${cls}-mob { display: none !important; max-height: 0; overflow: hidden; }
    @media only screen and (max-width: 600px) {
      .${cls}-desk { display: none !important; max-height: 0; overflow: hidden; }
      .${cls}-mob { display: ${display} !important; max-height: none !important; }
    }`;

  // Images + text content swap as block elements (same rules as before for imgs).
  const imgRules = [...imgClasses, ...textClasses]
    .map((cls) => swapRule(cls, 'block'))
    .join('\n');

  // Buttons swap as inline-block so alignment/width are preserved.
  const buttonRules = [...btnClasses].map((cls) => swapRule(cls, 'inline-block')).join('\n');

  // Stack React Email columns (rendered as <td>) on mobile.
  const columnRules = hasStackColumns
    ? `
    @media only screen and (max-width: 600px) {
      .${RESPONSIVE_COL_CLASS} {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        padding-left: 0 !important;
        padding-right: 0 !important;
        box-sizing: border-box !important;
      }
    }`
    : '';

  // Per-node mobile typography (font size / line height) from the Figma mobile
  // frame, so ≤600px matches the design instead of showing desktop type.
  const typographyRules = mobileRules.length
    ? `
    @media only screen and (max-width: 600px) {
${mobileRules.join('\n')}
    }`
    : '';

  return `${imgRules}\n${buttonRules}\n${columnRules}\n${typographyRules}`;
}

/**
 * Standalone responsive `<Head>` for a Figma block rendered on its own (e.g.
 * previews/tests). When the block is composed by DynamicEmailTemplate the CSS is
 * hoisted into the document head instead (see `emitResponsiveStyles`), so this
 * is skipped to avoid a stray `<head>` inside `<body>`.
 */
function ResponsiveStyles({ tree, ns }: { tree: ReactEmailNode; ns: string }) {
  const css = buildFigmaResponsiveCss(tree, ns);
  if (!css.trim()) return null;
  // `Head` is an official React Email component; injecting a `<style>` is the
  // documented mechanism for responsive media queries.
  return (
    <Head>
      <style>{css}</style>
    </Head>
  );
}

type TextLikeNode = Extract<ReactEmailNode, { type: 'Text' | 'Heading' | 'Link' }>;

/**
 * Render ONE variant of a text-like node (Text/Heading/Link) with an explicit
 * content/html pair and className. Shared by the single-element path and the
 * desktop/mobile dual-render path so both stay pixel-identical apart from the
 * text they carry and the `-desk`/`-mob` swap class.
 */
function renderTextLike(
  node: TextLikeNode,
  key: string,
  sel: Record<string, string>,
  className: string | undefined,
  content: string,
  html: string | undefined
): React.ReactNode {
  if (node.type === 'Link') {
    const linkStyle: React.CSSProperties = {
      fontFamily: EMAIL_FONT,
      textDecoration: 'underline',
      ...node.style,
    };
    if (html) {
      return (
        <a
          key={key}
          {...sel}
          className={className}
          href={node.href}
          style={linkStyle}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }
    return (
      <Link key={key} {...sel} className={className} href={node.href} style={linkStyle}>
        {content}
      </Link>
    );
  }

  const base: React.CSSProperties = {
    margin: 0,
    padding: 0,
    fontFamily: EMAIL_FONT,
    ...node.style,
  };
  if (html) {
    const richClass = ['fc-rich', className].filter(Boolean).join(' ');
    // Rich text renders as a styled block element (Heading tag or <div>, never a
    // <p>) so it can safely hold block content like bullet/numbered lists.
    if (node.type === 'Heading') {
      return React.createElement(node.as ?? 'h2', {
        key,
        ...sel,
        className: richClass,
        style: base,
        dangerouslySetInnerHTML: { __html: html },
      });
    }
    return (
      <div
        key={key}
        {...sel}
        className={richClass}
        style={base}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  if (node.type === 'Heading') {
    return (
      <Heading key={key} {...sel} className={className} as={node.as ?? 'h2'} style={{ ...base, whiteSpace: 'pre-line' }}>
        {linkWrap(node.href, content)}
      </Heading>
    );
  }
  return (
    <Text key={key} {...sel} className={className} style={{ ...base, whiteSpace: 'pre-line' }}>
      {linkWrap(node.href, content)}
    </Text>
  );
}

function renderNode(
  node: ReactEmailNode,
  key: string,
  path: number[],
  ctx: RenderCtx
): React.ReactNode {
  const sel = editAttrs(ctx, path);
  // Class that carries this node's ≤600px typography override (if any). Must use
  // the same block-namespaced name as collectResponsiveInfo so the media query
  // hits — and only this block's element, never a same-path node in another block.
  const rspCls = nodeMobileStyle(node) ? responsiveClass(ctx.ns, path) : undefined;

  switch (node.type) {
    case 'Section': {
      // Fixed-width sections (e.g. small icon containers) must not be forced to
      // 100% width, or they stretch into full-width bars/ovals.
      const hasFixedWidth =
        node.style?.width !== undefined && node.style.width !== '100%';
      // Mirror the CSS background onto the table's `bgcolor` attribute — Outlook
      // (Word engine) drops CSS `background-color` on tables, so without this a
      // dark header/hero (and flatten-to-image blocks) render on white, hiding
      // light logos/text.
      const bgColor = emailBgColor(node.style?.backgroundColor);
      return (
        <Section
          key={key}
          {...sel}
          {...(bgColor ? { bgcolor: bgColor } : {})}
          className={rspCls}
          style={{ ...(hasFixedWidth ? {} : { width: '100%' }), ...node.style }}
        >
          {node.children.map((child, i) => renderNode(child, `${key}-s-${i}`, [...path, i], ctx))}
        </Section>
      );
    }

    case 'Container': {
      const cBg = emailBgColor(node.style?.backgroundColor);
      return (
        <Container
          key={key}
          {...sel}
          {...(cBg ? { bgcolor: cBg } : {})}
          className={rspCls}
          style={{
            maxWidth: 600,
            width: '100%',
            margin: '0 auto',
            ...node.style,
          }}
        >
          {node.children.map((child, i) => renderNode(child, `${key}-ct-${i}`, [...path, i], ctx))}
        </Container>
      );
    }

    case 'Row':
      return (
        <Row key={key} {...sel} className={rspCls} style={{ width: '100%', ...node.style }}>
          {node.children.map((child, i) => renderNode(child, `${key}-r-${i}`, [...path, i], ctx))}
        </Row>
      );

    case 'Column':
      return (
        <Column
          key={key}
          {...sel}
          align={node.align}
          className={[node.className, rspCls].filter(Boolean).join(' ') || undefined}
          style={node.style}
        >
          {node.children.map((child, i) => renderNode(child, `${key}-c-${i}`, [...path, i], ctx))}
        </Column>
      );

    case 'Text':
    case 'Heading':
    case 'Link': {
      // Separate phone-only content: emit BOTH a desktop and a mobile variant and
      // let the `-desk`/`-mob` media query (buildFigmaResponsiveCss) show exactly
      // one — the same content-swap trick used for responsive images. Only pay for
      // two elements when the mobile text actually differs; otherwise fall through
      // to the single-element render below (no regression for existing nodes).
      if (hasDistinctMobileContent(node)) {
        const swap = swapClass('txt', ctx.ns, path);
        const deskEl = renderTextLike(
          node,
          `${key}-desk`,
          sel,
          `${swap}-desk`,
          node.content,
          node.html
        );
        // The mobile variant also carries the ≤600px typography class so it picks
        // up the node's mobileStyle / auto-scaled type just like a single element.
        const mobEl = renderTextLike(
          node,
          `${key}-mob`,
          sel,
          [`${swap}-mob`, rspCls].filter(Boolean).join(' ') || undefined,
          node.mobileContent ?? node.content,
          node.mobileHtml
        );
        return [deskEl, mobEl];
      }
      return renderTextLike(node, key, sel, rspCls, node.content, node.html);
    }

    case 'Img': {
      const alignMargin =
        node.align === 'center'
          ? { marginLeft: 'auto', marginRight: 'auto' }
          : node.align === 'right'
            ? { marginLeft: 'auto' }
            : {};
      // Small icons render at their fixed intrinsic size and are never stretched
      // to the container width (no maxWidth:100%).
      const imgStyle: React.CSSProperties = node.isIcon
        ? {
            display: 'block',
            width: node.width,
            height: node.height,
            ...alignMargin,
          }
        : node.fullBleed
          ? {
              // Edge-to-edge art: fill the section, flush to the edges.
              display: 'block',
              width: '100%',
              maxWidth: '100%',
              height: 'auto',
            }
          : {
              display: 'block',
              maxWidth: '100%',
              height: 'auto',
              ...alignMargin,
            };

      // When the image links somewhere, the anchor (not the <img>) carries the
      // selection attrs and click-through href; otherwise the <img> does.
      const imgSel = node.href ? {} : sel;

      let imgContent: React.ReactNode;
      if (node.mobileSrc) {
        const base = node.className ?? `figma-img-${key}`;
        // Desktop + mobile variants returned as a keyed array (no wrapper DOM).
        imgContent = [
          <Img
            key={`${key}-desk`}
            {...imgSel}
            src={node.src}
            width={node.width}
            height={node.height}
            alt={node.alt ?? ''}
            className={`${base}-desk`}
            style={imgStyle}
          />,
          <Img
            key={`${key}-mob`}
            {...imgSel}
            src={node.mobileSrc}
            width={node.width}
            height={node.height}
            alt={node.alt ?? ''}
            className={`${base}-mob`}
            style={imgStyle}
          />,
        ];
      } else {
        imgContent = (
          <Img
            key={`${key}-img`}
            {...imgSel}
            className={rspCls}
            src={node.src}
            width={node.width}
            height={node.height}
            alt={node.alt ?? ''}
            style={{ ...imgStyle, marginBottom: node.href || node.fullBleed ? undefined : 16 }}
          />
        );
      }

      if (node.href) {
        return (
          <Link
            key={key}
            {...sel}
            href={node.href}
            style={{ display: 'block', textDecoration: 'none', marginBottom: 16, ...alignMargin }}
          >
            {imgContent}
          </Link>
        );
      }

      return imgContent;
    }

    case 'Button': {
      const { textAlign, marginTop, ...containerRest } = node.containerStyle ?? {};
      const btnStyle: React.CSSProperties = {
        margin: 0,
        display: 'inline-block',
        textDecoration: 'none',
        textAlign: 'center' as const,
        boxSizing: 'border-box',
        maxWidth: '100%',
        fontFamily: EMAIL_FONT,
        ...node.style,
      };
      // Render one button, or — when a distinct mobile label exists — a desktop
      // and a mobile button swapped by the inline-block `-desk`/`-mob` media
      // query (mirrors the text-content swap, buttons kept inline-block so the
      // pill keeps its shape/centering rather than stretching full-width).
      const mkBtn = (label: string, k: string, cls: string | undefined) => (
        <Button key={k} {...sel} className={cls} href={node.href} style={btnStyle}>
          {label}
        </Button>
      );
      const dualLabel = hasDistinctMobileLabel(node);
      const swap = dualLabel ? swapClass('btn', ctx.ns, path) : undefined;
      return (
        <Section
          key={key}
          style={{
            width: '100%',
            textAlign: textAlign ?? 'center',
            marginTop,
            ...containerRest,
          }}
        >
          {dualLabel
            ? [
                mkBtn(node.label, `${key}-desk`, `${swap}-desk`),
                mkBtn(
                  node.mobileLabel as string,
                  `${key}-mob`,
                  [`${swap}-mob`, rspCls].filter(Boolean).join(' ') || undefined
                ),
              ]
            : mkBtn(node.label, `${key}-btn`, rspCls)}
        </Section>
      );
    }

    case 'Hr':
      return (
        <Hr
          key={key}
          {...sel}
          className={rspCls}
          style={{
            borderColor: '#e6ebf1',
            borderWidth: '1px',
            borderStyle: 'solid',
            width: '100%',
            margin: '20px 0',
            ...node.style,
          }}
        />
      );

    case 'Spacer':
      // Vertical spacing composed only from React Email primitives (Section +
      // Text). The content is a non-breaking space *string* (text content, not
      // an HTML element) so the Text keeps its height across email clients.
      return (
        <Section key={key} {...sel} style={{ height: node.height, lineHeight: '1px', fontSize: '1px' }}>
          <Text style={{ margin: 0, fontSize: '1px', lineHeight: `${node.height}px` }}>
            {'\u00A0'}
          </Text>
        </Section>
      );

    case 'Preview':
      return (
        <Preview key={key} {...sel}>
          {node.content}
        </Preview>
      );

    case 'Font':
      return (
        <Head key={key}>
          <Font
            fontFamily={node.fontFamily}
            fallbackFontFamily={
              node.fallbackFontFamily as React.ComponentProps<typeof Font>['fallbackFontFamily']
            }
            webFont={
              node.webFont as React.ComponentProps<typeof Font>['webFont'] | undefined
            }
            fontStyle={node.fontStyle as React.ComponentProps<typeof Font>['fontStyle']}
            fontWeight={node.fontWeight as React.ComponentProps<typeof Font>['fontWeight']}
          />
        </Head>
      );

    case 'CodeInline':
      return (
        <CodeInline key={key} {...sel} style={node.style}>
          {node.content}
        </CodeInline>
      );

    case 'Markdown':
      return (
        <Markdown
          key={key}
          markdownContainerStyles={node.markdownContainerStyles}
          markdownCustomStyles={node.markdownCustomStyles}
        >
          {node.content}
        </Markdown>
      );

    case 'CodeBlock': {
      const theme =
        CODE_THEMES[(node.themeName ?? 'dracula') as keyof typeof CODE_THEMES] ?? dracula;
      return (
        <CodeBlock
          key={key}
          {...sel}
          code={node.code}
          language={node.language as React.ComponentProps<typeof CodeBlock>['language']}
          theme={theme}
          lineNumbers={node.lineNumbers}
          fontFamily={node.fontFamily}
        />
      );
    }

    default:
      return null;
  }
}

export const FigmaReactEmailBlock: React.FC<FigmaReactEmailBlockProps> = ({
  tree,
  editable,
  blockId,
  emitResponsiveStyles = true,
  hideBorders = false,
  borderColor,
}) => {
  if (!tree) {
    return (
      <Section style={{ maxWidth: 600, padding: 20 }}>
        <Text style={{ color: '#666666', fontFamily: EMAIL_FONT }}>Empty Figma import</Text>
      </Section>
    );
  }

  // Stable per-block namespace for responsive classes. Prefer the blockId (stable
  // across preview + export); fall back to a short hash of the tree so standalone
  // renders still get a unique, deterministic prefix.
  const ns = sanitizeNs(blockId ?? `t${hashTree(tree)}`);
  const ctx: RenderCtx = { editable: Boolean(editable), blockId, ns };
  const trimmedBorderColor = borderColor?.trim() || undefined;
  const rendered =
    hideBorders || trimmedBorderColor
      ? applyBorderControls(tree, hideBorders, trimmedBorderColor)
      : tree;

  // A React Fragment groups the responsive <Head><style> and the rendered tree.
  // Fragments emit NO DOM of their own (no wrapper element), so this is not a
  // hand-rolled layout primitive — there is no React Email component for "group
  // siblings without markup".
  //
  // When composed by DynamicEmailTemplate, `emitResponsiveStyles` is false and
  // the CSS is hoisted into the document <head> instead (a <style> nested in
  // <body> is unreliable in email clients).
  return (
    <>
      {emitResponsiveStyles && <ResponsiveStyles tree={rendered} ns={ns} />}
      {renderNode(rendered, 'root', [], ctx)}
    </>
  );
};

export default FigmaReactEmailBlock;
