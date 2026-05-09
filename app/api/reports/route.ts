import { NextRequest, NextResponse } from "next/server";
import { getActiveReports, getAllActiveReports, addReport, ReportCategory } from "@/lib/reports";
import { reverseGeocode } from "@/lib/onemap";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat    = parseFloat(searchParams.get("lat") ?? "");
  const lng    = parseFloat(searchParams.get("lng") ?? "");
  const radius = parseFloat(searchParams.get("radius") ?? "0.01");

  const reports =
    isNaN(lat) || isNaN(lng)
      ? getAllActiveReports()
      : getActiveReports(lat, lng, radius);

  return NextResponse.json({ reports });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lat, lng, category, description } = body;

    if (!lat || !lng || !category) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const locationName = await reverseGeocode(parseFloat(lat), parseFloat(lng));

    const report = addReport(
      parseFloat(lat),
      parseFloat(lng),
      category as ReportCategory,
      description,
      locationName
    );

    return NextResponse.json({ report }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}