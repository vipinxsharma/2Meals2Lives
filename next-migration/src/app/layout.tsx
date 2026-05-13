import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: '#2Meals2Lives — Two Hands. Two Meals. Two Lives. One Movement.',
  description:
    'A global movement turning conference food waste into meals for people in need.',
  openGraph: {
    title: '#2Meals2Lives — One Movement',
    description: 'Two hands. Two meals. Two lives. One movement.',
    type: 'website',
    url: 'https://2meals2lives.org',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0800',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
