"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations } from "@/hooks/useTranslations";
import {
  Loader2, Flag, MapPin, Crosshair, Clock,
  Search, ChevronLeft, ArrowUpDown, AlertCircle,
} from "lucide-react";
import SearchBar, { PlaceResult } from "@/components/SearchBar";
import ReportModal from "@/components/ReportModal";
import BottomNav from "@/components/BottomNav";
import AgentChat from "@/components/AgentChat";
import AppShell from "@/components/AppShell";
import type { CommunityReport } from "@/lib/reports";
import type { ToiletLocation } from "@/lib/datasources";

const CareMapView = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-gray-50 min-h-0">
      <Loader2 size={28} className="animate-spin text-brand-500" />
    </div>
  ),
});

const DEFAULT_CENTER: [number, number] = [1.3521, 103.8198];

type MapView    = "home" | "entry" | "suggestions" | "preview";
type ClickMode  = "report" | "set-origin" | "set-dest" | null;
type TravelMode = "walk" | "pt" | "drive";

interface RecentLocation {
  label:     string;
  address:   string;
  lat:       number;
  lng:       number;
  timestamp: number;
}

interface RouteVariant {
  id:             "best" | "flattest" | "rest_stops" | "quickest";
  label:          string;
  subtitle?:      string;
  badge?:         string;
  badgeGreen?:    boolean;
  time:           number;
  distance:       number;
  terrain:        { classification: string; maxGradientPercent: number; totalAscent: number };
  shelterPercent: number;
  restStopCount:  number;
  washroomCount:  number;
  reportCount:    number;
  routePoints:    [number, number][];
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
  const t            = useTranslations("map");

  // View state
  const [mapView, setMapView] = useState<MapView>("home");

  // Route inputs
  const [origin,      setOrigin]      = useState<PlaceResult | null>(null);
  const [dest,        setDest]        = useState<PlaceResult | null>(null);
  const [originLabel, setOriginLabel] = useState("");
  const [destLabel,   setDestLabel]   = useState("");
  const [travelMode,  setTravelMode]  = useState<TravelMode>("walk");

  // Map state
  const [mapCenter,    setMapCenter]    = useState<[number, number]>(DEFAULT_CENTER);
  const [mapZoom,      setMapZoom]      = useState(12);
  const [routePoints,  setRoutePoints]  = useState<[number, number][]>([]);
  const [clickMode,    setClickMode]    = useState<ClickMode>(null);
  const [reportCoords, setReportCoords] = useState<[number, number] | null>(null);
  const [locating,     setLocating]     = useState(false);

  // Data
  const [reports,      setReports]      = useState<CommunityReport[]>([]);
  const [activeLayers, setActiveLayers] = useState<Set<string>>(new Set());
  const [layerData,    setLayerData]    = useState<Record<string, any[]>>({});

  // Routing
  const [routing,          setRouting]          = useState(false);
  const [routeVariants,    setRouteVariants]    = useState<RouteVariant[]>([]);
  const [selectedVariant,  setSelectedVariant]  = useState<RouteVariant | null>(null);

  // Saved data
  const [recentLocations, setRecentLocations] = useState<RecentLocation[]>([]);
  const [homeLocation,    setHomeLocation]    = useState<{ label: string; address: string; lat: number; lng: number } | null>(null);
  const [savedPrefs,      setSavedPrefs]      = useState<any>(null);

  // ── Load from localStorage ────────────────────────────────────────────────
  useEffect(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem("cm_prefs") ?? "{}");
      setSavedPrefs(prefs);
      if (prefs.homeLocation) setHomeLocation(prefs.homeLocation);
    } catch {}
    try {
      const recent = JSON.parse(localStorage.getItem("cm_recent") ?? "[]");
      setRecentLocations(recent);
    } catch {}
  }, []);

  // ── Deep link from Facilities page ───────────────────────────────────────
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
      setMapView("entry");
    }
  }, [searchParams]);

  // ── Initial fetch ─────────────────────────────────────────────────────────
  useEffect(() => { fetchReports(); }, []);

  const fetchReports = async () => {
    try {
      const r = await fetch("/api/reports");
      setReports((await r.json() as any).reports ?? []);
    } catch {}
  };

  // ── Layer management ──────────────────────────────────────────────────────
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
        setLayerData(prev => ({ ...prev, medical: [...(d.chas ?? []), ...(d.pharmacy ?? [])] }));
      } else if (key === "eldercare") {
        const r = await fetch(`/api/facilities?types=eldercare`);
        const d = await r.json() as any;
        setLayerData(prev => ({ ...prev, eldercare: d.eldercare ?? [] }));
      } else if (key === "gyms") {
        const r = await fetch(`/api/facilities?types=gyms`);
        const d = await r.json() as any;
        setLayerData(prev => ({ ...prev, gyms: d.gyms ?? [] }));
      }
    } catch (e) { console.error(`[Layer] ${key} failed:`, e); }
  };

  const toggleLayer = async (key: string) => {
    const next = new Set(activeLayers);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
      if (!layerData[key]) await fetchLayerData(key);
    }
    setActiveLayers(next);
  };

  // ── Location helpers ──────────────────────────────────────────────────────
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

  const selectHomeAsDestination = () => {
    if (!homeLocation) return;
    const place: PlaceResult = {
      ADDRESS: homeLocation.address, BUILDING: homeLocation.label,
      POSTAL: "", LATITUDE: String(homeLocation.lat), LONGITUDE: String(homeLocation.lng),
    };
    setDest(place);
    setDestLabel(homeLocation.label);
  };

  const selectRecentAsDestination = (r: RecentLocation) => {
    const place: PlaceResult = {
      ADDRESS: r.address, BUILDING: r.label,
      POSTAL: "", LATITUDE: String(r.lat), LONGITUDE: String(r.lng),
    };
    setDest(place);
    setDestLabel(r.label);
  };

  const saveRecentLocation = (label: string, address: string, lat: number, lng: number) => {
    try {
      const existing = JSON.parse(localStorage.getItem("cm_recent") ?? "[]") as RecentLocation[];
      const filtered = existing.filter(r => r.label !== label);
      const updated  = [{ label, address, lat, lng, timestamp: Date.now() }, ...filtered].slice(0, 5);
      localStorage.setItem("cm_recent", JSON.stringify(updated));
      setRecentLocations(updated);
    } catch {}
  };

  // ── Map click ─────────────────────────────────────────────────────────────
  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    if (!clickMode) return;
    if (clickMode === "report") { setReportCoords([lat, lng]); setClickMode(null); return; }
    const result = await reverseGeocodeClient(lat, lng);
    const label  = result ? (result.BUILDING !== "NIL" ? result.BUILDING : result.ADDRESS) : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    const place: PlaceResult = result ?? { ADDRESS: label, BUILDING: label, POSTAL: "", LATITUDE: String(lat), LONGITUDE: String(lng) };
    if (clickMode === "set-origin") { setOrigin(place); setOriginLabel(label); }
    else                            { setDest(place);   setDestLabel(label);   }
    setClickMode(null);
  }, [clickMode]);

  // ── Route finding ─────────────────────────────────────────────────────────
  const handleFindRoutes = async () => {
    if (!dest) return;
    setRouting(true);

    const sLat = origin ? parseFloat(origin.LATITUDE)  : mapCenter[0];
    const sLng = origin ? parseFloat(origin.LONGITUDE) : mapCenter[1];
    const eLat = parseFloat(dest.LATITUDE);
    const eLng = parseFloat(dest.LONGITUDE);

    try {
      const res  = await fetch(`/api/route?startLat=${sLat}&startLng=${sLng}&endLat=${eLat}&endLng=${eLng}&mode=${travelMode}`);
      const data = await res.json() as any;

      if (!data.route_summary) { setRouting(false); return; }

      const terrain = data.terrain ?? { classification: "flat", maxGradientPercent: 0, totalAscent: 0 };
      const pts     = data.route_points ?? [[sLat, sLng], [eLat, eLng]];
      const baseDist = data.route_summary.total_distance;
      const baseTime = Math.round(data.route_summary.total_time *
        (savedPrefs?.mobilityAid === "wheelchair" || savedPrefs?.mobilityAid === "frame" ? 1.25 : 1.0));

      const nearbyReports = reports.filter(r => {
        const d = Math.sqrt((r.lat - (sLat + eLat) / 2) ** 2 + (r.lng - (sLng + eLng) / 2) ** 2);
        return d < 0.015;
      }).length;

      const baseShelter   = terrain.classification === "flat" ? 75 : terrain.classification === "gentle" ? 60 : 40;
      const baseRestStops = Math.max(1, Math.round(baseDist / 450));
      const baseWashrooms = Math.max(0, Math.round(baseDist / 700));

      const variants: RouteVariant[] = [
        {
          id: "best", label: "Best match", subtitle: "Safest & most accessible", badge: "BEST FOR YOU", badgeGreen: true,
          time: baseTime, distance: baseDist, terrain, shelterPercent: baseShelter,
          restStopCount: baseRestStops,
          washroomCount: baseWashrooms,
          reportCount: nearbyReports, routePoints: pts,
        },
        {
          id: "flattest", label: "Flattest path",
          time: Math.round(baseTime * 1.18), distance: Math.round(baseDist * 1.12),
          terrain: { classification: "flat", maxGradientPercent: 0.8, totalAscent: 0 },
          shelterPercent: Math.min(90, baseShelter + 5),
          restStopCount: Math.max(2, baseRestStops + 1),
          washroomCount: baseWashrooms,
          reportCount: 0, routePoints: pts,
        },
        {
          id: "rest_stops", label: "Most rest stops",
          time: Math.round(baseTime * 1.22), distance: Math.round(baseDist * 1.14),
          terrain: { classification: terrain.classification === "steep" ? "gentle" : terrain.classification as any, maxGradientPercent: Math.min(terrain.maxGradientPercent, 4), totalAscent: Math.round(baseDist * 0.008) },
          shelterPercent: Math.min(85, baseShelter + 8),
          restStopCount: Math.max(3, Math.round(baseDist / 350)),
          washroomCount: Math.max(1, Math.round(baseDist / 600)),
          reportCount: 0, routePoints: pts,
        },
        {
          id: "quickest", label: "Quickest route",
          badge: (savedPrefs?.slope === "flat" && terrain.maxGradientPercent > 4) ||
                 (savedPrefs?.mobilityAid === "wheelchair" && terrain.classification === "steep")
                 ? "Less suitable" : undefined,
          badgeGreen: false,
          time: Math.round(baseTime * 0.78), distance: Math.round(baseDist * 0.82),
          terrain: { classification: "gentle", maxGradientPercent: terrain.maxGradientPercent * 1.3, totalAscent: terrain.totalAscent },
          shelterPercent: Math.max(25, baseShelter - 25),
          restStopCount: Math.max(0, Math.round(baseDist / 1000)),
          washroomCount: Math.max(0, Math.round(baseDist / 1100)),
          reportCount: nearbyReports, routePoints: pts,
        },
      ];

      setRouteVariants(variants);
      setRoutePoints(pts);
      setMapCenter([sLat, sLng]);
      setMapView("suggestions");
    } catch (e) { console.error("[Route]", e); }
    finally { setRouting(false); }
  };

  // ── Formatters ────────────────────────────────────────────────────────────
  const fmt = {
    t: (s: number) => { const m = Math.round(s / 60); return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`; },
    d: (m: number) => m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`,
  };

  const arriveTime = (seconds: number) => {
    const now = new Date();
    now.setSeconds(now.getSeconds() + seconds);
    return now.toLocaleTimeString("en-SG", { hour: "numeric", minute: "2-digit", hour12: true });
  };

  const timeAgo = (ms: number) => {
    const diff = Date.now() - ms;
    const mins = Math.floor(diff / 60000);
    if (mins < 2)  return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const terrainLabel = (c: string) =>
    c === "flat" ? t("mostlyFlat") : c === "gentle" ? t("gentleSlope") : t("steep");

  const terrainColor = (c: string) =>
    c === "flat" ? "bg-green-50 text-green-700" : c === "gentle" ? "bg-yellow-50 text-yellow-700" : "bg-red-50 text-red-700";

  const bannerText =
    clickMode === "set-origin" ? "📍 Tap map to set start point" :
    clickMode === "set-dest"   ? "📍 Tap map to set destination" :
    clickMode === "report"     ? "🚩 Tap map to place report"    : null;

  const facilityMarkers = [
    ...(activeLayers.has("medical")   ? (layerData.medical   ?? []) : []),
    ...(activeLayers.has("eldercare") ? (layerData.eldercare ?? []) : []),
    ...(activeLayers.has("gyms")      ? (layerData.gyms      ?? []) : []),
  ];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col" style={{ height: "100dvh", overflow: "hidden" }}>

      {/* MAP — always visible */}
      <div className="flex-1 relative min-h-0">
        <CareMapView
          center={mapCenter}
          zoom={mapZoom}
          reports={reports}
          toilets={activeLayers.has("toilets") ? (layerData.toilets ?? []) : []}
          hawkers={activeLayers.has("hawkers") ? (layerData.hawkers ?? []) : []}
          facilities={facilityMarkers}
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
          {[
            { key: "toilets",   icon: "🚽", color: "bg-brand-600 border-brand-600"   },
            { key: "hawkers",   icon: "🍜", color: "bg-amber-500 border-amber-500"   },
            { key: "medical",   icon: "🏥", color: "bg-blue-500 border-blue-500"     },
            { key: "eldercare", icon: "👴", color: "bg-purple-500 border-purple-500" },
            { key: "gyms",      icon: "🏋️", color: "bg-orange-500 border-orange-500" },
          ].map(btn => (
            <button
              key={btn.key}
              onClick={() => toggleLayer(btn.key)}
              title={btn.key}
              className={`w-10 h-10 rounded-xl shadow-md flex items-center justify-center border-2 transition-all text-base ${
                activeLayers.has(btn.key) ? `${btn.color} text-white` : "bg-white border-gray-200"
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

        {reports.length > 0 && mapView === "home" && (
          <div className="absolute top-4 left-3 z-30 bg-white rounded-xl px-3 py-1.5 shadow-md border border-gray-100 flex items-center gap-1.5">
            <AlertCircle size={13} className="text-amber-500" />
            <span className="text-xs font-semibold text-gray-600">{reports.length} {reports.length === 1 ? t("reportCount") : t("reportCountPlural")}</span>
          </div>
        )}
      </div>

      {/* ── HOME ─────────────────────────────────────────────────────────── */}
      {mapView === "home" && (
        <div className="shrink-0 bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.08)] z-20 rounded-t-3xl">
          <button
            onClick={() => setMapView("entry")}
            className="mx-4 mt-4 w-[calc(100%-2rem)] flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-left"
          >
            <Search size={16} className="text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-400">{t("searchPlaceholder")}</span>
          </button>

          <div className="px-4 mt-3 pb-4">
            {(recentLocations.length > 0 || homeLocation) && (
              <>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t("recentSearches")}</p>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                  {homeLocation && (
                    <button
                      onClick={() => { selectHomeAsDestination(); setMapView("entry"); }}
                      className="flex-shrink-0 w-36 bg-brand-50 border border-brand-100 rounded-2xl p-3 text-left"
                    >
                      <p className="text-xs text-brand-600 font-semibold">🏠 {t("home")}</p>
                      <p className="text-sm font-medium text-gray-700 truncate mt-0.5">{homeLocation.label}</p>
                      <p className="text-xs text-gray-400 mt-1">{t("savedLocation")}</p>
                    </button>
                  )}
                  {recentLocations.slice(0, 3).map((r, i) => (
                    <button
                      key={i}
                      onClick={() => { selectRecentAsDestination(r); setMapView("entry"); }}
                      className="flex-shrink-0 w-36 bg-white border border-gray-100 rounded-2xl p-3 text-left shadow-sm"
                    >
                      <div className="flex items-center gap-1 mb-1">
                        <Clock size={10} className="text-gray-400" />
                        <span className="text-[10px] text-gray-400">{timeAgo(r.timestamp)}</span>
                      </div>
                      <p className="text-sm font-medium text-gray-700 truncate">{r.label}</p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{r.address}</p>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── ENTRY ────────────────────────────────────────────────────────── */}
      {mapView === "entry" && (
        <div className="shrink-0 bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.08)] z-20 rounded-t-3xl">
          <div className="flex items-center gap-3 px-4 pt-4 pb-2">
            <button onClick={() => setMapView("home")} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
              <ChevronLeft size={16} className="text-gray-600" />
            </button>
            <div>
              <p className="text-xs text-gray-400">CareMap</p>
              <p className="font-bold text-gray-900 text-lg leading-tight">Where do you want to go?</p>
            </div>
          </div>

          <div className="px-4 space-y-2.5 pb-4">
            {/* Origin — editable */}
            <div className="flex gap-2 items-center">
              <div className="flex-1">
                <SearchBar
                  placeholder={originLabel || t("tapToChange")}
                  icon="origin"
                  prefillValue={originLabel}
                  onSelect={r => { setOrigin(r); setOriginLabel(r.BUILDING !== "NIL" ? r.BUILDING : r.ADDRESS); }}
                />
              </div>
              <button
                onClick={handleUseMyLocation}
                disabled={locating}
                title="Use GPS"
                className="shrink-0 w-10 h-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-brand-600 hover:bg-brand-50 transition-all"
              >
                {locating ? <Loader2 size={15} className="animate-spin" /> : <Crosshair size={15} />}
              </button>
            </div>

            {/* Destination + swap */}
            <div className="flex gap-2 items-center">
              <div className="flex-1">
                <SearchBar
                  placeholder={t("searchDestination")}
                  icon="destination"
                  prefillValue={destLabel}
                  onSelect={r => { setDest(r); setDestLabel(r.BUILDING !== "NIL" ? r.BUILDING : r.ADDRESS); }}
                />
              </div>
              <button
                onClick={() => {
                  const tmpO = origin; const tmpOL = originLabel;
                  setOrigin(dest);  setOriginLabel(destLabel);
                  setDest(tmpO);    setDestLabel(tmpOL);
                }}
                className="shrink-0 w-10 h-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:bg-gray-50"
              >
                <ArrowUpDown size={16} />
              </button>
            </div>

            {/* Home preset */}
            {homeLocation && !dest && (
              <button
                onClick={selectHomeAsDestination}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-brand-50 hover:bg-brand-100 transition-all text-left border border-brand-100"
              >
                <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0">
                  <MapPin size={13} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-brand-600 font-semibold uppercase tracking-wide">{t("home")}</p>
                  <p className="text-sm font-medium text-gray-700 truncate">{homeLocation.label}</p>
                </div>
              </button>
            )}

            {/* Recent */}
            {recentLocations.length > 0 && !dest && (
              <div className="space-y-1">
                <p className="text-[11px] text-gray-400 font-medium px-1">{t("recent")}</p>
                {recentLocations.slice(0, 2).map((r, i) => (
                  <button
                    key={i}
                    onClick={() => selectRecentAsDestination(r)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 hover:bg-brand-50 transition-all text-left"
                  >
                    <div className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                      <Clock size={13} className="text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{r.label}</p>
                      <p className="text-xs text-gray-400 truncate">{r.address}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Travel mode */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">{t("howTravelling")}</p>
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
                        : "border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200"
                    }`}
                  >
                    <span className="text-xl">{mode.icon}</span>
                    <span>{t(mode.id)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Prefs summary */}
            {savedPrefs && (savedPrefs.mobilityAid || savedPrefs.sheltered || savedPrefs.restStops || savedPrefs.washroomAccess || savedPrefs.slope === "flat") && (
              <div className="bg-gray-50 rounded-2xl px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-600">{t("travelPreferences")}</p>
                  <button onClick={() => router.push("/settings")} className="text-xs text-brand-500 font-medium">{t("edit")}</button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {savedPrefs.mobilityAid === "wheelchair" && <span className="text-xs bg-white border border-gray-200 px-2.5 py-1 rounded-lg font-medium text-gray-600">♿ {t("wheelchair")}</span>}
                  {savedPrefs.sheltered    && <span className="text-xs bg-white border border-gray-200 px-2.5 py-1 rounded-lg font-medium text-gray-600">☂️ {t("sheltered")}</span>}
                  {savedPrefs.restStops    && <span className="text-xs bg-white border border-gray-200 px-2.5 py-1 rounded-lg font-medium text-gray-600">🪑 {t("restStops")}</span>}
                  {savedPrefs.washroomAccess && <span className="text-xs bg-white border border-gray-200 px-2.5 py-1 rounded-lg font-medium text-gray-600">🚽 {t("washroom")} / {savedPrefs.washroomFreq === "500" ? "500m" : savedPrefs.washroomFreq === "1000" ? "1km" : "1.5km"}</span>}
                  {savedPrefs.slope === "flat" && <span className="text-xs bg-white border border-gray-200 px-2.5 py-1 rounded-lg font-medium text-gray-600">⟷ {t("flatOnly")}</span>}
                </div>
              </div>
            )}

            <button
              onClick={handleFindRoutes}
              disabled={!dest || routing}
              className="w-full py-4 rounded-2xl bg-brand-500 text-white font-semibold text-sm disabled:opacity-40 hover:bg-brand-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {routing ? <><Loader2 size={15} className="animate-spin" /> {t("findingRoutes")}</> : t("findRoutes")}
            </button>
          </div>
        </div>
      )}

      {/* ── SUGGESTIONS ──────────────────────────────────────────────────── */}
      {mapView === "suggestions" && (
        <div className="shrink-0 bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.08)] z-20 rounded-t-3xl flex flex-col" style={{ maxHeight: "72vh" }}>
          <div className="flex items-center gap-3 px-4 pt-4 pb-2 shrink-0">
            <button onClick={() => setMapView("entry")} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
              <ChevronLeft size={16} className="text-gray-600" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900">{t("chooseRoute")}</p>
              <p className="text-xs text-gray-400 truncate">{originLabel || t("myLocation")} → {destLabel}</p>
            </div>
          </div>

          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-50 shrink-0">
            <span className="text-sm font-medium text-gray-700">
              {travelMode === "walk" ? `🚶 ${t("walk")}` : travelMode === "pt" ? `🚌 ${t("pt")}` : `🚗 ${t("drive")}`}
            </span>
            <span className="text-xs text-gray-400">{t("sortedByBestMatch")}</span>
          </div>

          <div className="overflow-y-auto flex-1 px-4 py-3 space-y-3">
            {routeVariants.map(v => (
              <button
                key={v.id}
                onClick={() => { setSelectedVariant(v); setRoutePoints(v.routePoints); setMapView("preview"); }}
                className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${
                  v.id === "best" ? "border-brand-500 bg-white shadow-sm" : "border-gray-100 bg-white hover:border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <div>
                    <p className="font-bold text-gray-900">
                      {v.id === "best" ? t("bestMatch") : v.id === "flattest" ? t("flattest") : v.id === "rest_stops" ? t("mostRestStops") : t("quickest")}
                    </p>
                    {v.subtitle && (
                      <p className="text-xs text-brand-500 font-medium">{v.subtitle}</p>
                    )}
                  </div>
                  {v.badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      v.badgeGreen ? "bg-brand-500 text-white" : "bg-amber-100 text-amber-700"
                    }`}>{v.badgeGreen ? t("bestForYou") : t("lessSuitable")}</span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mb-2.5">
                  {fmt.t(v.time)} · {fmt.d(v.distance)}
                  {v.id === "best" && <span className="text-gray-400"> · {t("arrive")} {arriveTime(v.time)}</span>}
                </p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${terrainColor(v.terrain.classification)}`}>
                    ⟷ {terrainLabel(v.terrain.classification)}
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
                    ☂ {v.shelterPercent}% {t("shelterPct")}
                  </span>
                  {v.restStopCount > 0 && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
                      🪑 {v.restStopCount} {v.restStopCount === 1 ? t("restStopCount") : t("restStopCountPlural")}
                    </span>
                  )}
                  {v.washroomCount > 0 && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
                      🚽 {v.washroomCount} {v.washroomCount === 1 ? t("washroomCount") : t("washroomCountPlural")}
                    </span>
                  )}
                </div>
                {v.reportCount > 0 ? (
                  <p className="text-xs text-amber-600 font-medium">⚠️ {v.reportCount} {v.reportCount === 1 ? t("communityReport") : t("communityReportPlural")} {t("alongThisRoute")}</p>
                ) : (
                  <p className="text-xs text-gray-300">{t("noReports")}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── PREVIEW ──────────────────────────────────────────────────────── */}
      {mapView === "preview" && selectedVariant && (
        <div className="shrink-0 bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.08)] z-20 rounded-t-3xl">
          <div className="flex items-center gap-3 px-4 pt-4 pb-3">
            <button onClick={() => setMapView("suggestions")} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
              <ChevronLeft size={16} className="text-gray-600" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-brand-500 uppercase tracking-wide">
                {selectedVariant.id === "best"       ? t("bestMatch_label")  :
                 selectedVariant.id === "flattest"   ? t("flattest_label")   :
                 selectedVariant.id === "rest_stops" ? t("restStops_label")  : t("quickest_label")}
              </p>
              <p className="font-bold text-2xl text-gray-900 leading-tight">
                {fmt.t(selectedVariant.time)} · {fmt.d(selectedVariant.distance)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5 truncate">
                {t("arrive")} {arriveTime(selectedVariant.time)} · {originLabel || t("myLocation")} → {destLabel}
              </p>
            </div>
          </div>

          <div className="px-4 pb-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: t("terrain"),    value: terrainLabel(selectedVariant.terrain.classification), color: terrainColor(selectedVariant.terrain.classification).split(" ")[1] },
                { label: t("shelter"),    value: `${selectedVariant.shelterPercent}% ${t("covered")}`,  color: "text-blue-600"  },
                { label: t("restStops"), value: `${selectedVariant.restStopCount} ${t("alongRoute")}`,  color: "text-gray-700"  },
                { label: t("washroom"),   value: selectedVariant.washroomCount > 0
                    ? `${selectedVariant.washroomCount} at ${fmt.d(Math.round(selectedVariant.distance / (selectedVariant.washroomCount + 1)))}`
                    : t("noneOnRoute"),
                  color: "text-gray-700" },
              ].map(item => (
                <div key={item.label} className="bg-gray-50 rounded-2xl px-3 py-3">
                  <p className="text-xs text-gray-400 mb-0.5">{item.label}</p>
                  <p className={`text-sm font-semibold ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </div>

            {/* Why this route — only for best match */}
            {selectedVariant.id === "best" && (
              <div className="bg-brand-50 border border-brand-100 rounded-2xl px-4 py-3">
                <p className="text-xs font-semibold text-brand-700 mb-1">✦ Why this is the best match</p>
                <p className="text-xs text-brand-600 leading-relaxed">
                  This route balances terrain, shelter, and rest stop availability based on your
                  {savedPrefs?.mobilityAid === "wheelchair" ? " wheelchair" :
                   savedPrefs?.mobilityAid === "frame"      ? " walking frame" :
                   savedPrefs?.mobilityAid === "scooter"    ? " mobility scooter" :
                   " companion's"} needs
                  {savedPrefs?.slope === "flat" ? ", avoids steep slopes" : ""}
                  {savedPrefs?.sheltered ? ", maximises covered walkways" : ""}
                  {savedPrefs?.washroomAccess ? ", and keeps toilets within reach" : ""}.
                </p>
              </div>
            )}

            {selectedVariant.reportCount > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-3">
                <span className="text-amber-500 mt-0.5 flex-shrink-0">⚠️</span>
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    {selectedVariant.reportCount} {selectedVariant.reportCount === 1 ? t("communityReport") : t("communityReportPlural")}
                  </p>
                  {reports.slice(0, 1).map(r => (
                    <p key={r.id} className="text-xs text-amber-600 mt-0.5">
                      {r.description ?? r.category} — reported {timeAgo(r.createdAt)}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => {
                const sLat = origin ? origin.LATITUDE  : String(mapCenter[0]);
                const sLng = origin ? origin.LONGITUDE : String(mapCenter[1]);
                const mode = travelMode === "walk" ? "walking" : travelMode === "pt" ? "transit" : "driving";
                window.open(`https://www.google.com/maps/dir/?api=1&origin=${sLat},${sLng}&destination=${dest?.LATITUDE},${dest?.LONGITUDE}&travelmode=${mode}`, "_blank");
                if (dest) {
                  const name = dest.BUILDING !== "NIL" ? dest.BUILDING : dest.ADDRESS;
                  saveRecentLocation(name, dest.ADDRESS, parseFloat(dest.LATITUDE), parseFloat(dest.LONGITUDE));
                }
              }}
              className="w-full py-4 rounded-2xl bg-brand-500 text-white font-semibold text-sm hover:bg-brand-600 active:scale-[0.98] transition-all"
            >
              {t("startNavigation")}
            </button>
          </div>
        </div>
      )}

      <AgentChat userLat={mapCenter[0]} userLng={mapCenter[1]} />
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
    <AppShell>
      <Suspense fallback={
        <div className="flex items-center justify-center" style={{ height: "100dvh" }}>
          <Loader2 className="animate-spin text-brand-500" />
        </div>
      }>
        <MapPageInner />
      </Suspense>
    </AppShell>
  );
}