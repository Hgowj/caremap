import { NextRequest, NextResponse } from "next/server";
import { getToiletsNearby, getHawkerCentres } from "@/lib/datasources";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat    = parseFloat(searchParams.get("lat")    ?? "1.3521");
  const lng    = parseFloat(searchParams.get("lng")    ?? "103.8198");
  const radius = parseInt(searchParams.get("radius")   ?? "800");
  const types  = searchParams.get("types")?.split(",") ?? ["toilet", "hawker"];

  const results: Record<string, any[]> = {};

  await Promise.allSettled([
    types.includes("toilet") &&
      getToiletsNearby(lat, lng, radius).then((d) => {
        results.toilets = d;
        console.log(`[POIs] Toilets near ${lat},${lng}: ${d.length}`);
      }),
    types.includes("hawker") &&
      getHawkerCentres().then((d) => {
        results.hawkerCentres = d;
        console.log(`[POIs] Hawkers loaded: ${d.length}`);
      }),
  ]);

  return NextResponse.json(results);
}