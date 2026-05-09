"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Eye, EyeOff, Loader2, MapPin, X } from "lucide-react";

type Step = "account" | "who" | "prefs";
type UserType = "caregiver" | "other" | null;
type MobilityAid = "walks" | "wheelchair" | "frame" | "scooter" | null;
type SlopePreference = "any" | "gentle" | "flat";

interface HomeLocation {
  label: string;
  address: string;
  lat: number;
  lng: number;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("account");

  // Account
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [isLogin, setIsLogin] = useState(false);

  // Prefs
  const [userType, setUserType] = useState<UserType>(null);
  const [mobilityAid, setMobilityAid] = useState<MobilityAid>(null);
  const [slope, setSlope] = useState<SlopePreference>("any");
  const [sheltered, setSheltered] = useState(false);
  const [restStops, setRestStops] = useState(false);
  const [washroomAccess, setWashroomAccess] = useState(false);
  const [washroomFreq, setWashroomFreq] = useState<"500" | "1000" | "1500">("500");
  const [homeLocation, setHomeLocation] = useState<HomeLocation | null>(null);
  const [homeQuery, setHomeQuery] = useState("");
  const [homeResults, setHomeResults] = useState<any[]>([]);
  const [homeSearching, setHomeSearching] = useState(false);

  const stepNum = step === "account" ? 1 : step === "who" ? 2 : 3;

  const handleAuth = async () => {
    setAuthLoading(true);
    setAuthError("");
    try {
        const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
        const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        });
        const data = await res.json() as any;
        if (!res.ok) { setAuthError(data.error ?? "Something went wrong"); return; }

        if (isLogin) {
        // Returning user — go straight to map, prefs already saved
        router.push("/map");
        } else {
        // New account — walk through preferences
        setStep("who");
        }
    } catch {
        setAuthError("Network error — please try again");
    } finally {
        setAuthLoading(false);
    }
};

  const searchHome = async (query: string) => {
    setHomeQuery(query);
    if (query.length < 3) { setHomeResults([]); return; }
    setHomeSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json() as any;
      setHomeResults(data.results?.slice(0, 5) ?? []);
    } catch {
      setHomeResults([]);
    } finally {
      setHomeSearching(false);
    }
  };

  const selectHome = (r: any) => {
    const label = r.BUILDING && r.BUILDING !== "NIL" ? r.BUILDING : r.ADDRESS;
    setHomeLocation({
      label,
      address: r.ADDRESS,
      lat: parseFloat(r.LATITUDE),
      lng: parseFloat(r.LONGITUDE),
    });
    setHomeQuery(label);
    setHomeResults([]);
  };

  const handleFinish = async () => {
    // Use consistent key names throughout the app
    const prefs = {
      userType,
      mobilityAid,
      slope,
      sheltered,
      restStops,
      washroomAccess,
      washroomFreq,
      homeLocation,
    };

    // Save to localStorage with consistent key
    localStorage.setItem("cm_prefs", JSON.stringify(prefs));
    localStorage.setItem("cm_onboarded", "1");

    // Try to save to server (if logged in)
    try {
      await fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...prefs,
          homeLat: homeLocation?.lat ?? null,
          homeLng: homeLocation?.lng ?? null,
          homeLabel: homeLocation?.label ?? null,
        }),
      });
    } catch { /* guest — localStorage only */ }

    router.push("/map");
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Progress */}
      <div className="h-1 bg-gray-100">
        <div
          className="h-full bg-brand-500 transition-all duration-500"
          style={{ width: `${(stepNum / 3) * 100}%` }}
        />
      </div>

      <div className="flex items-center justify-between px-5 pt-5 pb-1">
        <span className="text-xs text-gray-400 font-medium">Step {stepNum} of 3</span>
        <button onClick={() => router.push("/map")} className="text-xs text-gray-400 hover:text-gray-600">Skip</button>
      </div>

      <div className="px-5 pt-3 pb-5">
        <span className="text-brand-500 font-bold text-xl tracking-tight">CareMap</span>
      </div>

      {/* STEP 1: Account */}
      {step === "account" && (
        <div className="flex-1 flex flex-col px-5">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            {isLogin ? "Welcome back" : "Create your account"}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {isLogin ? "Log in to access your saved routes and preferences." : "Save your routes, bookmarks, and preferences across devices."}
          </p>

          <div className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-100 bg-gray-50 text-sm outline-none focus:border-brand-400 focus:bg-white transition-all"
            />
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password (min 6 characters)"
                onKeyDown={e => e.key === "Enter" && handleAuth()}
                className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-100 bg-gray-50 text-sm outline-none focus:border-brand-400 focus:bg-white transition-all pr-12"
              />
              <button onClick={() => setShowPw(p => !p)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {authError && <p className="text-xs text-red-500 px-1">{authError}</p>}
          </div>

          <div className="mt-auto pb-6 space-y-3">
            <button
              onClick={handleAuth}
              disabled={authLoading || !email || password.length < 6}
              className="w-full py-4 rounded-2xl bg-brand-500 text-white font-semibold text-sm
                disabled:opacity-40 hover:bg-brand-600 active:scale-[0.98] transition-all
                flex items-center justify-center gap-2"
            >
              {authLoading && <Loader2 size={16} className="animate-spin" />}
              {isLogin ? "Log in" : "Create account"}
            </button>

            <button
              onClick={() => { setIsLogin(l => !l); setAuthError(""); }}
              className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400">or</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            <button
              onClick={() => {
                localStorage.setItem("cm_guest", "1");
                const alreadyOnboarded = localStorage.getItem("cm_onboarded");
                if (alreadyOnboarded) {
                    router.push("/map");
                } else {
                    setStep("who");
                }
                }}
              className="w-full py-3 rounded-2xl border-2 border-gray-100 text-sm text-gray-500 hover:border-gray-200 transition-all"
            >
              Continue as guest
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Who + Home location */}
      {step === "who" && (
        <div className="flex-1 flex flex-col px-5 overflow-y-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Who&apos;s using CareMap?</h2>
          <p className="text-sm text-gray-500 mb-6">We&apos;ll tailor routes to the right needs</p>

          <div className="space-y-3 mb-6">
            {[
              { id: "caregiver", label: "Caregiver",      sub: "I help someone get around", icon: "🤝" },
              { id: "other",     label: "Other / General", sub: "Accessibility-conscious user", icon: "👤" },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setUserType(opt.id as UserType)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                  userType === opt.id ? "border-brand-500 bg-brand-50" : "border-gray-100 bg-gray-50 hover:border-gray-200"
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-lg flex-shrink-0">{opt.icon}</div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{opt.label}</p>
                  <p className="text-xs text-gray-500">{opt.sub}</p>
                </div>
                {userType === opt.id && <Check size={18} className="ml-auto text-brand-500 flex-shrink-0" />}
              </button>
            ))}
          </div>

          {/* Home location */}
          <div className="mb-6">
            <p className="text-sm font-semibold text-gray-800 mb-1">Your home location</p>
            <p className="text-xs text-gray-500 mb-3">We&apos;ll use this as a quick-pick starting point for routes.</p>

            <div className="relative">
              <div className="flex items-center gap-2 bg-gray-50 border-2 border-gray-100 rounded-2xl px-3 py-3 focus-within:border-brand-400 focus-within:bg-white transition-all">
                <MapPin size={16} className="text-brand-500 flex-shrink-0" />
                <input
                  type="text"
                  value={homeQuery}
                  onChange={e => searchHome(e.target.value)}
                  placeholder="Search your home address or block..."
                  className="flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 outline-none"
                />
                {homeSearching && <Loader2 size={14} className="animate-spin text-brand-500 flex-shrink-0" />}
                {homeLocation && (
                  <button onClick={() => { setHomeLocation(null); setHomeQuery(""); }} className="text-gray-400 hover:text-gray-600">
                    <X size={14} />
                  </button>
                )}
              </div>

              {homeResults.length > 0 && (
                <div className="absolute z-50 top-full mt-1 w-full bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                  {homeResults.map((r, i) => {
                    const label = r.BUILDING && r.BUILDING !== "NIL" ? r.BUILDING : r.ADDRESS;
                    return (
                      <button
                        key={i}
                        onClick={() => selectHome(r)}
                        className="w-full text-left px-4 py-3 hover:bg-brand-50 transition-colors border-b border-gray-50 last:border-0"
                      >
                        <p className="text-sm font-medium text-gray-800 truncate">{label}</p>
                        <p className="text-xs text-gray-400 truncate">{r.ADDRESS}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {homeLocation && (
              <div className="mt-2 flex items-center gap-2 text-xs text-brand-600 bg-brand-50 px-3 py-2 rounded-xl">
                <MapPin size={12} />
                <span className="truncate">Saved: {homeLocation.label}</span>
              </div>
            )}
          </div>

          <div className="pb-8 mt-auto">
            <button
              onClick={() => userType && setStep("prefs")}
              disabled={!userType}
              className="w-full py-4 rounded-2xl bg-brand-500 text-white font-semibold text-sm disabled:opacity-40 hover:bg-brand-600 active:scale-[0.98] transition-all"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Preferences */}
      {step === "prefs" && (
        <div className="flex-1 flex flex-col px-5 overflow-y-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Your preferences</h2>
          <p className="text-sm text-gray-500 mb-6">Change these any time in Settings.</p>

          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Your Companion</p>
          <div className="space-y-2 mb-6">
            {[
              { id: "walks",      label: "Walks slowly or needs support", sub: "Frail, unsteady, or easily tired",  icon: "🚶" },
              { id: "wheelchair", label: "Uses a wheelchair",              sub: "I push or guide it",                icon: "♿" },
              { id: "frame",      label: "Uses a walking frame",           sub: "Rollator or zimmer frame",          icon: "🦯" },
              { id: "scooter",    label: "Uses a mobility scooter",        sub: "Electric scooter or power chair",   icon: "🛵" },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setMobilityAid(opt.id as MobilityAid)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all text-left ${
                  mobilityAid === opt.id ? "border-brand-500 bg-brand-50" : "border-gray-100 bg-gray-50 hover:border-gray-200"
                }`}
              >
                <span className="text-xl flex-shrink-0">{opt.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm">{opt.label}</p>
                  <p className="text-xs text-gray-500">{opt.sub}</p>
                </div>
                {mobilityAid === opt.id && <Check size={16} className="text-brand-500 flex-shrink-0" />}
              </button>
            ))}
          </div>

          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Route Preferences</p>

          <div className="mb-5">
            <p className="text-sm font-semibold text-gray-800 mb-0.5">Hills and slopes</p>
            <p className="text-xs text-gray-500 mb-3">Choose what suits your companion</p>
            <div className="flex gap-2">
              {(["any", "gentle", "flat"] as const).map(s => (
                <button key={s} onClick={() => setSlope(s)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                    slope === s ? "border-brand-500 bg-brand-500 text-white" : "border-gray-200 text-gray-600 bg-white hover:border-brand-300"
                  }`}
                >
                  {s === "flat" ? "Flat only" : s === "gentle" ? "Gentle slopes" : "Any is fine"}
                </button>
              ))}
            </div>
          </div>

          {[
            { key: "sheltered",      label: "Stay sheltered from rain",   sub: "Favour covered walkways",           val: sheltered,      set: setSheltered },
            { key: "restStops",      label: "Rest stops along the way",   sub: "Show benches and seating",          val: restStops,      set: setRestStops },
            { key: "washroomAccess", label: "Washroom access",            sub: "Show accessible toilets on route",  val: washroomAccess, set: setWashroomAccess },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between py-3.5 border-b border-gray-50 last:border-0">
              <div>
                <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                <p className="text-xs text-gray-500">{item.sub}</p>
              </div>
              <button onClick={() => item.set(!item.val)}
                className={`w-12 h-6 rounded-full relative flex-shrink-0 transition-all ${item.val ? "bg-brand-500" : "bg-gray-200"}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-all ${item.val ? "left-6" : "left-0.5"}`} />
              </button>
            </div>
          ))}

          {washroomAccess && (
            <div className="mt-4 mb-2">
              <p className="text-xs text-gray-500 mb-2">How often does your companion need one?</p>
              <div className="flex gap-2">
                {(["500", "1000", "1500"] as const).map(f => (
                  <button key={f} onClick={() => setWashroomFreq(f)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                      washroomFreq === f ? "border-brand-500 bg-brand-500 text-white" : "border-gray-200 text-gray-600 bg-white hover:border-brand-300"
                    }`}
                  >
                    Every {f === "500" ? "500m" : f === "1000" ? "1km" : "1.5km"}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="pb-8 pt-6">
            <button onClick={handleFinish}
              className="w-full py-4 rounded-2xl bg-brand-500 text-white font-semibold text-sm hover:bg-brand-600 active:scale-[0.98] transition-all"
            >
              Save and start
            </button>
          </div>
        </div>
      )}
    </div>
  );
}