import * as React from 'react';
import { Img } from '@react-email/components';
import type { CSSProperties } from 'react';
import { EDM_CLASS, fluidImgStyle } from './responsive';

export interface ResponsiveImgProps {
  deskSrc: string;
  mobSrc?: string;
  width: number;
  height?: number;
  alt?: string;
  style?: CSSProperties;
  className?: string;
  selectAttrs?: Record<string, string>;
}

/** Swaps desktop/mobile image at 600px breakpoint when mobSrc is provided */
export const ResponsiveImg: React.FC<ResponsiveImgProps> = ({
  deskSrc,
  mobSrc,
  width,
  height,
  alt = '',
  style,
  className,
  selectAttrs,
}) => {
  const imgClass = `${EDM_CLASS.imgFluid}${className ? ` ${className}` : ''}`;
  const imgStyle = fluidImgStyle(width, {
    height: height ? `${height}px` : 'auto',
    ...style,
  });

  if (!mobSrc || mobSrc === deskSrc) {
    return (
      <Img
        src={deskSrc}
        width={width}
        height={height}
        alt={alt}
        className={imgClass}
        style={imgStyle}
        {...selectAttrs}
      />
    );
  }

  return (
    <>
      <Img
        src={deskSrc}
        width={width}
        height={height}
        alt={alt}
        className={`${EDM_CLASS.deskImg} ${imgClass}`}
        style={imgStyle}
        {...selectAttrs}
      />
      <Img
        src={mobSrc}
        width={width}
        height={height}
        alt={alt}
        className={`${EDM_CLASS.mobImg} ${imgClass}`}
        style={imgStyle}
        {...selectAttrs}
      />
    </>
  );
};
