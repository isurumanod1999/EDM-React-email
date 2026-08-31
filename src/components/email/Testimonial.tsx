import * as React from 'react';
import { Img } from '@react-email/components';
import { EDM_CLASS } from '@/lib/email/responsive';
import { useSelectable } from '@/builder/preview/PreviewEditContext';

export interface TestimonialProps {
  quote: string;
  authorName: string;
  authorTitle?: string;
  avatarSrc?: string;
  avatarWidth?: number;
  backgroundColor?: string;
  cardBackgroundColor?: string;
  cardBorder?: string;
  cardBorderRadius?: string;
  deskPadding?: string;
  quoteColor?: string;
  authorColor?: string;
  titleColor?: string;
}

export const Testimonial: React.FC<TestimonialProps> = ({
  quote,
  authorName,
  authorTitle,
  avatarSrc,
  avatarWidth = 56,
  backgroundColor = '#f7f8f8',
  cardBackgroundColor = '#ffffff',
  cardBorder = '1px solid #e5e5e5',
  cardBorderRadius = '8px',
  deskPadding = '24px 40px',
  quoteColor = '#333333',
  authorColor = '#000000',
  titleColor = '#666666',
}) => {
  const fontFamily =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  const quoteSel = useSelectable('quote');
  const avatarSel = useSelectable('avatarSrc');
  const nameSel = useSelectable('authorName');
  const titleSel = useSelectable('authorTitle');

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
        <td align="center" valign="top" className={EDM_CLASS.pad} style={{ padding: deskPadding }}>
          <table
            width={520}
            cellPadding={0}
            cellSpacing={0}
            className={EDM_CLASS.fluid}
            style={{
              width: '520px',
              backgroundColor: cardBackgroundColor,
              border: cardBorder,
              borderRadius: cardBorderRadius,
            }}
            role="presentation"
          >
            <tr>
              <td style={{ padding: '28px 24px', fontFamily }}>
                <p
                  {...quoteSel}
                  style={{
                    margin: '0 0 20px 0',
                    fontSize: '18px',
                    lineHeight: '28px',
                    fontStyle: 'italic',
                    color: quoteColor,
                  }}
                  dangerouslySetInnerHTML={{ __html: quote }}
                />
                <table cellPadding={0} cellSpacing={0} className={EDM_CLASS.stackRow} role="presentation">
                  <tr>
                    {avatarSrc && (
                      <td valign="middle" className={EDM_CLASS.stackCell} style={{ paddingRight: '14px' }}>
                        <Img
                          src={avatarSrc}
                          width={avatarWidth}
                          height={avatarWidth}
                          alt={authorName}
                          {...avatarSel}
                          style={{
                            display: 'block',
                            width: `${avatarWidth}px`,
                            height: `${avatarWidth}px`,
                            borderRadius: '50%',
                          }}
                        />
                      </td>
                    )}
                    <td valign="middle" className={EDM_CLASS.stackCell}>
                      <p
                        {...nameSel}
                        style={{
                          margin: 0,
                          fontSize: '15px',
                          fontWeight: 700,
                          color: authorColor,
                        }}
                      >
                        {authorName}
                      </p>
                      {authorTitle && (
                        <p
                          {...titleSel}
                          style={{
                            margin: '4px 0 0 0',
                            fontSize: '13px',
                            color: titleColor,
                          }}
                        >
                          {authorTitle}
                        </p>
                      )}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  );
};

export default Testimonial;
