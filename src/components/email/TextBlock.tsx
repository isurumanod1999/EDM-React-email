import * as React from 'react';
import { EDM_CLASS } from '@/lib/email/responsive';
import { useSelectable } from '@/builder/preview/PreviewEditContext';

export interface TextBlockProps {
  content: string;
  backgroundColor?: string;
  deskPadding?: string;
  textAlign?: 'left' | 'center' | 'right';
  fontSize?: string;
  lineHeight?: string;
  color?: string;
}

export const TextBlock: React.FC<TextBlockProps> = ({
  content,
  backgroundColor = '#ffffff',
  deskPadding = '20px 40px',
  textAlign = 'left',
  fontSize = '16px',
  lineHeight = '26px',
  color = '#333333',
}) => {
  const contentSel = useSelectable('content');
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
            lineHeight,
            color,
          }}
          {...contentSel}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </tr>
    </table>
  );
};

export default TextBlock;
