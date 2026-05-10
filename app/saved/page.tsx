"use client";

import BottomNav from "@/components/BottomNav";
import AppShell from "@/components/AppShell";
import { Heart } from "lucide-react";

export default function SavedPage() {
  return (
    <AppShell>
    <div className="flex flex-col" style={{ height: "100dvh", overflow: "hidden" }}>
      <div className="px-4 pt-12 pb-4 bg-white border-b border-gray-100 shrink-0">
        <h1 className="font-display font-bold text-xl text-gray-800">Saved Routes</h1>
        <p className="text-sm text-gray-400 mt-0.5">Your accessible routes & places</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <Heart size={40} className="text-gray-200 mb-3" />
        <p className="text-gray-500 font-medium">No saved routes yet</p>
        <p className="text-gray-400 text-sm mt-1 text-center">Plan a route and tap Save to keep it here.</p>
      </div>

      <BottomNav />
    </div>
    </AppShell>
  );
}