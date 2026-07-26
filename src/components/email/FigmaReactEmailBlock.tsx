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
} from '@/lib/email/react-email';
import {
  RESPONSIVE_COL_CLASS,
  type ReactEmailNode,
  type FigmaReactEmailBlockProps,
} from '@/lib/figma/types/reactEmailAst';

const EMAIL_FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

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

function parsePx(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const m = value.match(/^([\d.]+)px$/);
    if (m) return parseFloat(m[1]);
  }
  return undefined;
}

/**
 * Desktop→mobile font-size scale used when a node has NO explicit mobile style
 * (e.g. desktop-only imports, or campaigns built before mobile support). Large
 * display type shrinks hardest (a 42px headline overflows a phone); readable
 * body/legal copy (≤17px) is left untouched. Mirrors how a designer down-scales
 * a desktop artboard to mobile.
 */
function scaleMobileFontSize(fs: number): number {
  if (fs >= 40) return Math.round(fs * 0.62); // 42 → 26
  if (fs >= 32) return Math.round(fs * 0.7); //  36 → 25
  if (fs >= 26) return Math.round(fs * 0.78); // 28 → 22
  if (fs >= 22) return Math.round(fs * 0.85); // 24 → 20
  if (fs >= 20) return 18; //                    20/21 → 18
  if (fs >= 18) return 16; //                    18/19 → 16
  return fs; //                                  ≤17px: keep
}

/** Proportional mobile typography derived from a node's inline desktop style. */
export function autoMobileStyle(style?: React.CSSProperties): React.CSSProperties | undefined {
  const fs = parsePx(style?.fontSize);
  if (!fs) return undefined;
  const mfs = scaleMobileFontSize(fs);
  if (mfs >= fs) return undefined;
  const out: React.CSSProperties = { fontSize: `${mfs}px` };
  const lh = parsePx(style?.lineHeight);
  if (lh) out.lineHeight = `${Math.round(mfs * (lh / fs))}px`;
  return out;
}

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
  hasStackColumns: boolean;
  mobileRules: string[];
}

function collectResponsiveInfo(
  node: ReactEmailNode,
  ns: string,
  path: number[] = [],
  info: ResponsiveInfo = { imgClasses: new Set(), hasStackColumns: false, mobileRules: [] }
): ResponsiveInfo {
  if (node.type === 'Img' && node.mobileSrc && node.className) {
    info.imgClasses.add(node.className);
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
  const { imgClasses, hasStackColumns, mobileRules } = collectResponsiveInfo(tree, ns);
  if (imgClasses.size === 0 && !hasStackColumns && mobileRules.length === 0) return '';

  const imgRules = [...imgClasses]
    .map(
      (cls) => `
    .${cls}-desk { display: block !important; }
    .${cls}-mob { display: none !important; max-height: 0; overflow: hidden; }
    @media only screen and (max-width: 600px) {
      .${cls}-desk { display: none !important; max-height: 0; overflow: hidden; }
      .${cls}-mob { display: block !important; max-height: none !important; }
    }`
    )
    .join('\n');

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

  return `${imgRules}\n${columnRules}\n${typographyRules}`;
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
      return (
        <Section
          key={key}
          {...sel}
          className={rspCls}
          style={{ ...(hasFixedWidth ? {} : { width: '100%' }), ...node.style }}
        >
          {node.children.map((child, i) => renderNode(child, `${key}-s-${i}`, [...path, i], ctx))}
        </Section>
      );
    }

    case 'Container':
      return (
        <Container
          key={key}
          {...sel}
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
          className={[node.className, rspCls].filter(Boolean).join(' ') || undefined}
          style={node.style}
        >
          {node.children.map((child, i) => renderNode(child, `${key}-c-${i}`, [...path, i], ctx))}
        </Column>
      );

    case 'Text': {
      const base: React.CSSProperties = {
        margin: 0,
        padding: 0,
        fontFamily: EMAIL_FONT,
        ...node.style,
      };
      // Rich text renders as a styled <div> (not <p>) so it can safely hold
      // block content like bullet/numbered lists.
      if (node.html) {
        return (
          <div
            key={key}
            {...sel}
            className={['fc-rich', rspCls].filter(Boolean).join(' ')}
            style={base}
            dangerouslySetInnerHTML={{ __html: node.html }}
          />
        );
      }
      return (
        <Text key={key} {...sel} className={rspCls} style={{ ...base, whiteSpace: 'pre-line' }}>
          {linkWrap(node.href, node.content)}
        </Text>
      );
    }

    case 'Heading': {
      const base: React.CSSProperties = {
        margin: 0,
        padding: 0,
        fontFamily: EMAIL_FONT,
        ...node.style,
      };
      if (node.html) {
        return React.createElement(node.as ?? 'h2', {
          key,
          ...sel,
          className: ['fc-rich', rspCls].filter(Boolean).join(' '),
          style: base,
          dangerouslySetInnerHTML: { __html: node.html },
        });
      }
      return (
        <Heading key={key} {...sel} className={rspCls} as={node.as ?? 'h2'} style={{ ...base, whiteSpace: 'pre-line' }}>
          {linkWrap(node.href, node.content)}
        </Heading>
      );
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

    case 'Link': {
      const linkStyle: React.CSSProperties = {
        fontFamily: EMAIL_FONT,
        textDecoration: 'underline',
        ...node.style,
      };
      if (node.html) {
        return (
          <a
            key={key}
            {...sel}
            className={rspCls}
            href={node.href}
            style={linkStyle}
            dangerouslySetInnerHTML={{ __html: node.html }}
          />
        );
      }
      return (
        <Link key={key} {...sel} className={rspCls} href={node.href} style={linkStyle}>
          {node.content}
        </Link>
      );
    }

    case 'Button': {
      const { textAlign, marginTop, ...containerRest } = node.containerStyle ?? {};

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
            <Button
              {...sel}
              className={rspCls}
              href={node.href}
              style={{
                margin: 0,
                display: 'inline-block',
                textDecoration: 'none',
                textAlign: 'center' as const,
                boxSizing: 'border-box',
                maxWidth: '100%',
                fontFamily: EMAIL_FONT,
                ...node.style,
              }}
            >
              {node.label}
            </Button>
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

    default:
      return null;
  }
}

export const FigmaReactEmailBlock: React.FC<FigmaReactEmailBlockProps> = ({
  tree,
  editable,
  blockId,
  emitResponsiveStyles = true,
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
      {emitResponsiveStyles && <ResponsiveStyles tree={tree} ns={ns} />}
      {renderNode(tree, 'root', [], ctx)}
    </>
  );
};

export default FigmaReactEmailBlock;
