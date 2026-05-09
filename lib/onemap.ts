// lib/onemap.ts
const ONEMAP_BASE = "https://www.onemap.gov.sg";

export interface OneMapToken {
  access_token: string;
  expiry_timestamp: string;
}

export interface SearchResult {
  SEARCHVAL: string;
  BLK_NO: string;
  ROAD_NAME: string;
  BUILDING: string;
  ADDRESS: string;
  POSTAL: string;
  X: string;
  Y: string;
  LATITUDE: string;
  LONGITUDE: string;
}

export interface RouteResult {
  status_message: string;
  route_geometry: string;
  route_instructions: any[];
  route_summary: {
    start_point: string;
    end_point: string;
    total_time: number;
    total_distance: number;
  };
  status: number;
}

export interface PoiResult {
  NAME: string;
  DESCRIPTION: string;
  ADDRESSPOSTALCODE: string;
  ADDRESSSTREETNAME: string;
  LatLng: string;
  ICON_NAME: string;
}

let _cachedToken: OneMapToken | null = null;

export async function getToken(): Promise<string> {
  if (process.env.ONEMAP_TOKEN) {
    return process.env.ONEMAP_TOKEN;
  }

  if (process.env.NODE_ENV === "development" && !process.env.ONEMAP_EMAIL) {
    console.warn("[OneMap] No credentials — using mock token");
    return "MOCK_TOKEN";
  }

  if (_cachedToken) {
    const expiryMs = parseInt(_cachedToken.expiry_timestamp) * 1000;
    if (Date.now() < expiryMs - 5 * 60 * 1000) {
      return _cachedToken.access_token;
    }
  }

  const res = await fetch(`${ONEMAP_BASE}/api/auth/post/getToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email:    process.env.ONEMAP_EMAIL,
      password: process.env.ONEMAP_PASSWORD,
    }),
  });

  if (!res.ok) throw new Error(`OneMap auth failed: ${res.status}`);
  _cachedToken = await res.json() as any;
  return _cachedToken!.access_token;
}

// No-auth search endpoint
export async function searchAddress(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const params = new URLSearchParams({
    searchVal: query, returnGeom: "Y", getAddrDetails: "Y", pageNum: "1",
  });
  const res = await fetch(`${ONEMAP_BASE}/api/common/elastic/search?${params}`);
  if (!res.ok) return [];
  const data = await res.json() as any;
  return data.results ?? [];
}

export type RouteType = "walk" | "pt" | "drive" | "cycle";

export async function getRoute(
  startLat: number, startLng: number,
  endLat: number,   endLng: number,
  routeType: RouteType = "walk"
): Promise<RouteResult | null> {
  const token = await getToken();
  if (token === "MOCK_TOKEN") return getMockRoute(startLat, startLng, endLat, endLng);

  const url = `${ONEMAP_BASE}/api/public/routingsvc/route?start=${startLat},${startLng}&end=${endLat},${endLng}&routeType=${routeType}`;
  const res  = await fetch(url, { headers: { Authorization: token } });
  if (!res.ok) return null;
  return res.json();
}

export async function getThemePois(themeName: string): Promise<PoiResult[]> {
  const token = await getToken();
  if (token === "MOCK_TOKEN") return [];

  const params = new URLSearchParams({ queryName: themeName });
  const res = await fetch(
    `${ONEMAP_BASE}/api/public/themesvc/retrieveTheme?${params}`,
    { headers: { Authorization: token } }
  );
  if (!res.ok) return [];
  const data = await res.json() as any;
  return data.SrchResults?.slice(1) ?? [];
}

// Decode OneMap/Google encoded polyline
export function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let shift = 0, result = 0, byte: number;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

function getMockRoute(startLat: number, startLng: number, endLat: number, endLng: number): RouteResult {
  return {
    status_message: "Found route (MOCK)",
    route_geometry: "",
    route_instructions: [],
    route_summary: { start_point: `${startLat},${startLng}`, end_point: `${endLat},${endLng}`, total_time: 720, total_distance: 850 },
    status: 0,
  };
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const token = await getToken();
    if (token === "MOCK_TOKEN") return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

    const res  = await fetch(
      `${ONEMAP_BASE}/api/public/revgeocode?location=${lat},${lng}&buffer=40&addressType=All`,
      { headers: { Authorization: token } }
    );
    if (!res.ok) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    const data = await res.json() as any;
    const info = data.GeocodeInfo?.[0];
    if (!info) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    const parts = [info.BLOCK, info.ROAD, info.BUILDINGNAME].filter((v: string) => v && v !== "NIL");
    return parts.join(", ") || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}