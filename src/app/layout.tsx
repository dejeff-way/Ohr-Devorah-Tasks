import type { Metadata } from 'next';
import { Nunito_Sans, Geist_Mono } from 'next/font/google';
import './globals.css';

const nunitoSans = Nunito_Sans({
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-nunito-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Ohr Devora — Task Manager',
  description: 'Staff Task Management Portal for Ohr Devora School',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${nunitoSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
