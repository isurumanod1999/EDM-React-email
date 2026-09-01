import * as React from 'react';
import {
  Html,
  Body,
  Container,
  Preview,
  Img,
} from '@react-email/components';
import { TwoColStacked, EmailResponsiveHead } from '@/components/email';
import { EDM_CLASS, fluidImgStyle } from '@/lib/email/responsive';

import { NISSAN_IMAGES } from '@/lib/constants/nissanAssets';

/**
 * Nissan Two Column Stacked Email
 * Features Nissan vehicles with prices and CTAs
 */
export const TwoColStackedEmail: React.FC = () => {
  return (
    <Html>
      <EmailResponsiveHead />
      <Preview>Explore Nissan&apos;s Range - From AUD 89,900</Preview>
      <Body style={{ backgroundColor: '#f4f4f4', margin: 0, padding: '20px 0' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto' }}>
          
          {/* Nissan Logo Header */}
          <table
            width={600}
            cellPadding={0}
            cellSpacing={0}
            className={EDM_CLASS.wrapper}
            style={{ width: '600px', backgroundColor: '#ffffff' }}
            role="presentation"
          >
            <tr>
              <td align="center" valign="middle" className={EDM_CLASS.pad} style={{ padding: '20px 40px' }}>
                <Img
                  src={NISSAN_IMAGES.logo}
                  width={200}
                  alt="Nissan Motor Corporation"
                  className={EDM_CLASS.imgFluid}
                  style={fluidImgStyle(200)}
                />
              </td>
            </tr>
          </table>

          {/* Section Title */}
          <table
            width={600}
            cellPadding={0}
            cellSpacing={0}
            className={EDM_CLASS.wrapper}
            style={{ width: '600px', backgroundColor: '#f7f8f8' }}
            role="presentation"
          >
            <tr>
              <td
                align="center"
                valign="top"
                className={EDM_CLASS.pad}
                style={{
                  padding: '30px 40px 15px 40px',
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                  fontSize: '24px',
                  fontWeight: 700,
                  color: '#000000',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                }}
              >
                Explore Our Range
              </td>
            </tr>
          </table>

          <TwoColStacked
            backgroundColor="#f7f8f8"
            deskPadding="10px 40px"
            gutterWidth={20}
            rows={[
              {
                product1: {
                  deskImgSrc: NISSAN_IMAGES.qashqai,
                  imgWidth: 250,
                  altText: 'Nissan Qashqai',
                  url: 'https://www.nissan.com/qashqai',
                  title: 'Nissan Qashqai',
                  subtitle: 'Bold design meets smart technology',
                  price: 'From AUD 89,900',
                  ctaText: 'EXPLORE NOW',
                  ctaUrl: 'https://www.nissan.com/qashqai',
                  backgroundColor: '#ffffff',
                  width: 250,
                },
                product2: {
                  deskImgSrc: NISSAN_IMAGES.patrol,
                  imgWidth: 250,
                  altText: 'Nissan Patrol',
                  url: 'https://www.nissan.com/patrol',
                  title: 'Nissan Patrol',
                  subtitle: 'Legendary power and luxury',
                  price: 'From AUD 199,900',
                  ctaText: 'EXPLORE NOW',
                  ctaUrl: 'https://www.nissan.com/patrol',
                  backgroundColor: '#ffffff',
                  width: 250,
                },
              },
              {
                product1: {
                  deskImgSrc: NISSAN_IMAGES.ariya,
                  imgWidth: 250,
                  altText: 'Nissan Ariya',
                  url: 'https://www.nissan.com/ariya',
                  title: 'Nissan Ariya',
                  subtitle: '100% Electric. 100% Nissan.',
                  price: 'From AUD 179,900',
                  ctaText: 'EXPLORE NOW',
                  backgroundColor: '#ffffff',
                  width: 250,
                },
                product2: {
                  deskImgSrc: NISSAN_IMAGES.xtrail,
                  imgWidth: 250,
                  altText: 'Nissan X-Trail',
                  url: 'https://www.nissan.com/xtrail',
                  title: 'Nissan X-Trail',
                  subtitle: 'Adventure-ready family SUV',
                  price: 'From AUD 119,900',
                  ctaText: 'EXPLORE NOW',
                  backgroundColor: '#ffffff',
                  width: 250,
                },
              },
            ]}
            styles={{
              title: {
                fontSize: '18px',
                color: '#000000',
                fontWeight: 700,
              },
              subtitle: {
                fontSize: '14px',
                color: '#666666',
              },
              price: {
                fontSize: '18px',
                color: '#c3002f',
                fontWeight: 700,
              },
              cta: {
                borderRadius: '0px',
                backgroundColor: '#000000',
                color: '#ffffff',
                border: '2px solid #000000',
              },
            }}
          />
        </Container>
      </Body>
    </Html>
  );
};

export default TwoColStackedEmail;
