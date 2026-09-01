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
  OneColProduct,
  PromoBlock,
  OrderCard,
  Footer,
  EmailResponsiveHead,
} from '@/components/email';
import { EDM_CLASS, fluidImgStyle } from '@/lib/email/responsive';

import { NISSAN_IMAGES, NISSAN_COLORS, NISSAN_ICONS, NISSAN_SOCIAL_ICONS } from '@/lib/constants/nissanAssets';

/**
 * All Components Email - Nissan Themed
 * Showcases all 8 email components with Nissan vehicles
 */
export const AllComponentsEmail: React.FC = () => {
  return (
    <Html>
      <EmailResponsiveHead />
      <Preview>Your Nissan Order Confirmation - All Components Showcase</Preview>
      <Body style={{ backgroundColor: '#e5e5e5', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto' }}>
          
          {/* ============================================ */}
          {/* HEADER - NISSAN LOGO */}
          {/* ============================================ */}
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
                  width={280}
                  alt="Nissan Motor Corporation"
                  className={EDM_CLASS.imgFluid}
                  style={fluidImgStyle(280)}
                />
              </td>
            </tr>
          </table>

          {/* ============================================ */}
          {/* PROMO BLOCK - NISSAN MORE BANNER */}
          {/* ============================================ */}
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

          {/* ============================================ */}
          {/* INTRO COPY COMPONENT */}
          {/* ============================================ */}
          <IntroCopy
            backgroundColor="#ffffff"
            deskPadding="30px 40px 20px 40px"
            textAlign="left"
            greeting="Dear Valued Customer,"
            body="Thank you for your interest in Nissan! We're delighted to share our latest offers with you. Enjoy up to <strong>10 years of warranty</strong> with Nissan MORE on selected models. Explore our innovative range of vehicles below."
            greetingStyle={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#000000',
            }}
            bodyStyle={{
              fontSize: '16px',
              lineHeight: '26px',
              color: '#4a4a4a',
            }}
          />

          {/* ============================================ */}
          {/* ORDER CARD COMPONENT - ENQUIRY DETAILS */}
          {/* ============================================ */}
          <OrderCard
            backgroundColor="#ffffff"
            cardBackgroundColor="#000000"
            cardWidth={520}
            cardBorderRadius="0px"
            dividerColor="#333333"
            deskPadding="10px 40px 30px 40px"
            rows={[
              { label: 'Enquiry Reference', value: '#ENQ-2026-NISSAN' },
              { label: 'Date', value: 'January 7, 2026' },
              { label: 'Model of Interest', value: 'Nissan Patrol' },
              { label: 'Preferred Contact', value: 'Email & Phone' },
              { 
                label: 'Offer', 
                value: '<strong>10 Year Warranty</strong>',
                valueStyle: { fontSize: '16px', fontWeight: 700, color: '#c3002f' }
              },
            ]}
            styles={{
              label: { color: '#888888' },
              value: { color: '#ffffff' },
            }}
          />

          {/* ============================================ */}
          {/* SECTION TITLE */}
          {/* ============================================ */}
          <table
            width={600}
            cellPadding={0}
            cellSpacing={0}
            className={EDM_CLASS.wrapper}
            style={{ width: '600px', backgroundColor: '#f5f5f5' }}
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
                Featured Vehicles
              </td>
            </tr>
          </table>

          {/* ============================================ */}
          {/* TWO COL DUAL CTA COMPONENT */}
          {/* ============================================ */}
          <TwoColDualCta
            backgroundColor="#f5f5f5"
            deskPadding="10px 40px 20px 40px"
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
                  title: 'All-New Qashqai',
                  subtitle: 'Bold design, smart technology',
                  cta1Text: 'REQUEST QUOTE',
                  cta1Url: 'https://www.nissan.com/quote',
                  cta2Text: 'TEST DRIVE',
                  cta2Url: 'https://www.nissan.com/testdrive',
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
                  title: 'Legendary Patrol',
                  subtitle: 'Power, luxury, capability',
                  cta1Text: 'REQUEST QUOTE',
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

          {/* ============================================ */}
          {/* THREE COL ICON COMPONENT */}
          {/* ============================================ */}
          <table
            width={600}
            cellPadding={0}
            cellSpacing={0}
            className={EDM_CLASS.wrapper}
            style={{ width: '600px', backgroundColor: '#ffffff' }}
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
                  color: '#000000',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
              >
                Why Choose Nissan
              </td>
            </tr>
          </table>

          <ThreeColIcon
            backgroundColor="#ffffff"
            deskPadding="10px 40px 30px 40px"
            gutterWidth={20}
            textHeight={70}
            rows={[
              {
                left: {
                  iconSrc: NISSAN_ICONS.warranty,
                  iconWidth: 32,
                  iconHeight: 32,
                  text: '<strong style="color:#c3002f;">10 Year Warranty</strong><br/><span style="color:#4a4a4a;">Complete peace of mind</span>',
                  backgroundColor: '#f5f5f5',
                  width: 160,
                  iconPadding: '20px 16px 12px 16px',
                },
                center: {
                  iconSrc: NISSAN_ICONS.innovation,
                  iconWidth: 32,
                  iconHeight: 32,
                  text: '<strong style="color:#c3002f;">Innovation</strong><br/><span style="color:#4a4a4a;">Cutting-edge technology</span>',
                  backgroundColor: '#f5f5f5',
                  width: 160,
                  iconPadding: '20px 16px 12px 16px',
                },
                right: {
                  iconSrc: NISSAN_ICONS.service,
                  iconWidth: 32,
                  iconHeight: 32,
                  text: '<strong style="color:#c3002f;">Premium Service</strong><br/><span style="color:#4a4a4a;">World-class experience</span>',
                  backgroundColor: '#f5f5f5',
                  width: 160,
                  iconPadding: '20px 16px 12px 16px',
                },
              },
            ]}
          />

          {/* ============================================ */}
          {/* TWO COL STACKED COMPONENT */}
          {/* ============================================ */}
          <table
            width={600}
            cellPadding={0}
            cellSpacing={0}
            className={EDM_CLASS.wrapper}
            style={{ width: '600px', backgroundColor: '#f5f5f5' }}
            role="presentation"
          >
            <tr>
              <td
                align="center"
                valign="top"
                className={EDM_CLASS.pad}
                style={{
                  padding: '20px 40px 10px 40px',
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                  fontSize: '20px',
                  fontWeight: 700,
                  color: '#000000',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
              >
                More Models
              </td>
            </tr>
          </table>

          <TwoColStacked
            backgroundColor="#f5f5f5"
            deskPadding="10px 40px 20px 40px"
            gutterWidth={20}
            rows={[
              {
                product1: {
                  deskImgSrc: NISSAN_IMAGES.ariya,
                  imgWidth: 250,
                  altText: 'Nissan Ariya',
                  url: 'https://www.nissan.com/ariya',
                  title: 'Nissan Ariya',
                  subtitle: '100% Electric',
                  price: 'From AUD 179,900',
                  ctaText: 'EXPLORE',
                  backgroundColor: '#ffffff',
                  width: 250,
                },
                product2: {
                  deskImgSrc: NISSAN_IMAGES.xtrail,
                  imgWidth: 250,
                  altText: 'Nissan X-Trail',
                  url: 'https://www.nissan.com/xtrail',
                  title: 'Nissan X-Trail',
                  subtitle: 'Family Adventure SUV',
                  price: 'From AUD 119,900',
                  ctaText: 'EXPLORE',
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

          {/* ============================================ */}
          {/* ONE COL PRODUCT COMPONENT */}
          {/* ============================================ */}
          <table
            width={600}
            cellPadding={0}
            cellSpacing={0}
            className={EDM_CLASS.wrapper}
            style={{ width: '600px', backgroundColor: '#f5f5f5' }}
            role="presentation"
          >
            <tr>
              <td
                align="center"
                valign="top"
                className={EDM_CLASS.pad}
                style={{
                  padding: '20px 40px 10px 40px',
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                  fontSize: '20px',
                  fontWeight: 700,
                  color: '#000000',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
              >
                Featured Model
              </td>
            </tr>
          </table>

          <OneColProduct
            backgroundColor="#f5f5f5"
            contentWidth={520}
            contentAlign="center"
            deskPadding="10px 40px 30px 40px"
            textAlign="center"
            ctaAlign="center"
            rows={[
              {
                deskImgSrc: NISSAN_IMAGES.patrol,
                imgWidth: 520,
                altText: 'Nissan Patrol',
                url: 'https://www.nissan.com/patrol',
                productTitle: 'Nissan Patrol Ti',
                productSubtitle: 'The legendary Patrol combines commanding presence with refined luxury. Featuring a powerful V8 engine, advanced 4WD system, and premium interior appointments.',
                productPrice: 'From AUD 199,900',
                showButton: true,
                ctaText: 'CONFIGURE YOURS',
                ctaUrl: 'https://www.nissan.com/patrol/configure',
                width: 520,
                backgroundColor: '#ffffff',
              },
            ]}
            styles={{
              title: { color: '#000000', fontSize: '22px' },
              price: { color: '#c3002f' },
              cta: {
                backgroundColor: '#c3002f',
                borderColor: '#c3002f',
                color: '#ffffff',
                borderRadius: '0px',
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
            style={{ width: '600px', backgroundColor: '#000000' }}
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
                  color: '#ffffff',
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
                    color: '#000000',
                    backgroundColor: '#ffffff',
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
          {/* FOOTER COMPONENT */}
          {/* ============================================ */}
          <Footer
            backgroundColor="#1a1a1a"
            logoSrc={NISSAN_IMAGES.logo}
            logoWidth={160}
            logoAlt="Nissan"
            logoUrl="https://www.nissan.com"
            socialTitle="Connect with us"
            socialLinks={[
              { platform: 'facebook', url: 'https://facebook.com/nissan', iconUrl: NISSAN_SOCIAL_ICONS.facebook },
              { platform: 'instagram', url: 'https://instagram.com/nissan', iconUrl: NISSAN_SOCIAL_ICONS.instagram },
              { platform: 'youtube', url: 'https://youtube.com/nissan', iconUrl: NISSAN_SOCIAL_ICONS.youtube },
              { platform: 'twitter', url: 'https://twitter.com/nissan', iconUrl: NISSAN_SOCIAL_ICONS.twitter },
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
              copyright: { color: '#666666' },
            }}
          />

        </Container>
      </Body>
    </Html>
  );
};

export default AllComponentsEmail;
