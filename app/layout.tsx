import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { cookies } from "next/headers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CareMap",
  description: "Accessible navigation for caregivers of seniors and PWDs in Singapore",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "CareMap" },
};

export const viewport: Viewport = {
  themeColor: "#00A172",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

const VALID_LOCALES = ["en", "zh", "th", "tl", "ta"] as const;
type Locale = typeof VALID_LOCALES[number];

async function getLocaleMessages(locale: Locale) {
  try {
    return (await import(`../messages/${locale}.json`)).default;
  } catch {
    return (await import("../messages/en.json")).default;
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const rawLocale   = cookieStore.get("cm_locale")?.value ?? "en";
  const locale      = VALID_LOCALES.includes(rawLocale as Locale) ? (rawLocale as Locale) : "en";
  const messages    = await getLocaleMessages(locale);

  return (
    <html lang={locale} className={inter.variable}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="font-sans bg-gray-100 antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
