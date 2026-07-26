import type { Metadata } from 'next';
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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

