import { NextRequest, NextResponse } from "next/server";
import { getToken } from "@/lib/onemap";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const startLat = parseFloat(searchParams.get("startLat") ?? "");
  const startLng = parseFloat(searchParams.get("startLng") ?? "");
  const endLat   = parseFloat(searchParams.get("endLat")   ?? "");
  const endLng   = parseFloat(searchParams.get("endLng")   ?? "");

  if ([startLat, startLng, endLat, endLng].some(isNaN)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  try {
    const token = await getToken();

    if (token === "MOCK_TOKEN") {
      return NextResponse.json({
        route_summary: { total_time: 720, total_distance: 850, start_point: "", end_point: "" },
        route_geometry: "",
        status: 0,
      });
    }

    // OneMap requires token in Authorization header, NOT as query param
    const url = `https://www.onemap.gov.sg/api/public/routingsvc/route?start=${startLat},${startLng}&end=${endLat},${endLng}&routeType=walk`;
    console.log("[Route] Calling:", url);

    const res  = await fetch(url, {
      headers: { Authorization: token },
    });
    const text = await res.text();
    console.log("[Route] Status:", res.status, "| Response:", text.slice(0, 300));

    if (!res.ok) {
      return NextResponse.json({ error: `OneMap error ${res.status}: ${text}` }, { status: 502 });
    }

    const data = JSON.parse(text);
    return NextResponse.json(data);
  } catch (err) {
    console.error("[Route] Exception:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}