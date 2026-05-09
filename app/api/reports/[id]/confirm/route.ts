// app/api/reports/[id]/confirm/route.ts
import { NextRequest, NextResponse } from "next/server";
import { confirmReport } from "@/lib/reports";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const report = confirmReport(params.id);
  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }
  return NextResponse.json({ report });
}
