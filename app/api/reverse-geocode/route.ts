import { NextRequest, NextResponse } from "next/server";
import { getToken } from "@/lib/onemap";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json({ error: "Missing lat/lng" }, { status: 400 });
  }

  try {
    const token = await getToken();

    if (token === "MOCK_TOKEN") {
      return NextResponse.json({
        address: {
          ADDRESS: `${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}`,
          BUILDING: "NIL", POSTAL: "", LATITUDE: lat, LONGITUDE: lng,
        }
      });
    }

    const res  = await fetch(
      `https://www.onemap.gov.sg/api/public/revgeocode?location=${lat},${lng}&buffer=40&addressType=All`,
      { headers: { Authorization: token } }
    );
    const data = await res.json();
    const info = data.GeocodeInfo?.[0];

    if (!info) return NextResponse.json({ address: null });

    return NextResponse.json({
      address: {
        ADDRESS:   [info.BLOCK, info.ROAD].filter((v: string) => v && v !== "NIL").join(" ") || `${lat}, ${lng}`,
        BUILDING:  info.BUILDINGNAME !== "NIL" ? info.BUILDINGNAME : "NIL",
        POSTAL:    info.POSTALCODE ?? "",
        LATITUDE:  lat,
        LONGITUDE: lng,
      }
    });
  } catch (err) {
    console.error("[RevGeocode]", err);
    return NextResponse.json({ address: null });
  }
}