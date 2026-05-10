# CareMap — Fix i18n Translation Keys Showing Raw

## Problem
Translation keys are showing as raw strings like `onboarding.saveRoutesSub`, `map.edit`, etc.
The root cause: `next-intl`'s `getMessages()` server function doesn't work correctly with
cookie-based locale switching on Cloudflare Workers. We need to bypass next-intl's server
routing entirely and pass messages directly to the client provider.

## Solution: Direct message injection (no next-intl server routing)

### Step 1: Delete these files if they exist
- `middleware.ts` — delete it entirely
- `i18n/request.ts` — delete it entirely
- `i18n/` directory — delete it entirely

```bash
rm -f middleware.ts
rm -rf i18n/
```

### Step 2: Rewrite `app/layout.tsx`

Read the current `app/layout.tsx` first, then replace it with exactly this:

```typescript
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { NextIntlClientProvider } from "next-intl";
import { cookies } from "next/headers";

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
  // Read locale from cookie server-side
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
```

### Step 3: Update `next.config.js` or `next.config.ts`

Read the current next.config file. Remove the `createNextIntlPlugin` wrapper if it exists,
since we are no longer using next-intl's routing. The config should NOT call
`createNextIntlPlugin` or `withNextIntl`. Just keep the PWA wrapper:

If it currently looks like:
```javascript
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");
module.exports = withNextIntl(withPWA({ ... }));
```

Change it to just:
```javascript
module.exports = withPWA({ ... });
```

Or if TypeScript:
```typescript
export default withPWA({ ... });
```

Remove the next-intl import line entirely from next.config.

### Step 4: Verify `useTranslations` usage in all client components

The `NextIntlClientProvider` in layout.tsx now passes messages directly, so
`useTranslations` in client components WILL work. But we need to verify the
namespace and key names match exactly.

Read `messages/en.json` completely first.

Then check each file for mismatches:

**`components/BottomNav.tsx`**
Should use namespace `"nav"`. Keys: `nav.map`, `nav.facilities`, `nav.saved`, `nav.notes`, `nav.settings`

**`app/map/page.tsx`**
Should use namespace `"map"`. Check every `t("...")` call matches a key in `messages/en.json` under `"map"`.

**`app/onboarding/page.tsx`**
Should use namespace `"onboarding"`. Check all keys.

**`app/notes/page.tsx`**
Should use namespace `"notes"`. Check all keys.

**`app/facilities/page.tsx`**
Should use namespace `"facilities"`. Check all keys.

**`app/settings/page.tsx`**
Should use namespace `"settings"`. Check all keys.

**`components/ReportModal.tsx`**
Should use namespace `"reportModal"`. Check all keys.

For EACH mismatch found (key exists in component but not in JSON, or name differs):
- Add the missing key to `messages/en.json`, `messages/zh.json`, `messages/th.json`,
  `messages/tl.json`, AND `messages/ta.json`
- OR rename the `t("key")` call to match the existing JSON key

Common mismatches to look for:
- `t("gpClinic")` vs JSON key `"gpClinics"` — fix to match
- `t("taptochange")` vs JSON key `"tapToChange"` — camelCase sensitivity
- `t("saveRoutesSub")` vs JSON key `"saveRoutesSub"` — verify exact spelling
- `t("edit")` under `"map"` namespace — verify key exists in `messages/en.json` under `"map"`

### Step 5: Add missing keys to ALL message files

After identifying mismatches, add any missing keys to all 5 language files simultaneously.
For any key that exists in the component but is missing from the JSON files, add it with
appropriate translations:

Pattern — if a key is missing from all files, add it to en.json with the English text,
and add reasonable translations to zh.json, th.json, tl.json, ta.json.

### Step 6: Verify the settings language switcher works

In `app/settings/page.tsx`, the language switcher sets a cookie and reloads:
```typescript
const switchLanguage = (code: string) => {
  document.cookie = `cm_locale=${code};path=/;max-age=${365 * 24 * 60 * 60};SameSite=Lax`;
  setCurrentLang(code);
  window.location.reload();
};
```

Make sure `SameSite=Lax` is included in the cookie string so the cookie is sent with
the next request to the server. Without it, the cookie may not be read by `cookies()`
in layout.tsx.

### Step 7: Build and deploy

```bash
npx @opennextjs/cloudflare build
npx wrangler deploy
```

### Step 8: Test

1. Open the live site — all text should show in English (no raw keys)
2. Go to Settings → tap 中文 → page reloads → all UI text in Chinese
3. Go to Settings → tap English → page reloads → back to English
4. Check every page: Map, Facilities, Notes, Onboarding, Settings
5. No raw keys like `map.edit` or `onboarding.saveRoutesSub` should appear anywhere

## Why this works

next-intl's `getMessages()` function only works when next-intl controls routing
(i.e. URL-based locales like `/en/map`). Since we use cookie-based switching with
no URL prefixes, we must bypass `getMessages()` and instead:
1. Read the cookie directly in layout.tsx using Next.js `cookies()`
2. Import the JSON messages file directly
3. Pass both `locale` and `messages` explicitly to `NextIntlClientProvider`

This makes the provider work without next-intl's routing infrastructure.
`useTranslations` in all client components will then work correctly because
they read from the provider context, not from the routing system.
