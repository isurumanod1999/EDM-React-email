import * as React from 'react';
import { Link } from '@react-email/components';
import { EDM_CLASS } from '@/lib/email/responsive';
import { useSelectable } from '@/builder/preview/PreviewEditContext';

export interface ButtonRowProps {
  primaryText: string;
  primaryUrl: string;
  secondaryText?: string;
  secondaryUrl?: string;
  backgroundColor?: string;
  deskPadding?: string;
  align?: 'left' | 'center' | 'right';
  primaryBackgroundColor?: string;
  primaryTextColor?: string;
  primaryBorder?: string;
  secondaryBackgroundColor?: string;
  secondaryTextColor?: string;
  secondaryBorder?: string;
  buttonBorderRadius?: string;
}

export const ButtonRow: React.FC<ButtonRowProps> = ({
  primaryText,
  primaryUrl,
  secondaryText,
  secondaryUrl,
  backgroundColor = '#ffffff',
  deskPadding = '24px 40px',
  align = 'center',
  primaryBackgroundColor = '#000000',
  primaryTextColor = '#ffffff',
  primaryBorder = '2px solid #000000',
  secondaryBackgroundColor = '#ffffff',
  secondaryTextColor = '#000000',
  secondaryBorder = '2px solid #000000',
  buttonBorderRadius = '4px',
}) => {
  const primarySel = useSelectable('primaryText');
  const secondarySel = useSelectable('secondaryText');
  const fontFamily =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  const buttonBase: React.CSSProperties = {
    display: 'inline-block',
    fontFamily,
    fontSize: '14px',
    fontWeight: 600,
    padding: '14px 28px',
    textDecoration: 'none',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderRadius: buttonBorderRadius,
    margin: '0 6px 8px 6px',
    maxWidth: '100%',
    boxSizing: 'border-box',
  };

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
        <td align={align} valign="top" className={EDM_CLASS.pad} style={{ padding: deskPadding }}>
          <Link
            href={primaryUrl}
            className={EDM_CLASS.cta}
            {...primarySel}
            style={{
              ...buttonBase,
              color: primaryTextColor,
              backgroundColor: primaryBackgroundColor,
              border: primaryBorder,
            }}
          >
            {primaryText}
          </Link>
          {secondaryText && secondaryUrl && (
            <Link
              href={secondaryUrl}
              className={EDM_CLASS.cta}
              {...secondarySel}
              style={{
                ...buttonBase,
                color: secondaryTextColor,
                backgroundColor: secondaryBackgroundColor,
                border: secondaryBorder,
              }}
            >
              {secondaryText}
            </Link>
          )}
        </td>
      </tr>
    </table>
  );
};

export default ButtonRow;
