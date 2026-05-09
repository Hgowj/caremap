"use client";

import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import { MapPin } from "lucide-react";

interface Prefs {
  userType: string;
  mobilityAid: string;
  slope: string;
  sheltered: boolean;
  restStops: boolean;
  washroomAccess: boolean;
  washroomFreq: string;
  homeLocation?: { label: string; address: string; lat: number; lng: number } | null;
}

const MOBILITY_LABELS: Record<string, string> = {
  walks:      "Walks slowly / needs support",
  wheelchair: "Uses a wheelchair",
  frame:      "Uses a walking frame",
  scooter:    "Uses a mobility scooter",
};

const SLOPE_LABELS: Record<string, string> = {
  any:    "Any is fine",
  gentle: "Gentle slopes",
  flat:   "Flat only",
};

const WASHROOM_LABELS: Record<string, string> = {
  "500":  "Every 500m",
  "1000": "Every 1km",
  "1500": "Every 1.5km",
};

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("cm_prefs");
      if (stored) setPrefs(JSON.parse(stored));
    } catch {}
  }, []);

  const row = (emoji: string, label: string, value: string) => (
    <div key={label} className="flex items-center justify-between px-4 py-3.5 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-3">
        <span className="text-xl">{emoji}</span>
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      <span className="text-sm text-brand-600 font-medium text-right max-w-[160px] truncate">{value}</span>
    </div>
  );

  return (
    <div className="flex flex-col" style={{ height: "100dvh", overflow: "hidden" }}>
      <div className="px-4 pt-12 pb-4 bg-white border-b border-gray-100 shrink-0">
        <h1 className="font-bold text-xl text-gray-800">Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">Your preferences & accessibility</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {!prefs ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm">No preferences saved yet.</p>
            <button
              onClick={() => window.location.href = "/onboarding"}
              className="mt-3 text-sm text-brand-600 font-medium hover:underline"
            >
              Set up preferences →
            </button>
          </div>
        ) : (
          <>
            {/* Profile */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-4 pt-3 pb-1">Profile</p>
              {row("🤝", "Using as",       prefs.userType === "caregiver" ? "Caregiver" : "General user")}
              {row("♿", "Companion aid",   MOBILITY_LABELS[prefs.mobilityAid] ?? prefs.mobilityAid ?? "Not set")}
            </div>

            {/* Route preferences */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-4 pt-3 pb-1">Route Preferences</p>
              {row("⛰️", "Hills & slopes",   SLOPE_LABELS[prefs.slope] ?? prefs.slope ?? "Any")}
              {row("☂️", "Sheltered paths",   prefs.sheltered   ? "Preferred" : "Not required")}
              {row("🪑", "Rest stops",        prefs.restStops   ? "Enabled"   : "Disabled")}
              {row("🚽", "Washroom access",   prefs.washroomAccess
                ? WASHROOM_LABELS[prefs.washroomFreq] ?? `Every ${prefs.washroomFreq}m`
                : "Not required")}
            </div>

            {/* Home location */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-4 pt-3 pb-1">Home Location</p>
              <div className="px-4 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MapPin size={18} className="text-brand-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {prefs.homeLocation?.label ?? "Not set"}
                    </p>
                    {prefs.homeLocation?.address && (
                      <p className="text-xs text-gray-400 mt-0.5 max-w-[200px] truncate">
                        {prefs.homeLocation.address}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => window.location.href = "/onboarding"}
                  className="text-xs text-brand-500 font-medium hover:underline"
                >
                  {prefs.homeLocation ? "Edit" : "Set"}
                </button>
              </div>
            </div>

            <button
              onClick={() => window.location.href = "/onboarding"}
              className="w-full py-3 rounded-2xl border-2 border-gray-100 text-sm text-gray-500 hover:border-gray-200 transition-all"
            >
              Edit all preferences
            </button>

            <p className="text-center text-xs text-gray-300 pb-2">CareMap v0.1</p>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}