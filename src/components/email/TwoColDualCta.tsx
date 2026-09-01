import * as React from 'react';
import { Img, Link } from '@react-email/components';
import { EDM_CLASS, fluidImgStyle } from '@/lib/email/responsive';
import { useSelectable } from '@/builder/preview/PreviewEditContext';

// ============================================================================
// TYPES
// ============================================================================

export interface ProductCardProps {
  /** Header title above the image */
  headerTitle?: string;
  /** Header subtitle below header title */
  headerSubtitle?: string;
  /** Product image source URL */
  imgSrc: string;
  /** Image alt text */
  altText?: string;
  /** Image width in pixels */
  imgWidth?: number;
  /** Image height in pixels */
  imgHeight?: number;
  /** Link URL for the product */
  url?: string;
  /** Link tracking label */
  label?: string;
  /** Label text (e.g., "NEW", "SALE") */
  labelText?: string;
  /** Product title */
  title?: string;
  /** Product subtitle */
  subtitle?: string;
  /** Primary CTA text (outlined button) */
  cta1Text?: string;
  /** Primary CTA URL */
  cta1Url?: string;
  /** Secondary CTA text (filled button) */
  cta2Text?: string;
  /** Secondary CTA URL */
  cta2Url?: string;
  /** Card background color */
  backgroundColor?: string;
  /** Card width in pixels */
  width?: number;
}

export interface TwoColDualCtaRowProps {
  /** Left card product data */
  product1: ProductCardProps;
  /** Right card product data */
  product2: ProductCardProps;
}

export interface TwoColDualCtaProps {
  /** Array of rows, each containing two products */
  rows: TwoColDualCtaRowProps[];
  /** Section background color */
  backgroundColor?: string;
  /** Padding for desktop */
  deskPadding?: string;
  /** Gutter width between cards */
  gutterWidth?: number;
  /** Card border style */
  cardBorder?: string;
  /** Card border radius */
  cardBorderRadius?: string;
  /** Text alignment */
  textAlign?: 'left' | 'center' | 'right';
  /** Custom styles for various elements */
  styles?: {
    headerTitle?: React.CSSProperties;
    headerSubtitle?: React.CSSProperties;
    label?: React.CSSProperties;
    title?: React.CSSProperties;
    subtitle?: React.CSSProperties;
    cta1?: React.CSSProperties;
    cta2?: React.CSSProperties;
  };
}

// ============================================================================
// STYLES
// ============================================================================

const defaultStyles = {
  headerTitle: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    fontSize: '22px',
    lineHeight: '28px',
    color: '#000000',
    fontWeight: 700,
    padding: '16px 16px 0 16px',
    margin: 0,
  } as React.CSSProperties,
  headerSubtitle: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    fontSize: '11px',
    lineHeight: '16px',
    color: '#666666',
    fontWeight: 'normal' as const,
    letterSpacing: '0.5px',
    padding: '4px 16px 12px 16px',
    margin: 0,
  } as React.CSSProperties,
  label: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    fontSize: '11px',
    lineHeight: '16px',
    color: '#666666',
    fontWeight: 'normal' as const,
    letterSpacing: '1px',
    padding: '16px 16px 4px 16px',
    margin: 0,
  } as React.CSSProperties,
  title: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    fontSize: '20px',
    lineHeight: '28px',
    color: '#000000',
    fontWeight: 600,
    padding: '0 16px 4px 16px',
    margin: 0,
  } as React.CSSProperties,
  subtitle: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    fontSize: '11px',
    lineHeight: '16px',
    color: '#666666',
    fontWeight: 'normal' as const,
    letterSpacing: '0.5px',
    padding: '0 16px 16px 16px',
    margin: 0,
  } as React.CSSProperties,
  cta1: {
    display: 'inline-block',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    textAlign: 'center' as const,
    textDecoration: 'none',
    letterSpacing: '0.5px',
    fontSize: '13px',
    lineHeight: '44px',
    color: '#000000',
    fontWeight: 600,
    backgroundColor: '#ffffff',
    border: '1px solid #000000',
    borderRadius: '50px',
    width: '218px',
    maxWidth: '100%',
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,
  cta2: {
    display: 'inline-block',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    textAlign: 'center' as const,
    textDecoration: 'none',
    letterSpacing: '0.5px',
    fontSize: '13px',
    lineHeight: '44px',
    color: '#ffffff',
    fontWeight: 600,
    backgroundColor: '#000000',
    border: '1px solid #000000',
    borderRadius: '50px',
    width: '218px',
    maxWidth: '100%',
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,
};

// ============================================================================
// PRODUCT CARD COMPONENT
// ============================================================================

const ProductCard: React.FC<{
  product: ProductCardProps;
  align: 'left' | 'right';
  textAlign: 'left' | 'center' | 'right';
  cardBorder?: string;
  cardBorderRadius?: string;
  styles?: TwoColDualCtaProps['styles'];
  containerStyle?: React.CSSProperties;
}> = ({ product, align, textAlign, cardBorder, cardBorderRadius, styles = {}, containerStyle }) => {
  const bgColor = product.backgroundColor || '#ffffff';
  const width = product.width || 250;
  const imgWidth = product.imgWidth || width;
  const rowsSel = useSelectable('rows');

  return (
    <table
      width={width}
      cellPadding={0}
      cellSpacing={0}
      align={align}
      className={EDM_CLASS.colDrop}
      style={{
        width: `${width}px`,
        float: align,
        border: cardBorder,
        borderRadius: cardBorderRadius,
        backgroundColor: bgColor,
        ...containerStyle,
      }}
      role="presentation"
    >
      {product.headerTitle && (
        <tr>
          <td
            align={textAlign}
            valign="top"
            {...rowsSel}
            style={{
              backgroundColor: bgColor,
              ...defaultStyles.headerTitle,
              ...styles.headerTitle,
            }}
          >
            {product.headerTitle}
          </td>
        </tr>
      )}

      {product.headerSubtitle && (
        <tr>
          <td
            align={textAlign}
            valign="top"
            {...rowsSel}
            style={{
              backgroundColor: bgColor,
              ...defaultStyles.headerSubtitle,
              ...styles.headerSubtitle,
            }}
          >
            {product.headerSubtitle}
          </td>
        </tr>
      )}

      <tr>
        <td align="center" valign="top" style={{ backgroundColor: bgColor }}>
          {product.url ? (
            <Link href={product.url} style={{ color: '#181716' }} target="_blank">
              <Img
                src={product.imgSrc}
                width={imgWidth}
                alt={product.altText || ''}
                className={EDM_CLASS.imgFluid}
                style={fluidImgStyle(imgWidth)}
                {...rowsSel}
              />
            </Link>
          ) : (
            <Img
              src={product.imgSrc}
              width={imgWidth}
              alt={product.altText || ''}
              className={EDM_CLASS.imgFluid}
              style={fluidImgStyle(imgWidth)}
              {...rowsSel}
            />
          )}
        </td>
      </tr>

      {product.labelText && (
        <tr>
          <td
            align={textAlign}
            valign="top"
            {...rowsSel}
            style={{
              backgroundColor: bgColor,
              ...defaultStyles.label,
              ...styles.label,
            }}
          >
            {product.labelText}
          </td>
        </tr>
      )}

      {product.title && (
        <tr>
          <td
            align={textAlign}
            valign="top"
            {...rowsSel}
            style={{
              backgroundColor: bgColor,
              ...defaultStyles.title,
              ...styles.title,
            }}
          >
            {product.title}
          </td>
        </tr>
      )}

      {product.subtitle && (
        <tr>
          <td
            align={textAlign}
            valign="top"
            {...rowsSel}
            style={{
              backgroundColor: bgColor,
              ...defaultStyles.subtitle,
              ...styles.subtitle,
            }}
          >
            {product.subtitle}
          </td>
        </tr>
      )}

      <tr>
        <td
          align="center"
          valign="top"
          style={{
            backgroundColor: bgColor,
            padding: '0 16px 10px 16px',
          }}
        >
          <Link
            href={product.cta1Url || product.url || '#'}
            className={EDM_CLASS.cta}
            {...rowsSel}
            style={{
              ...defaultStyles.cta1,
              ...styles.cta1,
            }}
            target="_blank"
          >
            {product.cta1Text || 'REQUEST A QUOTE'}
          </Link>
        </td>
      </tr>

      <tr>
        <td
          align="center"
          valign="top"
          style={{
            backgroundColor: bgColor,
            padding: '0 16px 20px 16px',
          }}
        >
          <Link
            href={product.cta2Url || product.url || '#'}
            className={EDM_CLASS.cta}
            {...rowsSel}
            style={{
              ...defaultStyles.cta2,
              ...styles.cta2,
            }}
            target="_blank"
          >
            {product.cta2Text || 'VIEW OFFERS'}
          </Link>
        </td>
      </tr>
    </table>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const TwoColDualCta: React.FC<TwoColDualCtaProps> = ({
  rows,
  backgroundColor = '#f7f8f8',
  deskPadding = '20px 40px 20px 40px',
  gutterWidth = 20,
  cardBorder,
  cardBorderRadius,
  textAlign = 'left',
  styles = {},
}) => {
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
            width="100%"
            cellPadding={0}
            cellSpacing={0}
            className={EDM_CLASS.fluid}
            role="presentation"
          >
            {rows.map((row, index) => (
              <tr key={index}>
                <td align="center" valign="top">
                  <table width="100%" cellPadding={0} cellSpacing={0} role="presentation">
                    <tr>
                      <td align="left" valign="top">
                        <ProductCard
                          product={row.product1}
                          align="left"
                          textAlign={textAlign}
                          cardBorder={cardBorder}
                          cardBorderRadius={cardBorderRadius}
                          styles={styles}
                        />

                        <table
                          width={gutterWidth}
                          cellPadding={0}
                          cellSpacing={0}
                          align="left"
                          className={EDM_CLASS.colHide}
                          style={{ width: `${gutterWidth}px` }}
                          role="presentation"
                        >
                          <tr>
                            <td width={gutterWidth} style={{ width: `${gutterWidth}px`, fontSize: '0px', lineHeight: '0px' }}>
                              &nbsp;
                            </td>
                          </tr>
                        </table>

                        <ProductCard
                          product={row.product2}
                          align="right"
                          textAlign={textAlign}
                          cardBorder={cardBorder}
                          cardBorderRadius={cardBorderRadius}
                          styles={styles}
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className={EDM_CLASS.clearfix} style={{ fontSize: '0px', lineHeight: '0px' }}>
                        &nbsp;
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            ))}
          </table>
        </td>
      </tr>
    </table>
  );
};

export default TwoColDualCta;
