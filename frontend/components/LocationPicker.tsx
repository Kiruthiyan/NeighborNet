"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { MapPin, Search, X, Loader2, CheckCircle2, AlertCircle, Map } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

export interface LocationResult {
  address: string;         // human-readable address
  lat: number;
  lng: number;
  verified: boolean;       // true = confirmed by Nominatim
  raw?: string;            // what the user typed (if unverified)
}

interface Props {
  value: LocationResult | null;
  onChange: (loc: LocationResult | null) => void;
  placeholder?: string;
  /** Bounding box to bias search: [minLng, minLat, maxLng, maxLat] */
  bounds?: [number, number, number, number];
  /** Default map center */
  defaultCenter?: [number, number];
}

// ── Nominatim helpers ────────────────────────────────────────────────────────

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

async function searchNominatim(query: string, bounds?: [number, number, number, number]): Promise<NominatimResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: "json",
    limit: "5",
    addressdetails: "1",
  });
  if (bounds) {
    params.set("viewbox", bounds.join(","));
    params.set("bounded", "1");
  }
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { "Accept-Language": "en" },
  });
  if (!res.ok) return [];
  return res.json();
}

async function reverseNominatim(lat: number, lng: number): Promise<string> {
  const params = new URLSearchParams({ lat: String(lat), lon: String(lng), format: "json" });
  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
    headers: { "Accept-Language": "en" },
  });
  if (!res.ok) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  const data = await res.json();
  return data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

// ── Lazy-loaded Map (SSR-safe) ────────────────────────────────────────────────

const MapPicker = dynamic(() => import("./MapPickerInner"), { ssr: false, loading: () => (
  <div className="w-full h-full flex items-center justify-center bg-slate-100 rounded-xl">
    <Loader2 className="animate-spin text-emerald-600" size={24} />
  </div>
)});

// ── Main Component ────────────────────────────────────────────────────────────

export default function LocationPicker({ value, onChange, placeholder = "Type address or drop a pin…", bounds, defaultCenter = [6.84, 79.88] }: Props) {
  const [mode, setMode] = useState<"type" | "map">("type");
  const [query, setQuery] = useState(value?.address ?? "");
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [verifyState, setVerifyState] = useState<"idle" | "verified" | "unverified">(
    value?.verified ? "verified" : "idle"
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(
    value ? [value.lat, value.lng] : defaultCenter
  );

  // Sync text when external value changes
  useEffect(() => {
    if (value) {
      setQuery(value.address);
      setVerifyState(value.verified ? "verified" : "unverified");
    } else {
      setQuery("");
      setVerifyState("idle");
    }
  }, [value]);

  // Debounced Nominatim search as user types
  const handleQueryChange = useCallback((raw: string) => {
    setQuery(raw);
    setVerifyState("idle");
    setSuggestions([]);
    onChange(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (raw.trim().length < 3) return;

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchNominatim(raw, bounds);
        setSuggestions(results);
        // Auto-verify if exactly one high-confidence result
        if (results.length === 1) {
          const r = results[0];
          const loc: LocationResult = { address: r.display_name, lat: parseFloat(r.lat), lng: parseFloat(r.lon), verified: true };
          onChange(loc);
          setQuery(r.display_name);
          setVerifyState("verified");
          setSuggestions([]);
          setMapCenter([loc.lat, loc.lng]);
        }
      } finally {
        setSearching(false);
      }
    }, 600);
  }, [bounds, onChange]);

  const handleSelectSuggestion = (r: NominatimResult) => {
    const loc: LocationResult = { address: r.display_name, lat: parseFloat(r.lat), lng: parseFloat(r.lon), verified: true };
    onChange(loc);
    setQuery(r.display_name);
    setVerifyState("verified");
    setSuggestions([]);
    setMapCenter([loc.lat, loc.lng]);
  };

  const handleMapPin = async (lat: number, lng: number) => {
    setMapCenter([lat, lng]);
    const address = await reverseNominatim(lat, lng);
    const loc: LocationResult = { address, lat, lng, verified: true };
    onChange(loc);
    setQuery(address);
    setVerifyState("verified");
    setSuggestions([]);
  };

  const handleClear = () => {
    setQuery("");
    setSuggestions([]);
    setVerifyState("idle");
    onChange(null);
  };

  return (
    <div className="space-y-2">
      {/* Mode tabs */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit text-[11px] font-bold">
        <button
          type="button"
          onClick={() => setMode("type")}
          className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-all ${mode === "type" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
        >
          <Search size={11} /> Type
        </button>
        <button
          type="button"
          onClick={() => setMode("map")}
          className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-all ${mode === "map" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
        >
          <Map size={11} /> Pick on Map
        </button>
      </div>

      {/* Text input + verification */}
      {mode === "type" && (
        <div className="relative">
          <div className="relative flex items-center">
            <MapPin size={14} className="absolute left-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder={placeholder}
              className={`w-full rounded-xl border pl-8 pr-10 py-2.5 text-xs focus:outline-none transition-all ${
                verifyState === "verified"
                  ? "border-emerald-400 bg-emerald-50/40 focus:border-emerald-500"
                  : verifyState === "unverified"
                  ? "border-amber-400 bg-amber-50/40 focus:border-amber-500"
                  : "border-slate-300 bg-white focus:border-emerald-500"
              }`}
            />
            <div className="absolute right-3 flex items-center gap-1.5">
              {searching && <Loader2 size={13} className="animate-spin text-slate-400" />}
              {!searching && verifyState === "verified" && <CheckCircle2 size={14} className="text-emerald-500" />}
              {!searching && verifyState === "unverified" && <AlertCircle size={14} className="text-amber-500" />}
              {query && (
                <button type="button" onClick={handleClear} className="text-slate-400 hover:text-slate-600">
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Verification badge */}
          {verifyState === "verified" && value && (
            <p className="text-[10px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
              <CheckCircle2 size={10} /> Address verified · {value.lat.toFixed(4)}, {value.lng.toFixed(4)}
            </p>
          )}
          {verifyState === "unverified" && query.trim().length >= 3 && suggestions.length === 0 && !searching && (
            <p className="text-[10px] text-amber-700 font-semibold mt-1 flex items-center gap-1">
              <AlertCircle size={10} /> Address not found — try a different search or use the map
            </p>
          )}

          {/* Suggestion dropdown */}
          {suggestions.length > 0 && (
            <ul className="absolute top-full mt-1 w-full z-50 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
              {suggestions.map((r) => (
                <li key={r.place_id}>
                  <button
                    type="button"
                    onClick={() => handleSelectSuggestion(r)}
                    className="w-full text-left px-3 py-2.5 text-xs hover:bg-emerald-50 flex items-start gap-2 transition-colors border-b border-slate-100 last:border-0"
                  >
                    <MapPin size={12} className="text-emerald-600 mt-0.5 shrink-0" />
                    <span className="text-slate-700 leading-snug">{r.display_name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Map picker */}
      {mode === "map" && (
        <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm" style={{ height: 200 }}>
          <MapPicker
            center={mapCenter}
            markerPos={value ? [value.lat, value.lng] : null}
            onPin={handleMapPin}
          />
        </div>
      )}

      {/* Show picked address under map */}
      {mode === "map" && value && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 flex items-start gap-2">
          <CheckCircle2 size={13} className="text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-[11px] font-semibold text-emerald-800">{value.address}</p>
            <p className="text-[10px] text-emerald-600 mt-0.5">{value.lat.toFixed(5)}, {value.lng.toFixed(5)}</p>
          </div>
          <button type="button" onClick={handleClear} className="ml-auto text-emerald-400 hover:text-emerald-700">
            <X size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
