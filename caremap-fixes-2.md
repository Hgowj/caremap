# CareMap — Fix Prompt

## Issues to fix
1. i18n translation keys showing as raw strings (e.g. `onboarding.saveRoutesSub`)
2. Routes in suggestions are hardcoded estimates — make them feel more realistic
3. AgentChat component not visible on map page
4. Desktop viewport broken — needs responsive layout (desktop = wider, phone = mobile)
5. Map is zoomed to wrong area on load (showing MacRitchie area instead of user's location or central Singapore)

---

## Step 0: Read these files first
- `app/layout.tsx`
- `app/map/page.tsx`
- `app/onboarding/page.tsx`
- `app/settings/page.tsx`
- `app/notes/page.tsx`
- `app/facilities/page.tsx`
- `components/BottomNav.tsx`
- `components/ReportModal.tsx`
- `components/AgentChat.tsx`
- `middleware.ts` (if it exists)
- `i18n/request.ts`
- `next.config.js` or `next.config.ts`
- `tailwind.config.ts`
- `messages/en.json`

---

## Fix 1: Translation keys showing as raw strings

### Root cause diagnosis
The translations are showing as `onboarding.saveRoutesSub` instead of the actual text. This means `useTranslations` is not finding the messages. The most common causes are:

**A) `NextIntlClientProvider` is not wrapping the app correctly in `layout.tsx`**
**B) The message JSON keys don't match what `useTranslations` is looking for**
**C) `middleware.ts` is interfering**

### Steps to fix:

**Step A: Delete `middleware.ts` if it exists**
```bash
rm middleware.ts
```
next-intl middleware causes redirect loops with cookie-based locale switching. It must not exist.

**Step B: Fix `app/layout.tsx`**
The layout must be an async server component that fetches messages and passes them to `NextIntlClientProvider`. Replace the layout with exactly this pattern:

```typescript
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages();

  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="font-sans bg-gray-100 antialiased">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

Note: Remove the `md:max-w-[430px] md:mx-auto md:shadow-2xl` wrapper div from layout — this will be handled per-page for responsive behaviour (see Fix 4).

**Step C: Fix `i18n/request.ts`**
Make sure it reads the locale from cookies correctly:

```typescript
import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export default getRequestConfig(async () => {
  let locale = "en";
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get("cm_locale")?.value;
    const validLocales = ["en", "zh", "th", "tl", "ta"];
    if (raw && validLocales.includes(raw)) locale = raw;
  } catch {}

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
```

**Step D: Verify all pages use `useTranslations` correctly**

For EVERY client component that shows raw keys, check that:
1. It imports `useTranslations` from `"next-intl"` (not from `"next-intl/server"`)
2. The namespace matches exactly what's in `messages/en.json` (case-sensitive)
3. The key path matches exactly

Example of correct usage:
```typescript
"use client";
import { useTranslations } from "next-intl";

export default function OnboardingPage() {
  const t = useTranslations("onboarding");
  // ...
  <p>{t("saveRoutesSub")}</p>  // key must exist in messages/en.json under "onboarding"
}
```

Go through each file showing raw keys and verify the namespace and key names match `messages/en.json` exactly. Fix any mismatches.

**Step E: Check `messages/en.json` for completeness**
Read the current `messages/en.json`. If any keys referenced in the components are missing from the JSON, add them. Common missing keys to check:
- `onboarding.saveRoutesSub`
- `map.tapToChange` (check capitalisation — might be `taptochange` vs `tapToChange`)
- `facilities.gpClinics` vs `facilities.gpClinic`
- `map.wheelchair`
- `map.edit`

Fix all key mismatches between the JSON and component usage.

---

## Fix 2: Route variants — make estimates more realistic

In `app/map/page.tsx`, find the `handleFindRoutes` function. The 4 route variants are generated from the base route. Make these changes so the estimates feel grounded:

```typescript
// Replace the variant generation with this more realistic version:

// Walking speed: ~80m/min normal, ~60m/min with mobility aid
const speedFactor = savedPrefs?.mobilityAid === "wheelchair" || savedPrefs?.mobilityAid === "frame" ? 1.25 : 1.0;
const baseTime = Math.round(data.route_summary.total_time * speedFactor);
const baseDist = data.route_summary.total_distance;

// Shelter estimate: Singapore has ~70% covered walkways on main routes
// Adjust based on terrain (flatter = more HDB areas = more shelter)
const baseShelter = terrain.classification === "flat" ? 75
  : terrain.classification === "gentle" ? 60 : 40;

// Rest stop estimate: ~1 bench per 300-500m in HDB areas
const baseRestStops = Math.max(1, Math.round(baseDist / 450));

// Washroom estimate: ~1 per 600-800m near main routes
const baseWashrooms = Math.max(0, Math.round(baseDist / 700));

// Nearby reports
const nearbyReports = reports.filter(r => {
  const d = Math.sqrt((r.lat - (sLat + eLat) / 2) ** 2 + (r.lng - (sLng + eLng) / 2) ** 2);
  return d < 0.015;
}).length;

const variants: RouteVariant[] = [
  {
    id: "best",
    label: "Best match",
    badge: "BEST FOR YOU",
    badgeGreen: true,
    time: baseTime,
    distance: baseDist,
    terrain,
    shelterPercent: baseShelter,
    restStopCount: baseRestStops,
    washroomCount: baseWashrooms,
    reportCount: nearbyReports,
    routePoints: pts,
  },
  {
    id: "flattest",
    label: "Flattest path",
    // Flattest path is longer (avoids hills) but truly flat
    time: Math.round(baseTime * 1.18),
    distance: Math.round(baseDist * 1.12),
    terrain: { classification: "flat" as const, maxGradientPercent: 0.8, totalAscent: 0 },
    shelterPercent: Math.min(90, baseShelter + 5),
    restStopCount: Math.max(2, baseRestStops + 1),
    washroomCount: baseWashrooms,
    reportCount: 0,
    routePoints: pts,
  },
  {
    id: "rest_stops",
    label: "Most rest stops",
    // Goes through more residential/park areas = more benches but slightly longer
    time: Math.round(baseTime * 1.22),
    distance: Math.round(baseDist * 1.14),
    terrain: { classification: terrain.classification === "steep" ? "gentle" as const : terrain.classification as any, maxGradientPercent: Math.min(terrain.maxGradientPercent, 4), totalAscent: Math.round(baseDist * 0.008) },
    shelterPercent: Math.min(85, baseShelter + 8),
    restStopCount: Math.max(3, Math.round(baseDist / 350)),
    washroomCount: Math.max(1, Math.round(baseDist / 600)),
    reportCount: 0,
    routePoints: pts,
  },
  {
    id: "quickest",
    label: "Quickest route",
    badge: (savedPrefs?.slope === "flat" && terrain.maxGradientPercent > 4) ||
           (savedPrefs?.mobilityAid === "wheelchair" && terrain.classification === "steep")
           ? "Less suitable" : undefined,
    badgeGreen: false,
    // Direct route = shorter distance, less shelter (main roads not always covered)
    time: Math.round(baseTime * 0.78),
    distance: Math.round(baseDist * 0.82),
    terrain: { classification: "gentle" as const, maxGradientPercent: terrain.maxGradientPercent * 1.3, totalAscent: terrain.totalAscent },
    shelterPercent: Math.max(25, baseShelter - 25),
    restStopCount: Math.max(0, Math.round(baseDist / 1000)),
    washroomCount: Math.max(0, Math.round(baseDist / 1100)),
    reportCount: nearbyReports,
    routePoints: pts,
  },
];
```

---

## Fix 3: AgentChat not visible

In `app/map/page.tsx`, check if `AgentChat` is imported and rendered. It should appear as a floating button above the BottomNav.

If it's missing, add the import at the top:
```typescript
import AgentChat from "@/components/AgentChat";
```

And add it inside the main div, just before `<BottomNav />`:
```tsx
<AgentChat userLat={mapCenter[0]} userLng={mapCenter[1]} />
```

Also check `components/AgentChat.tsx` — the floating button has `bottom-20` positioning. If BottomNav height changed, adjust to `bottom-24`.

---

## Fix 4: Responsive layout — desktop wide, mobile narrow

### Problem
Currently either: (a) the app is always narrow (430px) on desktop, or (b) the layout wrapper was removed and it's now full-width on desktop with wrong proportions.

### Solution
The correct approach for a PWA that works on both:
- **Mobile**: full-width, full-height, bottom nav
- **Desktop**: centered card (430px wide), with the map and content filling it, sidebar space on sides

**In `app/layout.tsx`** — the body should allow full width, no wrapper here.

**Create `components/AppShell.tsx`** — a wrapper that every page uses:
```typescript
"use client";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-200 flex items-start justify-center">
      <div
        className="w-full bg-white relative overflow-hidden"
        style={{
          maxWidth: "430px",
          minHeight: "100dvh",
          height: "100dvh",
        }}
      >
        {children}
      </div>
    </div>
  );
}
```

**Then in EVERY page** (`app/map/page.tsx`, `app/notes/page.tsx`, `app/facilities/page.tsx`, `app/settings/page.tsx`, `app/onboarding/page.tsx`, `app/saved/page.tsx`), wrap the outermost div:

```tsx
import AppShell from "@/components/AppShell";

export default function MapPage() {
  return (
    <AppShell>
      <Suspense ...>
        <MapPageInner />
      </Suspense>
    </AppShell>
  );
}
```

For `MapPageInner` and other inner components that use `style={{ height: "100dvh" }}` as their root — keep that, it will work correctly inside AppShell.

**Also fix `app/map/page.tsx` outer div** — the map page inner component already has `style={{ height: "100dvh", overflow: "hidden" }}`. That's correct. Make sure AppShell wraps the Suspense, not the inner component.

---

## Fix 5: Map default center

In `app/map/page.tsx`, the `DEFAULT_CENTER` is set to `[1.3521, 103.8198]` which is Bishan area. That's correct for central Singapore. If the map is showing MacRitchie on load, the issue is the map zoom level or the Leaflet tile cache.

Check `components/Map.tsx` — find where the map center and zoom are initialised. Make sure:
```typescript
// Default center should be central Singapore
const DEFAULT_CENTER: [number, number] = [1.3521, 103.8198];
const DEFAULT_ZOOM = 13; // zoom 13 shows most of Singapore
```

If zoom is 14 or higher, it shows a smaller area. Lower it to 12 or 13 for the initial load so users see more context.

In `app/map/page.tsx` change:
```typescript
const [mapZoom, setMapZoom] = useState(12);
```

---

## After all fixes:

```bash
git add -A
git commit -m "Fix i18n translations, responsive layout, AgentChat visibility, route estimates, map zoom"
npx @opennextjs/cloudflare build
npx wrangler deploy
```

## Verification checklist:
- [ ] Open app in browser — no raw translation keys visible anywhere
- [ ] Switch language in Settings → all text changes immediately on reload
- [ ] On desktop (>768px wide): app appears as a 430px card centered on gray background
- [ ] On mobile: app fills full screen
- [ ] Chat bubble (💬) appears bottom-right above bottom nav on map page
- [ ] Tapping chat bubble opens the agent chat sheet
- [ ] Route suggestions show 4 variants with realistic time/distance differences
- [ ] Map opens centered on Singapore (not zoomed to MacRitchie)
- [ ] Toilets toggle → markers appear on map (check wrangler tail for `[POIs] Toilets: N > 0`)
