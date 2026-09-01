import * as React from 'react';
import { Link } from '@react-email/components';
import { EDM_CLASS } from '@/lib/email/responsive';
import { ResponsiveImg } from '@/lib/email/ResponsiveImg';
import { useSelectable } from '@/builder/preview/PreviewEditContext';

export interface ImageBlockProps {
  imgSrc: string;
  mobileSrc?: string;
  imgWidth?: number;
  imgHeight?: number;
  altText?: string;
  url?: string;
  backgroundColor?: string;
  deskPadding?: string;
  align?: 'left' | 'center' | 'right';
  imgBorderRadius?: string;
}

export const ImageBlock: React.FC<ImageBlockProps> = ({
  imgSrc,
  mobileSrc,
  imgWidth = 520,
  imgHeight,
  altText = 'Image',
  url,
  backgroundColor = '#ffffff',
  deskPadding = '20px 40px',
  align = 'center',
  imgBorderRadius = '0px',
}) => {
  const imgSel = useSelectable('imgSrc');
  const image = (
    <ResponsiveImg
      deskSrc={imgSrc}
      mobSrc={mobileSrc}
      width={imgWidth}
      height={imgHeight}
      alt={altText}
      style={{ borderRadius: imgBorderRadius }}
      selectAttrs={imgSel}
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
        <td align={align} valign="top" className={EDM_CLASS.pad} style={{ padding: deskPadding }}>
          {url ? (
            <Link href={url} target="_blank">
              {image}
            </Link>
          ) : (
            image
          )}
        </td>
      </tr>
    </table>
  );
};

export default ImageBlock;
