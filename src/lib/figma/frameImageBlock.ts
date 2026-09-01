import { generateId } from '@/lib/utils/id';
import type { ReactEmailNode } from './types/reactEmailAst';

export interface FrameImageParams {
  /** Local path to the full-frame desktop PNG export (Figma frame render). */
  desktopUrl: string;
  /** Optional full-frame mobile PNG export — swapped in ≤600px via media query. */
  mobileUrl?: string;
  width?: number;
  height?: number;
  alt: string;
  /**
   * Background painted behind the image. Figma renders a frame whose fill lives
   * on a parent (logo bars, preheaders) as a TRANSPARENT PNG, so without this the
   * component would show no background. Harmless when the PNG is already opaque.
   */
  backgroundColor?: string;
}

/**
 * Build a "flatten to image" React Email tree: the ENTIRE component rendered as
 * a single full-width PNG (the Figma frame export) — no structured primitives,
 * no design context. This is the standard email escape hatch for components that
 * rely on CSS email clients drop (custom fonts, gradients, transforms, overlap):
 * an image renders identically in every client.
 *
 * When a mobile frame export is present it is swapped in below 600px using the
 * existing `figma-img-responsive` desktop/mobile mechanism. `fullBleed` makes the
 * image span the full section width with `height:auto`, so differing desktop /
 * mobile aspect ratios never distort.
 */
export function buildFrameImageTree(params: FrameImageParams): ReactEmailNode {
  const width = Math.min(params.width ?? 600, 600);
  const cls = `figma-frame-img-${generateId()}`;
  return {
    type: 'Section',
    style: {
      width: '100%',
      maxWidth: 600,
      margin: '0 auto',
      ...(params.backgroundColor ? { backgroundColor: params.backgroundColor } : {}),
    },
    children: [
      {
        type: 'Img',
        src: params.desktopUrl,
        mobileSrc: params.mobileUrl,
        width,
        height: params.height,
        alt: params.alt,
        align: 'center',
        fullBleed: true,
        // A className is required for the responsive desktop/mobile swap CSS to be
        // emitted; only needed when there's a distinct mobile export.
        className: params.mobileUrl ? cls : undefined,
      },
    ],
  };
}
