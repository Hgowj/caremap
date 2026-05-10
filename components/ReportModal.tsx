"use client";

import { useState, useEffect } from "react";
import { X, MapPin, Loader2, ChevronRight } from "lucide-react";
import type { ReportCategory } from "@/lib/reports";

const CATEGORIES: { value: ReportCategory; label: string; emoji: string }[] = [
  { value: "pothole",             label: "Pothole",             emoji: "🕳️" },
  { value: "uneven_surface",      label: "Uneven Surface",      emoji: "⚠️" },
  { value: "no_ramp",             label: "No Ramp / Steps",     emoji: "🚷" },
  { value: "broken_ramp",         label: "Broken Ramp",         emoji: "♿" },
  { value: "elevator_fault",      label: "Lift/Elevator Fault", emoji: "🛗" },
  { value: "construction",        label: "Construction",        emoji: "🚧" },
  { value: "steep_slope",         label: "Steep Slope",         emoji: "⛰️" },
  { value: "flooded_path",        label: "Flooded Path",        emoji: "🌊" },
  { value: "no_shelter",          label: "No Shelter",          emoji: "☔" },
  { value: "toilet_closed",       label: "Toilet Closed",       emoji: "🚽" },
  { value: "rest_stop_closed",    label: "Rest Stop Closed",    emoji: "🪑" },
  { value: "rest_stop_available", label: "Rest Stop Open",      emoji: "✅" },
];

interface ReportModalProps {
  lat: number;
  lng: number;
  onClose: () => void;
  onSubmit: () => void;
}

type Step = "location" | "category" | "details" | "done";

export default function ReportModal({ lat, lng, onClose, onSubmit }: ReportModalProps) {
  const [step, setStep]               = useState<Step>("location");
  const [resolvedLocation, setResolved] = useState<string>("");
  const [locating, setLocating]       = useState(false);
  const [modalLat, setModalLat]       = useState(lat);
  const [modalLng, setModalLng]       = useState(lng);
  const [locationMode, setLocationMode] = useState<"gps" | "search">("gps");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [category, setCategory]       = useState<ReportCategory | null>(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting]   = useState(false);

  // Reverse geocode the initial coords
  useEffect(() => {
    if (lat && lng) reverseGeocode(lat, lng);
  }, [lat, lng]);

  const reverseGeocode = async (la: number, lo: number) => {
    setLocating(true);
    try {
      const res  = await fetch(`/api/reverse-geocode?lat=${la}&lng=${lo}`);
      const data = await res.json() as any;
      if (data.address) {
        const label = data.address.BUILDING !== "NIL"
          ? data.address.BUILDING
          : data.address.ADDRESS;
        setResolved(label);
      } else {
        setResolved(`${la.toFixed(5)}, ${lo.toFixed(5)}`);
      }
    } catch {
      setResolved(`${la.toFixed(5)}, ${lo.toFixed(5)}`);
    } finally {
      setLocating(false);
    }
  };

  const handleUseGPS = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      setModalLat(latitude);
      setModalLng(longitude);
      await reverseGeocode(latitude, longitude);
    }, () => setLocating(false));
  };

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 3) { setSearchResults([]); return; }
    try {
      const res  = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json() as any;
      setSearchResults(data.results?.slice(0, 5) ?? []);
    } catch {
      setSearchResults([]);
    }
  };

  const handlePickSearchResult = (r: any) => {
    const label = r.BUILDING && r.BUILDING !== "NIL" ? r.BUILDING : r.ADDRESS;
    setModalLat(parseFloat(r.LATITUDE));
    setModalLng(parseFloat(r.LONGITUDE));
    setResolved(label);
    setSearchQuery(label);
    setSearchResults([]);
  };

  const handleSubmit = async () => {
    if (!category) return;
    setSubmitting(true);
    try {
      await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: modalLat, lng: modalLng,
          category, description,
        }),
      });
      setStep("done");
      setTimeout(() => { onSubmit(); onClose(); }, 1400);
    } catch {
      setSubmitting(false);
    }
  };

  const canProceedFromLocation = resolvedLocation && !locating;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-t-3xl p-5 pb-8 slide-up max-h-[90dvh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display font-semibold text-gray-800 text-lg">Add a note</h2>
            {/* Step indicator */}
            <div className="flex items-center gap-1 mt-1">
              {(["location","category","details"] as Step[]).map((s, i) => (
                <div key={s} className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full transition-all ${
                    step === s ? "bg-brand-500 w-4" :
                    ["location","category","details"].indexOf(step) > i ? "bg-brand-300" : "bg-gray-200"
                  }`} />
                </div>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={20} />
          </button>
        </div>

        {/* ── STEP 1: Location ── */}
        {step === "location" && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 font-medium">Where is the issue?</p>

            {/* Location mode toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => { setLocationMode("gps"); reverseGeocode(lat, lng); setModalLat(lat); setModalLng(lng); }}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-all ${
                  locationMode === "gps"
                    ? "border-brand-500 bg-brand-500 text-white"
                    : "border-gray-200 text-gray-600"
                }`}
              >
                📍 Use my location
              </button>
              <button
                onClick={() => setLocationMode("search")}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-all ${
                  locationMode === "search"
                    ? "border-brand-500 bg-brand-500 text-white"
                    : "border-gray-200 text-gray-600"
                }`}
              >
                🔍 Search location
              </button>
            </div>

            {locationMode === "gps" ? (
              <>
                {/* Current resolved location */}
                <div className="flex items-start gap-3 bg-gray-50 rounded-2xl p-3.5">
                  <MapPin size={18} className="text-brand-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    {locating ? (
                      <div className="flex items-center gap-2">
                        <Loader2 size={14} className="animate-spin text-brand-500" />
                        <span className="text-sm text-gray-400">Getting location…</span>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-gray-800 truncate">{resolvedLocation || "Tap map to set location"}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{modalLat.toFixed(5)}, {modalLng.toFixed(5)}</p>
                      </>
                    )}
                  </div>
                </div>

                {/* GPS button */}
                <button
                  onClick={handleUseGPS}
                  disabled={locating}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-brand-200 text-brand-600 text-sm font-medium hover:bg-brand-50 transition-all disabled:opacity-50"
                >
                  {locating ? <Loader2 size={15} className="animate-spin" /> : <MapPin size={15} />}
                  Use my current GPS location
                </button>

                <p className="text-xs text-gray-400 text-center">
                  — or tap the flag button on the map to pin the exact spot —
                </p>
              </>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  placeholder="Search for a location…"
                  className="w-full text-sm border-2 border-gray-100 rounded-xl px-3 py-2.5 text-gray-700 placeholder:text-gray-300 outline-none focus:border-brand-400"
                />
                {searchResults.length > 0 && (
                  <div className="absolute z-10 top-full mt-1 w-full bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    {searchResults.map((r: any, i: number) => {
                      const label = r.BUILDING && r.BUILDING !== "NIL" ? r.BUILDING : r.ADDRESS;
                      return (
                        <button
                          key={i}
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => handlePickSearchResult(r)}
                          className="w-full text-left px-4 py-3 hover:bg-brand-50 transition-colors border-b border-gray-50 last:border-0"
                        >
                          <div className="text-sm font-medium text-gray-800 truncate">{label}</div>
                          <div className="text-xs text-gray-400 truncate mt-0.5">{r.ADDRESS}</div>
                        </button>
                      );
                    })}
                  </div>
                )}
                {resolvedLocation && (
                  <div className="flex items-center gap-2 mt-2 bg-brand-50 rounded-xl px-3 py-2">
                    <MapPin size={13} className="text-brand-500 shrink-0" />
                    <p className="text-xs text-brand-700 truncate font-medium">{resolvedLocation}</p>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => setStep("category")}
              disabled={!canProceedFromLocation}
              className="w-full py-3 rounded-2xl text-white font-semibold text-sm bg-brand-600 hover:bg-brand-700 disabled:opacity-40 flex items-center justify-center gap-2 transition-all"
            >
              Continue <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* ── STEP 2: Category ── */}
        {step === "category" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 bg-brand-50 rounded-xl px-3 py-2">
              <MapPin size={13} className="text-brand-500 shrink-0" />
              <p className="text-xs text-brand-700 truncate font-medium">{resolvedLocation}</p>
            </div>

            <p className="text-sm text-gray-500 font-medium">What did you encounter?</p>

            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                    category === c.value
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-gray-100 bg-gray-50 text-gray-600 hover:border-brand-200"
                  }`}
                >
                  <span>{c.emoji}</span>
                  <span className="truncate text-xs">{c.label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep("details")}
              disabled={!category}
              className="w-full py-3 rounded-2xl text-white font-semibold text-sm bg-brand-600 hover:bg-brand-700 disabled:opacity-40 flex items-center justify-center gap-2 transition-all"
            >
              Continue <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* ── STEP 3: Details ── */}
        {step === "details" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 bg-brand-50 rounded-xl px-3 py-2">
              <MapPin size={13} className="text-brand-500 shrink-0" />
              <p className="text-xs text-brand-700 truncate font-medium">{resolvedLocation}</p>
            </div>

            {category && (() => {
              const c = CATEGORIES.find(x => x.value === category)!;
              return (
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                  <span>{c.emoji}</span>
                  <p className="text-sm font-medium text-gray-700">{c.label}</p>
                </div>
              );
            })()}

            <p className="text-sm text-gray-500 font-medium">Add details <span className="text-gray-400 font-normal">(optional)</span></p>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                category === "elevator_fault" ? 'e.g. "Lift B at Bedok MRT out of service since morning"' :
                category === "construction"   ? 'e.g. "Road works blocking footpath, no alternative route marked"' :
                category === "steep_slope"    ? 'e.g. "Extremely steep near the underpass, hard for wheelchairs"' :
                'Describe what you saw…'
              }
              rows={3}
              className="w-full text-sm border-2 border-gray-100 rounded-xl px-3 py-2.5 text-gray-700 placeholder:text-gray-300 outline-none focus:border-brand-400 resize-none"
            />

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-3 rounded-2xl text-white font-semibold text-sm bg-brand-600 hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
            >
              {submitting ? <><Loader2 size={15} className="animate-spin" /> Submitting…</> : "Save note"}
            </button>
          </div>
        )}

        {/* ── DONE ── */}
        {step === "done" && (
          <div className="text-center py-8">
            <div className="text-5xl mb-3">✅</div>
            <p className="text-brand-600 font-semibold text-lg">Note saved!</p>
            <p className="text-gray-400 text-sm mt-1">It will appear on the map for others to see.</p>
          </div>
        )}
      </div>
    </div>
  );
}
