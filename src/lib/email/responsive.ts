import type { CSSProperties } from 'react';

/**
 * Shared responsive class names and CSS for 600px email templates.
 * Include <EmailResponsiveHead /> once per email document.
 */
export const EDM_CLASS = {
  wrapper: 'edm-wrapper',
  fluid: 'edm-fluid',
  pad: 'edm-pad',
  colDrop: 'edm-col-drop',
  colHide: 'edm-col-hide',
  imgFluid: 'edm-img-fluid',
  cta: 'edm-cta',
  stackRow: 'edm-stack-row',
  stackCell: 'edm-stack-cell',
  stackCellLeft: 'edm-stack-cell-left',
  footerStack: 'edm-footer-stack',
  clearfix: 'edm-clearfix',
  deskImg: 'edm-desk-img',
  mobImg: 'edm-mob-img',
} as const;

export const EMAIL_RESPONSIVE_CSS = `
  .${EDM_CLASS.deskImg} {
    display: block !important;
    max-height: none !important;
    overflow: visible !important;
  }
  .${EDM_CLASS.mobImg} {
    display: none !important;
    max-height: 0 !important;
    overflow: hidden !important;
    mso-hide: all;
  }
  @media only screen and (max-width: 600px) {
    .${EDM_CLASS.deskImg} {
      display: none !important;
      max-height: 0 !important;
      overflow: hidden !important;
      mso-hide: all;
    }
    .${EDM_CLASS.mobImg} {
      display: block !important;
      max-height: none !important;
      overflow: visible !important;
      width: 100% !important;
      max-width: 100% !important;
      height: auto !important;
    }
    .${EDM_CLASS.wrapper} {
      width: 100% !important;
      max-width: 100% !important;
    }
    .${EDM_CLASS.fluid} {
      width: 100% !important;
      max-width: 100% !important;
    }
    .${EDM_CLASS.pad} {
      padding-left: 20px !important;
      padding-right: 20px !important;
    }
    .${EDM_CLASS.colDrop} {
      display: block !important;
      width: 100% !important;
      max-width: 100% !important;
      float: none !important;
    }
    .${EDM_CLASS.colHide} {
      display: none !important;
      width: 0 !important;
      max-height: 0 !important;
      overflow: hidden !important;
      mso-hide: all;
    }
    .${EDM_CLASS.imgFluid} {
      width: 100% !important;
      max-width: 100% !important;
      height: auto !important;
    }
    .${EDM_CLASS.cta} {
      display: block !important;
      width: 100% !important;
      max-width: 100% !important;
      box-sizing: border-box !important;
      margin-left: 0 !important;
      margin-right: 0 !important;
    }
    .${EDM_CLASS.stackRow},
    .${EDM_CLASS.stackRow} > tbody,
    .${EDM_CLASS.stackRow} > tr {
      display: block !important;
      width: 100% !important;
    }
    .${EDM_CLASS.stackCell} {
      display: block !important;
      width: 100% !important;
      max-width: 100% !important;
      text-align: center !important;
      padding-top: 10px !important;
    }
    .${EDM_CLASS.stackCell}:first-child {
      padding-top: 0 !important;
    }
    .${EDM_CLASS.stackCellLeft} {
      display: block !important;
      width: 100% !important;
      max-width: 100% !important;
      text-align: left !important;
      padding-top: 8px !important;
    }
    .${EDM_CLASS.stackCellLeft}:first-child {
      padding-top: 0 !important;
    }
    .${EDM_CLASS.colDrop} td {
      text-align: center !important;
    }
    .${EDM_CLASS.footerStack} {
      display: block !important;
      width: 100% !important;
      max-width: 100% !important;
      text-align: center !important;
      padding-bottom: 16px !important;
    }
    .${EDM_CLASS.clearfix} {
      display: block !important;
      width: 100% !important;
      clear: both !important;
      height: 0 !important;
      line-height: 0 !important;
      font-size: 0 !important;
    }
  }
`;

/** Inline image styles that scale down on narrow viewports when paired with edm-img-fluid */
export function fluidImgStyle(width: number, extra?: CSSProperties): CSSProperties {
  return {
    display: 'block',
    width: `${width}px`,
    maxWidth: '100%',
    height: 'auto',
    ...extra,
  };
}

export type { ResponsiveImgProps } from './ResponsiveImg';
