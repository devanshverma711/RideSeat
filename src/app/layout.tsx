import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Bricolage_Grotesque } from 'next/font/google';
import './globals.css';
import { APP_NAME } from '@/lib/config';

const font = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font' });

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s | ${APP_NAME}` },
  description: 'Book a seat on your daily ride. No more searching through WhatsApp messages.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon.svg' },
};

export const viewport: Viewport = { themeColor: '#0B6E5C', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={font.variable}>
      <body>{children}</body>
    </html>
  );
}
