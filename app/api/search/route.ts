// app/api/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { searchAddress } from "@/lib/onemap";

export async function GET(req: NextRequest) {
  const query = new URL(req.url).searchParams.get("q") ?? "";
  const results = await searchAddress(query);
  return NextResponse.json({ results });
}
