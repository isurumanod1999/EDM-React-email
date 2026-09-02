import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { THEME_INITIALIZER_SCRIPT } from '@/lib/theme/theme';
import './globals.css';
import '@/builder/builder.css';

export const metadata: Metadata = {
  title: 'Email Studio — Visual Email Builder',
  description: 'Design, customize, and export cross-client HTML emails with React Email, Figma import, and Resend.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INITIALIZER_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

