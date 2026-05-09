import type { Metadata, Viewport } from "next";
import { DM_Sans, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CareMap",
  description: "Accessible navigation for caregivers of seniors and PWDs in Singapore",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "CareMap" },
};

export const viewport: Viewport = {
  themeColor: "#0d9488",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${plusJakarta.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="font-sans bg-gray-100 antialiased">
        {/*
          Mobile  (<768px): full screen, no card
          Tablet  (768px+): centred phone card, max-width 430px
          Desktop (1024px+): full width with sidebar feel via max-width cap
        */}
        <div
          className="
            w-full bg-white relative overflow-hidden
            md:max-w-[430px] md:mx-auto md:my-0 md:shadow-2xl
            lg:max-w-none lg:mx-0 lg:shadow-none
          "
          style={{ height: "100dvh" }}
        >
          {children}
        </div>
      </body>
    </html>
  );
}