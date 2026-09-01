import * as React from 'react';
import {
  Html,
  Body,
  Container,
  Preview,
  Img,
} from '@react-email/components';

import {
  IntroCopy,
  TwoColDualCta,
  TwoColStacked,
  ThreeColIcon,
  PromoBlock,
  Footer,
  EmailResponsiveHead,
} from '@/components/email';
import { EDM_CLASS, fluidImgStyle } from '@/lib/email/responsive';

/**
 * Nissan Email Template
 * Features Nissan vehicles with the Nissan MORE offer
 * 
 * IMAGE PATHS - Replace these with your hosted image URLs:
 * - NISSAN_LOGO: Nissan Motor Corporation logo
 * - NISSAN_MORE_BANNER: "10 Years Warranty" promotional banner
 * - NISSAN_QASHQAI: Blue Nissan Qashqai side view
 * - NISSAN_PATROL: Gray Nissan Patrol side view
 * - NISSAN_ARIYA: Dark blue/green Nissan Ariya side view
 * - NISSAN_XTRAIL: Red Nissan X-Trail side view
 */

import {
  NISSAN_IMAGES,
  NISSAN_COLORS,
  NISSAN_ICONS,
  NISSAN_SOCIAL_ICONS,
} from '@/lib/constants/nissanAssets';

export const NissanEmail: React.FC = () => {
  return (
    <Html>
      <EmailResponsiveHead />
      <Preview>Discover Nissan MORE - Up to 10 Years of Warranty on Selected Models</Preview>
      <Body style={{ backgroundColor: '#e5e5e5', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto' }}>
          
          {/* HEADER WITH NISSAN LOGO */}
          <table
            width={600}
            cellPadding={0}
            cellSpacing={0}
            className={EDM_CLASS.wrapper}
            style={{ width: '600px', backgroundColor: NISSAN_COLORS.white }}
            role="presentation"
          >
            <tr>
              <td align="center" valign="middle" className={EDM_CLASS.pad} style={{ padding: '30px 40px' }}>
                <Img
                  src={NISSAN_IMAGES.logo}
                  width={280}
                  alt="Nissan Motor Corporation"
                  className={EDM_CLASS.imgFluid}
                  style={fluidImgStyle(280)}
                />
              </td>
            </tr>
          </table>

          {/* NISSAN MORE PROMOTIONAL BANNER */}
          <table
            width={600}
            cellPadding={0}
            cellSpacing={0}
            className={EDM_CLASS.wrapper}
            style={{ width: '600px', backgroundColor: NISSAN_COLORS.black }}
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

          {/* ============================================ */}
          {/* INTRO COPY */}
          {/* ============================================ */}
          <IntroCopy
            backgroundColor={NISSAN_COLORS.white}
            deskPadding="30px 40px 20px 40px"
            textAlign="left"
            greeting="Dear Valued Customer,"
            body=" Hi Isuru Experience the ultimate peace of mind with <strong>Nissan MORE</strong>. For a limited time, enjoy up to <strong>10 years of warranty</strong> on selected Nissan models. Discover our range of innovative vehicles designed to exceed your expectations."
            greetingStyle={{
              fontSize: '18px',
              fontWeight: 700,
              color: NISSAN_COLORS.black,
            }}
            bodyStyle={{
              fontSize: '16px',
              lineHeight: '26px',
              color: NISSAN_COLORS.gray,
            }}
          />

          {/* ============================================ */}
          {/* SECTION TITLE - FEATURED VEHICLES */}
          {/* ============================================ */}
          <table
            width={600}
            cellPadding={0}
            cellSpacing={0}
            className={EDM_CLASS.wrapper}
            style={{ width: '600px', backgroundColor: NISSAN_COLORS.lightGray }}
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
                  color: NISSAN_COLORS.black,
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                }}
              >
                Our Featured Vehicles
              </td>
            </tr>
          </table>

          {/* ============================================ */}
          {/* TWO COL DUAL CTA - QASHQAI & PATROL */}
          {/* ============================================ */}
          <TwoColDualCta
            backgroundColor={NISSAN_COLORS.lightGray}
            deskPadding="10px 40px 20px 40px"
            gutterWidth={20}
            cardBorderRadius="0px"
            textAlign="center"
            rows={[
              {
                product1: {
                  headerTitle: 'All-New Qashqai',
                  headerSubtitle: 'CROSSOVER',
                  imgSrc: NISSAN_IMAGES.qashqai,
                  imgWidth: 250,
                  altText: 'Nissan Qashqai - Blue',
                  url: 'https://www.nissan.com/qashqai',
                  labelText: 'FROM AUD 89,900',
                  title: 'Nissan Qashqai',
                  subtitle: 'Bold design meets smart technology',
                  cta1Text: 'REQUEST A QUOTE',
                  cta1Url: 'https://www.nissan.com/quote/qashqai',
                  cta2Text: 'BOOK TEST DRIVE',
                  cta2Url: 'https://www.nissan.com/testdrive/qashqai',
                  backgroundColor: NISSAN_COLORS.white,
                  width: 250,
                },
                product2: {
                  headerTitle: 'Patrol',
                  headerSubtitle: 'FULL-SIZE SUV',
                  imgSrc: NISSAN_IMAGES.patrol,
                  imgWidth: 250,
                  altText: 'Nissan Patrol - Gray',
                  url: 'https://www.nissan.com/patrol',
                  labelText: 'FROM AUD 199,900',
                  title: 'Nissan Patrol',
                  subtitle: 'Legendary power and luxury',
                  cta1Text: 'REQUEST A QUOTE',
                  cta1Url: 'https://www.nissan.com/quote/patrol',
                  cta2Text: 'BOOK TEST DRIVE',
                  cta2Url: 'https://www.nissan.com/testdrive/patrol',
                  backgroundColor: NISSAN_COLORS.white,
                  width: 250,
                },
              },
            ]}
            styles={{
              headerTitle: {
                fontSize: '20px',
                fontWeight: 700,
                color: NISSAN_COLORS.black,
              },
              headerSubtitle: {
                color: NISSAN_COLORS.red,
                fontWeight: 600,
                letterSpacing: '1px',
              },
              label: {
                color: NISSAN_COLORS.red,
                fontWeight: 700,
              },
              title: {
                fontSize: '18px',
                color: NISSAN_COLORS.black,
              },
              cta1: {
                borderRadius: '0px',
                backgroundColor: NISSAN_COLORS.white,
                color: NISSAN_COLORS.black,
                border: `2px solid ${NISSAN_COLORS.black}`,
              },
              cta2: {
                borderRadius: '0px',
                backgroundColor: NISSAN_COLORS.black,
                color: NISSAN_COLORS.white,
                border: `2px solid ${NISSAN_COLORS.black}`,
              },
            }}
          />

          {/* ============================================ */}
          {/* TWO COL STACKED - ARIYA & X-TRAIL */}
          {/* ============================================ */}
          <TwoColStacked
            backgroundColor={NISSAN_COLORS.lightGray}
            deskPadding="10px 40px 30px 40px"
            gutterWidth={20}
            rows={[
              {
                product1: {
                  deskImgSrc: NISSAN_IMAGES.ariya,
                  imgWidth: 250,
                  altText: 'Nissan Ariya - Dark Blue',
                  url: 'https://www.nissan.com/ariya',
                  title: 'Nissan Ariya',
                  subtitle: '100% Electric. 100% Nissan.',
                  price: 'From AUD 179,900',
                  ctaText: 'EXPLORE NOW',
                  ctaUrl: 'https://www.nissan.com/ariya',
                  backgroundColor: NISSAN_COLORS.white,
                  width: 250,
                },
                product2: {
                  deskImgSrc: NISSAN_IMAGES.xtrail,
                  imgWidth: 250,
                  altText: 'Nissan X-Trail - Red',
                  url: 'https://www.nissan.com/xtrail',
                  title: 'Nissan X-Trail',
                  subtitle: 'Adventure-ready family SUV',
                  price: 'From AUD 119,900',
                  ctaText: 'EXPLORE NOW',
                  ctaUrl: 'https://www.nissan.com/xtrail',
                  backgroundColor: NISSAN_COLORS.white,
                  width: 250,
                },
              },
            ]}
            styles={{
              title: {
                fontSize: '18px',
                fontWeight: 700,
                color: NISSAN_COLORS.black,
              },
              subtitle: {
                fontSize: '14px',
                color: NISSAN_COLORS.gray,
              },
              price: {
                fontSize: '18px',
                color: NISSAN_COLORS.red,
                fontWeight: 700,
              },
              cta: {
                borderRadius: '0px',
                backgroundColor: NISSAN_COLORS.white,
                color: NISSAN_COLORS.black,
                border: `2px solid ${NISSAN_COLORS.black}`,
              },
            }}
          />

          {/* ============================================ */}
          {/* THREE COL ICONS - NISSAN BENEFITS */}
          {/* ============================================ */}
          <table
            width={600}
            cellPadding={0}
            cellSpacing={0}
            className={EDM_CLASS.wrapper}
            style={{ width: '600px', backgroundColor: NISSAN_COLORS.white }}
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
                  fontSize: '20px',
                  fontWeight: 700,
                  color: NISSAN_COLORS.black,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
              >
                Why Choose Nissan
              </td>
            </tr>
          </table>

          <ThreeColIcon
            backgroundColor={NISSAN_COLORS.white}
            deskPadding="10px 40px 30px 40px"
            gutterWidth={20}
            textHeight={70}
            rows={[
              {
                left: {
                  iconSrc: NISSAN_ICONS.warranty,
                  iconWidth: 32,
                  iconHeight: 32,
                  text: '<strong style="color:#c3002f;">10 Year Warranty</strong><br/><span style="color:#4a4a4a;">Complete peace of mind coverage</span>',
                  backgroundColor: NISSAN_COLORS.lightGray,
                  width: 160,
                  iconPadding: '20px 16px 12px 16px',
                },
                center: {
                  iconSrc: NISSAN_ICONS.innovation,
                  iconWidth: 32,
                  iconHeight: 32,
                  text: '<strong style="color:#c3002f;">Innovation</strong><br/><span style="color:#4a4a4a;">Cutting-edge technology in every model</span>',
                  backgroundColor: NISSAN_COLORS.lightGray,
                  width: 160,
                  iconPadding: '20px 16px 12px 16px',
                },
                right: {
                  iconSrc: NISSAN_ICONS.service,
                  iconWidth: 32,
                  iconHeight: 32,
                  text: '<strong style="color:#c3002f;">Premium Service</strong><br/><span style="color:#4a4a4a;">World-class customer experience</span>',
                  backgroundColor: NISSAN_COLORS.lightGray,
                  width: 160,
                  iconPadding: '20px 16px 12px 16px',
                },
              },
            ]}
            styles={{
              text: {
                fontSize: '12px',
                lineHeight: '18px',
                padding: '0 16px 20px 16px',
              },
            }}
          />

          {/* ============================================ */}
          {/* CTA SECTION */}
          {/* ============================================ */}
          <table
            width={600}
            cellPadding={0}
            cellSpacing={0}
            className={EDM_CLASS.wrapper}
            style={{ width: '600px', backgroundColor: NISSAN_COLORS.black }}
            role="presentation"
          >
            <tr>
              <td
                align="center"
                valign="top"
                className={EDM_CLASS.pad}
                style={{
                  padding: '40px',
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                }}
              >
                <p style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: NISSAN_COLORS.white,
                  margin: '0 0 10px 0',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                }}>
                  Find Your Perfect Nissan
                </p>
                <p style={{
                  fontSize: '16px',
                  color: '#cccccc',
                  margin: '0 0 25px 0',
                }}>
                  Visit your nearest showroom or book a test drive today
                </p>
                <a
                  href="https://www.nissan.com/find-dealer"
                  className={EDM_CLASS.cta}
                  style={{
                    display: 'inline-block',
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                    fontSize: '14px',
                    fontWeight: 600,
                    color: NISSAN_COLORS.black,
                    backgroundColor: NISSAN_COLORS.white,
                    padding: '16px 40px',
                    textDecoration: 'none',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                  }}
                >
                  Find a Dealer
                </a>
              </td>
            </tr>
          </table>

          {/* ============================================ */}
          {/* FOOTER */}
          {/* ============================================ */}
          <Footer
            backgroundColor={NISSAN_COLORS.darkGray}
            logoSrc={NISSAN_IMAGES.logo}
            logoWidth={160}
            logoAlt="Nissan"
            logoUrl="https://www.nissan.com"
            socialTitle="Connect with us"
            socialLinks={[
              { 
                platform: 'facebook', 
                url: 'https://facebook.com/nissan',
                iconUrl: NISSAN_SOCIAL_ICONS.facebook
              },
              { 
                platform: 'instagram', 
                url: 'https://instagram.com/nissan',
                iconUrl: NISSAN_SOCIAL_ICONS.instagram
              },
              { 
                platform: 'youtube', 
                url: 'https://youtube.com/nissan',
                iconUrl: NISSAN_SOCIAL_ICONS.youtube
              },
              { 
                platform: 'twitter', 
                url: 'https://twitter.com/nissan',
                iconUrl: NISSAN_SOCIAL_ICONS.twitter
              },
            ]}
            socialIconSize={28}
            showDivider={true}
            dividerColor="#333333"
            legalText="*Nissan MORE warranty offer valid on selected models purchased between January 1, 2026 and March 31, 2026. Terms and conditions apply. Visit your nearest Nissan dealer for full details."
            showLinks={true}
            preferencesUrl="https://www.nissan.com/preferences"
            unsubscribeUrl="https://www.nissan.com/unsubscribe"
            privacyUrl="https://www.nissan.com/privacy"
            linkColor="#999999"
            address="Nissan Motor Corporation<br/>Global Headquarters, Yokohama, Japan"
            phone="1-800-NISSAN-1"
            phoneTel="+18006477261"
            copyright="© 2026 Nissan Motor Corporation. All rights reserved."
            styles={{
              socialTitle: { color: '#ffffff' },
              legalText: { color: '#888888', fontSize: '11px' },
              copyright: { color: '#666666' },
            }}
          />

        </Container>
      </Body>
    </Html>
  );
};

export default NissanEmail;

