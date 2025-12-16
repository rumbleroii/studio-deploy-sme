import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

// DM Sans - Similar to BR Cobane (clean, geometric sans-serif)
// Replace with BR Cobane local font when font files are available
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

// Playfair Display - Elegant serif for accents (similar to Messina Serif)
// Replace with Messina Serif local font when font files are available
const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  style: ["italic"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Metaforms Studio",
  description: "Research project management with AI-powered insights",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${dmSans.variable} ${playfairDisplay.variable} font-sans antialiased min-h-screen`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
