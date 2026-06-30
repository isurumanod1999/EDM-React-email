import type { CSSProperties } from 'react';

/** Class applied to columns that should stack vertically on mobile (≤600px). */
export const RESPONSIVE_COL_CLASS = 'figma-col-stack';

export type ReactEmailNode =
  | { type: 'Section'; style?: CSSProperties; children: ReactEmailNode[] }
  | { type: 'Container'; style?: CSSProperties; children: ReactEmailNode[] }
  | { type: 'Row'; style?: CSSProperties; children: ReactEmailNode[] }
  | {
      type: 'Column';
      style?: CSSProperties;
      className?: string;
      children: ReactEmailNode[];
    }
  | { type: 'Text'; content: string; href?: string; style?: CSSProperties }
  | {
      type: 'Heading';
      content: string;
      as?: 'h1' | 'h2' | 'h3';
      href?: string;
      style?: CSSProperties;
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
    }
  | { type: 'Link'; href: string; content: string; style?: CSSProperties }
  | {
      type: 'Button';
      href: string;
      label: string;
      style?: CSSProperties;
      containerStyle?: CSSProperties;
    }
  | { type: 'Hr'; style?: CSSProperties }
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
}
