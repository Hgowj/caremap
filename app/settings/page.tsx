"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { MapPin } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import AppShell from "@/components/AppShell";

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

const LANGUAGES = [
  { code: "en", label: "English",    flag: "🇸🇬" },
  { code: "zh", label: "中文",        flag: "🇨🇳" },
  { code: "th", label: "ภาษาไทย",    flag: "🇹🇭" },
  { code: "tl", label: "Filipino",   flag: "🇵🇭" },
  { code: "ta", label: "தமிழ்",       flag: "🇮🇳" },
];

export default function SettingsPage() {
  const t = useTranslations("settings");
  const [prefs, setPrefs]           = useState<Prefs | null>(null);
  const [currentLang, setCurrentLang] = useState("en");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("cm_prefs");
      if (stored) setPrefs(JSON.parse(stored));
    } catch {}

    // Read language from cookie
    const langMatch = document.cookie.match(/cm_locale=([^;]+)/);
    if (langMatch) setCurrentLang(langMatch[1]);
  }, []);

  const switchLanguage = (code: string) => {
    document.cookie = `cm_locale=${code};path=/;max-age=${365 * 24 * 60 * 60};SameSite=Lax`;
    setCurrentLang(code);
    window.location.reload();
  };

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
    <AppShell>
    <div className="flex flex-col" style={{ height: "100dvh", overflow: "hidden" }}>

      {/* Header */}
      <div className="px-4 pt-12 pb-4 bg-white border-b border-gray-100 shrink-0">
        <h1 className="font-bold text-xl text-gray-800">{t("title")}</h1>
        <p className="text-sm text-gray-400 mt-0.5">{t("subtitle")}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {!prefs ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm">{t("noPrefs")}</p>
            <button
              onClick={() => window.location.href = "/onboarding"}
              className="mt-3 text-sm text-brand-600 font-medium hover:underline"
            >
              {t("setupPrefs")}
            </button>
          </div>
        ) : (
          <>
            {/* Profile */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-4 pt-3 pb-1">
                {t("profile")}
              </p>
              {row("🤝", t("usingAs"),     prefs.userType === "caregiver" ? t("caregiver") : t("generalUser"))}
              {row("♿", t("companionAid"), (() => { const k: Record<string,string> = { walks: "walks", wheelchair: "wheelchair", frame: "frame", scooter: "scooter" }; return prefs.mobilityAid && k[prefs.mobilityAid] ? t(k[prefs.mobilityAid]) : t("notSet"); })())}
            </div>

            {/* Route preferences */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-4 pt-3 pb-1">
                {t("routePrefs")}
              </p>
              {row("⛰️", t("hillsSlopes"),   (() => { const k: Record<string,string> = { any: "anyIsFine", gentle: "gentleSlopes", flat: "flatOnly" }; return k[prefs.slope] ? t(k[prefs.slope]) : t("anyIsFine"); })())}
              {row("☂️", t("shelteredPaths"), prefs.sheltered    ? t("preferred")   : t("notRequired"))}
              {row("🪑", t("restStops"),      prefs.restStops    ? t("enabled")     : t("disabled"))}
              {row("🚽", t("washroomAccess"), prefs.washroomAccess
                ? (() => { const k: Record<string,string> = { "500": "every500m", "1000": "every1km", "1500": "every1_5km" }; return k[prefs.washroomFreq] ? t(k[prefs.washroomFreq]) : `Every ${prefs.washroomFreq}m`; })()
                : t("notRequired"))}
            </div>

            {/* Home location */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-4 pt-3 pb-1">
                {t("homeLocation")}
              </p>
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
                  {prefs.homeLocation ? t("edit") : t("set")}
                </button>
              </div>
            </div>

            {/* Language */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-4 pt-3 pb-1">
                {t("language")}
              </p>
              <div className="px-4 py-3 grid grid-cols-5 gap-2">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => switchLanguage(lang.code)}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 transition-all ${
                      currentLang === lang.code
                        ? "border-brand-500 bg-brand-50"
                        : "border-gray-100 bg-gray-50 hover:border-gray-200"
                    }`}
                  >
                    <span className="text-xl">{lang.flag}</span>
                    <span className={`text-[10px] font-medium text-center leading-tight ${
                      currentLang === lang.code ? "text-brand-600" : "text-gray-500"
                    }`}>{lang.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Edit all */}
            <button
              onClick={() => window.location.href = "/onboarding"}
              className="w-full py-3 rounded-2xl border-2 border-gray-100 text-sm text-gray-500 hover:border-gray-200 transition-all"
            >
              {t("editAll")}
            </button>

            <p className="text-center text-xs text-gray-300 pb-2">{t("version")}</p>
          </>
        )}
      </div>

      <BottomNav />
    </div>
    </AppShell>
  );
}