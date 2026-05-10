# CareMap — Fix Remaining Issues

## Read these files first before making any changes
- `app/page.tsx`
- `app/onboarding/page.tsx`
- `app/settings/page.tsx`
- `app/api/agent/route.ts`
- `app/api/route/route.ts`
- `app/map/page.tsx`
- `lib/datasources.ts`
- `wrangler.toml`

---

## Fix 1: Always landing on map despite not being logged in

### Problem
`app/page.tsx` checks `localStorage` for `cm_onboarded` or `cm_guest`. Because the user
tested the app before, these keys are set. But also, the onboarding page sets
`cm_onboarded` after account creation WITHOUT checking if preferences were saved.

### Fix A: `app/page.tsx`
The redirect logic needs to also check if the user has a valid session cookie.
Replace the entire file:

```typescript
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const onboarded  = localStorage.getItem("cm_onboarded");
    const guest      = localStorage.getItem("cm_guest");
    const hasPrefs   = localStorage.getItem("cm_prefs");

    // Only skip onboarding if they've completed it AND have preferences set
    if ((onboarded || guest) && hasPrefs) {
      router.replace("/map");
    } else {
      // Clear stale flags so onboarding shows fresh
      localStorage.removeItem("cm_onboarded");
      localStorage.removeItem("cm_guest");
      router.replace("/onboarding");
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen bg-white">
      <div className="flex flex-col items-center gap-3">
        <span className="text-brand-500 font-bold text-2xl tracking-tight">CareMap</span>
        <Loader2 size={20} className="animate-spin text-brand-400" />
      </div>
    </div>
  );
}
```

### Fix B: `app/onboarding/page.tsx`
The `handleFinish` function must save `cm_prefs` to localStorage BEFORE setting
`cm_onboarded`. Find `handleFinish` and make sure this order is correct:

```typescript
const handleFinish = async () => {
  const prefs = {
    userType,
    mobilityAid,
    slope,
    sheltered,
    restStops,
    washroomAccess,
    washroomFreq,
    homeLocation,
  };

  // Save prefs FIRST (page.tsx checks for this)
  localStorage.setItem("cm_prefs", JSON.stringify(prefs));
  // Then mark as onboarded
  localStorage.setItem("cm_onboarded", "1");

  // Try to save to server
  try {
    await fetch("/api/user/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...prefs,
        homeLat:   homeLocation?.lat   ?? null,
        homeLng:   homeLocation?.lng   ?? null,
        homeLabel: homeLocation?.label ?? null,
      }),
    });
  } catch { /* guest — localStorage only */ }

  router.push("/map");
};
```

---

## Fix 2: Settings "Edit all preferences" goes to login instead of onboarding step 2/3

### Problem
`app/settings/page.tsx` has buttons that call `window.location.href = "/onboarding"`.
But the onboarding page checks `cm_onboarded` and if already set, may redirect to login.
The fix: pass a query param so onboarding knows to skip to step 2 (preferences).

### Fix `app/settings/page.tsx`
Replace all occurrences of `window.location.href = "/onboarding"` with:
```typescript
window.location.href = "/onboarding?edit=true";
```

### Fix `app/onboarding/page.tsx`
At the top of the component, read the `edit` query param and skip to preferences step:

```typescript
import { useSearchParams } from "next/navigation";

// Inside the component, add:
const searchParams = useSearchParams();

useEffect(() => {
  const editMode = searchParams.get("edit") === "true";
  if (editMode) {
    // Skip account creation, go straight to preferences
    setStep("prefs");
  }
}, [searchParams]);
```

Also wrap the component in Suspense in the page export since useSearchParams requires it:
```typescript
import { Suspense } from "react";

export default function OnboardingPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full" /></div>}>
      <OnboardingPage />
    </Suspense>
  );
}

function OnboardingPage() {
  // ... existing component code
}
```

---

## Fix 3: CareMap assistant not finding toilets

### Problem
The agent calls `${baseUrl}/api/pois?...` but `baseUrl` from the env var is the external
URL. Inside a Cloudflare Worker, calling its own external URL causes a fetch that goes
through the internet and back, which often fails or times out.

### Fix `app/api/agent/route.ts`

Replace the `findToilets` function to use direct D1 database access instead of
HTTP self-fetch. Read the current `lib/datasources.ts` to understand the toilet
data structure (it imports from `public/toilets.json`).

Since the toilet data is bundled as JSON, import it directly in the agent route:

```typescript
import toiletData from "../../../public/toilets.json";

interface ToiletEntry {
  id: string;
  lat: number;
  lng: number;
  name: string;
  wheelchair: boolean;
  bidet: boolean;
  free?: boolean;
}

function findToiletsLocal(
  lat: number,
  lng: number,
  radiusMetres: number = 600
): string {
  try {
    const all = toiletData as ToiletEntry[];
    const radiusDeg = radiusMetres / 111320;

    const nearby = all
      .filter(t => Math.sqrt((t.lat - lat) ** 2 + (t.lng - lng) ** 2) <= radiusDeg)
      .map(t => ({
        ...t,
        dist: distanceMetres(lat, lng, t.lat, t.lng),
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 3);

    if (nearby.length === 0) {
      return `No public toilets found within ${radiusMetres}m of your location.`;
    }

    const lines = nearby.map(t => {
      const tags = [
        t.wheelchair ? "♿ wheelchair accessible" : "",
        t.free       ? "free entry"               : "",
      ].filter(Boolean).join(", ");
      return `• ${t.name} — ${formatDist(t.dist)}${tags ? ` (${tags})` : ""}`;
    });

    return `Found ${nearby.length} toilet${nearby.length !== 1 ? "s" : ""} nearby:\n${lines.join("\n")}\n\nTap the 🚽 button on the map to see all toilets.`;
  } catch (err) {
    console.error("[Agent] findToiletsLocal error:", err);
    return "I had trouble finding toilets. Please tap the 🚽 button on the map to see nearby ones.";
  }
}
```

Then replace the call in the main handler:
```typescript
if (intent.intent === "FIND_TOILET") {
  toolResult = findToiletsLocal(userLat, userLng, 600);
}
```

### Also fix `findFacilities` to use direct API calls with proper error handling

Replace the `findFacilities` function:

```typescript
async function findFacilities(
  facilityType: string,
  lat: number,
  lng: number,
  baseUrl: string
): Promise<string> {
  const typeMap: Record<string, string> = {
    medical:   "chas",
    hawker:    "hawker",
    eldercare: "eldercare",
    gyms:      "gyms",
    pharmacy:  "pharmacy",
  };

  const apiType = typeMap[facilityType] ?? facilityType;

  const typeLabel: Record<string, string> = {
    chas:      "GP clinic",
    hawker:    "hawker centre",
    eldercare: "eldercare centre",
    gyms:      "gym",
    pharmacy:  "pharmacy",
  };

  try {
    let list: Array<{ name: string; address?: string; lat: number; lng: number }> = [];

    if (apiType === "hawker") {
      // Hawker centres are loaded from data.gov.sg via pois API
      // Use direct data.gov.sg API call instead of self-fetch
      const hawkerDatasetId = "d_4a086da0a5553be1d89383cd90d07ecd";
      const pollRes = await fetch(
        `https://api-open.data.gov.sg/v1/public/api/datasets/${hawkerDatasetId}/poll-download`,
        { signal: AbortSignal.timeout(8000) }
      );
      const poll = await pollRes.json() as any;
      if (poll.code === 0) {
        const geoRes  = await fetch(poll.data.url, { signal: AbortSignal.timeout(10000) });
        const geoJson = await geoRes.json() as any;
        list = (geoJson.features ?? [])
          .filter((f: any) => f.geometry?.coordinates)
          .map((f: any) => ({
            name:    f.properties?.NAME ?? f.properties?.name ?? "Hawker Centre",
            address: f.properties?.ADDRESS ?? "",
            lat:     f.geometry.coordinates[1],
            lng:     f.geometry.coordinates[0],
          }));
      }
    } else {
      // Use facilities API datasets directly
      const datasetIds: Record<string, string> = {
        chas:      "d_548c33ea2d99e29ec63a7cc9edcccedc",
        eldercare: "d_f0fd1b3643ed8bd34bd403dedd7c1533",
        gyms:      "d_b3ae090692ecf632116c9885cfbd3424",
        pharmacy:  "d_bb92615f43de22933e4479558b1f6c36",
      };

      const datasetId = datasetIds[apiType];
      if (datasetId) {
        const pollRes = await fetch(
          `https://api-open.data.gov.sg/v1/public/api/datasets/${datasetId}/poll-download`,
          { signal: AbortSignal.timeout(8000) }
        );
        const poll = await pollRes.json() as any;
        if (poll.code === 0) {
          const geoRes  = await fetch(poll.data.url, { signal: AbortSignal.timeout(12000) });
          const geoJson = await geoRes.json() as any;

          list = (geoJson.features ?? [])
            .filter((f: any) => f.geometry?.coordinates)
            .map((f: any) => {
              // Parse description HTML for name/address
              const desc = f.properties?.Description ?? "";
              const nameMatch    = desc.match(/<th>(?:NAME|HCI_NAME|PHARMACY_NAME)<\/th>\s*<td>([^<]+)<\/td>/i);
              const addressMatch = desc.match(/<th>(?:ADDRESSSTREETNAME|STREET_NAME|ROAD_NAME)<\/th>\s*<td>([^<]+)<\/td>/i);
              return {
                name:    nameMatch?.[1]?.trim()    ?? f.properties?.Name ?? "Facility",
                address: addressMatch?.[1]?.trim() ?? "",
                lat:     f.geometry.coordinates[1],
                lng:     f.geometry.coordinates[0],
              };
            });
        }
      }
    }

    if (list.length === 0) {
      return `No ${typeLabel[apiType] ?? facilityType}s found. Please check the Facilities page for more options.`;
    }

    const top = list
      .filter(f => f.lat && f.lng)
      .map(f => ({ ...f, dist: distanceMetres(lat, lng, f.lat, f.lng) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 3);

    const label = typeLabel[apiType] ?? facilityType;
    const lines = top.map(f =>
      `• ${f.name}${f.address ? ` (${f.address})` : ""} — ${formatDist(f.dist)}`
    );

    return `Found ${list.length} ${label}${list.length !== 1 ? "s" : ""} in Singapore. Nearest to you:\n${lines.join("\n")}\n\nUse the Facilities page to browse all options.`;
  } catch (err) {
    console.error("[Agent] findFacilities error:", err);
    return `I couldn't fetch ${typeLabel[apiType] ?? facilityType} data right now. Please check the Facilities page instead.`;
  }
}
```

---

## Fix 4: Route "Best match" — add safety context

### Problem
The route suggestions show terrain, shelter, rest stops, washrooms — but don't
explain WHY "Best match" is safest/best. The preview screen needs to make this
clear for caregivers.

### Fix `app/map/page.tsx` — Preview screen

In the preview sheet, add a "Why this route?" explanation card between the 2×2 grid
and the community reports section:

```tsx
{/* Why this route — only for best match */}
{selectedVariant.id === "best" && (
  <div className="bg-brand-50 border border-brand-100 rounded-2xl px-4 py-3">
    <p className="text-xs font-semibold text-brand-700 mb-1">✦ Why this is the best match</p>
    <p className="text-xs text-brand-600 leading-relaxed">
      This route balances terrain, shelter, and rest stop availability based on your
      {savedPrefs?.mobilityAid === "wheelchair" ? " wheelchair" :
       savedPrefs?.mobilityAid === "frame"      ? " walking frame" :
       savedPrefs?.mobilityAid === "scooter"    ? " mobility scooter" :
       " companion's"} needs
      {savedPrefs?.slope === "flat" ? ", avoids steep slopes" : ""}
      {savedPrefs?.sheltered ? ", maximises covered walkways" : ""}
      {savedPrefs?.washroomAccess ? ", and keeps toilets within reach" : ""}.
    </p>
  </div>
)}
```

Also update the variant scoring comment in `handleFindRoutes` so "best match" is
described as the safety-optimised route in the label:

```typescript
// In the "best" variant, update the label to be clearer:
{
  id:    "best",
  label: "Best match",
  badge: "BEST FOR YOU",
  // Add a subtitle field:
  subtitle: "Safest & most accessible",
  // ... rest of the variant
}
```

And in the suggestion card UI, show the subtitle if present:
```tsx
<div className="flex items-start justify-between mb-1.5">
  <div>
    <p className="font-bold text-gray-900">{v.label}</p>
    {(v as any).subtitle && (
      <p className="text-xs text-brand-500 font-medium">{(v as any).subtitle}</p>
    )}
  </div>
  {v.badge && (...)}
</div>
```

---

## After all fixes, build and deploy:

```bash
git add -A
git commit -m "Fix: onboarding redirect, settings edit flow, agent toilet search, route safety label"
npx @opennextjs/cloudflare build
npx wrangler deploy
```

## Verification:
1. Clear localStorage in DevTools, visit site → should see onboarding
2. Complete onboarding → should land on map
3. Go to Settings → tap "Edit all preferences" → should go to preferences step (not login)
4. Open agent → type "find toilet near Sims Vista" → should return toilet list
5. Plan a walking route → Best match card shows "Safest & most accessible" subtitle
6. Preview screen for Best match shows "Why this route?" explanation
