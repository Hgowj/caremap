"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import type { CommunityReport } from "@/lib/reports";
import type { ToiletLocation } from "@/lib/datasources";
import { REPORT_CONFIG } from "@/lib/reports";

type ClickMode = "report" | "set-origin" | "set-dest" | null;

interface MapProps {
  center: [number, number];
  zoom?: number;
  reports?: CommunityReport[];
  toilets?: ToiletLocation[];
  hawkers?: any[];
  events?: any[];
  onMapClick?: (lat: number, lng: number) => void;
  routePoints?: [number, number][];
  clickMode?: ClickMode;
}

export default function CareMap({
  center,
  zoom = 14,
  reports = [],
  toilets = [],
  hawkers = [],
  events  = [],
  onMapClick,
  routePoints = [],
  clickMode   = null,
}: MapProps) {
  const mapRef     = useRef<LeafletMap | null>(null);
  const divRef     = useRef<HTMLDivElement>(null);
  const clickCbRef = useRef(onMapClick);
  const prevCenter = useRef(center);
  const prevZoom   = useRef(zoom);

  useEffect(() => { clickCbRef.current = onMapClick; }, [onMapClick]);

  // ── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined" || !divRef.current) return;
    if ((divRef.current as any)._leaflet_id) return;

    import("leaflet").then((L) => {
      if (!divRef.current || (divRef.current as any)._leaflet_id) return;

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(divRef.current!, {
        center, zoom, zoomControl: false,
      });

      L.tileLayer("https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png", {
        attribution: 'Map © <a href="https://www.onemap.gov.sg">OneMap</a> | SLA',
        maxZoom: 19, minZoom: 11,
      }).addTo(map);

      L.control.zoom({ position: "bottomright" }).addTo(map);

      map.locate({ setView: false });
      map.on("locationfound", (e) => {
        L.marker(e.latlng, {
          icon: L.divIcon({
            html: `<div style="width:14px;height:14px;background:#0d9488;border:3px solid white;border-radius:50%;box-shadow:0 0 0 4px rgba(13,148,136,0.25)"></div>`,
            className: "", iconSize: [14, 14], iconAnchor: [7, 7],
          }),
        }).addTo(map).bindPopup("You are here");
      });

      // Use ref so listener never needs re-registering
      map.on("click", (e) => {
        if (clickCbRef.current) clickCbRef.current(e.latlng.lat, e.latlng.lng);
      });

      mapRef.current   = map;
      prevCenter.current = center;
      prevZoom.current   = zoom;

      renderAll(L, map, reports, toilets, hawkers, events, routePoints);
    });

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Move map only when center/zoom meaningfully changes ─────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    const [pLat, pLng] = prevCenter.current;
    const [nLat, nLng] = center;
    const moved = Math.abs(pLat - nLat) > 0.0001 || Math.abs(pLng - nLng) > 0.0001;
    const zoomed = prevZoom.current !== zoom;
    if (moved || zoomed) {
      mapRef.current.setView(center, zoom, { animate: true });
      prevCenter.current = center;
      prevZoom.current   = zoom;
    }
  }, [center, zoom]);

  // ── Re-render layers ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    import("leaflet").then((L) => {
      if (!mapRef.current) return;
      mapRef.current.eachLayer((layer) => {
        if (!("_url" in layer)) mapRef.current!.removeLayer(layer);
      });
      renderAll(L, mapRef.current, reports, toilets, hawkers, events, routePoints);
    });
  }, [reports, toilets, hawkers, events, routePoints]);

  const cursor = clickMode ? "crosshair" : "grab";

  return (
    <div ref={divRef} className="w-full h-full" style={{ zIndex: 0, cursor }} />
  );
}

// ── Render orchestrator ──────────────────────────────────────────────────────

function renderAll(
  L: typeof import("leaflet"),
  map: LeafletMap,
  reports: CommunityReport[],
  toilets: ToiletLocation[],
  hawkers: any[],
  events: any[],
  routePoints: [number, number][]
) {
  renderReports(L, map, reports);
  renderToilets(L, map, toilets);
  renderHawkers(L, map, hawkers);
  renderEvents(L, map, events);
  if (routePoints.length >= 2) renderRoute(L, map, routePoints);
}

function renderReports(L: typeof import("leaflet"), map: LeafletMap, reports: CommunityReport[]) {
  reports.forEach((r) => {
    const config = REPORT_CONFIG[r.category];
    if (!config) return;
    const icon = L.divIcon({
      html: `<div style="width:28px;height:28px;background:${config.color};border:2.5px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.25);"></div>`,
      className: "", iconSize: [28, 28], iconAnchor: [14, 28],
    });
    L.marker([r.lat, r.lng], { icon })
      .addTo(map)
      .bindPopup(`
        <div style="font-size:13px;padding:4px;min-width:160px">
          <strong>${config.emoji} ${config.label}</strong>
          ${(r as any).locationName ? `<br/><span style="color:#0d9488;font-size:11px">📍 ${(r as any).locationName}</span>` : ""}
          ${r.description ? `<br/><span style="color:#6b7280;font-size:12px">${r.description}</span>` : ""}
          <br/><span style="color:#9ca3af;font-size:11px">✓ ${r.confirmedCount} confirmed</span>
        </div>
      `);
  });
}

function renderToilets(L: typeof import("leaflet"), map: LeafletMap, toilets: ToiletLocation[]) {
  toilets.forEach((t) => {
    const icon = L.divIcon({
      html: `<div style="background:white;border:2px solid #0d9488;border-radius:8px;padding:2px 5px;font-size:13px;box-shadow:0 2px 6px rgba(0,0,0,0.15);white-space:nowrap;">${t.hasHandicap ? "♿🚽" : "🚽"}</div>`,
      className: "", iconSize: [40, 26], iconAnchor: [20, 13],
    });
    L.marker([t.lat, t.lng], { icon })
      .addTo(map)
      .bindPopup(`
        <div style="font-size:13px;padding:4px">
          <strong>${t.name}</strong><br/>
          ${t.hasHandicap ? "♿ Wheelchair accessible<br/>" : ""}
          ${t.hasBidet    ? "🚿 Bidet available"           : ""}
        </div>
      `);
  });
}

function renderHawkers(L: typeof import("leaflet"), map: LeafletMap, hawkers: any[]) {
  hawkers.forEach((h) => {
    const lat = h.lat ?? h.LATITUDE;
    const lng = h.lng ?? h.LONGITUDE;
    if (!lat || !lng) return;
    const icon = L.divIcon({
      html: `<div style="background:white;border:2px solid #f59e0b;border-radius:8px;padding:2px 5px;font-size:13px;box-shadow:0 2px 6px rgba(0,0,0,0.15);">🍜</div>`,
      className: "", iconSize: [34, 26], iconAnchor: [17, 13],
    });
    L.marker([lat, lng], { icon })
      .addTo(map)
      .bindPopup(`
        <div style="font-size:13px;padding:4px;min-width:160px">
          <strong>${h.name ?? h.NAME ?? "Hawker Centre"}</strong><br/>
          ${h.address ? `<span style="color:#6b7280;font-size:11px">${h.address}</span><br/>` : ""}
          <span style="color:#0d9488;font-size:11px">🚽 Toilets · 🪑 Seating · ☂️ Sheltered</span>
        </div>
      `);
  });
}

function renderEvents(L: typeof import("leaflet"), map: LeafletMap, events: any[]) {
  events.forEach((evt) => {
    if (!evt.lat || !evt.lng) return;
    const icon = L.divIcon({
      html: `<div style="background:white;border:2px solid #8b5cf6;border-radius:8px;padding:2px 5px;font-size:13px;box-shadow:0 2px 6px rgba(0,0,0,0.15);">📅</div>`,
      className: "", iconSize: [34, 26], iconAnchor: [17, 13],
    });
    L.marker([evt.lat, evt.lng], { icon })
      .addTo(map)
      .bindPopup(`
        <div style="font-size:13px;padding:4px;min-width:180px">
          <strong>${evt.title}</strong><br/>
          <span style="color:#8b5cf6;font-size:11px">📅 ${evt.date} · ${evt.time}</span><br/>
          <span style="color:#6b7280;font-size:11px">📍 ${evt.location}</span><br/>
          ${evt.accessible ? '<span style="color:#0d9488;font-size:11px">♿ Accessible</span>' : ""}
        </div>
      `);
  });
}

function renderRoute(L: typeof import("leaflet"), map: LeafletMap, points: [number, number][]) {
  L.polyline(points, {
    color: "#0d9488", weight: 5, opacity: 0.85,
    lineCap: "round", lineJoin: "round",
  }).addTo(map);

  L.marker(points[0], {
    icon: L.divIcon({
      html: `<div style="width:16px;height:16px;background:#16a34a;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(22,163,74,0.4)"></div>`,
      className: "", iconSize: [16, 16], iconAnchor: [8, 8],
    }),
  }).addTo(map).bindPopup("Start");

  L.marker(points[points.length - 1], {
    icon: L.divIcon({
      html: `<div style="width:16px;height:16px;background:#f43f5e;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(244,63,94,0.4)"></div>`,
      className: "", iconSize: [16, 16], iconAnchor: [8, 8],
    }),
  }).addTo(map).bindPopup("Destination");

  map.fitBounds(L.latLngBounds(points), { padding: [60, 40] });
}