"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AlertCircle, Loader2, Flag, MapPin, Crosshair, Clock, Search, ChevronLeft, ArrowUpDown } from "lucide-react";
import SearchBar, { PlaceResult } from "@/components/SearchBar";
import ReportModal from "@/components/ReportModal";
import BottomNav from "@/components/BottomNav";
import type { CommunityReport } from "@/lib/reports";

const CareMapView = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-gray-50 min-h-0">
      <Loader2 size={28} className="animate-spin text-brand-500" />
    </div>
  ),
});

const DEFAULT_CENTER: [number, number] = [1.3521, 103.8198];
type ClickMode = "report" | null;
type MapView = "home" | "entry" | "suggestions" | "preview";

interface RecentLocation {
  label: string;
  address: string;
  lat: number;
  lng: number;
  timestamp: number;
}

interface RouteVariant {
  id: "best" | "flattest" | "rest_stops" | "quickest";
  label: string;
  badge?: string;
  badgeColor?: string;
  time: number;
  distance: number;
  terrain: { classification: string; maxGradientPercent: number; totalAscent: number };
  shelterPercent: number;
  restStopCount: number;
  washroomCount: number;
  reportCount: number;
  routePoints: [number, number][];
}

async function reverseGeocodeClient(lat: number, lng: number): Promise<PlaceResult | null> {
  try {
    const res  = await fetch(`/api/reverse-geocode?lat=${lat}&lng=${lng}`);
    const data = await res.json() as any;
    return data.address ?? null;
  } catch { return null; }
}

function MapPageInner() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  // ── Core state ───────────────────────────────────────────────────────────────
  const [mapView, setMapView]           = useState<MapView>("home");
  const [origin, setOrigin]             = useState<PlaceResult | null>(null);
  const [dest, setDest]                 = useState<PlaceResult | null>(null);
  const [originLabel, setOriginLabel]   = useState("");
  const [destLabel, setDestLabel]       = useState("");
  const [mapCenter, setMapCenter]       = useState<[number, number]>(DEFAULT_CENTER);
  const [mapZoom, setMapZoom]           = useState(14);
  const [routePoints, setRoutePoints]   = useState<[number, number][]>([]);
  const [reports, setReports]           = useState<CommunityReport[]>([]);
  const [clickMode, setClickMode]       = useState<ClickMode>(null);
  const [reportCoords, setReportCoords] = useState<[number, number] | null>(null);
  const [locating, setLocating]         = useState(false);

  // ── Route planning state ─────────────────────────────────────────────────────
  const [travelMode, setTravelMode]         = useState<"walk" | "pt" | "drive">("walk");
  const [routing, setRouting]               = useState(false);
  const [routeVariants, setRouteVariants]   = useState<RouteVariant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<RouteVariant | null>(null);
  const [savedPrefs, setSavedPrefs]         = useState<any>(null);

  // ── User data ────────────────────────────────────────────────────────────────
  const [recentLocations, setRecentLocations] = useState<RecentLocation[]>([]);
  const [homeLocation, setHomeLocation]       = useState<{
    label: string; address: string; lat: number; lng: number;
  } | null>(null);

  // ── Layer system ─────────────────────────────────────────────────────────────
  const [activeLayers, setActiveLayers] = useState<Set<string>>(new Set());
  const [layerData, setLayerData]       = useState<Record<string, any[]>>({});

  // ── Load prefs + recent from localStorage ───────────────────────────────────
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem("cm_prefs") ?? "{}");
      setSavedPrefs(p);
      if (p.homeLocation) setHomeLocation(p.homeLocation);
    } catch {}
    try {
      const recent = JSON.parse(localStorage.getItem("cm_recent") ?? "[]");
      setRecentLocations(recent);
    } catch {}
  }, []);

  // ── Deep link from facilities page ───────────────────────────────────────────
  useEffect(() => {
    const dLat  = searchParams.get("destLat");
    const dLng  = searchParams.get("destLng");
    const dName = searchParams.get("destName");
    if (dLat && dLng && dName) {
      const label = decodeURIComponent(dName);
      const place: PlaceResult = {
        ADDRESS: label, BUILDING: label,
        POSTAL: "", LATITUDE: dLat, LONGITUDE: dLng,
      };
      setDest(place);
      setDestLabel(label);
      setMapCenter([parseFloat(dLat), parseFloat(dLng)]);
      setMapZoom(16);
      setMapView("entry");
    }
  }, [searchParams]);

  useEffect(() => {
    fetchReports();
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const saveRecentLocation = (label: string, address: string, lat: number, lng: number) => {
    try {
      const existing = JSON.parse(localStorage.getItem("cm_recent") ?? "[]") as RecentLocation[];
      const filtered = existing.filter(r => r.label !== label);
      const updated  = [{ label, address, lat, lng, timestamp: Date.now() }, ...filtered].slice(0, 5);
      localStorage.setItem("cm_recent", JSON.stringify(updated));
      setRecentLocations(updated);
    } catch {}
  };

  const fetchReports = async () => {
    try {
      const r = await fetch("/api/reports");
      setReports((await r.json() as any).reports ?? []);
    } catch {}
  };

  const fetchLayerData = async (key: string) => {
    try {
      if (key === "toilets") {
        const r = await fetch(`/api/pois?lat=${mapCenter[0]}&lng=${mapCenter[1]}&radius=800&types=toilet`);
        const d = await r.json() as any;
        setLayerData(prev => ({ ...prev, toilets: d.toilets ?? [] }));
      } else if (key === "hawkers") {
        const r = await fetch(`/api/pois?lat=1.3521&lng=103.8198&types=hawker`);
        const d = await r.json() as any;
        setLayerData(prev => ({ ...prev, hawkers: d.hawkerCentres ?? [] }));
      } else if (key === "medical") {
        const r = await fetch(`/api/facilities?types=chas,pharmacy`);
        const d = await r.json() as any;
        const items = [...(d.chas ?? []), ...(d.pharmacy ?? [])];
        setLayerData(prev => ({ ...prev, medical: items }));
      } else if (key === "eldercare") {
        const r = await fetch(`/api/facilities?types=eldercare`);
        const d = await r.json() as any;
        setLayerData(prev => ({ ...prev, eldercare: d.eldercare ?? [] }));
      } else if (key === "gyms") {
        const r = await fetch(`/api/facilities?types=gyms`);
        const d = await r.json() as any;
        setLayerData(prev => ({ ...prev, gyms: d.gyms ?? [] }));
      }
    } catch (e) {
      console.error(`[Layer] ${key} failed:`, e);
    }
  };

  const toggleLayer = async (key: string) => {
    const next = new Set(activeLayers);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
      if (!layerData[key]) {
        await fetchLayerData(key);
      }
    }
    setActiveLayers(next);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      const result = await reverseGeocodeClient(lat, lng);
      const label  = result
        ? (result.BUILDING !== "NIL" ? result.BUILDING : result.ADDRESS)
        : "My Location";
      const place: PlaceResult = result ?? {
        ADDRESS: "My Location", BUILDING: "My Location",
        POSTAL: "", LATITUDE: String(lat), LONGITUDE: String(lng),
      };
      setOrigin(place);
      setOriginLabel(label);
      setMapCenter([lat, lng]);
      setLocating(false);
    }, () => setLocating(false));
  };

  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (clickMode === "report") {
      setReportCoords([lat, lng]);
      setClickMode(null);
    }
  }, [clickMode]);

  const selectRecentAsDestination = (r: RecentLocation) => {
    const place: PlaceResult = {
      ADDRESS: r.address, BUILDING: r.label,
      POSTAL: "", LATITUDE: String(r.lat), LONGITUDE: String(r.lng),
    };
    setDest(place);
    setDestLabel(r.label);
  };

  const selectHomeAsDestination = () => {
    if (!homeLocation) return;
    const place: PlaceResult = {
      ADDRESS: homeLocation.address, BUILDING: homeLocation.label,
      POSTAL: "", LATITUDE: String(homeLocation.lat), LONGITUDE: String(homeLocation.lng),
    };
    setDest(place);
    setDestLabel(homeLocation.label);
  };

  const handleFindRoutes = async () => {
    if (!dest) return;
    setRouting(true);

    const sLat = origin ? parseFloat(origin.LATITUDE) : mapCenter[0];
    const sLng = origin ? parseFloat(origin.LONGITUDE) : mapCenter[1];
    const eLat = parseFloat(dest.LATITUDE);
    const eLng = parseFloat(dest.LONGITUDE);

    try {
      const res  = await fetch(`/api/route?startLat=${sLat}&startLng=${sLng}&endLat=${eLat}&endLng=${eLng}&mode=${travelMode}`);
      const data = await res.json() as any;

      if (!data.route_summary) { setRouting(false); return; }

      const base = {
        time:        data.route_summary.total_time,
        distance:    data.route_summary.total_distance,
        terrain:     data.terrain ?? { classification: "flat", maxGradientPercent: 0, totalAscent: 0 },
        routePoints: (data.route_points?.length >= 2 ? data.route_points : [[sLat, sLng], [eLat, eLng]]) as [number, number][],
        reportCount: reports.filter(r => {
          const d = Math.sqrt((r.lat - (sLat + eLat) / 2) ** 2 + (r.lng - (sLng + eLng) / 2) ** 2);
          return d < 0.01;
        }).length,
      };

      const baseShelter = base.terrain.classification === "flat" ? 80
        : base.terrain.classification === "gentle" ? 65 : 45;

      const variants: RouteVariant[] = [
        {
          id: "best",
          label: "Best match",
          badge: "BEST FOR YOU",
          time:           base.time,
          distance:       base.distance,
          terrain:        base.terrain,
          shelterPercent: baseShelter,
          restStopCount:  Math.max(1, Math.round(base.distance / 600)),
          washroomCount:  Math.max(1, Math.round(base.distance / 800)),
          reportCount:    base.reportCount,
          routePoints:    base.routePoints,
        },
        {
          id: "flattest",
          label: "Flattest path",
          time:           Math.round(base.time * 1.15),
          distance:       Math.round(base.distance * 1.1),
          terrain:        { classification: "flat", maxGradientPercent: 0.5, totalAscent: 0 },
          shelterPercent: Math.min(100, baseShelter - 15),
          restStopCount:  Math.max(2, Math.round(base.distance / 500)),
          washroomCount:  Math.max(0, Math.round(base.distance / 1000)),
          reportCount:    0,
          routePoints:    base.routePoints,
        },
        {
          id: "rest_stops",
          label: "Most rest stops",
          time:           Math.round(base.time * 1.25),
          distance:       Math.round(base.distance * 1.15),
          terrain:        { classification: "gentle", maxGradientPercent: 3, totalAscent: Math.round(base.distance * 0.01) },
          shelterPercent: Math.min(100, baseShelter + 5),
          restStopCount:  Math.max(3, Math.round(base.distance / 400)),
          washroomCount:  Math.max(1, Math.round(base.distance / 700)),
          reportCount:    0,
          routePoints:    base.routePoints,
        },
        {
          id: "quickest",
          label: "Quickest route",
          badge: (base.terrain.classification === "steep" || (savedPrefs?.slope === "flat" && base.terrain.maxGradientPercent > 3))
            ? "Less suitable" : undefined,
          time:           Math.round(base.time * 0.8),
          distance:       Math.round(base.distance * 0.85),
          terrain:        { classification: "gentle", maxGradientPercent: base.terrain.maxGradientPercent * 1.2, totalAscent: base.terrain.totalAscent },
          shelterPercent: Math.max(20, baseShelter - 30),
          restStopCount:  Math.max(0, Math.round(base.distance / 900)),
          washroomCount:  Math.max(0, Math.round(base.distance / 1200)),
          reportCount:    base.reportCount,
          routePoints:    base.routePoints,
        },
      ];

      setRouteVariants(variants);
      setRoutePoints(base.routePoints);
      setMapCenter([sLat, sLng]);

      const destName = dest.BUILDING !== "NIL" ? dest.BUILDING : dest.ADDRESS;
      saveRecentLocation(destName, dest.ADDRESS, eLat, eLng);

      setMapView("suggestions");
    } catch (e) {
      console.error("[Route] Error:", e);
    } finally {
      setRouting(false);
    }
  };

  const fmt = {
    t: (s: number) => {
      const m = Math.round(s / 60);
      return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`;
    },
    d: (m: number) => m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`,
  };

  const arriveTime = (seconds: number): string => {
    const now = new Date();
    now.setSeconds(now.getSeconds() + seconds);
    return now.toLocaleTimeString("en-SG", { hour: "numeric", minute: "2-digit", hour12: true });
  };

  const timeAgo = (ms: number) => {
    const diff = Date.now() - ms;
    const mins = Math.floor(diff / 60000);
    if (mins < 2) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col" style={{ height: "100dvh", overflow: "hidden" }}>

      {/* MAP */}
      <div className="flex-1 relative min-h-0">
        <CareMapView
          center={mapCenter}
          zoom={mapZoom}
          reports={reports}
          toilets={activeLayers.has("toilets") ? (layerData.toilets ?? []) : []}
          hawkers={activeLayers.has("hawkers") ? (layerData.hawkers ?? []) : []}
          facilities={[
            ...(activeLayers.has("medical")   ? (layerData.medical   ?? []) : []),
            ...(activeLayers.has("eldercare") ? (layerData.eldercare ?? []) : []),
            ...(activeLayers.has("gyms")      ? (layerData.gyms      ?? []) : []),
          ]}
          onMapClick={handleMapClick}
          routePoints={routePoints}
          clickMode={clickMode}
        />

        {/* Click mode banner */}
        {clickMode === "report" && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-gray-900/90 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg pointer-events-none whitespace-nowrap">
            🚩 Tap map to place report
          </div>
        )}

        {/* Layer toggles */}
        <div className="absolute top-4 right-3 z-30 flex flex-col gap-2">
          {([
            { key: "toilets",   icon: "🚽", activeColor: "bg-brand-600 border-brand-600"   },
            { key: "hawkers",   icon: "🍜", activeColor: "bg-amber-500 border-amber-500"   },
            { key: "medical",   icon: "🏥", activeColor: "bg-blue-500 border-blue-500"     },
            { key: "eldercare", icon: "👴", activeColor: "bg-purple-500 border-purple-500" },
            { key: "gyms",      icon: "🏋️", activeColor: "bg-orange-500 border-orange-500" },
          ] as const).map(btn => (
            <button
              key={btn.key}
              onClick={() => toggleLayer(btn.key)}
              title={btn.key}
              className={`w-10 h-10 rounded-xl shadow-md flex items-center justify-center border-2 transition-all text-base ${
                activeLayers.has(btn.key)
                  ? `${btn.activeColor} text-white`
                  : "bg-white border-gray-200"
              }`}
            >
              {btn.icon}
            </button>
          ))}
          <button
            onClick={() => setClickMode(m => m === "report" ? null : "report")}
            className={`w-10 h-10 rounded-xl shadow-md flex items-center justify-center border-2 transition-all ${
              clickMode === "report" ? "bg-red-500 border-red-500 text-white" : "bg-white border-gray-200 text-gray-600"
            }`}
          >
            <Flag size={16} />
          </button>
        </div>

        {/* Report count badge */}
        {reports.length > 0 && (
          <div className="absolute top-4 left-3 z-30 bg-white rounded-xl px-3 py-1.5 shadow-md border border-gray-100 flex items-center gap-1.5">
            <AlertCircle size={13} className="text-amber-500" />
            <span className="text-xs font-semibold text-gray-600">
              {reports.length} report{reports.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* ── HOME VIEW ──────────────────────────────────────────────────────────── */}
      {mapView === "home" && (
        <div className="shrink-0 bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.08)] z-20 rounded-t-3xl">
          {/* Search bar tap target */}
          <button
            onClick={() => setMapView("entry")}
            className="mx-4 mt-4 w-[calc(100%-2rem)] flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-left"
          >
            <Search size={16} className="text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-400">Where would you like to go?</span>
          </button>

          {/* Quick destination chips */}
          <div className="flex gap-2 px-4 mt-3 overflow-x-auto scrollbar-hide pb-1">
            {[
              { label: "Polyclinic", icon: "🏥" },
              { label: "Market",     icon: "🏪" },
              { label: "Park",       icon: "🌳" },
              { label: "Home",       icon: "🏠" },
            ].map(chip => (
              <button
                key={chip.label}
                onClick={() => { setDestLabel(chip.label); setMapView("entry"); }}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:border-brand-300 hover:text-brand-600 transition-all"
              >
                {chip.icon} {chip.label}
              </button>
            ))}
          </div>

          {/* Frequent trips */}
          {(recentLocations.length > 0 || homeLocation) && (
            <div className="px-4 mt-4 pb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Frequent trips</p>
              <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                {homeLocation && (
                  <button
                    onClick={() => { selectHomeAsDestination(); setMapView("entry"); }}
                    className="flex-shrink-0 w-36 bg-brand-50 border border-brand-100 rounded-2xl p-3 text-left"
                  >
                    <p className="text-xs text-brand-600 font-semibold">🏠 Home</p>
                    <p className="text-sm font-medium text-gray-700 truncate mt-0.5">{homeLocation.label}</p>
                    <p className="text-xs text-gray-400 mt-1">Saved location</p>
                  </button>
                )}
                {recentLocations.slice(0, 3).map((r, i) => (
                  <button
                    key={i}
                    onClick={() => { selectRecentAsDestination(r); setMapView("entry"); }}
                    className="flex-shrink-0 w-36 bg-white border border-gray-100 rounded-2xl p-3 text-left shadow-sm"
                  >
                    <p className="text-xs font-medium text-gray-700 truncate">{r.label}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{r.address}</p>
                    <p className="text-xs text-brand-500 font-medium mt-1.5">
                      {Math.round(Math.sqrt((r.lat - mapCenter[0]) ** 2 + (r.lng - mapCenter[1]) ** 2) * 111320 / 80)} min
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ENTRY VIEW ─────────────────────────────────────────────────────────── */}
      {mapView === "entry" && (
        <div className="shrink-0 bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.08)] z-20 rounded-t-3xl">
          <div className="flex items-center gap-3 px-4 pt-4 pb-3">
            <button
              onClick={() => setMapView("home")}
              className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center"
            >
              <ChevronLeft size={16} className="text-gray-600" />
            </button>
            <div>
              <p className="text-xs text-gray-400">CareMap</p>
              <p className="font-bold text-gray-900 text-lg leading-tight">Where do you want to go?</p>
            </div>
          </div>

          <div className="px-4 space-y-3 pb-4">
            {/* Origin */}
            <div className="flex items-center gap-2 bg-gray-50 border-2 border-gray-100 rounded-2xl px-3 py-3 focus-within:border-brand-400">
              <div className="w-2.5 h-2.5 rounded-full bg-brand-500 flex-shrink-0" />
              <span className="text-sm text-gray-700 flex-1 truncate">
                {originLabel || "My location"}
              </span>
              <button
                onClick={handleUseMyLocation}
                disabled={locating}
                className="text-brand-500 shrink-0"
              >
                {locating ? <Loader2 size={16} className="animate-spin" /> : <Crosshair size={16} />}
              </button>
            </div>

            {/* Destination + swap */}
            <div className="flex gap-2 items-center">
              <div className="flex-1">
                <SearchBar
                  placeholder="Search destination"
                  icon="destination"
                  prefillValue={destLabel}
                  onSelect={(r) => {
                    setDest(r);
                    setDestLabel(r.BUILDING !== "NIL" ? r.BUILDING : r.ADDRESS);
                  }}
                />
              </div>
              <button
                onClick={() => {
                  const tmp = origin; setOrigin(dest); setDest(tmp);
                  const tmpL = originLabel; setOriginLabel(destLabel); setDestLabel(tmpL);
                }}
                className="w-10 h-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-400"
              >
                <ArrowUpDown size={16} />
              </button>
            </div>

            {/* Travel mode */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">How are you travelling?</p>
              <div className="flex gap-2">
                {([
                  { id: "walk",  label: "Walking",  icon: "🚶" },
                  { id: "pt",    label: "Bus / MRT", icon: "🚌" },
                  { id: "drive", label: "Car",       icon: "🚗" },
                ] as const).map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => setTravelMode(mode.id)}
                    className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl border-2 transition-all text-xs font-semibold ${
                      travelMode === mode.id
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-gray-100 bg-gray-50 text-gray-500"
                    }`}
                  >
                    <span className="text-xl">{mode.icon}</span>
                    <span>{mode.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Travel preferences summary */}
            {savedPrefs && Object.keys(savedPrefs).length > 0 && (
              <div className="bg-gray-50 rounded-2xl px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-600">Your travel preferences</p>
                  <button
                    onClick={() => router.push("/settings")}
                    className="text-xs text-brand-500 font-medium"
                  >Edit</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {savedPrefs.mobilityAid === "wheelchair" && (
                    <span className="text-xs bg-white border border-gray-200 px-2.5 py-1 rounded-lg font-medium text-gray-600">♿ Wheelchair</span>
                  )}
                  {savedPrefs.sheltered && (
                    <span className="text-xs bg-white border border-gray-200 px-2.5 py-1 rounded-lg font-medium text-gray-600">☂️ Sheltered</span>
                  )}
                  {savedPrefs.restStops && (
                    <span className="text-xs bg-white border border-gray-200 px-2.5 py-1 rounded-lg font-medium text-gray-600">🪑 Rest stops</span>
                  )}
                  {savedPrefs.washroomAccess && (
                    <span className="text-xs bg-white border border-gray-200 px-2.5 py-1 rounded-lg font-medium text-gray-600">
                      🚽 Washroom / {savedPrefs.washroomFreq === "500" ? "500m" : savedPrefs.washroomFreq === "1000" ? "1km" : "1.5km"}
                    </span>
                  )}
                  {savedPrefs.slope === "flat" && (
                    <span className="text-xs bg-white border border-gray-200 px-2.5 py-1 rounded-lg font-medium text-gray-600">⟷ Flat only</span>
                  )}
                </div>
              </div>
            )}

            {/* Find routes button */}
            <button
              onClick={handleFindRoutes}
              disabled={!dest || routing}
              className="w-full py-4 rounded-2xl bg-brand-500 text-white font-semibold text-sm disabled:opacity-40 hover:bg-brand-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {routing
                ? <><Loader2 size={15} className="animate-spin" /> Finding routes…</>
                : "Find routes"}
            </button>
          </div>
        </div>
      )}

      {/* ── SUGGESTIONS VIEW ───────────────────────────────────────────────────── */}
      {mapView === "suggestions" && (
        <div className="shrink-0 bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.08)] z-20 rounded-t-3xl max-h-[70vh] flex flex-col">
          <div className="flex items-center gap-3 px-4 pt-4 pb-2 shrink-0">
            <button
              onClick={() => setMapView("entry")}
              className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center"
            >
              <ChevronLeft size={16} className="text-gray-600" />
            </button>
            <div className="flex-1">
              <p className="font-bold text-gray-900">Choose a route</p>
              <p className="text-xs text-gray-400">
                {originLabel || "My location"} → {destLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-50 shrink-0">
            <span className="text-sm">
              {travelMode === "walk" ? "🚶 Walking" : travelMode === "pt" ? "🚌 Bus / MRT" : "🚗 Car"}
            </span>
            <span className="text-xs text-gray-400">Sorted by best match</span>
          </div>

          <div className="overflow-y-auto flex-1 px-4 py-3 space-y-3">
            {routeVariants.map(v => (
              <button
                key={v.id}
                onClick={() => { setSelectedVariant(v); setRoutePoints(v.routePoints); setMapView("preview"); }}
                className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${
                  v.id === "best"
                    ? "border-brand-500 bg-white shadow-sm"
                    : "border-gray-100 bg-white hover:border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="font-bold text-gray-900">{v.label}</p>
                  {v.badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      v.id === "best"
                        ? "bg-brand-500 text-white"
                        : "bg-amber-100 text-amber-700"
                    }`}>{v.badge}</span>
                  )}
                </div>

                <p className="text-sm text-gray-600 mb-3">
                  {fmt.t(v.time)} · {fmt.d(v.distance)}
                  {v.id === "best" && (
                    <span className="text-gray-400"> · arrive {arriveTime(v.time)}</span>
                  )}
                </p>

                <div className="flex flex-wrap gap-2 mb-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    v.terrain.classification === "flat"
                      ? "bg-green-50 text-green-700"
                      : v.terrain.classification === "gentle"
                        ? "bg-yellow-50 text-yellow-700"
                        : "bg-red-50 text-red-700"
                  }`}>
                    ⟷ {v.terrain.classification === "flat" ? "Mostly flat" : v.terrain.classification === "gentle" ? "Gentle slope" : "Steep"}
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
                    ☂ {v.shelterPercent}% sheltered
                  </span>
                  {v.restStopCount > 0 && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
                      🪑 {v.restStopCount} rest stop{v.restStopCount !== 1 ? "s" : ""}
                    </span>
                  )}
                  {v.washroomCount > 0 && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
                      🚽 {v.washroomCount} washroom{v.washroomCount !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                {v.reportCount > 0 ? (
                  <p className="text-xs text-amber-600 font-medium">
                    ⚠️ {v.reportCount} community report{v.reportCount !== 1 ? "s" : ""} along this route
                  </p>
                ) : (
                  <p className="text-xs text-gray-300">0 reports</p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── PREVIEW VIEW ───────────────────────────────────────────────────────── */}
      {mapView === "preview" && selectedVariant && (
        <div className="shrink-0 bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.08)] z-20 rounded-t-3xl">
          <div className="flex items-center gap-3 px-4 pt-4 pb-3">
            <button
              onClick={() => setMapView("suggestions")}
              className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center"
            >
              <ChevronLeft size={16} className="text-gray-600" />
            </button>
            <div className="flex-1">
              <p className="text-xs font-semibold text-brand-500 uppercase tracking-wide">
                {selectedVariant.id === "best"       ? "✦ BEST MATCH"       :
                 selectedVariant.id === "flattest"   ? "⟷ FLATTEST PATH"    :
                 selectedVariant.id === "rest_stops" ? "🪑 MOST REST STOPS" : "⚡ QUICKEST"}
              </p>
              <p className="font-bold text-2xl text-gray-900">
                {fmt.t(selectedVariant.time)} · {fmt.d(selectedVariant.distance)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Arrive {arriveTime(selectedVariant.time)} · {originLabel || "My location"} → {destLabel}
              </p>
            </div>
          </div>

          <div className="px-4 pb-4 space-y-3">
            {/* 2×2 info grid */}
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  label: "Terrain",
                  value: selectedVariant.terrain.classification === "flat" ? "Mostly flat"
                    : selectedVariant.terrain.classification === "gentle" ? "Gentle slope" : "Steep",
                  color: selectedVariant.terrain.classification === "flat" ? "text-green-600"
                    : selectedVariant.terrain.classification === "gentle" ? "text-yellow-600" : "text-red-600",
                },
                {
                  label: "Shelter",
                  value: `${selectedVariant.shelterPercent}% covered`,
                  color: "text-blue-600",
                },
                {
                  label: "Rest stops",
                  value: `${selectedVariant.restStopCount} along route`,
                  color: "text-gray-700",
                },
                {
                  label: "Washroom",
                  value: selectedVariant.washroomCount > 0
                    ? `${selectedVariant.washroomCount} at ${fmt.d(Math.round(selectedVariant.distance / (selectedVariant.washroomCount + 1)))}`
                    : "None on route",
                  color: "text-gray-700",
                },
              ].map(item => (
                <div key={item.label} className="bg-gray-50 rounded-2xl px-3 py-3">
                  <p className="text-xs text-gray-400 mb-0.5">{item.label}</p>
                  <p className={`text-sm font-semibold ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </div>

            {/* Community report banner */}
            {selectedVariant.reportCount > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-3">
                <span className="text-amber-500 mt-0.5">⚠️</span>
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    {selectedVariant.reportCount} community report{selectedVariant.reportCount !== 1 ? "s" : ""}
                  </p>
                  {reports.slice(0, 1).map(r => (
                    <p key={r.id} className="text-xs text-amber-600 mt-0.5">
                      {r.description ?? r.category} — reported {timeAgo(r.createdAt)}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Start navigation */}
            <button
              onClick={() => {
                const url = `https://www.google.com/maps/dir/?api=1&origin=${
                  origin ? `${origin.LATITUDE},${origin.LONGITUDE}` : ""
                }&destination=${dest?.LATITUDE},${dest?.LONGITUDE}&travelmode=${
                  travelMode === "walk" ? "walking" : travelMode === "pt" ? "transit" : "driving"
                }`;
                window.open(url, "_blank");
              }}
              className="w-full py-4 rounded-2xl bg-brand-500 text-white font-semibold text-sm hover:bg-brand-600 active:scale-[0.98] transition-all"
            >
              Start navigation
            </button>
          </div>
        </div>
      )}

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
    <Suspense fallback={
      <div className="flex items-center justify-center" style={{ height: "100dvh" }}>
        <Loader2 className="animate-spin text-brand-500" />
      </div>
    }>
      <MapPageInner />
    </Suspense>
  );
}
