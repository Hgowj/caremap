import { NextRequest, NextResponse } from "next/server";
import { dbConfirmReport } from "@/lib/db";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  await dbConfirmReport(id);
  return NextResponse.json({ ok: true });
}