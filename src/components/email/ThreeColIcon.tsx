import * as React from 'react';
import { Img, Link } from '@react-email/components';
import { EDM_CLASS } from '@/lib/email/responsive';
import { useSelectable } from '@/builder/preview/PreviewEditContext';

// ============================================================================
// TYPES
// ============================================================================

export interface IconColumnProps {
  /** Icon image source URL */
  iconSrc: string;
  /** Icon width */
  iconWidth?: number;
  /** Icon height */
  iconHeight?: number;
  /** Icon alignment */
  iconAlign?: 'left' | 'center' | 'right';
  /** Icon padding */
  iconPadding?: string;
  /** Icon alt text */
  altText?: string;
  /** Link URL */
  url?: string;
  /** Link label for tracking */
  label?: string;
  /** Text content */
  text: string;
  /** Column width */
  width?: number;
  /** Background color */
  backgroundColor?: string;
  /** Custom text style */
  textStyle?: React.CSSProperties;
}

export interface ThreeColIconRowProps {
  /** Left column */
  left: IconColumnProps;
  /** Center column */
  center: IconColumnProps;
  /** Right column */
  right: IconColumnProps;
}

export interface ThreeColIconProps {
  /** Array of rows */
  rows: ThreeColIconRowProps[];
  /** Section background color */
  backgroundColor?: string;
  /** Padding for the section */
  deskPadding?: string;
  /** Gutter width between columns */
  gutterWidth?: number;
  /** Fixed text height (for alignment) */
  textHeight?: number;
  /** Custom styles */
  styles?: {
    text?: React.CSSProperties;
  };
}

// ============================================================================
// STYLES
// ============================================================================

const defaultStyles = {
  text: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    fontSize: '12px',
    lineHeight: '18px',
    color: '#333333',
    padding: '0 16px 16px 16px',
    margin: 0,
  } as React.CSSProperties,
};

// ============================================================================
// ICON COLUMN COMPONENT
// ============================================================================

const IconColumn: React.FC<{
  column: IconColumnProps;
  textHeight?: number;
  styles?: ThreeColIconProps['styles'];
}> = ({ column, textHeight = 54, styles = {} }) => {
  const bgColor = column.backgroundColor || '#ffffff';
  const width = column.width || 160;
  const iconWidth = column.iconWidth || 18;
  const iconHeight = column.iconHeight || 18;
  const rowsSel = useSelectable('rows');

  return (
    <table
      width={width}
      cellPadding={0}
      cellSpacing={0}
      align="left"
      className={EDM_CLASS.colDrop}
      style={{
        width: `${width}px`,
        float: 'left',
        backgroundColor: bgColor,
      }}
      role="presentation"
    >
      <tr>
        <td
          align={column.iconAlign || 'left'}
          valign="top"
          style={{
            padding: column.iconPadding || '16px 16px 12px 16px',
            backgroundColor: bgColor,
          }}
        >
          {column.url ? (
            <Link href={column.url} target="_blank">
              <Img
                src={column.iconSrc}
                width={iconWidth}
                height={iconHeight}
                alt={column.altText || ''}
                {...rowsSel}
                style={{
                  display: 'block',
                  width: `${iconWidth}px`,
                  height: `${iconHeight}px`,
                }}
              />
            </Link>
          ) : (
            <Img
              src={column.iconSrc}
              width={iconWidth}
              height={iconHeight}
              alt={column.altText || ''}
              {...rowsSel}
              style={{
                display: 'block',
                width: `${iconWidth}px`,
                height: `${iconHeight}px`,
              }}
            />
          )}
        </td>
      </tr>

      <tr>
        <td
          align="left"
          valign="top"
          className={EDM_CLASS.stackCell}
          {...rowsSel}
          style={{
            minHeight: `${textHeight}px`,
            backgroundColor: bgColor,
            ...defaultStyles.text,
            ...styles.text,
            ...column.textStyle,
          }}
          dangerouslySetInnerHTML={{ __html: column.text }}
        />
      </tr>
    </table>
  );
};

const GutterSpacer: React.FC<{ width: number }> = ({ width }) => (
  <table
    width={width}
    cellPadding={0}
    cellSpacing={0}
    align="left"
    className={EDM_CLASS.colHide}
    style={{ width: `${width}px` }}
    role="presentation"
  >
    <tr>
      <td width={width} style={{ width: `${width}px`, fontSize: '0px', lineHeight: '0px' }}>
        &nbsp;
      </td>
    </tr>
  </table>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ThreeColIcon: React.FC<ThreeColIconProps> = ({
  rows,
  backgroundColor = '#f7f8f8',
  deskPadding = '20px 40px 20px 40px',
  gutterWidth = 20,
  textHeight = 54,
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
            width={520}
            cellPadding={0}
            cellSpacing={0}
            className={EDM_CLASS.fluid}
            style={{ width: '520px' }}
            role="presentation"
          >
            {rows.map((row, index) => (
              <tr key={index}>
                <td align="left" valign="top">
                  <IconColumn column={row.left} textHeight={textHeight} styles={styles} />
                  <GutterSpacer width={gutterWidth} />
                  <IconColumn column={row.center} textHeight={textHeight} styles={styles} />
                  <GutterSpacer width={gutterWidth} />
                  <IconColumn column={row.right} textHeight={textHeight} styles={styles} />
                </td>
              </tr>
            ))}
            <tr>
              <td className={EDM_CLASS.clearfix} style={{ fontSize: '0px', lineHeight: '0px' }}>
                &nbsp;
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  );
};

export default ThreeColIcon;
