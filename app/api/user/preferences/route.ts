import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  const { env } = await getCloudflareContext({ async: true });
  const db = env.DB;
  const prefs = await db.prepare("SELECT * FROM user_preferences WHERE user_id = ?")
    .bind(session.userId).first();
  return NextResponse.json({ prefs: prefs ?? null });
}

export async function PUT(req: NextRequest) {
  const session = getSession(req);
  if (!session) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  const { env } = await getCloudflareContext({ async: true });
  const db = env.DB;
  const body = await req.json() as any;
  await db.prepare(`
    INSERT INTO user_preferences (user_id, user_type, mobility_aid, slope_pref, sheltered, rest_stops, washroom_access, washroom_freq, home_lat, home_lng, home_label)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      user_type=excluded.user_type, mobility_aid=excluded.mobility_aid,
      slope_pref=excluded.slope_pref, sheltered=excluded.sheltered,
      rest_stops=excluded.rest_stops, washroom_access=excluded.washroom_access,
      washroom_freq=excluded.washroom_freq, home_lat=excluded.home_lat,
      home_lng=excluded.home_lng, home_label=excluded.home_label
  `).bind(
    session.userId, body.userType ?? null, body.mobilityAid ?? null,
    body.slope ?? "any", body.sheltered ? 1 : 0, body.restStops ? 1 : 0,
    body.washroomAccess ? 1 : 0, body.washroomFreq ?? "500",
    body.homeLat ?? null, body.homeLng ?? null, body.homeLabel ?? null
  ).run();
  return NextResponse.json({ success: true });
}