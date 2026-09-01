import * as React from 'react';
import { Img, Link } from '@react-email/components';
import { EDM_CLASS, fluidImgStyle } from '@/lib/email/responsive';
import { useSelectable } from '@/builder/preview/PreviewEditContext';

export interface HeroBannerProps {
  imgSrc: string;
  imgWidth?: number;
  imgHeight?: number;
  altText?: string;
  imageUrl?: string;
  headline?: string;
  subheadline?: string;
  ctaText?: string;
  ctaUrl?: string;
  backgroundColor?: string;
  contentBackgroundColor?: string;
  deskPadding?: string;
  textAlign?: 'left' | 'center' | 'right';
  headlineColor?: string;
  subheadlineColor?: string;
  ctaBackgroundColor?: string;
  ctaTextColor?: string;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  imgSrc,
  imgWidth = 600,
  imgHeight,
  altText = 'Hero image',
  imageUrl,
  headline,
  subheadline,
  ctaText,
  ctaUrl,
  backgroundColor = '#ffffff',
  contentBackgroundColor = '#ffffff',
  deskPadding = '32px 40px',
  textAlign = 'center',
  headlineColor = '#000000',
  subheadlineColor = '#666666',
  ctaBackgroundColor = '#000000',
  ctaTextColor = '#ffffff',
}) => {
  const fontFamily =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  const imgSel = useSelectable('imgSrc');
  const headlineSel = useSelectable('headline');
  const subSel = useSelectable('subheadline');
  const ctaSel = useSelectable('ctaText');

  const image = (
    <Img
      src={imgSrc}
      width={imgWidth}
      height={imgHeight}
      alt={altText}
      className={EDM_CLASS.imgFluid}
      style={fluidImgStyle(imgWidth, {
        height: imgHeight ? `${imgHeight}px` : 'auto',
      })}
      {...imgSel}
    />
  );

  return (
    <table
      width={600}
      cellPadding={0}
      cellSpacing={0}
      className={EDM_CLASS.wrapper}
      style={{ width: '600px', backgroundColor }}
      role="presentation"
    >
      <tr>
        <td align="center" valign="top">
          {imageUrl ? <Link href={imageUrl}>{image}</Link> : image}
        </td>
      </tr>
      {(headline || subheadline || ctaText) && (
        <tr>
          <td
            align={textAlign}
            valign="top"
            className={EDM_CLASS.pad}
            style={{
              padding: deskPadding,
              backgroundColor: contentBackgroundColor,
              fontFamily,
            }}
          >
            {headline && (
              <p
                {...headlineSel}
                style={{
                  margin: '0 0 12px 0',
                  fontSize: '28px',
                  fontWeight: 700,
                  lineHeight: '34px',
                  color: headlineColor,
                }}
              >
                {headline}
              </p>
            )}
            {subheadline && (
              <p
                {...subSel}
                style={{
                  margin: '0 0 20px 0',
                  fontSize: '16px',
                  lineHeight: '24px',
                  color: subheadlineColor,
                }}
              >
                {subheadline}
              </p>
            )}
            {ctaText && ctaUrl && (
              <Link
                href={ctaUrl}
                className={EDM_CLASS.cta}
                {...ctaSel}
                style={{
                  display: 'inline-block',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                  fontFamily,
                  fontSize: '14px',
                  fontWeight: 600,
                  color: ctaTextColor,
                  backgroundColor: ctaBackgroundColor,
                  padding: '14px 32px',
                  textDecoration: 'none',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {ctaText}
              </Link>
            )}
          </td>
        </tr>
      )}
    </table>
  );
};

export default HeroBanner;
