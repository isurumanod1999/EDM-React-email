import * as React from 'react';
import { Link } from '@react-email/components';
import { EDM_CLASS } from '@/lib/email/responsive';
import { ResponsiveImg } from '@/lib/email/ResponsiveImg';
import { useSelectable } from '@/builder/preview/PreviewEditContext';

// ============================================================================
// TYPES
// ============================================================================

export interface ProductProps {
  /** Desktop image source URL */
  deskImgSrc?: string;
  /** Mobile image source URL (for responsive) */
  mobImgSrc?: string;
  /** Image width in pixels */
  imgWidth?: number;
  /** Image height in pixels */
  imgHeight?: number;
  /** Image alt text */
  altText?: string;
  /** Image border radius */
  imgBorderRadius?: string;
  /** Image padding */
  imgPadding?: string;
  /** Link URL for the product */
  url?: string;
  /** Link tracking label */
  label?: string;
  /** Link target */
  urlTarget?: string;
  /** Product title */
  title?: string;
  /** Product subtitle */
  subtitle?: string;
  /** Product price */
  price?: string;
  /** CTA button text */
  ctaText?: string;
  /** CTA button URL */
  ctaUrl?: string;
  /** Hide CTA button */
  hideCta?: boolean;
  /** Card background color */
  backgroundColor?: string;
  /** Card width in pixels */
  width?: number;
}

export interface TwoColStackedRowProps {
  /** Single image spanning full width (optional) */
  singleImage?: boolean;
  /** Left product data */
  product1?: ProductProps;
  /** Right product data */
  product2?: ProductProps;
  /** Desktop image source (for single image mode) */
  desktopImgSrc?: string;
  /** Mobile image source (for single image mode) */
  mobileImgSrc?: string;
  /** Image width (for single image mode) */
  width?: number;
  /** Image height (for single image mode) */
  height?: number;
  /** Alt text (for single image mode) */
  altText?: string;
  /** URL (for single image mode) */
  url?: string;
  /** Label (for single image mode) */
  label?: string;
}

export interface TwoColStackedProps {
  /** Array of rows */
  rows: TwoColStackedRowProps[];
  /** Section background color */
  backgroundColor?: string;
  /** Padding for desktop */
  deskPadding?: string;
  /** Gutter width between cards */
  gutterWidth?: number;
  /** Custom styles for various elements */
  styles?: {
    title?: React.CSSProperties;
    subtitle?: React.CSSProperties;
    price?: React.CSSProperties;
    cta?: React.CSSProperties;
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
    textDecoration: 'none',
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
    textDecoration: 'none',
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
};

// ============================================================================
// SINGLE IMAGE ROW COMPONENT
// ============================================================================

const SingleImageRow: React.FC<{
  row: TwoColStackedRowProps;
  backgroundColor?: string;
}> = ({ row, backgroundColor = '#ffffff' }) => {
  const width = row.width || 520;
  const rowsSel = useSelectable('rows');

  return (
    <tr>
      <td align="center" valign="top" style={{ padding: '0 0 10px' }}>
        <table
          width={width}
          cellPadding={0}
          cellSpacing={0}
          align="center"
          className={`${EDM_CLASS.fluid} ${EDM_CLASS.colDrop}`}
          style={{ width: `${width}px`, backgroundColor }}
          role="presentation"
        >
          <tr>
            <td align="center" valign="top" style={{ backgroundColor }}>
              {row.url ? (
                <Link href={row.url} style={{ color: '#181716' }} target="_blank">
                  <ResponsiveImg
                    deskSrc={row.desktopImgSrc || ''}
                    mobSrc={row.mobileImgSrc}
                    width={width}
                    height={row.height}
                    alt={row.altText || ''}
                    style={{ height: row.height ? `${row.height}px` : 'auto' }}
                    selectAttrs={rowsSel}
                  />
                </Link>
              ) : (
                <ResponsiveImg
                  deskSrc={row.desktopImgSrc || ''}
                  mobSrc={row.mobileImgSrc}
                  width={width}
                  height={row.height}
                  alt={row.altText || ''}
                  style={{ height: row.height ? `${row.height}px` : 'auto' }}
                  selectAttrs={rowsSel}
                />
              )}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  );
};

// ============================================================================
// PRODUCT COLUMN COMPONENT
// ============================================================================

const ProductColumn: React.FC<{
  product: ProductProps;
  align: 'left' | 'right';
  styles?: TwoColStackedProps['styles'];
}> = ({ product, align, styles = {} }) => {
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
        backgroundColor: bgColor,
      }}
      role="presentation"
    >
      <tr>
        <td
          align="center"
          valign="top"
          style={{
            padding: product.imgPadding || '0 0 0px',
            backgroundColor: bgColor,
          }}
        >
          {product.url ? (
            <Link
              href={product.url}
              style={{ color: '#181716' }}
              target={product.urlTarget || '_blank'}
            >
              <ResponsiveImg
                deskSrc={product.deskImgSrc || ''}
                mobSrc={product.mobImgSrc}
                width={imgWidth}
                alt={product.altText || ''}
                style={{ borderRadius: product.imgBorderRadius }}
                selectAttrs={rowsSel}
              />
            </Link>
          ) : (
            <ResponsiveImg
              deskSrc={product.deskImgSrc || ''}
              mobSrc={product.mobImgSrc}
              width={imgWidth}
              alt={product.altText || ''}
              style={{ borderRadius: product.imgBorderRadius }}
              selectAttrs={rowsSel}
            />
          )}
        </td>
      </tr>

      {product.title && (
        <tr>
          <td
            align="left"
            valign="top"
            {...rowsSel}
            style={{
              backgroundColor: bgColor,
              ...defaultStyles.title,
              ...styles.title,
            }}
          >
            <Link
              href={product.url || '#'}
              style={{
                textDecoration: 'none',
                display: 'block',
                color: 'inherit',
              }}
              target={product.urlTarget || '_blank'}
            >
              <strong>{product.title}</strong>
            </Link>
          </td>
        </tr>
      )}

      {product.title && product.subtitle && (
        <tr>
          <td
            align="left"
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

      {product.price && (
        <tr>
          <td
            align="left"
            valign="top"
            {...rowsSel}
            style={{
              backgroundColor: bgColor,
              ...defaultStyles.price,
              ...styles.price,
            }}
          >
            <Link
              href={product.url || '#'}
              style={{
                textDecoration: 'none',
                display: 'inline-block',
                color: 'inherit',
              }}
              target={product.urlTarget || '_blank'}
            >
              <strong>{product.price}</strong>
            </Link>
          </td>
        </tr>
      )}

      {product.price && !product.hideCta && (
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
              href={product.ctaUrl || product.url || '#'}
              className={EDM_CLASS.cta}
              {...rowsSel}
              style={{
                ...defaultStyles.cta,
                ...styles.cta,
              }}
              target={product.urlTarget || '_blank'}
            >
              {product.ctaText || 'SHOP NOW'}
            </Link>
          </td>
        </tr>
      )}
    </table>
  );
};

// ============================================================================
// TWO COLUMN ROW COMPONENT
// ============================================================================

const TwoColumnRow: React.FC<{
  row: TwoColStackedRowProps;
  gutterWidth: number;
  styles?: TwoColStackedProps['styles'];
}> = ({ row, gutterWidth, styles }) => {
  return (
    <tr>
      <td align="center" valign="top">
        <table width="100%" cellPadding={0} cellSpacing={0} role="presentation">
          <tr>
            <td align="left" valign="top">
              {row.product1 && (
                <ProductColumn product={row.product1} align="left" styles={styles} />
              )}

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

              {row.product2 && (
                <ProductColumn product={row.product2} align="right" styles={styles} />
              )}
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
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const TwoColStacked: React.FC<TwoColStackedProps> = ({
  rows,
  backgroundColor = '#f7f8f8',
  deskPadding = '0 40px 0px',
  gutterWidth = 20,
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
            {rows.map((row, index) =>
              row.singleImage ? (
                <SingleImageRow
                  key={index}
                  row={row}
                  backgroundColor={row.product1?.backgroundColor}
                />
              ) : (
                <TwoColumnRow
                  key={index}
                  row={row}
                  gutterWidth={gutterWidth}
                  styles={styles}
                />
              )
            )}
          </table>
        </td>
      </tr>
    </table>
  );
};

export default TwoColStacked;
