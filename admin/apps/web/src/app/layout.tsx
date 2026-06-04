import type { Metadata } from 'next';
import './globals.css';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export const metadata: Metadata = {
  title: 'HyperGlow Admin · Tavola',
  description: 'HyperGlow operations portal',
  icons: {
    icon: `${BASE_PATH}/favicon.ico`,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
