"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

type UserType = "senior" | "caregiver" | null;
type MobilityAid = "walks" | "wheelchair" | "frame" | "scooter" | null;
type SlopePreference = "any" | "gentle" | "flat";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [userType, setUserType] = useState<UserType>(null);
  const [mobilityAid, setMobilityAid] = useState<MobilityAid>(null);
  const [slope, setSlope] = useState<SlopePreference>("any");
  const [sheltered, setSheltered] = useState(false);
  const [restStops, setRestStops] = useState(false);
  const [washroomAccess, setWashroomAccess] = useState(false);
  const [washroomFreq, setWashroomFreq] = useState<"500" | "1000" | "1500">("500");

  const handleFinish = () => {
    // Save prefs to localStorage
    localStorage.setItem("cm_prefs", JSON.stringify({
      userType, mobilityAid, slope, sheltered, restStops,
      washroomAccess, washroomFreq,
    }));
    localStorage.setItem("cm_onboarded", "1");
    router.push("/map");
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <div
          className="h-full bg-brand-500 transition-all duration-500"
          style={{ width: step === 1 ? "50%" : "100%" }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2">
        <span className="text-xs text-gray-400 font-medium">Step {step} of 2</span>
        <button
          onClick={() => router.push("/map")}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Skip
        </button>
      </div>

      {/* CareMap logo */}
      <div className="px-5 pt-2 pb-6">
        <span className="text-brand-500 font-bold text-xl tracking-tight">CareMap</span>
      </div>

      {step === 1 && (
        <div className="flex-1 flex flex-col px-5">
          <h2 className="text-2xl font-bold text-gray-900 leading-tight mb-1">
            Who&apos;s using CareMap?
          </h2>
          <p className="text-sm text-gray-500 mb-8">
            We&apos;ll tailor routes to the right needs
          </p>

          <div className="space-y-3">
            {/* Senior option */}
            <button
              onClick={() => setUserType("senior")}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                userType === "senior"
                  ? "border-brand-500 bg-brand-50"
                  : "border-gray-100 bg-gray-50 hover:border-gray-200"
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-lg flex-shrink-0">
                👤
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-sm">I&apos;m a senior</p>
                <p className="text-xs text-gray-500">65 and above</p>
              </div>
              {userType === "senior" && (
                <Check size={18} className="ml-auto text-brand-500 flex-shrink-0" />
              )}
            </button>

            {/* Caregiver option */}
            <button
              onClick={() => setUserType("caregiver")}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                userType === "caregiver"
                  ? "border-brand-500 bg-brand-50"
                  : "border-gray-100 bg-gray-50 hover:border-gray-200"
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-lg flex-shrink-0">
                🤝
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-sm">Caregiver</p>
                <p className="text-xs text-gray-500">I help someone get around</p>
              </div>
              {userType === "caregiver" && (
                <Check size={18} className="ml-auto text-brand-500 flex-shrink-0" />
              )}
            </button>
          </div>

          <div className="mt-auto pb-8">
            <button
              onClick={() => userType && setStep(2)}
              disabled={!userType}
              className="w-full py-4 rounded-2xl bg-brand-500 text-white font-semibold text-sm
                disabled:opacity-40 disabled:cursor-not-allowed hover:bg-brand-600
                active:scale-[0.98] transition-all"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex-1 flex flex-col px-5 overflow-y-auto">
          <h2 className="text-2xl font-bold text-gray-900 leading-tight mb-1">
            Your preferences
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            We&apos;ll use these to find the best routes. Change them any time in Settings.
          </p>

          {/* YOUR COMPANION */}
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Your Companion
          </p>
          <div className="space-y-2 mb-6">
            {[
              { id: "walks",      label: "Walks slowly or needs support", sub: "Frail, unsteady, or easily tired",    icon: "🚶" },
              { id: "wheelchair", label: "Uses a wheelchair",              sub: "I push or guide it",                  icon: "♿" },
              { id: "frame",      label: "Uses a walking frame",           sub: "Rollator or zimmer frame",            icon: "🦯" },
              { id: "scooter",    label: "Uses a mobility scooter",        sub: "Electric scooter or power chair",     icon: "🛵" },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setMobilityAid(opt.id as MobilityAid)}
                className={`w-full flex items-center gap-4 p-3.5 rounded-2xl border-2 transition-all text-left ${
                  mobilityAid === opt.id
                    ? "border-brand-500 bg-brand-50"
                    : "border-gray-100 bg-gray-50 hover:border-gray-200"
                }`}
              >
                <span className="text-xl flex-shrink-0">{opt.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm">{opt.label}</p>
                  <p className="text-xs text-gray-500">{opt.sub}</p>
                </div>
                {mobilityAid === opt.id && (
                  <Check size={16} className="text-brand-500 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>

          {/* ROUTE PREFERENCES */}
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Route Preferences
          </p>

          {/* Hills & slopes */}
          <div className="mb-4">
            <p className="text-sm font-semibold text-gray-800 mb-1">Hills and slopes</p>
            <p className="text-xs text-gray-500 mb-3">Choose what suits your companion</p>
            <div className="flex gap-2">
              {(["any", "gentle", "flat"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSlope(s)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-all capitalize ${
                    slope === s
                      ? "border-brand-500 bg-brand-500 text-white"
                      : "border-gray-200 text-gray-600 bg-white hover:border-brand-300"
                  }`}
                >
                  {s === "flat" ? "Flat only" : s === "gentle" ? "Gentle slopes" : "Any is fine"}
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          {[
            { key: "sheltered",    label: "Stay sheltered from rain",    sub: "Favour covered walkways and linkways", val: sheltered,    set: setSheltered },
            { key: "restStops",    label: "Rest stops along the way",    sub: "Show benches and seating on the route", val: restStops,    set: setRestStops },
            { key: "washroom",     label: "Washroom access",              sub: "Show accessible toilets on the route",  val: washroomAccess, set: setWashroomAccess },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between py-3.5 border-b border-gray-50 last:border-0">
              <div>
                <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                <p className="text-xs text-gray-500">{item.sub}</p>
              </div>
              <button
                onClick={() => item.set(!item.val)}
                className={`w-12 h-6 rounded-full transition-all relative flex-shrink-0 ${
                  item.val ? "bg-brand-500" : "bg-gray-200"
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${
                  item.val ? "left-6" : "left-0.5"
                }`} />
              </button>
            </div>
          ))}

          {/* Washroom frequency */}
          {washroomAccess && (
            <div className="mt-3 mb-2">
              <p className="text-xs text-gray-500 mb-2">How often does your companion need one?</p>
              <div className="flex gap-2">
                {(["500", "1000", "1500"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setWashroomFreq(f)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-all ${
                      washroomFreq === f
                        ? "border-brand-500 bg-brand-500 text-white"
                        : "border-gray-200 text-gray-600 bg-white hover:border-brand-300"
                    }`}
                  >
                    Every {f === "500" ? "500m" : f === "1000" ? "1km" : "1.5km"}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="pb-8 pt-6">
            <button
              onClick={handleFinish}
              className="w-full py-4 rounded-2xl bg-brand-500 text-white font-semibold text-sm
                hover:bg-brand-600 active:scale-[0.98] transition-all"
            >
              Save and start
            </button>
          </div>
        </div>
      )}
    </div>
  );
}