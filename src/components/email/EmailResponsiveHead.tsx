import * as React from 'react';
import { Head } from '@react-email/components';
import { EMAIL_RESPONSIVE_CSS } from '@/lib/email/responsive';

/** Inject responsive CSS — include once in each email <Html> document */
export function EmailResponsiveHead({ extraCss }: { extraCss?: string } = {}): React.ReactElement {
  return (
    <Head>
      <style>{EMAIL_RESPONSIVE_CSS}</style>
      {/* Per-block Figma responsive rules, hoisted here into the document <head>
          so mobile media queries (font scaling, column stacking) apply reliably
          in email clients — a <style> nested in <body> is dropped by many. */}
      {extraCss ? <style>{extraCss}</style> : null}
    </Head>
  );
}

export default EmailResponsiveHead;
