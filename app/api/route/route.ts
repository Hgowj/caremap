import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getToken, decodePolyline } from "@/lib/onemap";
import { getElevations, analyseTerrainFromElevations } from "@/lib/elevation";

// ── Google polyline decoder ───────────────────────────────────────────────────
function decodeGooglePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let shift = 0, result = 0, b: number;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

// ── Rough route distance in metres ────────────────────────────────────────────
function routeLengthMetres(points: [number, number][]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const dLat = (points[i][0] - points[i-1][0]) * 111320;
    const dLng = (points[i][1] - points[i-1][1]) * 111320 * Math.cos(points[i][0] * Math.PI / 180);
    total += Math.sqrt(dLat ** 2 + dLng ** 2);
  }
  return total;
}

// ── Terrain analysis — skip for short routes ──────────────────────────────────
async function getTerrainForPoints(points: [number, number][]) {
  const FLAT = { maxGradientPercent: 0, avgGradientPercent: 0, classification: "flat" as const, totalAscent: 0, totalDescent: 0 };

  if (points.length < 3) return FLAT;

  // Skip elevation analysis for routes under 300m — data is too noisy
  const lengthM = routeLengthMetres(points);
  if (lengthM < 300) {
    console.log(`[Route] Skipping terrain for short route (${Math.round(lengthM)}m)`);
    return FLAT;
  }

  try {
    const pointObjs  = points.map(([lat, lng]) => ({ lat, lng }));
    const elevations = await getElevations(pointObjs);
    return analyseTerrainFromElevations(elevations);
  } catch (err) {
    console.warn("[Route] Elevation analysis failed:", err);
    return FLAT;
  }
}

// ── Format Google route ───────────────────────────────────────────────────────
async function formatGoogleRoute(route: any, mode: "transit" | "driving") {
  const leg    = route.legs[0];
  const points = decodeGooglePolyline(route.overview_polyline.points);
  const terrain = await getTerrainForPoints(points);

  const steps = (leg.steps ?? []).map((s: any) => {
    const base = {
      instruction: (s.html_instructions ?? "").replace(/<[^>]*>/g, ""),
      distance:    s.distance?.value ?? 0,
      duration:    s.duration?.value ?? 0,
      travel_mode: s.travel_mode,
    };
    if (s.travel_mode === "TRANSIT" && s.transit_details) {
      return {
        ...base,
        transit: {
          line:        s.transit_details.line?.short_name ?? s.transit_details.line?.name ?? "",
          vehicle:     s.transit_details.line?.vehicle?.type ?? "BUS",
          departure:   s.transit_details.departure_stop?.name ?? "",
          arrival:     s.transit_details.arrival_stop?.name ?? "",
          num_stops:   s.transit_details.num_stops ?? 0,
          depart_time: s.transit_details.departure_time?.text ?? "",
          arrive_time: s.transit_details.arrival_time?.text ?? "",
        },
      };
    }
    return base;
  });

  return {
    route_summary: {
      total_time:     leg.duration?.value ?? 0,
      total_distance: leg.distance?.value ?? 0,
      start_point:    leg.start_address ?? "",
      end_point:      leg.end_address   ?? "",
    },
    route_points: points,
    steps,
    warnings: route.warnings ?? [],
    terrain,
    source: "google" as const,
    mode,
  };
}

// ── Google Directions API ─────────────────────────────────────────────────────
async function getGoogleRoute(
  startLat: number, startLng: number,
  endLat:   number, endLng:   number,
  mode:     "transit" | "driving",
  apiKey:   string
) {
  const now     = new Date();
  const depTime = Math.floor(now.getTime() / 1000) + 60;

  const params = new URLSearchParams({
    origin:       `${startLat},${startLng}`,
    destination:  `${endLat},${endLng}`,
    mode,
    key:          apiKey,
    alternatives: "true",
    region:       "sg",
    language:     "en",
    units:        "metric",
  });

  if (mode === "transit") {
    params.set("departure_time", String(depTime));
    params.set("transit_mode",   "bus|subway");
  }

  const url = `https://maps.googleapis.com/maps/api/directions/json?${params}`;
  console.log(`[Route] Google ${mode}: calling API`);

  const res  = await fetch(url, { signal: AbortSignal.timeout(10000) });
  const data = await res.json() as any;

  console.log(`[Route] Google status: ${data.status}, routes: ${data.routes?.length ?? 0}`);

  if (data.status !== "OK") {
    throw new Error(`Google Directions API: ${data.status} — ${data.error_message ?? ""}`);
  }

  return data.routes as any[];
}

// ── OneMap walking route ──────────────────────────────────────────────────────
async function getOneMapWalkRoute(
  startLat: number, startLng: number,
  endLat:   number, endLng:   number
) {
  const token = await getToken();
  const url   = `https://www.onemap.gov.sg/api/public/routingsvc/route?start=${startLat},${startLng}&end=${endLat},${endLng}&routeType=walk`;
  console.log("[Route] OneMap walk:", url);

  const res  = await fetch(url, {
    headers: token !== "MOCK_TOKEN" ? { Authorization: token } : {},
    signal:  AbortSignal.timeout(10000),
  });
  const text = await res.text();
  console.log(`[Route] OneMap status: ${res.status}`);

  if (!res.ok) throw new Error(`OneMap ${res.status}: ${text.slice(0, 200)}`);

  const data = JSON.parse(text);
  if (!data.route_geometry) throw new Error("OneMap returned no route geometry");

  const points  = decodePolyline(data.route_geometry);
  const terrain = await getTerrainForPoints(points);

  return {
    route_summary: {
      total_time:     data.route_summary?.total_time     ?? 0,
      total_distance: data.route_summary?.total_distance ?? 0,
      start_point:    data.route_summary?.start_point    ?? "",
      end_point:      data.route_summary?.end_point      ?? "",
    },
    route_points:        points,
    route_instructions:  data.route_instructions ?? [],
    terrain,
    source: "onemap" as const,
    mode:   "walk"   as const,
  };
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const startLat = parseFloat(searchParams.get("startLat") ?? "");
  const startLng = parseFloat(searchParams.get("startLng") ?? "");
  const endLat   = parseFloat(searchParams.get("endLat")   ?? "");
  const endLng   = parseFloat(searchParams.get("endLng")   ?? "");
  const mode     = (searchParams.get("mode") ?? "walk") as "walk" | "pt" | "drive";

  if ([startLat, startLng, endLat, endLng].some(isNaN)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  // ── Walk — OneMap ───────────────────────────────────────────────────────────
  if (mode === "walk") {
    try {
      const result = await getOneMapWalkRoute(startLat, startLng, endLat, endLng);
      return NextResponse.json(result);
    } catch (err) {
      console.error("[Route] OneMap walk error:", err);
      // Straight-line fallback
      const distM = Math.round(
        Math.sqrt((endLat - startLat) ** 2 + (endLng - startLng) ** 2) * 111320
      );
      return NextResponse.json({
        route_summary: {
          total_time:     Math.round(distM / 1.2),
          total_distance: distM,
        },
        route_points: [[startLat, startLng], [endLat, endLng]],
        terrain:      { classification: "flat", maxGradientPercent: 0, totalAscent: 0, totalDescent: 0 },
        source:       "fallback",
        mode:         "walk",
        warning:      "Could not compute exact route — showing straight-line estimate",
      });
    }
  }

  // ── PT + Drive — Google Maps ────────────────────────────────────────────────
  try {
    const { env } = await getCloudflareContext({ async: true });
    const apiKey  = (env as any).GOOGLE_MAPS_API_KEY as string | undefined;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Google Maps API key not configured. Add GOOGLE_MAPS_API_KEY to wrangler.toml [vars]." },
        { status: 503 }
      );
    }

    const googleMode = mode === "pt" ? "transit" : "driving";
    const routes     = await getGoogleRoute(startLat, startLng, endLat, endLng, googleMode, apiKey);

    if (!routes?.length) {
      return NextResponse.json({ error: "No routes found" }, { status: 404 });
    }

    const formatted  = await Promise.all(routes.map(r => formatGoogleRoute(r, googleMode)));
    const primary    = formatted[0];

    return NextResponse.json({
      ...primary,
      alternatives: formatted.slice(1),
    });

  } catch (err) {
    console.error("[Route] Google error:", err);
    return NextResponse.json(
      { error: `Route calculation failed: ${(err as Error).message}` },
      { status: 502 }
    );
  }
}