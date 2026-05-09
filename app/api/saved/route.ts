import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session) return NextResponse.json({ saved: [] });
  const db = (process.env as any).DB as D1Database;
  const { results } = await db.prepare(
    "SELECT * FROM saved_locations WHERE user_id = ? ORDER BY created_at DESC"
  ).bind(session.userId).all();
  return NextResponse.json({ saved: results });
}

export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  const db = (process.env as any).DB as D1Database;
  const { label, address, lat, lng, icon } = await req.json();
  const id = crypto.randomUUID();
  await db.prepare(
    "INSERT INTO saved_locations (id, user_id, label, address, lat, lng, icon, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(id, session.userId, label, address ?? "", lat, lng, icon ?? "bookmark", Date.now()).run();
  return NextResponse.json({ success: true, id });
}

export async function DELETE(req: NextRequest) {
  const session = getSession(req);
  if (!session) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  const db = (process.env as any).DB as D1Database;
  const { id } = await req.json();
  await db.prepare("DELETE FROM saved_locations WHERE id = ? AND user_id = ?")
    .bind(id, session.userId).run();
  return NextResponse.json({ success: true });
}