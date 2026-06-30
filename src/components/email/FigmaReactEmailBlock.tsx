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

interface ResponsiveInfo {
  imgClasses: Set<string>;
  hasStackColumns: boolean;
}

function collectResponsiveInfo(
  node: ReactEmailNode,
  info: ResponsiveInfo = { imgClasses: new Set(), hasStackColumns: false }
): ResponsiveInfo {
  if (node.type === 'Img' && node.mobileSrc && node.className) {
    info.imgClasses.add(node.className);
  }
  if (node.type === 'Column' && node.className === RESPONSIVE_COL_CLASS) {
    info.hasStackColumns = true;
  }
  if ('children' in node && Array.isArray(node.children)) {
    for (const child of node.children) {
      collectResponsiveInfo(child, info);
    }
  }
  return info;
}

function ResponsiveStyles({ tree }: { tree: ReactEmailNode }) {
  const { imgClasses, hasStackColumns } = collectResponsiveInfo(tree);
  if (imgClasses.size === 0 && !hasStackColumns) return null;

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

  // `Head` is an official React Email component. Injecting a `<style>` block
  // inside it is React Email's *documented* mechanism for responsive media
  // queries (React Email has no dedicated `Style` component) — see
  // https://react.email/docs/components/head. This is the sanctioned pattern,
  // not a hand-rolled layout element.
  return (
    <Head>
      <style>{`${imgRules}\n${columnRules}`}</style>
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
        <Row key={key} {...sel} style={{ width: '100%', ...node.style }}>
          {node.children.map((child, i) => renderNode(child, `${key}-r-${i}`, [...path, i], ctx))}
        </Row>
      );

    case 'Column':
      return (
        <Column key={key} {...sel} className={node.className} style={node.style}>
          {node.children.map((child, i) => renderNode(child, `${key}-c-${i}`, [...path, i], ctx))}
        </Column>
      );

    case 'Text':
      return (
        <Text
          key={key}
          {...sel}
          style={{
            margin: 0,
            padding: 0,
            whiteSpace: 'pre-line',
            fontFamily: EMAIL_FONT,
            ...node.style,
          }}
        >
          {linkWrap(node.href, node.content)}
        </Text>
      );

    case 'Heading':
      return (
        <Heading
          key={key}
          {...sel}
          as={node.as ?? 'h2'}
          style={{
            margin: 0,
            padding: 0,
            whiteSpace: 'pre-line',
            fontFamily: EMAIL_FONT,
            ...node.style,
          }}
        >
          {linkWrap(node.href, node.content)}
        </Heading>
      );

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
            src={node.src}
            width={node.width}
            height={node.height}
            alt={node.alt ?? ''}
            style={{ ...imgStyle, marginBottom: node.href ? undefined : 16 }}
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

    case 'Link':
      return (
        <Link
          key={key}
          {...sel}
          href={node.href}
          style={{
            fontFamily: EMAIL_FONT,
            textDecoration: 'underline',
            ...node.style,
          }}
        >
          {node.content}
        </Link>
      );

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
}) => {
  if (!tree) {
    return (
      <Section style={{ maxWidth: 600, padding: 20 }}>
        <Text style={{ color: '#666666', fontFamily: EMAIL_FONT }}>Empty Figma import</Text>
      </Section>
    );
  }

  const ctx: RenderCtx = { editable: Boolean(editable), blockId };

  // A React Fragment groups the responsive <Head><style> and the rendered tree.
  // Fragments emit NO DOM of their own (no wrapper element), so this is not a
  // hand-rolled layout primitive — there is no React Email component for "group
  // siblings without markup".
  return (
    <>
      <ResponsiveStyles tree={tree} />
      {renderNode(tree, 'root', [], ctx)}
    </>
  );
};

export default FigmaReactEmailBlock;
