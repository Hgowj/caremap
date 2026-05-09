import type { ReportCategory, CommunityReport } from "./reports";
import { REPORT_CONFIG, getAllActiveReports, addReport, confirmReport } from "./reports";

function getDB(): any {
  return (globalThis as any).DB ?? null;
}

export async function dbGetActiveReports(): Promise<CommunityReport[]> {
  const db = getDB();
  if (!db) return getAllActiveReports();
  const now = Date.now();
  const { results } = await db
    .prepare(`SELECT * FROM reports WHERE status = 'active' AND expires_at > ? ORDER BY created_at DESC`)
    .bind(now)
    .all();
  return results.map(rowToReport);
}

export async function dbAddReport(
  lat: number, lng: number,
  category: ReportCategory,
  description?: string,
  locationName?: string
): Promise<CommunityReport> {
  const db = getDB();
  if (!db) return addReport(lat, lng, category, description, locationName);
  const config    = REPORT_CONFIG[category];
  const id        = `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now       = Date.now();
  const expiresAt = now + config.ttlHours * 3_600_000;
  await db
    .prepare(`INSERT INTO reports (id, lat, lng, category, description, location_name, confirmed_count, created_at, expires_at, status) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, 'active')`)
    .bind(id, lat, lng, category, description ?? null, locationName ?? null, now, expiresAt)
    .run();
  return { id, lat, lng, category, description, locationName, confirmedCount: 1, createdAt: now, expiresAt, status: "active" } as any;
}

export async function dbConfirmReport(id: string): Promise<void> {
  const db = getDB();
  if (!db) { confirmReport(id); return; }
  await db.prepare(`UPDATE reports SET confirmed_count = confirmed_count + 1 WHERE id = ?`).bind(id).run();
}

export async function dbGetComments(reportId: string): Promise<Array<{ id: string; text: string; createdAt: number }>> {
  const db = getDB();
  if (!db) return [];
  const { results } = await db.prepare(`SELECT * FROM comments WHERE report_id = ? ORDER BY created_at ASC`).bind(reportId).all();
  return results.map((r: any) => ({ id: r.id, text: r.text, createdAt: r.created_at }));
}

export async function dbAddComment(reportId: string, text: string): Promise<void> {
  const db = getDB();
  if (!db) return;
  const id  = `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = Date.now();
  await db.prepare(`INSERT INTO comments (id, report_id, text, created_at) VALUES (?, ?, ?, ?)`).bind(id, reportId, text, now).run();
}

function rowToReport(r: any): CommunityReport {
  return {
    id: r.id, lat: r.lat, lng: r.lng, category: r.category,
    description: r.description ?? undefined,
    locationName: r.location_name ?? undefined,
    confirmedCount: r.confirmed_count,
    createdAt: r.created_at, expiresAt: r.expires_at, status: r.status,
  } as any;
}