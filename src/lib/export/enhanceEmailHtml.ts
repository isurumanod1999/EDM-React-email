import { EMAIL_RESPONSIVE_CSS } from '@/lib/email/responsive';

const EMAIL_CLIENT_RESET_CSS = `
  body, table, td, p, a, li, blockquote {
    -webkit-text-size-adjust: 100%;
    -ms-text-size-adjust: 100%;
  }
  table, td {
    mso-table-lspace: 0pt;
    mso-table-rspace: 0pt;
  }
  img {
    -ms-interpolation-mode: bicubic;
    border: 0;
    outline: none;
    text-decoration: none;
    display: block;
  }
  body {
    margin: 0 !important;
    padding: 0 !important;
    width: 100% !important;
    height: 100% !important;
  }
  a[x-apple-data-detectors] {
    color: inherit !important;
    text-decoration: none !important;
  }
`;

const EMAIL_CLIENT_META = `
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no" />
`;

/** Add cross-client meta tags and resets for exported / uploaded HTML */
export function enhanceEmailHtml(html: string): string {
  let output = html.trim();

  if (!/<!DOCTYPE\s+html/i.test(output)) {
    output = `<!DOCTYPE html>\n${output}`;
  }

  if (!/charset\s*=/i.test(output)) {
    output = output.replace(/<head([^>]*)>/i, `<head$1>\n<meta charset="utf-8" />`);
  }

  if (!/viewport/i.test(output)) {
    output = output.replace(/<head([^>]*)>/i, `<head$1>${EMAIL_CLIENT_META}`);
  }

  const needsReset = !/mso-table-lspace/i.test(output);
  const needsResponsive = !/edm-wrapper/i.test(output);

  if (needsReset || needsResponsive) {
    const extraStyles = [
      needsReset ? EMAIL_CLIENT_RESET_CSS : '',
      needsResponsive ? EMAIL_RESPONSIVE_CSS : '',
    ]
      .filter(Boolean)
      .join('\n');

    if (/<style[\s>]/i.test(output)) {
      output = output.replace(/<\/style>/i, `${extraStyles}\n</style>`);
    } else {
      output = output.replace(
        /<head([^>]*)>/i,
        `<head$1>\n<style type="text/css">${extraStyles}\n</style>`
      );
    }
  }

  return output;
}
