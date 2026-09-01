import * as React from 'react';
import { Img, Link } from '@react-email/components';
import { EDM_CLASS, fluidImgStyle } from '@/lib/email/responsive';
import { useSelectable } from '@/builder/preview/PreviewEditContext';

export interface HeaderProps {
  logoSrc: string;
  logoWidth?: number;
  logoHeight?: number;
  logoAlt?: string;
  logoUrl?: string;
  backgroundColor?: string;
  deskPadding?: string;
  align?: 'left' | 'center' | 'right';
}

export const Header: React.FC<HeaderProps> = ({
  logoSrc,
  logoWidth = 200,
  logoHeight,
  logoAlt = 'Logo',
  logoUrl,
  backgroundColor = '#ffffff',
  deskPadding = '25px 40px',
  align = 'center',
}) => {
  const logoSel = useSelectable('logoSrc');
  const img = (
    <Img
      src={logoSrc}
      width={logoWidth}
      height={logoHeight}
      alt={logoAlt}
      className={EDM_CLASS.imgFluid}
      style={fluidImgStyle(logoWidth, {
        height: logoHeight ? `${logoHeight}px` : 'auto',
      })}
      {...logoSel}
    />
  );

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
        <td align={align} valign="middle" className={EDM_CLASS.pad} style={{ padding: deskPadding }}>
          {logoUrl ? (
            <Link href={logoUrl} target="_blank">
              {img}
            </Link>
          ) : (
            img
          )}
        </td>
      </tr>
    </table>
  );
};

export default Header;
