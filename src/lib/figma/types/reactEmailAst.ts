import type { CSSProperties } from 'react';

/** Class applied to columns that should stack vertically on mobile (≤600px). */
export const RESPONSIVE_COL_CLASS = 'figma-col-stack';

/**
 * Plain HTML attributes forwarded verbatim to the underlying element.
 *
 * React Email components are thin wrappers over real tags (`Row`/`Section` →
 * `<table>`, `Column` → `<td>`, `Link` → `<a>`), so documented markup like
 * `cellPadding`, `colSpan` or `target` must survive the AST untouched.
 */
export type HtmlAttrs = Record<string, string | number | boolean>;

export type ReactEmailNode =
  | {
      type: 'Section';
      style?: CSSProperties;
      mobileStyle?: CSSProperties;
      attrs?: HtmlAttrs;
      children: ReactEmailNode[];
    }
  | {
      type: 'Container';
      style?: CSSProperties;
      mobileStyle?: CSSProperties;
      attrs?: HtmlAttrs;
      children: ReactEmailNode[];
    }
  | {
      type: 'Row';
      style?: CSSProperties;
      mobileStyle?: CSSProperties;
      attrs?: HtmlAttrs;
      children: ReactEmailNode[];
    }
  | {
      type: 'Column';
      style?: CSSProperties;
      mobileStyle?: CSSProperties;
      className?: string;
      /** Horizontal alignment of cell content (maps to React Email Column `align`). */
      align?: 'left' | 'center' | 'right';
      attrs?: HtmlAttrs;
      children: ReactEmailNode[];
    }
  | {
      type: 'Text';
      content: string;
      /**
       * Optional sanitized, inline-styled rich-text HTML (bold, lists, links,
       * per-run font-size/color). When present it renders instead of `content`;
       * `content` is kept as the plain-text fallback (layer labels, search, and
       * clients that strip markup).
       */
      html?: string;
      /**
       * Optional phone-only content override (≤600px). When distinct from the
       * desktop `content`/`html`, the renderer emits BOTH a desktop and a mobile
       * variant and swaps them with a media query (see `mobileContent`/`mobileHtml`
       * handling in FigmaReactEmailBlock). `mobileContent` is the plain-text form;
       * `mobileHtml` the sanitized rich-text form (rendered in preference). Leave
       * both undefined to share the desktop text on mobile.
       */
      mobileContent?: string;
      mobileHtml?: string;
      href?: string;
      style?: CSSProperties;
      /**
       * Typography overrides applied only at ≤600px (font size / line height /
       * letter spacing) — emitted as a `@media` rule so mobile matches the
       * Figma mobile frame instead of inheriting desktop type.
       */
      mobileStyle?: CSSProperties;
      attrs?: HtmlAttrs;
    }
  | {
      type: 'Heading';
      content: string;
      html?: string;
      /** Phone-only content override (≤600px). See `Text.mobileContent`. */
      mobileContent?: string;
      mobileHtml?: string;
      as?: 'h1' | 'h2' | 'h3';
      href?: string;
      style?: CSSProperties;
      mobileStyle?: CSSProperties;
      attrs?: HtmlAttrs;
    }
  | {
      type: 'Img';
      src: string;
      mobileSrc?: string;
      width?: number;
      height?: number;
      alt?: string;
      /** Optional click-through link; renders the image wrapped in an anchor. */
      href?: string;
      className?: string;
      align?: 'left' | 'center' | 'right';
      /** Small square icon: render at fixed intrinsic size, never full-width. */
      isIcon?: boolean;
      /**
       * Edge-to-edge art that spans the full section width (e.g. a hero photo that
       * overflowed its frame's padding). Rendered flush — full width, no bottom
       * margin — so it sits tight against the section edges.
       */
      fullBleed?: boolean;
      mobileStyle?: CSSProperties;
      attrs?: HtmlAttrs;
    }
  | {
      type: 'Link';
      href: string;
      content: string;
      html?: string;
      /** Phone-only content override (≤600px). See `Text.mobileContent`. */
      mobileContent?: string;
      mobileHtml?: string;
      style?: CSSProperties;
      mobileStyle?: CSSProperties;
      attrs?: HtmlAttrs;
    }
  | {
      type: 'Button';
      href: string;
      label: string;
      /**
       * Phone-only button text (≤600px). When distinct from `label`, the renderer
       * emits both a desktop and a mobile button and swaps them with a media
       * query. Leave undefined to share the desktop label on mobile.
       */
      mobileLabel?: string;
      style?: CSSProperties;
      containerStyle?: CSSProperties;
      mobileStyle?: CSSProperties;
      attrs?: HtmlAttrs;
    }
  | { type: 'Hr'; style?: CSSProperties; mobileStyle?: CSSProperties; attrs?: HtmlAttrs }
  | { type: 'Spacer'; height: number }
  /** Inbox preview line — maps to React Email `<Preview>`. */
  | { type: 'Preview'; content: string }
  /** Web font declaration — rendered inside `<Head>` (React Email `<Font>`). */
  | {
      type: 'Font';
      fontFamily: string;
      fallbackFontFamily: string | string[];
      webFont?: { url: string; format: string };
      fontStyle?: string;
      fontWeight?: number | string;
    }
  /** Inline code snippet — maps to React Email `<CodeInline>`. */
  | { type: 'CodeInline'; content: string; style?: CSSProperties }
  /** Markdown body — maps to React Email `<Markdown>`. */
  | {
      type: 'Markdown';
      content: string;
      markdownContainerStyles?: CSSProperties;
      markdownCustomStyles?: Record<string, CSSProperties>;
    }
  /** Syntax-highlighted code block — maps to React Email `<CodeBlock>`. */
  | {
      type: 'CodeBlock';
      code: string;
      language: string;
      /** Named theme from `@react-email/code-block` (e.g. dracula, oneLight). */
      themeName?: string;
      lineNumbers?: boolean;
      fontFamily?: string;
    }
  /** Document root — maps to React Email `<Html>`. */
  | {
      type: 'Html';
      lang?: string;
      dir?: string;
      style?: CSSProperties;
      attrs?: HtmlAttrs;
      children: ReactEmailNode[];
    }
  /** Document body — maps to React Email `<Body>`. */
  | { type: 'Body'; style?: CSSProperties; attrs?: HtmlAttrs; children: ReactEmailNode[] }
  /** Document head wrapper — maps to React Email `<Head>`. */
  | { type: 'Head'; children: ReactEmailNode[] }
  /** Tailwind utility wrapper — maps to React Email `<Tailwind>`. */
  | {
      type: 'Tailwind';
      config?: Record<string, unknown>;
      children: ReactEmailNode[];
    };

export interface FigmaReactEmailBlockProps {
  tree: ReactEmailNode;
  sourceFrame?: string;
  mobileFrame?: string;
  /**
   * Editor-only: when true, each rendered node carries `data-node-path` /
   * `data-block-id` attributes so the live preview can map clicks back to AST
   * nodes. Never set for export — keeps the shipped email clean.
   */
  editable?: boolean;
  /** Editor-only: id of the template block this tree belongs to. */
  blockId?: string;
  /**
   * When true (default) the block renders its own responsive `<Head>` style.
   * DynamicEmailTemplate sets this false and hoists the CSS into the document
   * head so media queries survive in email clients.
   */
  emitResponsiveStyles?: boolean;
  /** Strip every border the imported design carries, without editing the tree. */
  hideBorders?: boolean;
  /** Recolor every border the imported design carries. Ignored when empty. */
  borderColor?: string;
}
