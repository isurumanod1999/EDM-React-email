import * as React from 'react';
import { Link } from '@react-email/components';
import { EDM_CLASS } from '@/lib/email/responsive';
import { ResponsiveImg } from '@/lib/email/ResponsiveImg';
import { useSelectable } from '@/builder/preview/PreviewEditContext';

// ============================================================================
// TYPES
// ============================================================================

export interface ProductItemProps {
  /** Desktop image source URL */
  deskImgSrc: string;
  /** Mobile image source URL (optional) */
  mobImgSrc?: string;
  /** Image width */
  imgWidth?: number;
  /** Image height */
  imgHeight?: number;
  /** Image alt text */
  altText?: string;
  /** Image border radius */
  imgBorderRadius?: string;
  /** Image alignment */
  imgAlign?: 'left' | 'center' | 'right';
  /** Link URL */
  url?: string;
  /** Link label for tracking */
  label?: string;
  /** Product title */
  productTitle?: string;
  /** Product subtitle */
  productSubtitle?: string;
  /** Product price */
  productPrice?: string;
  /** Show button CTA */
  showButton?: boolean;
  /** CTA button text */
  ctaText?: string;
  /** CTA button URL */
  ctaUrl?: string;
  /** CTA link text (alternative to button) */
  ctaLinkText?: string;
  /** Card width */
  width?: number;
  /** Card background color */
  backgroundColor?: string;
}

export interface OneColProductProps {
  /** Array of product items */
  rows: ProductItemProps[];
  /** Section background color */
  backgroundColor?: string;
  /** Content width */
  contentWidth?: number;
  /** Content alignment */
  contentAlign?: 'left' | 'center' | 'right';
  /** Padding for the section */
  deskPadding?: string;
  /** Text alignment */
  textAlign?: 'left' | 'center' | 'right';
  /** CTA alignment */
  ctaAlign?: 'left' | 'center' | 'right';
  /** Custom styles */
  styles?: {
    title?: React.CSSProperties;
    subtitle?: React.CSSProperties;
    price?: React.CSSProperties;
    cta?: React.CSSProperties;
    ctaLink?: React.CSSProperties;
  };
}

// ============================================================================
// STYLES
// ============================================================================

const defaultStyles = {
  title: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    fontSize: '16px',
    lineHeight: '24px',
    color: '#000000',
    fontWeight: 600,
    padding: '16px 16px 4px 16px',
    margin: 0,
  } as React.CSSProperties,
  subtitle: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    fontSize: '14px',
    lineHeight: '20px',
    color: '#666666',
    padding: '0 16px 8px 16px',
    margin: 0,
  } as React.CSSProperties,
  price: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    fontSize: '20px',
    lineHeight: '28px',
    color: '#000000',
    fontWeight: 600,
    padding: '0 16px 16px 16px',
    margin: 0,
  } as React.CSSProperties,
  cta: {
    display: 'inline-block',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    textAlign: 'center' as const,
    textDecoration: 'none',
    letterSpacing: '0.5px',
    fontSize: '14px',
    lineHeight: '44px',
    color: '#000000',
    fontWeight: 600,
    backgroundColor: '#ffffff',
    border: '1px solid #000000',
    borderRadius: '4px',
    width: '218px',
    maxWidth: '100%',
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,
  ctaLink: {
    textDecoration: 'none',
    borderBottom: '1px solid #005bab',
    paddingBottom: '4px',
    color: '#005bab',
    fontWeight: 'normal' as const,
  } as React.CSSProperties,
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const OneColProduct: React.FC<OneColProductProps> = ({
  rows,
  backgroundColor = '#f7f8f8',
  contentWidth = 520,
  contentAlign = 'center',
  deskPadding = '20px 40px 20px 40px',
  textAlign = 'left',
  ctaAlign = 'left',
  styles = {},
}) => {
  const rowsSel = useSelectable('rows');
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
            width={contentWidth}
            cellPadding={0}
            cellSpacing={0}
            className={EDM_CLASS.fluid}
            style={{ width: `${contentWidth}px` }}
            role="presentation"
          >
            {rows.map((item, index) => {
              const itemBgColor = item.backgroundColor || '#ffffff';
              const itemWidth = item.width || contentWidth;
              const imgWidth = item.imgWidth || itemWidth;

              return (
                <tr key={index}>
                  <td align={contentAlign} valign="top">
                    <table
                      width={itemWidth}
                      cellPadding={0}
                      cellSpacing={0}
                      align={contentAlign}
                      className={EDM_CLASS.fluid}
                      style={{
                        width: `${itemWidth}px`,
                        backgroundColor: itemBgColor,
                      }}
                      role="presentation"
                    >
                      <tr>
                        <td
                          align={item.imgAlign || 'center'}
                          valign="top"
                          style={{ backgroundColor: itemBgColor }}
                        >
                          {item.url ? (
                            <Link href={item.url} target="_blank">
                              <ResponsiveImg
                                deskSrc={item.deskImgSrc}
                                mobSrc={item.mobImgSrc}
                                width={imgWidth}
                                alt={item.altText || ''}
                                style={{ borderRadius: item.imgBorderRadius }}
                                selectAttrs={rowsSel}
                              />
                            </Link>
                          ) : (
                            <ResponsiveImg
                              deskSrc={item.deskImgSrc}
                              mobSrc={item.mobImgSrc}
                              width={imgWidth}
                              alt={item.altText || ''}
                              style={{ borderRadius: item.imgBorderRadius }}
                              selectAttrs={rowsSel}
                            />
                          )}
                        </td>
                      </tr>

                      {item.productTitle && (
                        <tr>
                          <td
                            align={textAlign}
                            valign="top"
                            {...rowsSel}
                            style={{
                              backgroundColor: itemBgColor,
                              ...defaultStyles.title,
                              ...styles.title,
                            }}
                          >
                            {item.url ? (
                              <Link
                                href={item.url}
                                style={{
                                  textDecoration: 'none',
                                  display: 'block',
                                  color: 'inherit',
                                }}
                                target="_blank"
                              >
                                <strong>{item.productTitle}</strong>
                              </Link>
                            ) : (
                              <strong>{item.productTitle}</strong>
                            )}
                          </td>
                        </tr>
                      )}

                      {item.productSubtitle && (
                        <tr>
                          <td
                            align={textAlign}
                            valign="top"
                            {...rowsSel}
                            style={{
                              backgroundColor: itemBgColor,
                              ...defaultStyles.subtitle,
                              ...styles.subtitle,
                            }}
                            dangerouslySetInnerHTML={{ __html: item.productSubtitle }}
                          />
                        </tr>
                      )}

                      {item.productPrice && (
                        <tr>
                          <td
                            align={textAlign}
                            valign="top"
                            {...rowsSel}
                            style={{
                              backgroundColor: itemBgColor,
                              ...defaultStyles.price,
                              ...styles.price,
                            }}
                          >
                            {item.url ? (
                              <Link
                                href={item.url}
                                style={{
                                  textDecoration: 'none',
                                  display: 'inline-block',
                                  color: 'inherit',
                                }}
                                target="_blank"
                              >
                                <strong>{item.productPrice}</strong>
                              </Link>
                            ) : (
                              <strong>{item.productPrice}</strong>
                            )}
                          </td>
                        </tr>
                      )}

                      {item.showButton && (
                        <tr>
                          <td
                            align={ctaAlign}
                            valign="top"
                            style={{
                              backgroundColor: itemBgColor,
                              padding: '0 16px 20px 16px',
                            }}
                          >
                            <Link
                              href={item.ctaUrl || item.url || '#'}
                              className={EDM_CLASS.cta}
                              {...rowsSel}
                              style={{
                                ...defaultStyles.cta,
                                ...styles.cta,
                              }}
                              target="_blank"
                            >
                              {item.ctaText || 'SHOP NOW'}
                            </Link>
                          </td>
                        </tr>
                      )}

                      {!item.showButton && item.ctaLinkText && (
                        <tr>
                          <td
                            align={textAlign}
                            valign="top"
                            style={{
                              backgroundColor: itemBgColor,
                              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                              fontSize: '14px',
                              lineHeight: '20px',
                              padding: '0 16px 16px 16px',
                            }}
                          >
                            <Link
                              href={item.ctaUrl || item.url || '#'}
                              {...rowsSel}
                              style={{
                                ...defaultStyles.ctaLink,
                                ...styles.ctaLink,
                              }}
                              target="_blank"
                            >
                              {item.ctaLinkText}
                            </Link>
                          </td>
                        </tr>
                      )}
                    </table>
                  </td>
                </tr>
              );
            })}
          </table>
        </td>
      </tr>
    </table>
  );
};

export default OneColProduct;
