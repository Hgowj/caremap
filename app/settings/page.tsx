"use client";

import { useState, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import { Check, MapPin, Loader2 } from "lucide-react";

interface Prefs {
  mobilityAid:     "none" | "wheelchair" | "walking_frame" | "stroller";
  requireShelter:  boolean;
  washroomStops:   "none" | "500m" | "1km" | "2km";
  requireRestStop: boolean;
  language:        "en" | "zh" | "ms" | "ta";
  homeAddress:     string;
  homeLat:         string;
  homeLng:         string;
}

const DEFAULTS: Prefs = {
  mobilityAid: "wheelchair", requireShelter: true,
  washroomStops: "500m", requireRestStop: true,
  language: "en", homeAddress: "", homeLat: "", homeLng: "",
};

const LANG_LABELS: Record<string, string> = { en: "English", zh: "中文", ms: "Bahasa Melayu", ta: "தமிழ்" };

export default function SettingsPage() {
  const [prefs, setPrefs]       = useState<Prefs>(DEFAULTS);
  const [saved, setSaved]       = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("caremap_prefs");
    if (stored) setPrefs(JSON.parse(stored));
  }, []);

  const save = (updates: Partial<Prefs>) => {
    const next = { ...prefs, ...updates };
    setPrefs(next);
    localStorage.setItem("caremap_prefs", JSON.stringify(next));
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const handleSaveHome = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      try {
        const res  = await fetch(`/api/reverse-geocode?lat=${lat}&lng=${lng}`);
        const data = await res.json();
        const addr = data.address?.ADDRESS ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        save({ homeAddress: addr, homeLat: String(lat), homeLng: String(lng) });
      } catch {
        save({ homeAddress: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, homeLat: String(lat), homeLng: String(lng) });
      }
      setLocating(false);
    }, () => setLocating(false));
  };

  return (
    <div className="flex flex-col" style={{ height: "100dvh", overflow: "hidden" }}>
      <div className="px-4 pt-12 pb-4 bg-white border-b border-gray-100 shrink-0 flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-xl text-gray-800">Settings</h1>
          <p className="text-sm text-gray-400 mt-0.5">Preferences & accessibility</p>
        </div>
        {saved && (
          <div className="flex items-center gap-1 text-teal-600 text-xs font-medium">
            <Check size={14} /> Saved
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* Home location */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Home Location</p>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-lg">🏠</span>
              <p className="text-sm text-gray-700 truncate">
                {prefs.homeAddress || "Not set"}
              </p>
            </div>
            <button
              onClick={handleSaveHome}
              disabled={locating}
              className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 px-3 py-2 rounded-xl transition-all"
            >
              {locating ? <Loader2 size={13} className="animate-spin" /> : <MapPin size={13} />}
              {locating ? "Locating…" : "Set Current"}
            </button>
          </div>
        </div>

        {/* Mobility Aid */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Mobility Aid</p>
          <div className="grid grid-cols-2 gap-2">
            {([["none","None","🚶"],["wheelchair","Wheelchair","♿"],["walking_frame","Walking Frame","🦯"],["stroller","Stroller","👶"]] as const).map(([val, label, emoji]) => (
              <button key={val} onClick={() => save({ mobilityAid: val })}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                  prefs.mobilityAid === val ? "border-teal-500 bg-teal-50 text-teal-700" : "border-gray-100 bg-gray-50 text-gray-600"
                }`}>
                <span>{emoji}</span><span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Shelter & Rest */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Route Preferences</p>
          {[
            { key: "requireShelter" as const,  emoji: "☂️", label: "Prefer sheltered paths" },
            { key: "requireRestStop" as const, emoji: "🪑", label: "Include rest stop info" },
          ].map(({ key, emoji, label }) => (
            <div key={key} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{emoji}</span>
                <span className="text-sm text-gray-700">{label}</span>
              </div>
              <button
                onClick={() => save({ [key]: !prefs[key] })}
                className={`w-11 h-6 rounded-full transition-all relative ${prefs[key] ? "bg-teal-500" : "bg-gray-200"}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${prefs[key] ? "left-5" : "left-0.5"}`} />
              </button>
            </div>
          ))}
        </div>

        {/* Washroom interval */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Washroom Stop Interval</p>
          <div className="grid grid-cols-4 gap-2">
            {(["none","500m","1km","2km"] as const).map((v) => (
              <button key={v} onClick={() => save({ washroomStops: v })}
                className={`py-2 rounded-xl border-2 text-xs font-medium transition-all ${
                  prefs.washroomStops === v ? "border-teal-500 bg-teal-50 text-teal-700" : "border-gray-100 bg-gray-50 text-gray-600"
                }`}>
                {v === "none" ? "Off" : v}
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Language</p>
          <div className="grid grid-cols-2 gap-2">
            {(["en","zh","ms","ta"] as const).map((lang) => (
              <button key={lang} onClick={() => save({ language: lang })}
                className={`py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                  prefs.language === lang ? "border-teal-500 bg-teal-50 text-teal-700" : "border-gray-100 bg-gray-50 text-gray-600"
                }`}>
                {LANG_LABELS[lang]}
              </button>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-gray-300 pb-2">CareMap v0.1 — Hackathon Build</p>
      </div>

      <BottomNav />
    </div>
  );
}