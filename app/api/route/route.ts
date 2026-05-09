import { NextRequest, NextResponse } from "next/server";
import { getToken, decodePolyline } from "@/lib/onemap";
import { getElevations, analyseTerrainFromElevations } from "@/lib/elevation";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const startLat = parseFloat(searchParams.get("startLat") ?? "");
  const startLng = parseFloat(searchParams.get("startLng") ?? "");
  const endLat   = parseFloat(searchParams.get("endLat")   ?? "");
  const endLng   = parseFloat(searchParams.get("endLng")   ?? "");
  const mode     = searchParams.get("mode") ?? "walk"; // walk | pt | drive

  if ([startLat, startLng, endLat, endLng].some(isNaN)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  try {
    const token = await getToken();

    if (token === "MOCK_TOKEN") {
      return NextResponse.json({
        route_summary: { total_time: 720, total_distance: 850, start_point: "", end_point: "" },
        route_geometry: "",
        route_points: [[startLat, startLng], [endLat, endLng]],
        terrain: { maxGradientPercent: 0, avgGradientPercent: 0, classification: "flat", totalAscent: 0, totalDescent: 0 },
        status: 0,
      });
    }

    const url = `https://www.onemap.gov.sg/api/public/routingsvc/route?start=${startLat},${startLng}&end=${endLat},${endLng}&routeType=${mode}`;
    console.log("[Route] Calling:", url);

    const res  = await fetch(url, { headers: { Authorization: token } });
    const text = await res.text();
    console.log("[Route] Status:", res.status, "| Response:", text.slice(0, 300));

    if (!res.ok) return NextResponse.json({ error: `OneMap ${res.status}` }, { status: 502 });

    const data = JSON.parse(text);

    // Decode polyline and get elevation data
    let routePoints: [number, number][] = [[startLat, startLng], [endLat, endLng]];
    let terrain: { maxGradientPercent: number; avgGradientPercent: number; classification: "flat" | "gentle" | "steep"; totalAscent: number; totalDescent: number } = { maxGradientPercent: 0, avgGradientPercent: 0, classification: "flat", totalAscent: 0, totalDescent: 0 };
    if (data.route_geometry) {
      const decoded = decodePolyline(data.route_geometry);
      if (decoded.length >= 2) {
        routePoints = decoded;
        // Get terrain analysis (non-blocking — if it fails we still return the route)
        try {
          const pointObjs = decoded.map(([lat, lng]) => ({ lat, lng }));
          const elevations = await getElevations(pointObjs);
          terrain = analyseTerrainFromElevations(elevations);
          console.log("[Route] Terrain:", terrain);
        } catch (e) {
          console.warn("[Route] Elevation analysis failed:", e);
        }
      }
    }

    return NextResponse.json({
      ...data,
      route_points: routePoints,
      terrain,
    });
  } catch (err) {
    console.error("[Route] Exception:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}