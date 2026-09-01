import * as React from 'react';
import {
  Html,
  Body,
  Container,
  Preview,
  Img,
} from '@react-email/components';
import { TwoColDualCta, EmailResponsiveHead } from '@/components/email';
import { EDM_CLASS, fluidImgStyle } from '@/lib/email/responsive';

import { NISSAN_IMAGES } from '@/lib/constants/nissanAssets';

/**
 * Nissan Two Column Dual CTA Email
 * Features Qashqai, Patrol, Ariya, and X-Trail
 */
export const TwoColDualCtaEmail: React.FC = () => {
  return (
    <Html>
      <EmailResponsiveHead />
      <Preview>Discover Nissan&apos;s Latest Models - Request a Quote Today!</Preview>
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

          <TwoColDualCta
            backgroundColor="#f7f8f8"
            deskPadding="20px 40px"
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
                  cta1Url: 'https://www.nissan.com/quote',
                  cta2Text: 'BOOK TEST DRIVE',
                  cta2Url: 'https://www.nissan.com/testdrive',
                  backgroundColor: '#ffffff',
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
                  cta1Url: 'https://www.nissan.com/quote',
                  cta2Text: 'BOOK TEST DRIVE',
                  cta2Url: 'https://www.nissan.com/testdrive',
                  backgroundColor: '#ffffff',
                  width: 250,
                },
              },
              {
                product1: {
                  headerTitle: 'Ariya',
                  headerSubtitle: '100% ELECTRIC',
                  imgSrc: NISSAN_IMAGES.ariya,
                  imgWidth: 250,
                  altText: 'Nissan Ariya - Electric',
                  url: 'https://www.nissan.com/ariya',
                  labelText: 'FROM AUD 179,900',
                  title: 'Nissan Ariya',
                  subtitle: 'The future of driving is here',
                  cta1Text: 'LEARN MORE',
                  cta2Text: 'BOOK TEST DRIVE',
                  backgroundColor: '#ffffff',
                  width: 250,
                },
                product2: {
                  headerTitle: 'X-Trail',
                  headerSubtitle: 'FAMILY SUV',
                  imgSrc: NISSAN_IMAGES.xtrail,
                  imgWidth: 250,
                  altText: 'Nissan X-Trail - Red',
                  url: 'https://www.nissan.com/xtrail',
                  labelText: 'FROM AUD 119,900',
                  title: 'Nissan X-Trail',
                  subtitle: 'Adventure-ready family SUV',
                  cta1Text: 'LEARN MORE',
                  cta2Text: 'BOOK TEST DRIVE',
                  backgroundColor: '#ffffff',
                  width: 250,
                },
              },
            ]}
            styles={{
              headerTitle: {
                fontSize: '20px',
                color: '#000000',
                fontWeight: 700,
              },
              headerSubtitle: {
                color: '#c3002f',
                fontWeight: 600,
              },
              label: {
                color: '#c3002f',
                fontWeight: 700,
              },
              title: {
                fontSize: '18px',
                color: '#000000',
              },
              cta1: {
                borderRadius: '0px',
                backgroundColor: '#ffffff',
                color: '#000000',
                border: '2px solid #000000',
              },
              cta2: {
                borderRadius: '0px',
                backgroundColor: '#000000',
                color: '#ffffff',
              },
            }}
          />
        </Container>
      </Body>
    </Html>
  );
};

export default TwoColDualCtaEmail;
