import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Verizon Business Wireless Survey',
  description: 'Understanding preferences for business wireless add-on services',
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
