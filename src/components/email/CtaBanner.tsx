import * as React from 'react';
import { EDM_CLASS } from '@/lib/email/responsive';
import { useSelectable } from '@/builder/preview/PreviewEditContext';

export interface CtaBannerProps {
  headline: string;
  subtext?: string;
  buttonText: string;
  buttonUrl: string;
  backgroundColor?: string;
  headlineColor?: string;
  subtextColor?: string;
  buttonBackgroundColor?: string;
  buttonTextColor?: string;
  deskPadding?: string;
}

export const CtaBanner: React.FC<CtaBannerProps> = ({
  headline,
  subtext,
  buttonText,
  buttonUrl,
  backgroundColor = '#000000',
  headlineColor = '#ffffff',
  subtextColor = '#cccccc',
  buttonBackgroundColor = '#ffffff',
  buttonTextColor = '#000000',
  deskPadding = '40px',
}) => {
  const fontFamily =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  const headlineSel = useSelectable('headline');
  const subtextSel = useSelectable('subtext');
  const buttonSel = useSelectable('buttonText');

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
        <td align="center" valign="top" className={EDM_CLASS.pad} style={{ padding: deskPadding, fontFamily }}>
          <p
            {...headlineSel}
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: headlineColor,
              margin: '0 0 10px 0',
              textTransform: 'uppercase',
              letterSpacing: '2px',
            }}
          >
            {headline}
          </p>
          {subtext && (
            <p
              {...subtextSel}
              style={{
                fontSize: '16px',
                color: subtextColor,
                margin: '0 0 25px 0',
              }}
            >
              {subtext}
            </p>
          )}
          <a
            href={buttonUrl}
            className={EDM_CLASS.cta}
            {...buttonSel}
            style={{
              display: 'inline-block',
              fontFamily,
              fontSize: '14px',
              fontWeight: 600,
              color: buttonTextColor,
              backgroundColor: buttonBackgroundColor,
              padding: '16px 40px',
              textDecoration: 'none',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              maxWidth: '100%',
              boxSizing: 'border-box',
            }}
          >
            {buttonText}
          </a>
        </td>
      </tr>
    </table>
  );
};

export default CtaBanner;
