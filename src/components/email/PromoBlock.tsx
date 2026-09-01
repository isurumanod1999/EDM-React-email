import * as React from 'react';
import { Img, Link } from '@react-email/components';
import { EDM_CLASS, fluidImgStyle } from '@/lib/email/responsive';
import { useSelectable } from '@/builder/preview/PreviewEditContext';

// ============================================================================
// TYPES
// ============================================================================

export interface PromoBlockProps {
  /** Image source URL */
  imgSrc: string;
  /** Image width */
  imgWidth?: number;
  /** Image height */
  imgHeight?: number;
  /** Image alt text */
  altText?: string;
  /** Link URL */
  url?: string;
  /** Link label for tracking */
  label?: string;
  /** Promo title */
  title?: string;
  /** Promo subtitle/description */
  subtitle?: string;
  /** CTA button text */
  ctaText?: string;
  /** CTA button URL (defaults to url if not provided) */
  ctaUrl?: string;
  /** Section background color */
  backgroundColor?: string;
  /** Card background color */
  cardBackgroundColor?: string;
  /** Card width */
  cardWidth?: number;
  /** Card border */
  cardBorder?: string;
  /** Padding for the section */
  deskPadding?: string;
  /** CTA padding */
  ctaPadding?: string;
  /** Custom styles */
  styles?: {
    title?: React.CSSProperties;
    subtitle?: React.CSSProperties;
    cta?: React.CSSProperties;
  };
}

// ============================================================================
// STYLES
// ============================================================================

const defaultStyles = {
  title: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    fontSize: '18px',
    lineHeight: '26px',
    color: '#000000',
    fontWeight: 700,
    padding: '16px 20px 8px 20px',
    margin: 0,
  } as React.CSSProperties,
  subtitle: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    fontSize: '14px',
    lineHeight: '20px',
    color: '#666666',
    padding: '0 20px 16px 20px',
    margin: 0,
  } as React.CSSProperties,
  cta: {
    display: 'inline-block',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    textAlign: 'center' as const,
    textDecoration: 'none',
    letterSpacing: '0.5px',
    textTransform: 'uppercase' as const,
    fontSize: '12px',
    lineHeight: '44px',
    color: '#ffffff',
    fontWeight: 600,
    backgroundColor: '#000000',
    width: '140px',
    maxWidth: '100%',
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const PromoBlock: React.FC<PromoBlockProps> = ({
  imgSrc,
  imgWidth = 520,
  imgHeight,
  altText = '',
  url,
  label,
  title,
  subtitle,
  ctaText,
  ctaUrl,
  backgroundColor = '#ffffff',
  cardBackgroundColor = '#ffffff',
  cardWidth = 520,
  cardBorder = '1px solid #e0e0e0',
  deskPadding = '20px 40px 20px 40px',
  ctaPadding = '0 20px 20px 20px',
  styles = {},
}) => {
  const imgSel = useSelectable('imgSrc');
  const titleSel = useSelectable('title');
  const subtitleSel = useSelectable('subtitle');
  const ctaSel = useSelectable('ctaText');
  const finalCtaUrl = ctaUrl || url || '#';

  return (
    <table
      width={600}
      cellPadding={0}
      cellSpacing={0}
      className={EDM_CLASS.wrapper}
      style={{
        width: '600px',
        backgroundColor: backgroundColor,
      }}
      role="presentation"
    >
      <tr>
        <td align="center" valign="top" className={EDM_CLASS.pad} style={{ padding: deskPadding }}>
          <table
            width={cardWidth}
            cellPadding={0}
            cellSpacing={0}
            className={EDM_CLASS.fluid}
            style={{
              width: `${cardWidth}px`,
              border: cardBorder,
              backgroundColor: cardBackgroundColor,
            }}
            role="presentation"
          >
            {/* Image */}
            <tr>
              <td align="center" valign="top">
                {url ? (
                  <Link href={url} target="_blank">
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
                  </Link>
                ) : (
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
                )}
              </td>
            </tr>

            {/* Title */}
            {title && (
              <tr>
                <td
                  align="left"
                  valign="top"
                  {...titleSel}
                  style={{
                    ...defaultStyles.title,
                    ...styles.title,
                  }}
                >
                  {url ? (
                    <Link
                      href={url}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                      target="_blank"
                    >
                      {title}
                    </Link>
                  ) : (
                    title
                  )}
                </td>
              </tr>
            )}

            {/* Subtitle */}
            {subtitle && (
              <tr>
                <td
                  align="left"
                  valign="top"
                  {...subtitleSel}
                  style={{
                    ...defaultStyles.subtitle,
                    ...styles.subtitle,
                  }}
                  dangerouslySetInnerHTML={{ __html: subtitle }}
                />
              </tr>
            )}

            {/* CTA Button */}
            {ctaText && (
              <tr>
                <td align="left" valign="top" style={{ padding: ctaPadding }}>
                  <Link
                    href={finalCtaUrl}
                    className={EDM_CLASS.cta}
                    {...ctaSel}
                    style={{
                      ...defaultStyles.cta,
                      ...styles.cta,
                    }}
                    target="_blank"
                  >
                    {ctaText}
                  </Link>
                </td>
              </tr>
            )}
          </table>
        </td>
      </tr>
    </table>
  );
};

export default PromoBlock;

