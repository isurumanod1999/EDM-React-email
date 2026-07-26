import type { CSSProperties } from 'react';

/** Class applied to columns that should stack vertically on mobile (≤600px). */
export const RESPONSIVE_COL_CLASS = 'figma-col-stack';

export type ReactEmailNode =
  | { type: 'Section'; style?: CSSProperties; mobileStyle?: CSSProperties; children: ReactEmailNode[] }
  | { type: 'Container'; style?: CSSProperties; mobileStyle?: CSSProperties; children: ReactEmailNode[] }
  | { type: 'Row'; style?: CSSProperties; mobileStyle?: CSSProperties; children: ReactEmailNode[] }
  | {
      type: 'Column';
      style?: CSSProperties;
      mobileStyle?: CSSProperties;
      className?: string;
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
      href?: string;
      style?: CSSProperties;
      /**
       * Typography overrides applied only at ≤600px (font size / line height /
       * letter spacing) — emitted as a `@media` rule so mobile matches the
       * Figma mobile frame instead of inheriting desktop type.
       */
      mobileStyle?: CSSProperties;
    }
  | {
      type: 'Heading';
      content: string;
      html?: string;
      as?: 'h1' | 'h2' | 'h3';
      href?: string;
      style?: CSSProperties;
      mobileStyle?: CSSProperties;
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
    }
  | {
      type: 'Link';
      href: string;
      content: string;
      html?: string;
      style?: CSSProperties;
      mobileStyle?: CSSProperties;
    }
  | {
      type: 'Button';
      href: string;
      label: string;
      style?: CSSProperties;
      containerStyle?: CSSProperties;
      mobileStyle?: CSSProperties;
    }
  | { type: 'Hr'; style?: CSSProperties; mobileStyle?: CSSProperties }
  | { type: 'Spacer'; height: number };

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
}
