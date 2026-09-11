import type { Metadata, Viewport } from 'next';
import { Nunito_Sans, Geist_Mono } from 'next/font/google';
import './globals.css';

const nunitoSans = Nunito_Sans({
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-nunito-sans',
  subsets: ['latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Ohr Devora — Staff Portal',
    template: '%s · Ohr Devora',
  },
  description: 'Task, calendar and messaging portal for Ohr Devora school staff.',
  applicationName: 'Ohr Devora Staff Portal',
  appleWebApp: {
    capable: true,
    title: 'Ohr Devora',
    statusBarStyle: 'default',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${nunitoSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">{children}</body>
    </html>
  );
}
