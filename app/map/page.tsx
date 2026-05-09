"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Navigation, AlertCircle, Loader2, Flag, MapPin, Crosshair } from "lucide-react";
import SearchBar, { PlaceResult } from "@/components/SearchBar";
import ReportModal from "@/components/ReportModal";
import BottomNav from "@/components/BottomNav";
import type { CommunityReport } from "@/lib/reports";
import type { ToiletLocation } from "@/lib/datasources";

const CareMapView = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-gray-50 min-h-0">
      <Loader2 size={28} className="animate-spin text-teal-500" />
    </div>
  ),
});

const DEFAULT_CENTER: [number, number] = [1.3521, 103.8198];
type ClickMode = "report" | "set-origin" | "set-dest" | null;

async function reverseGeocodeClient(lat: number, lng: number): Promise<PlaceResult | null> {
  try {
    const res  = await fetch(`/api/reverse-geocode?lat=${lat}&lng=${lng}`);
    const data = await res.json() as any as any;
    return data.address ?? null;
  } catch { return null; }
}

// Fetch elevation profile along route points (sampled)
async function getElevationProfile(points: [number, number][]): Promise<number[]> {
  try {
    // Sample up to 20 points evenly
    const step    = Math.max(1, Math.floor(points.length / 20));
    const sampled = points.filter((_, i) => i % step === 0);
    const locations = sampled.map(([lat, lng]) => `${lat},${lng}`).join("|");
    const res  = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${sampled.map(p=>p[0]).join(",")}&longitude=${sampled.map(p=>p[1]).join(",")}`);
    const data = await res.json() as any as any;
    return data.elevation ?? [];
  } catch { return []; }
}

function analyseElevation(elevations: number[], mobilityAid: string): {
  maxGradient: number;
  totalAscent: number;
  warning: string | null;
  colour: string;
} {
  if (elevations.length < 2) return { maxGradient: 0, totalAscent: 0, warning: null, colour: "teal" };

  let maxGradient = 0;
  let totalAscent = 0;
  const STEP_METRES = 50; // approx horizontal distance per sample

  for (let i = 1; i < elevations.length; i++) {
    const rise     = elevations[i] - elevations[i - 1];
    const gradient = Math.abs(rise) / STEP_METRES * 100;
    if (gradient > maxGradient) maxGradient = gradient;
    if (rise > 0) totalAscent += rise;
  }

  const isWheelchair = mobilityAid === "wheelchair" || mobilityAid === "walking_frame";

  let warning: string | null = null;
  let colour = "teal";

  if (isWheelchair && maxGradient > 8) {
    warning = `⚠️ Very steep section detected (${maxGradient.toFixed(0)}% gradient). Consider public transport or an alternative route.`;
    colour = "red";
  } else if (isWheelchair && maxGradient > 5) {
    warning = `⚠️ Moderate slope ahead (${maxGradient.toFixed(0)}% gradient). May be challenging with a wheelchair.`;
    colour = "amber";
  } else if (maxGradient > 12) {
    warning = `⚠️ Steep hill along this route (${maxGradient.toFixed(0)}% gradient).`;
    colour = "amber";
  }

  return { maxGradient, totalAscent, warning, colour };
}

function MapPageInner() {
  const searchParams = useSearchParams();

  const [origin, setOrigin]               = useState<PlaceResult | null>(null);
  const [dest, setDest]                   = useState<PlaceResult | null>(null);
  const [originLabel, setOriginLabel]     = useState("");
  const [destLabel, setDestLabel]         = useState("");
  const [mapCenter, setMapCenter]         = useState<[number, number]>(DEFAULT_CENTER);
  const [mapZoom, setMapZoom]             = useState(14);
  const [routePoints, setRoutePoints]     = useState<[number, number][]>([]);
  const [reports, setReports]             = useState<CommunityReport[]>([]);
  const [toilets, setToilets]             = useState<ToiletLocation[]>([]);
  const [hawkers, setHawkers]             = useState<any[]>([]);
  const [events, setEvents]               = useState<any[]>([]);
  const [showToilets, setShowToilets]     = useState(false);
  const [showHawkers, setShowHawkers]     = useState(false);
  const [showEvents, setShowEvents]       = useState(false);
  const [routing, setRouting]             = useState(false);
  const [routeSummary, setRouteSummary] = useState<{
  time: number;
  distance: number;
  terrain: { classification: string; maxGradientPercent: number; totalAscent: number } | null;
} | null>(null);
  const [elevationInfo, setElevationInfo] = useState<{ maxGradient: number; totalAscent: number; warning: string | null; colour: string } | null>(null);
  const [clickMode, setClickMode]         = useState<ClickMode>(null);
  const [reportCoords, setReportCoords]   = useState<[number, number] | null>(null);
  const [panelOpen, setPanelOpen]         = useState(true);
  const [locating, setLocating]           = useState(false);
  const [mobilityAid, setMobilityAid]     = useState("wheelchair");

  // Load user preferences for mobility aid
  useEffect(() => {
    const stored = localStorage.getItem("caremap_prefs");
    if (stored) {
      try { setMobilityAid(JSON.parse(stored).mobilityAid ?? "wheelchair"); } catch {}
    }
  }, []);

  // Handle deep link from events
  useEffect(() => {
    const dLat  = searchParams.get("destLat");
    const dLng  = searchParams.get("destLng");
    const dName = searchParams.get("destName");
    if (dLat && dLng && dName) {
      const label = decodeURIComponent(dName);
      const place: PlaceResult = { ADDRESS: label, BUILDING: label, POSTAL: "", LATITUDE: dLat, LONGITUDE: dLng };
      setDest(place);
      setDestLabel(label);
      setMapCenter([parseFloat(dLat), parseFloat(dLng)]);
      setMapZoom(16);
      setPanelOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchReports();
    fetchHawkers();
    fetch("/events.json").then(r => r.json()).then(setEvents).catch(() => {});
  }, []);

  const fetchReports = async () => {
    try { const r = await fetch("/api/reports"); setReports((await r.json() as any).reports ?? []); } catch {}
  };
  const fetchToilets = async (lat: number, lng: number) => {
    try { const r = await fetch(`/api/pois?lat=${lat}&lng=${lng}&radius=800&types=toilet`); setToilets((await r.json() as any).toilets ?? []); } catch {}
  };
  const fetchHawkers = async () => {
    try { const r = await fetch("/api/pois?lat=1.3521&lng=103.8198&types=hawker"); setHawkers((await r.json() as any).hawkerCentres ?? []); } catch {}
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      const result = await reverseGeocodeClient(lat, lng);
      const label  = result ? (result.BUILDING !== "NIL" ? result.BUILDING : result.ADDRESS) : "My Location";
      const place: PlaceResult = result ?? { ADDRESS: "My Location", BUILDING: "My Location", POSTAL: "", LATITUDE: String(lat), LONGITUDE: String(lng) };
      setOrigin(place);
      setOriginLabel(label);
      setMapCenter([lat, lng]);
      setMapZoom(16);
      setLocating(false);
    }, () => setLocating(false));
  };

  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    if (!clickMode) return;

    if (clickMode === "report") {
      setReportCoords([lat, lng]);
      setClickMode(null);
      return;
    }

    const result = await reverseGeocodeClient(lat, lng);
    const label  = result
      ? (result.BUILDING !== "NIL" ? result.BUILDING : result.ADDRESS)
      : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    const place: PlaceResult = result ?? { ADDRESS: label, BUILDING: label, POSTAL: "", LATITUDE: String(lat), LONGITUDE: String(lng) };

    if (clickMode === "set-origin") { setOrigin(place); setOriginLabel(label); }
    else                            { setDest(place);   setDestLabel(label);   }
    setClickMode(null);
  }, [clickMode]);

  const handleRoute = async () => {
    if (!origin || !dest) return;
    setRouting(true);
    setRouteSummary(null);
    setElevationInfo(null);

    const sLat = parseFloat(origin.LATITUDE), sLng = parseFloat(origin.LONGITUDE);
    const eLat = parseFloat(dest.LATITUDE),   eLng = parseFloat(dest.LONGITUDE);

    try {
      const res  = await fetch(`/api/route?startLat=${sLat}&startLng=${sLng}&endLat=${eLat}&endLng=${eLng}`);
      const data = await res.json() as any as any;

      if (data.route_summary) {
        setRouteSummary({
          time: data.route_summary.total_time,
          distance: data.route_summary.total_distance,
          terrain: data.terrain ?? null,
        });

        // Use pre-decoded route_points from server (includes elevation analysis)
        if (data.route_points?.length >= 2) {
          setRoutePoints(data.route_points);
        } else {
          setRoutePoints([[sLat, sLng], [eLat, eLng]]);
        }

        setMapCenter([sLat, sLng]);
        setPanelOpen(false);
        if (showToilets) fetchToilets((sLat + eLat) / 2, (sLng + eLng) / 2);
      }
    } catch (e) { console.error(e); }
    finally { setRouting(false); }
  };

  const fmt = {
    t: (s: number) => { const m = Math.round(s / 60); return m < 60 ? `${m} min` : `${Math.floor(m/60)}h ${m%60}m`; },
    d: (m: number) => m >= 1000 ? `${(m/1000).toFixed(1)} km` : `${m} m`,
  };

  const bannerText =
    clickMode === "set-origin" ? "📍 Tap map to set start point" :
    clickMode === "set-dest"   ? "📍 Tap map to set destination" :
    clickMode === "report"     ? "🚩 Tap map to place report"    : null;

  const elevColour = elevationInfo?.colour === "red" ? "bg-red-50 border-red-200 text-red-700"
    : elevationInfo?.colour === "amber" ? "bg-amber-50 border-amber-200 text-amber-700"
    : "bg-teal-50 border-teal-200 text-teal-700";

  return (
    <div className="flex flex-col" style={{ height: "100dvh", overflow: "hidden" }}>

      {/* MAP */}
      <div className="flex-1 relative min-h-0">
        <CareMapView
          center={mapCenter}
          zoom={mapZoom}
          reports={reports}
          toilets={showToilets ? toilets : []}
          hawkers={showHawkers ? hawkers : []}
          events={showEvents ? events : []}
          onMapClick={handleMapClick}
          routePoints={routePoints}
          clickMode={clickMode}
        />

        {bannerText && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-gray-900/90 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg pointer-events-none whitespace-nowrap">
            {bannerText}
          </div>
        )}

        {/* Layer toggles */}
        <div className="absolute top-4 right-3 z-30 flex flex-col gap-2">
          <button
            onClick={() => { const n = !showToilets; setShowToilets(n); if (n) fetchToilets(mapCenter[0], mapCenter[1]); else setToilets([]); }}
            className={`w-10 h-10 rounded-xl shadow-md text-base flex items-center justify-center border transition-all ${showToilets ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-gray-200"}`}
            title="Toilets"
          >🚽</button>
          <button
            onClick={() => setShowHawkers(h => !h)}
            className={`w-10 h-10 rounded-xl shadow-md text-base flex items-center justify-center border transition-all ${showHawkers ? "bg-amber-500 border-amber-500 text-white" : "bg-white border-gray-200"}`}
            title="Hawker centres"
          >🍜</button>
          <button
            onClick={() => setShowEvents(e => !e)}
            className={`w-10 h-10 rounded-xl shadow-md text-base flex items-center justify-center border transition-all ${showEvents ? "bg-purple-500 border-purple-500 text-white" : "bg-white border-gray-200"}`}
            title="Events"
          >📅</button>
          <button
            onClick={() => setClickMode(m => m === "report" ? null : "report")}
            className={`w-10 h-10 rounded-xl shadow-md flex items-center justify-center border transition-all ${clickMode === "report" ? "bg-red-500 border-red-500 text-white" : "bg-white border-gray-200 text-gray-600"}`}
            title="Report issue"
          ><Flag size={16} /></button>
        </div>

        {reports.length > 0 && (
          <div className="absolute top-4 left-3 z-30 bg-white rounded-xl px-3 py-1.5 shadow-md border border-gray-100 flex items-center gap-1.5">
            <AlertCircle size={13} className="text-amber-500" />
            <span className="text-xs font-semibold text-gray-600">{reports.length} report{reports.length !== 1 ? "s" : ""}</span>
          </div>
        )}
      </div>

      {/* SEARCH PANEL */}
      <div className="shrink-0 bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.08)] z-20">
        <button onClick={() => setPanelOpen(p => !p)} className="w-full flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </button>

        {panelOpen && (
          <div className="px-4 pb-3 space-y-2">

            {/* Origin */}
            <div className="flex gap-2 items-center">
              <div className="flex-1">
                <SearchBar
                  placeholder="From — type or tap map"
                  icon="origin"
                  prefillValue={originLabel}
                  onSelect={(r) => { setOrigin(r); setOriginLabel(r.BUILDING !== "NIL" ? r.BUILDING : r.ADDRESS); setClickMode(null); }}
                />
              </div>
              <button
                onClick={handleUseMyLocation}
                disabled={locating}
                title="Use GPS location"
                className="shrink-0 w-10 h-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-teal-600 hover:bg-teal-50 transition-all"
              >
                {locating ? <Loader2 size={15} className="animate-spin" /> : <Crosshair size={15} />}
              </button>
              <button
                onClick={() => setClickMode(m => m === "set-origin" ? null : "set-origin")}
                title="Tap map to set start"
                className={`shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${clickMode === "set-origin" ? "bg-teal-600 border-teal-600 text-white" : "border-gray-200 bg-white text-gray-500"}`}
              ><MapPin size={15} /></button>
            </div>

            {/* Destination */}
            <div className="flex gap-2 items-center">
              <div className="flex-1">
                <SearchBar
                  placeholder="To — type or tap map"
                  icon="destination"
                  prefillValue={destLabel}
                  onSelect={(r) => { setDest(r); setDestLabel(r.BUILDING !== "NIL" ? r.BUILDING : r.ADDRESS); setClickMode(null); }}
                />
              </div>
              <button
                onClick={() => setClickMode(m => m === "set-dest" ? null : "set-dest")}
                title="Tap map to set destination"
                className={`shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${clickMode === "set-dest" ? "bg-red-500 border-red-500 text-white" : "border-gray-200 bg-white text-gray-500"}`}
              ><MapPin size={15} /></button>
            </div>

            <button
              onClick={handleRoute}
              disabled={!origin || !dest || routing}
              className="w-full py-3 rounded-2xl text-white font-semibold text-sm bg-teal-600 hover:bg-teal-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {routing
                ? <><Loader2 size={15} className="animate-spin" /> Calculating route…</>
                : <><Navigation size={15} /> Find Accessible Route</>}
            </button>

            {/* Route summary */}
            {routeSummary && (
            <div className="bg-brand-50 rounded-xl px-4 py-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-brand-700 font-semibold text-sm">🚶 {fmt.t(routeSummary.time)}</p>
                  <p className="text-brand-500 text-xs">{fmt.d(routeSummary.distance)} walking</p>
                </div>
                <p className="text-xs text-brand-600 font-medium">
                  {reports.length > 0 ? `⚠️ ${reports.length} flags nearby` : "✅ Route looks clear"}
                </p>
              </div>
              {routeSummary.terrain && (
                <div className="flex gap-2 flex-wrap pt-0.5">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                    routeSummary.terrain.classification === "flat"   ? "bg-green-100 text-green-700" :
                    routeSummary.terrain.classification === "gentle" ? "bg-yellow-100 text-yellow-700" :
                                                                        "bg-red-100 text-red-700"
                  }`}>
                    {routeSummary.terrain.classification === "flat"   ? "⟷ Mostly flat" :
                    routeSummary.terrain.classification === "gentle" ? "⤴ Gentle slopes" : "⬆ Steep"}
                  </span>
                  {routeSummary.terrain.maxGradientPercent > 0 && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                      Max {routeSummary.terrain.maxGradientPercent}% grade
                    </span>
                  )}
                  {routeSummary.terrain.totalAscent > 2 && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                      ↑ {routeSummary.terrain.totalAscent}m ascent
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
          </div>
        )}
      </div>

      <BottomNav />

      {reportCoords && (
        <ReportModal
          lat={reportCoords[0]}
          lng={reportCoords[1]}
          onClose={() => setReportCoords(null)}
          onSubmit={fetchReports}
        />
      )}
    </div>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center" style={{height:"100dvh"}}><Loader2 className="animate-spin text-teal-500" /></div>}>
      <MapPageInner />
    </Suspense>
  );
}