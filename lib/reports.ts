// lib/reports.ts
// Community report store.
// Phase 1: in-memory (resets on server restart) — good for hackathon demo.
// Phase 2: swap reportStore for Cloudflare D1 calls.

export type ReportCategory =
  | "pothole"
  | "uneven_surface"
  | "no_ramp"
  | "broken_ramp"
  | "construction"
  | "steep_slope"
  | "no_shelter"
  | "crowded"
  | "toilet_closed"
  | "elevator_fault"
  | "flooded_path"
  | "rest_stop_closed"
  | "rest_stop_available";

export interface CommunityReport {
  id: string;
  lat: number;
  lng: number;
  locationName?: string;
  category: ReportCategory;
  description?: string;
  confirmedCount: number;
  createdAt: number; // unix ms
  expiresAt: number; // unix ms
  status: "active" | "expired" | "moderated";
}

// Category display config
export const REPORT_CONFIG: Record<ReportCategory, { label: string; emoji: string; ttlHours: number; color: string }> = {
  pothole:             { label: "Pothole",           emoji: "🕳️", ttlHours: 72,  color: "#f43f5e" },
  uneven_surface:      { label: "Uneven Surface",    emoji: "⚠️", ttlHours: 168, color: "#f59e0b" },
  no_ramp:             { label: "No Ramp / Steps",   emoji: "🚷", ttlHours: 720, color: "#dc2626" },
  broken_ramp:         { label: "Broken Ramp",       emoji: "♿", ttlHours: 168, color: "#f97316" },
  construction:        { label: "Construction",      emoji: "🚧", ttlHours: 168, color: "#d97706" },
  steep_slope:         { label: "Steep Slope",       emoji: "⛰️", ttlHours: 720, color: "#8b5cf6" },
  no_shelter:          { label: "No Shelter",        emoji: "☔", ttlHours: 720, color: "#3b82f6" },
  crowded:             { label: "Crowded Area",      emoji: "👥", ttlHours: 2,   color: "#6b7280" },
  toilet_closed:       { label: "Toilet Closed",     emoji: "🚽", ttlHours: 8,   color: "#ef4444" },
  elevator_fault:      { label: "Lift/Elevator Fault",emoji: "🛗", ttlHours: 24,  color: "#7c3aed" },
  flooded_path:        { label: "Flooded Path",      emoji: "🌊", ttlHours: 6,   color: "#0ea5e9" },
  rest_stop_closed:    { label: "Rest Stop Closed",  emoji: "🪑", ttlHours: 24,  color: "#dc2626" },
  rest_stop_available: { label: "Rest Stop Open",    emoji: "✅", ttlHours: 24,  color: "#16a34a" },
};

// ─── In-memory store (replace with D1 for production) ────────────────────────

const reportStore: CommunityReport[] = [
  // Seed with a couple of demo reports near Bishan

];

// ─── CRUD operations ─────────────────────────────────────────────────────────

export function getActiveReports(
  lat: number,
  lng: number,
  radiusDegrees: number = 0.01 // ~1.1km at Singapore's latitude
): CommunityReport[] {
  const now = Date.now();
  return reportStore.filter((r) => {
    if (r.status !== "active") return false;
    if (r.expiresAt < now) return false;
    const dlat = r.lat - lat;
    const dlng = r.lng - lng;
    return Math.sqrt(dlat * dlat + dlng * dlng) <= radiusDegrees;
  });
}

export function getAllActiveReports(): CommunityReport[] {
  const now = Date.now();
  return reportStore.filter((r) => r.status === "active" && r.expiresAt > now);
}

export function addReport(
  lat: number,
  lng: number,
  category: ReportCategory,
  description?: string,
  locationName?: string
): CommunityReport {
  const config = REPORT_CONFIG[category];
  const report: CommunityReport = {
    id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    lat,
    lng,
    locationName,
    category,
    description,
    confirmedCount: 1,
    createdAt: Date.now(),
    expiresAt: Date.now() + config.ttlHours * 3_600_000,
    status: "active",
  };
  reportStore.push(report);
  return report;
}

export function confirmReport(id: string): CommunityReport | null {
  const report = reportStore.find((r) => r.id === id);
  if (!report) return null;
  report.confirmedCount += 1;
  return report;
}
