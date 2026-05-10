"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const onboarded = localStorage.getItem("cm_onboarded");
    const guest     = localStorage.getItem("cm_guest");
    const hasPrefs  = localStorage.getItem("cm_prefs");

    // Only skip onboarding if they've completed it AND have preferences set
    if ((onboarded || guest) && hasPrefs) {
      router.replace("/map");
    } else {
      // Clear stale flags so onboarding shows fresh
      localStorage.removeItem("cm_onboarded");
      localStorage.removeItem("cm_guest");
      router.replace("/onboarding");
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen bg-white">
      <div className="flex flex-col items-center gap-3">
        <span className="text-brand-500 font-bold text-2xl tracking-tight">CareMap</span>
        <Loader2 size={20} className="animate-spin text-brand-400" />
      </div>
    </div>
  );
}
