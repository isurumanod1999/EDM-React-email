import * as React from 'react';
import {
  Html,
  Body,
  Container,
  Preview,
  Img,
} from '@react-email/components';
import { IntroCopy, TwoColDualCta, TwoColStacked, Footer, EmailResponsiveHead } from '@/components/email';
import { EDM_CLASS, fluidImgStyle } from '@/lib/email/responsive';

import { NISSAN_IMAGES, NISSAN_COLORS, NISSAN_ICONS, NISSAN_SOCIAL_ICONS } from '@/lib/constants/nissanAssets';

/**
 * Complete Nissan Email Template
 * Includes header, intro, products, and footer
 */
export const CompleteEmail: React.FC = () => {
  return (
    <Html>
      <EmailResponsiveHead />
      <Preview>Nissan MORE - Up to 10 Years of Warranty on Selected Models</Preview>
      <Body style={{ backgroundColor: '#f4f4f4', margin: 0, padding: 0 }}>
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
              <td align="center" valign="middle" className={EDM_CLASS.pad} style={{ padding: '25px 40px' }}>
                <Img
                  src={NISSAN_IMAGES.logo}
                  width={250}
                  alt="Nissan Motor Corporation"
                  className={EDM_CLASS.imgFluid}
                  style={fluidImgStyle(250)}
                />
              </td>
            </tr>
          </table>

          {/* Nissan MORE Banner */}
          <table
            width={600}
            cellPadding={0}
            cellSpacing={0}
            className={EDM_CLASS.wrapper}
            style={{ width: '600px', backgroundColor: '#000000' }}
            role="presentation"
          >
            <tr>
              <td align="center" valign="top">
                <Img
                  src={NISSAN_IMAGES.moreBanner}
                  width={600}
                  alt="Nissan MORE - Up to 10 Years of Warranty"
                  className={EDM_CLASS.imgFluid}
                  style={fluidImgStyle(600)}
                />
              </td>
            </tr>
          </table>

          {/* Intro Copy Section */}
          <IntroCopy
            backgroundColor="#ffffff"
            deskPadding="30px 40px 20px 40px"
            textAlign="left"
            greeting="Dear Valued Customer,"
            body="Experience the ultimate peace of mind with <strong>Nissan MORE</strong>. For a limited time, enjoy up to <strong>10 years of warranty</strong> on selected Nissan models. Discover our range of innovative vehicles designed to exceed your expectations."
            greetingStyle={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#000000',
            }}
            bodyStyle={{
              fontSize: '16px',
              lineHeight: '26px',
              color: '#333333',
            }}
          />

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
                  padding: '30px 40px 10px 40px',
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                  fontSize: '24px',
                  fontWeight: 700,
                  color: '#000000',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                }}
              >
                Featured Vehicles
              </td>
            </tr>
          </table>

          {/* Two Column Dual CTA Products */}
          <TwoColDualCta
            backgroundColor="#f7f8f8"
            deskPadding="20px 40px"
            gutterWidth={20}
            cardBorderRadius="0px"
            textAlign="center"
            rows={[
              {
                product1: {
                  headerTitle: 'Qashqai',
                  headerSubtitle: 'CROSSOVER',
                  imgSrc: NISSAN_IMAGES.qashqai,
                  imgWidth: 250,
                  altText: 'Nissan Qashqai',
                  url: 'https://www.nissan.com/qashqai',
                  labelText: 'FROM AUD 89,900',
                  title: 'Nissan Qashqai',
                  subtitle: 'Bold design meets smart technology',
                  cta1Text: 'GET QUOTE',
                  cta2Text: 'TEST DRIVE',
                  backgroundColor: '#ffffff',
                  width: 250,
                },
                product2: {
                  headerTitle: 'Patrol',
                  headerSubtitle: 'FULL-SIZE SUV',
                  imgSrc: NISSAN_IMAGES.patrol,
                  imgWidth: 250,
                  altText: 'Nissan Patrol',
                  url: 'https://www.nissan.com/patrol',
                  labelText: 'FROM AUD 199,900',
                  title: 'Nissan Patrol',
                  subtitle: 'Legendary power and luxury',
                  cta1Text: 'GET QUOTE',
                  cta2Text: 'TEST DRIVE',
                  backgroundColor: '#ffffff',
                  width: 250,
                },
              },
            ]}
            styles={{
              headerSubtitle: { color: '#c3002f', fontWeight: 600 },
              label: { color: '#c3002f', fontWeight: 700 },
              cta1: { borderRadius: '0px', border: '2px solid #000000' },
              cta2: { borderRadius: '0px' },
            }}
          />

          {/* Section Divider */}
          <table
            width={600}
            cellPadding={0}
            cellSpacing={0}
            style={{ width: '600px', backgroundColor: '#f7f8f8' }}
            role="presentation"
          >
            <tr>
              <td
                align="center"
                valign="top"
                style={{
                  padding: '20px 40px 10px 40px',
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                  fontSize: '24px',
                  fontWeight: 700,
                  color: '#000000',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                }}
              >
                More Models
              </td>
            </tr>
          </table>

          {/* Two Column Stacked Products */}
          <TwoColStacked
            backgroundColor="#f7f8f8"
            deskPadding="20px 40px 30px 40px"
            gutterWidth={20}
            rows={[
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
              price: { color: '#c3002f', fontWeight: 700 },
              cta: { borderRadius: '0px', backgroundColor: '#000000', color: '#ffffff' },
            }}
          />

          {/* Footer */}
          <Footer
            backgroundColor="#1a1a1a"
            logoSrc={NISSAN_IMAGES.logo}
            logoWidth={150}
            logoAlt="Nissan"
            logoUrl="https://www.nissan.com"
            socialTitle="Connect with us"
            socialLinks={[
              { platform: 'facebook', url: 'https://facebook.com/nissan', iconUrl: NISSAN_SOCIAL_ICONS.facebook },
              { platform: 'instagram', url: 'https://instagram.com/nissan', iconUrl: NISSAN_SOCIAL_ICONS.instagram },
              { platform: 'youtube', url: 'https://youtube.com/nissan', iconUrl: NISSAN_SOCIAL_ICONS.youtube },
            ]}
            socialIconSize={24}
            showDivider={true}
            dividerColor="#333333"
            legalText="*Nissan MORE warranty offer valid on selected models. Terms and conditions apply."
            showLinks={true}
            preferencesUrl="https://www.nissan.com/preferences"
            unsubscribeUrl="https://www.nissan.com/unsubscribe"
            privacyUrl="https://www.nissan.com/privacy"
            linkColor="#ffffff"
            address="Nissan Motor Corporation"
            copyright="© 2026 Nissan Motor Corporation. All rights reserved."
          />

        </Container>
      </Body>
    </Html>
  );
};

export default CompleteEmail;
