"use client";

import { useEffect, useState } from "react";
import { Calendar, MapPin, Navigation } from "lucide-react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";

interface CareEvent {
  id: string;
  title: string;
  organiser: string;
  date: string;
  time: string;
  location: string;
  lat: number;
  lng: number;
  tags: string[];
  accessible: boolean;
  description: string;
}

export default function EventsPage() {
  const [events, setEvents] = useState<CareEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/events.json")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setEvents)
      .catch((e) => console.error("Events load failed:", e))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-SG", { weekday: "short", day: "numeric", month: "short" });

  const navigateTo = (evt: CareEvent) => {
    const params = new URLSearchParams({
      destLat:  String(evt.lat),
      destLng:  String(evt.lng),
      destName: evt.location,
    });
    router.push(`/map?${params.toString()}`);
  };

  return (
    <div className="flex flex-col" style={{ height: "100dvh", overflow: "hidden" }}>
      <div className="px-4 pt-12 pb-4 bg-white border-b border-gray-100 shrink-0">
        <h1 className="font-display font-bold text-xl text-gray-800">Facilities</h1>
        <p className="text-sm text-gray-400 mt-0.5">Nearby facilities and services</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20 px-6">
            <p className="text-4xl mb-3">📅</p>
            <p className="text-gray-500">No events found</p>
          </div>
        ) : (
          <div className="px-4 py-4 space-y-3 pb-4">
            {events.map((evt) => (
              <div key={evt.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h3 className="font-semibold text-gray-800 text-sm leading-snug flex-1">{evt.title}</h3>
                  {evt.accessible && (
                    <span className="text-[10px] bg-teal-50 text-teal-600 px-2 py-0.5 rounded-full shrink-0 font-medium">
                      ♿ Accessible
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mb-2 leading-relaxed">{evt.description}</p>
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                  <Calendar size={11} />
                  <span>{formatDate(evt.date)} · {evt.time}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
                  <MapPin size={11} />
                  <span>{evt.location}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex gap-1 flex-wrap">
                    {evt.tags.map((tag) => (
                      <span key={tag} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => navigateTo(evt)}
                    className="flex items-center gap-1.5 text-xs text-white font-medium bg-teal-600 hover:bg-teal-700 px-3 py-1.5 rounded-xl transition-colors shrink-0"
                  >
                    <Navigation size={11} />
                    Navigate
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}