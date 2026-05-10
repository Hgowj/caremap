"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, X, Loader2 } from "lucide-react";

export interface PlaceResult {
  ADDRESS: string;
  BUILDING: string;
  POSTAL: string;
  LATITUDE: string;
  LONGITUDE: string;
}

interface SearchBarProps {
  placeholder: string;
  onSelect: (result: PlaceResult) => void;
  icon?: "origin" | "destination";
  prefillValue?: string; // pre-fill from external source (e.g. events page)
}

export default function SearchBar({ placeholder, onSelect, icon = "destination", prefillValue }: SearchBarProps) {
  const [query, setQuery]     = useState(prefillValue ?? "");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen]       = useState(false);
  const debounceRef           = useRef<NodeJS.Timeout>();
  const selectedRef           = useRef(false);
  const iconColor             = icon === "origin" ? "#0d9488" : "#f43f5e";

  // Update if prefill changes (e.g. navigating from events)
  useEffect(() => {
    if (prefillValue) {
      selectedRef.current = true;
      setQuery(prefillValue);
    }
  }, [prefillValue]);

  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current = false;
      return;
    }
    if (query.length < 3) { setResults([]); setOpen(false); return; }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res  = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json() as any;
        setResults(data.results?.slice(0, 6) ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const handleSelect = (r: PlaceResult) => {
    const label = r.BUILDING && r.BUILDING !== "NIL" ? r.BUILDING : r.ADDRESS;
    selectedRef.current = true;
    setQuery(label);
    setResults([]);
    setOpen(false);
    onSelect(r);
  };

  const handleClear = () => {
    selectedRef.current = false;
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2 bg-gray-50 border-2 border-transparent rounded-2xl px-3 py-2.5 focus-within:border-brand-400 focus-within:bg-white transition-all">
        <MapPin size={17} style={{ color: iconColor, flexShrink: 0 }} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 outline-none"
        />
        {loading && <Loader2 size={15} className="animate-spin text-brand-500 shrink-0" />}
        {query && !loading && (
          <button onClick={handleClear} className="text-gray-400 hover:text-gray-600 shrink-0">
            <X size={15} />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-[200] top-full mt-1 w-full bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {results.map((r, i) => {
            const label = r.BUILDING && r.BUILDING !== "NIL" ? r.BUILDING : r.ADDRESS;
            return (
              <button
                key={i}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(r)}
                className="w-full text-left px-4 py-3 hover:bg-brand-50 transition-colors border-b border-gray-50 last:border-0"
              >
                <div className="text-sm font-medium text-gray-800 truncate">{label}</div>
                <div className="text-xs text-gray-400 truncate mt-0.5">{r.ADDRESS}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}