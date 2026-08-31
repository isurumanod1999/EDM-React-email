import * as React from 'react';
import { EDM_CLASS } from '@/lib/email/responsive';
import { useSelectable } from '@/builder/preview/PreviewEditContext';

export interface SectionTitleProps {
  title: string;
  backgroundColor?: string;
  deskPadding?: string;
  textAlign?: 'left' | 'center' | 'right';
  fontSize?: string;
  fontWeight?: number;
  color?: string;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  letterSpacing?: string;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({
  title,
  backgroundColor = '#f7f8f8',
  deskPadding = '30px 40px 15px 40px',
  textAlign = 'center',
  fontSize = '24px',
  fontWeight = 700,
  color = '#000000',
  textTransform = 'uppercase',
  letterSpacing = '2px',
}) => {
  const titleSel = useSelectable('title');
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
        <td
          align={textAlign}
          valign="top"
          className={EDM_CLASS.pad}
          style={{
            padding: deskPadding,
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
            fontSize,
            fontWeight,
            color,
            textTransform,
            letterSpacing,
          }}
          {...titleSel}
        >
          {title}
        </td>
      </tr>
    </table>
  );
};

export default SectionTitle;
