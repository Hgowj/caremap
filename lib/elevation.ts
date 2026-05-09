// Fetch elevation data from OpenTopoData for a set of coordinates
// Uses SRTM30m dataset which covers Singapore well

export interface ElevationPoint {
  lat: number;
  lng: number;
  elevation: number; // metres above sea level
}

export interface RouteTerrainAnalysis {
  maxGradientPercent: number;
  avgGradientPercent: number;
  classification: "flat" | "gentle" | "steep";
  totalAscent: number;   // metres
  totalDescent: number;  // metres
}

// OpenTopoData allows up to 100 locations per request, max 1 req/sec
export async function getElevations(
  points: Array<{ lat: number; lng: number }>
): Promise<ElevationPoint[]> {
  if (points.length === 0) return [];

  // Sample at most 60 points evenly spaced along the route
  const sampled = samplePoints(points, 60);
  const locations = sampled.map(p => `${p.lat},${p.lng}`).join("|");

  try {
    const res = await fetch(
      `https://api.opentopodata.org/v1/srtm30m?locations=${locations}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) throw new Error(`OpenTopoData ${res.status}`);
    const data = await res.json() as any;
    if (data.status !== "OK") throw new Error(data.error ?? "OpenTopoData error");

    return data.results.map((r: any, i: number) => ({
      lat: sampled[i].lat,
      lng: sampled[i].lng,
      elevation: r.elevation ?? 0,
    }));
  } catch (err) {
    console.warn("[Elevation] Failed:", err);
    return sampled.map(p => ({ ...p, elevation: 0 }));
  }
}

export function analyseTerrainFromElevations(elevations: ElevationPoint[]): RouteTerrainAnalysis {
  if (elevations.length < 2) {
    return { maxGradientPercent: 0, avgGradientPercent: 0, classification: "flat", totalAscent: 0, totalDescent: 0 };
  }

  let maxGradient = 0;
  let totalAscent = 0;
  let totalDescent = 0;
  const gradients: number[] = [];

  for (let i = 1; i < elevations.length; i++) {
    const prev = elevations[i - 1];
    const curr = elevations[i];
    const elevDiff = curr.elevation - prev.elevation;
    const horizDist = haversineMetres(prev.lat, prev.lng, curr.lat, curr.lng);
    if (horizDist < 1) continue;

    const gradient = Math.abs(elevDiff / horizDist) * 100;
    maxGradient = Math.max(maxGradient, gradient);
    gradients.push(gradient);

    if (elevDiff > 0) totalAscent += elevDiff;
    else totalDescent += Math.abs(elevDiff);
  }

  const avgGradient = gradients.length > 0
    ? gradients.reduce((a, b) => a + b, 0) / gradients.length
    : 0;

  const classification: "flat" | "gentle" | "steep" =
    maxGradient < 3 ? "flat" :
    maxGradient < 8 ? "gentle" : "steep";

  return {
    maxGradientPercent: Math.round(maxGradient * 10) / 10,
    avgGradientPercent: Math.round(avgGradient * 10) / 10,
    classification,
    totalAscent: Math.round(totalAscent),
    totalDescent: Math.round(totalDescent),
  };
}

function samplePoints<T extends { lat: number; lng: number }>(
  points: T[],
  maxSamples: number
): T[] {
  if (points.length <= maxSamples) return points;
  const step = points.length / maxSamples;
  return Array.from({ length: maxSamples }, (_, i) => points[Math.floor(i * step)]);
}

function haversineMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}