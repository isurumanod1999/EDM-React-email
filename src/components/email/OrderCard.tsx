import * as React from 'react';
import { EDM_CLASS } from '@/lib/email/responsive';
import { useSelectable } from '@/builder/preview/PreviewEditContext';

// ============================================================================
// TYPES
// ============================================================================

export interface OrderRowProps {
  /** Label text (left side) */
  label: string;
  /** Value text (right side) */
  value: string;
  /** Custom label style */
  labelStyle?: React.CSSProperties;
  /** Custom value style */
  valueStyle?: React.CSSProperties;
}

export interface OrderCardProps {
  /** Array of order detail rows */
  rows: OrderRowProps[];
  /** Section background color */
  backgroundColor?: string;
  /** Card background color */
  cardBackgroundColor?: string;
  /** Card width */
  cardWidth?: number;
  /** Card border radius */
  cardBorderRadius?: string;
  /** Divider color between rows */
  dividerColor?: string;
  /** Padding for the section */
  deskPadding?: string;
  /** Row padding */
  rowPadding?: string;
  /** Custom styles */
  styles?: {
    label?: React.CSSProperties;
    value?: React.CSSProperties;
  };
}

// ============================================================================
// STYLES
// ============================================================================

const defaultStyles = {
  label: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    fontSize: '14px',
    lineHeight: '20px',
    color: '#cccccc',
  } as React.CSSProperties,
  value: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    fontSize: '14px',
    lineHeight: '20px',
    color: '#ffffff',
  } as React.CSSProperties,
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const OrderCard: React.FC<OrderCardProps> = ({
  rows,
  backgroundColor = '#ffffff',
  cardBackgroundColor = '#333333',
  cardWidth = 520,
  cardBorderRadius = '8px',
  dividerColor = '#555555',
  deskPadding = '20px 40px 20px 40px',
  rowPadding = '16px 20px',
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
            width={cardWidth}
            cellPadding={0}
            cellSpacing={0}
            className={EDM_CLASS.fluid}
            style={{
              width: `${cardWidth}px`,
              borderRadius: cardBorderRadius,
              backgroundColor: cardBackgroundColor,
            }}
            role="presentation"
          >
            {rows.map((row, index) => (
              <React.Fragment key={index}>
                <tr>
                  <td
                    align="left"
                    valign="middle"
                    style={{
                      padding: rowPadding,
                      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                    }}
                  >
                    <table
                      width="100%"
                      cellPadding={0}
                      cellSpacing={0}
                      className={EDM_CLASS.stackRow}
                      role="presentation"
                    >
                      <tr>
                        <td
                          width="50%"
                          align="left"
                          valign="top"
                          className={EDM_CLASS.stackCellLeft}
                          {...rowsSel}
                          style={{
                            width: '50%',
                            ...defaultStyles.label,
                            ...styles.label,
                            ...row.labelStyle,
                          }}
                          dangerouslySetInnerHTML={{ __html: row.label }}
                        />
                        <td
                          width="50%"
                          align="right"
                          valign="top"
                          className={EDM_CLASS.stackCellLeft}
                          {...rowsSel}
                          style={{
                            width: '50%',
                            textAlign: 'right',
                            ...defaultStyles.value,
                            ...styles.value,
                            ...row.valueStyle,
                          }}
                          dangerouslySetInnerHTML={{ __html: row.value }}
                        />
                      </tr>
                    </table>
                  </td>
                </tr>
                {index < rows.length - 1 && (
                  <tr>
                    <td align="center" style={{ padding: '0 20px' }}>
                      <table
                        width="100%"
                        cellPadding={0}
                        cellSpacing={0}
                        role="presentation"
                        style={{ backgroundColor: dividerColor }}
                      >
                        <tr>
                          <td
                            style={{
                              height: '1px',
                              fontSize: '1px',
                              lineHeight: '1px',
                            }}
                          >
                            &nbsp;
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </table>
        </td>
      </tr>
    </table>
  );
};

export default OrderCard;
