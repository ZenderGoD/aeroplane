"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import type { FlightState } from "@/types/flight";
import { haversineNm, bearing, mToFt, msToKts } from "@/lib/geo";
import airportsData from "@/data/airports.json";

// ---------- Types ----------

interface Airport {
  id: number;
  name: string;
  city: string;
  country: string;
  iata: string | null;
  icao: string;
  lat: number;
  lon: number;
  alt: number;
  tz?: string;
  type?: "large" | "medium" | "small" | "heliport" | "seaplane" | "balloon" | "other";
}

type FlightStatus =
  | "ON FINAL"
  | "APPROACHING"
  | "LANDED"
  | "DEPARTING"
  | "CLIMBING"
  | "EN ROUTE";

type SortKey =
  | "callsign"
  | "typeCode"
  | "origin"
  | "altitude"
  | "speed"
  | "distance"
  | "status"
  | "eta";

type SortDir = "asc" | "desc";
type BoardTab = "arrivals" | "departures";

interface ClassifiedFlight {
  flight: FlightState;
  distanceNm: number;
  bearingDeg: number;
  altitudeFt: number | null;
  speedKts: number | null;
  status: FlightStatus;
  estimatedOriginDest: string;
  etaMinutes: number | null;
}

// ---------- Constants ----------

const airports = airportsData as Airport[];

const REFRESH_OPTIONS = [3, 5, 10, 15, 30, 60];

const STATUS_CONFIG: Record<FlightStatus, { bg: string; text: string; glow: string }> = {
  "APPROACHING": { bg: "rgba(251, 191, 36, 0.15)", text: "#94a3b8", glow: "rgba(251, 191, 36, 0.25)" },
  "ON FINAL":    { bg: "rgba(52, 211, 153, 0.15)", text: "#cbd5e1", glow: "rgba(52, 211, 153, 0.25)" },
  "LANDED":      { bg: "rgba(34, 211, 238, 0.15)", text: "#cbd5e1", glow: "rgba(34, 211, 238, 0.25)" },
  "DEPARTING":   { bg: "rgba(96, 165, 250, 0.15)", text: "#cbd5e1", glow: "rgba(96, 165, 250, 0.25)" },
  "CLIMBING":    { bg: "rgba(167, 139, 250, 0.15)", text: "#94a3b8", glow: "rgba(167, 139, 250, 0.25)" },
  "EN ROUTE":    { bg: "rgba(100, 116, 139, 0.15)", text: "#94a3b8", glow: "rgba(100, 116, 139, 0.25)" },
};

// ---------- Utility Functions ----------

function fuzzyMatch(airport: Airport, query: string): number {
  const q = query.toLowerCase();
  const icao = (airport.icao ?? "").toLowerCase();
  const iata = (airport.iata ?? "").toLowerCase();
  const name = airport.name.toLowerCase();
  const city = airport.city.toLowerCase();
  if (icao === q || iata === q) return 100;
  if (icao.startsWith(q) || iata.startsWith(q)) return 80;
  if (name.startsWith(q) || city.startsWith(q)) return 60;
  if (name.includes(q) || city.includes(q)) return 40;
  if (icao.includes(q) || iata.includes(q)) return 30;
  return 0;
}

function classifyFlight(
  f: FlightState,
  airportLat: number,
  airportLon: number
): ClassifiedFlight | null {
  if (f.latitude === null || f.longitude === null) return null;

  const distanceNm = haversineNm(airportLat, airportLon, f.latitude, f.longitude);
  const bearingDeg = bearing(airportLat, airportLon, f.latitude, f.longitude);
  const altitudeFt = f.baroAltitude !== null ? mToFt(f.baroAltitude) : null;
  const speedKts = f.velocity !== null ? msToKts(f.velocity) : null;
  const vRate = f.verticalRate ?? 0;
  const isDescending = vRate < -1;
  const isClimbing = vRate > 1;

  // Determine heading toward/away from airport
  const headingToAirport = bearing(f.latitude, f.longitude, airportLat, airportLon);
  const flightHeading = f.trueTrack ?? 0;
  const headingDiff = Math.abs(((flightHeading - headingToAirport) + 180) % 360 - 180);
  const isHeadingToward = headingDiff < 60;
  const isHeadingAway = headingDiff > 120;

  let status: FlightStatus;

  if (f.onGround && distanceNm < 5) {
    status = "LANDED";
  } else if (f.onGround || (altitudeFt !== null && altitudeFt < 5000 && isClimbing && distanceNm < 50)) {
    status = "DEPARTING";
  } else if (distanceNm < 15 && altitudeFt !== null && altitudeFt < 5000 && isDescending) {
    status = "ON FINAL";
  } else if (distanceNm < 50 && isDescending && isHeadingToward) {
    status = "APPROACHING";
  } else if (distanceNm < 50 && isClimbing && isHeadingAway) {
    status = "CLIMBING";
  } else {
    status = "EN ROUTE";
  }

  // Estimate origin/destination based on reverse heading
  let estimatedOriginDest = "---";
  if (f.trueTrack !== null && f.baroAltitude !== null && !f.onGround) {
    const reverseHeading = (f.trueTrack + 180) % 360;
    const headingRad = (reverseHeading * Math.PI) / 180;
    const altFeet = f.baroAltitude * 3.28084;
    const estimatedNm = Math.min(Math.max(altFeet / 20, 30), 2000);
    const depLat = f.latitude + (estimatedNm / 60) * Math.cos(headingRad);
    const depLon =
      f.longitude +
      ((estimatedNm / 60) * Math.sin(headingRad)) /
        Math.cos((f.latitude * Math.PI) / 180);

    let bestDist = Infinity;
    let bestApt: Airport | null = null;
    for (const a of airports) {
      const d = haversineNm(depLat, depLon, a.lat, a.lon);
      if (d < bestDist) {
        bestDist = d;
        bestApt = a;
      }
    }
    if (bestApt && bestDist < 100) {
      estimatedOriginDest = bestApt.iata || bestApt.icao || bestApt.city;
    }
  }

  // Rough ETA for arrivals
  let etaMinutes: number | null = null;
  if (speedKts && speedKts > 50 && distanceNm > 0) {
    etaMinutes = (distanceNm / speedKts) * 60;
  }

  return {
    flight: f,
    distanceNm,
    bearingDeg,
    altitudeFt,
    speedKts,
    status,
    estimatedOriginDest,
    etaMinutes,
  };
}

function isArrival(cf: ClassifiedFlight): boolean {
  return (
    cf.status === "APPROACHING" ||
    cf.status === "ON FINAL" ||
    cf.status === "LANDED" ||
    cf.status === "EN ROUTE"
  );
}

function isDeparture(cf: ClassifiedFlight): boolean {
  return (
    cf.status === "DEPARTING" ||
    cf.status === "CLIMBING" ||
    cf.status === "LANDED"
  );
}

function formatEta(minutes: number | null): string {
  if (minutes === null) return "---";
  if (minutes < 1) return "<1m";
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m}m`;
}

function formatAlt(ft: number | null): string {
  if (ft === null) return "---";
  if (ft < 100) return "GND";
  return ft.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function formatSpeed(kts: number | null): string {
  if (kts === null) return "---";
  return Math.round(kts).toString();
}

function formatDist(nm: number): string {
  if (nm < 1) return "<1";
  if (nm < 10) return nm.toFixed(1);
  return Math.round(nm).toString();
}

// ---------- Sub-components ----------

function StatusBadge({ status }: { status: FlightStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider whitespace-nowrap"
      style={{
        background: cfg.bg,
        color: cfg.text,
        border: `1px solid ${cfg.glow}`,
        textShadow: `0 0 8px ${cfg.glow}`,
      }}
    >
      {status}
    </span>
  );
}

function FlightDetailOverlay({
  cf,
  airportLat,
  airportLon,
  onClose,
}: {
  cf: ClassifiedFlight;
  airportLat: number;
  airportLon: number;
  onClose: () => void;
}) {
  const f = cf.flight;
  const cs = f.callsign?.trim() || f.icao24;

  const rows: { label: string; value: string }[] = [
    { label: "CALLSIGN", value: cs },
    { label: "REG", value: f.registration || "---" },
    { label: "TYPE", value: f.typeCode || "---" },
    { label: "ALT", value: cf.altitudeFt !== null ? `${formatAlt(cf.altitudeFt)} ft` : "---" },
    { label: "SPD", value: cf.speedKts !== null ? `${Math.round(cf.speedKts)} kts` : "---" },
    { label: "HDG", value: f.trueTrack !== null ? `${Math.round(f.trueTrack)}\u00B0` : "---" },
    { label: "VRATE", value: f.verticalRate !== null ? `${Math.round(f.verticalRate * 196.85)} fpm` : "---" },
    { label: "DIST", value: `${cf.distanceNm.toFixed(1)} NM` },
    { label: "BRG", value: `${Math.round(cf.bearingDeg)}\u00B0` },
    { label: "GROUND", value: f.onGround ? "YES" : "NO" },
    { label: "SQUAWK", value: f.squawk || "---" },
  ];

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-80 rounded-xl overflow-hidden"
        style={{
          background: "var(--surface-1)",
          border: "1px solid var(--border-default)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid var(--border-default)", background: "var(--surface-2)" }}
        >
          <div className="flex items-center gap-3">
            <StatusBadge status={cf.status} />
            <span
              className="data-value"
              style={{ color: "#cbd5e1", fontWeight: 700, fontSize: "15px" }}
            >
              {cs}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/10 transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Body */}
        <div className="px-4 py-3 space-y-1.5" style={{ fontFamily: "'Geist Mono', 'JetBrains Mono', monospace" }}>
          {rows.map((r) => (
            <div key={r.label} className="flex justify-between items-center" style={{ fontSize: "11px" }}>
              <span style={{ color: "var(--text-muted)", letterSpacing: "0.05em" }}>{r.label}</span>
              <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{r.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Main Component ----------

export default function AirportBoardMode({ onExitMode }: { onExitMode?: () => void } = {}) {
  const [selectedAirport, setSelectedAirport] = useState<Airport | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [flights, setFlights] = useState<FlightState[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [refreshRate, setRefreshRate] = useState(10);
  const [activeTab, setActiveTab] = useState<BoardTab>("arrivals");
  const [sortKey, setSortKey] = useState<SortKey>("distance");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selectedDetail, setSelectedDetail] = useState<ClassifiedFlight | null>(null);
  const [clock, setClock] = useState(new Date());

  // Inject keyframes
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes pulse-dot {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(1.3); }
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  // Clock tick
  useEffect(() => {
    const iv = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        searchRef.current &&
        !searchRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Fuzzy search
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return airports
      .map((a) => ({ airport: a, score: fuzzyMatch(a, searchQuery.trim()) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((r) => r.airport);
  }, [searchQuery]);

  const selectAirport = useCallback((apt: Airport) => {
    setSelectedAirport(apt);
    setSearchQuery("");
    setShowDropdown(false);
    setSelectedDetail(null);
  }, []);

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        const q = searchQuery.trim().toUpperCase();
        const found = airports.find((a) => a.icao === q || a.iata === q);
        if (found) selectAirport(found);
        else if (searchResults.length > 0) selectAirport(searchResults[0]);
      }
      if (e.key === "Escape") {
        setShowDropdown(false);
        searchRef.current?.blur();
      }
    },
    [searchQuery, searchResults, selectAirport]
  );

  // Fetch flights
  useEffect(() => {
    if (!selectedAirport) return;
    let cancelled = false;
    async function fetchFlights() {
      try {
        const r = await fetch(
          `/api/flights?lat=${selectedAirport!.lat}&lon=${selectedAirport!.lon}&radius=100`
        );
        if (cancelled) return;
        const data = await r.json();
        const list: FlightState[] = data.flights ?? data.states ?? [];
        setFlights(list);
        setLastUpdate(new Date());
      } catch {
        /* silent */
      }
    }
    fetchFlights();
    const iv = setInterval(fetchFlights, refreshRate * 1000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [selectedAirport, refreshRate]);

  // Classify and filter flights
  const classified = useMemo(() => {
    if (!selectedAirport) return [];
    const results: ClassifiedFlight[] = [];
    for (const f of flights) {
      const cf = classifyFlight(f, selectedAirport.lat, selectedAirport.lon);
      if (cf) results.push(cf);
    }
    return results;
  }, [flights, selectedAirport]);

  const arrivals = useMemo(() => classified.filter(isArrival), [classified]);
  const departures = useMemo(() => classified.filter(isDeparture), [classified]);

  const displayFlights = activeTab === "arrivals" ? arrivals : departures;

  // Sort
  const sorted = useMemo(() => {
    const list = [...displayFlights];
    const dir = sortDir === "asc" ? 1 : -1;

    list.sort((a, b) => {
      switch (sortKey) {
        case "callsign": {
          const ac = a.flight.callsign?.trim() || a.flight.icao24 || "";
          const bc = b.flight.callsign?.trim() || b.flight.icao24 || "";
          return ac.localeCompare(bc) * dir;
        }
        case "typeCode": {
          const at = a.flight.typeCode || "";
          const bt = b.flight.typeCode || "";
          return at.localeCompare(bt) * dir;
        }
        case "origin":
          return a.estimatedOriginDest.localeCompare(b.estimatedOriginDest) * dir;
        case "altitude":
          return ((a.altitudeFt ?? -1) - (b.altitudeFt ?? -1)) * dir;
        case "speed":
          return ((a.speedKts ?? -1) - (b.speedKts ?? -1)) * dir;
        case "distance":
          return (a.distanceNm - b.distanceNm) * dir;
        case "status":
          return a.status.localeCompare(b.status) * dir;
        case "eta":
          return ((a.etaMinutes ?? 9999) - (b.etaMinutes ?? 9999)) * dir;
        default:
          return 0;
      }
    });
    return list;
  }, [displayFlights, sortKey, sortDir]);

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
    },
    [sortKey]
  );

  const SortArrow = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return null;
    return (
      <span className="ml-1 inline-block" style={{ fontSize: "9px", color: "#cbd5e1" }}>
        {sortDir === "asc" ? "\u25B2" : "\u25BC"}
      </span>
    );
  };

  // Format time
  const utcStr = clock.toLocaleTimeString("en-GB", { timeZone: "UTC", hour12: false });
  const localStr = selectedAirport
    ? (() => {
        try {
          // Attempt to show airport local time if tz data is available
          return clock.toLocaleTimeString("en-GB", { hour12: false });
        } catch {
          return "";
        }
      })()
    : "";

  return (
    <div
      className="relative h-full w-full overflow-hidden flex flex-col"
      style={{ background: "var(--surface-0)" }}
    >
      {/* ===== TOP HEADER BAR ===== */}
      <div
        className="flex-shrink-0 flex items-center gap-3 px-4"
        style={{
          height: "48px",
          background: "rgba(6,8,13,0.92)",
          borderBottom: "1px solid var(--border-default)",
          backdropFilter: "blur(12px)",
          position: "relative",
          zIndex: 1100,
        }}
      >
        {/* Back button */}
        {onExitMode && (
          <button
            onClick={onExitMode}
            className="flex items-center gap-1.5 hover:opacity-80 transition-opacity mr-1"
            style={{
              color: "var(--text-muted)",
              fontSize: "12px",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Map
          </button>
        )}

        {/* FIDS Icon */}
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{
              background: "rgba(203,213,225,0.1)",
              border: "1px solid rgba(203,213,225,0.2)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
          <span style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "13px" }}>
            Flight Board
          </span>
        </div>

        {/* Search */}
        <div className="relative ml-3" style={{ width: "300px" }}>
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => {
              if (searchQuery.trim()) setShowDropdown(true);
            }}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search airport (ICAO, IATA, name, city)..."
            className="w-full h-8 px-3 rounded-lg outline-none transition-all data-value"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border-default)",
              color: "var(--text-primary)",
              fontSize: "12px",
            }}
          />
          <svg
            className="absolute right-2.5 top-1/2 -translate-y-1/2"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-muted)"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>

          {showDropdown && searchResults.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute top-full left-0 right-0 mt-1 z-[2000] overflow-hidden"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border-default)",
                borderRadius: "8px",
                boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
                maxHeight: "320px",
                overflowY: "auto",
              }}
            >
              {searchResults.map((apt) => (
                <button
                  key={apt.id}
                  onClick={() => selectAirport(apt)}
                  className="w-full text-left px-3 py-2 hover:bg-white/5 transition-colors flex items-center gap-3"
                  style={{ borderBottom: "1px solid var(--border-subtle)" }}
                >
                  <div className="flex-shrink-0 text-center" style={{ minWidth: "40px" }}>
                    <span
                      className="data-value"
                      style={{ color: "#cbd5e1", fontSize: "11px", fontWeight: 700 }}
                    >
                      {apt.icao}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate" style={{ color: "var(--text-primary)", fontSize: "12px" }}>
                      {apt.name}
                    </div>
                    <div className="truncate" style={{ color: "var(--text-muted)", fontSize: "10px" }}>
                      {apt.city}, {apt.country}
                      {apt.iata ? ` \u00b7 ${apt.iata}` : ""}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected airport badge */}
        {selectedAirport && (
          <div className="flex items-center gap-2 ml-3">
            <div
              className="flex items-center gap-2 px-3 py-1 rounded-lg"
              style={{
                background: "rgba(203,213,225,0.08)",
                border: "1px solid rgba(203,213,225,0.15)",
              }}
            >
              <span className="data-value" style={{ color: "#cbd5e1", fontSize: "12px", fontWeight: 700 }}>
                {selectedAirport.icao}
              </span>
              {selectedAirport.iata && (
                <>
                  <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>/</span>
                  <span className="data-value" style={{ color: "var(--text-secondary)", fontSize: "11px" }}>
                    {selectedAirport.iata}
                  </span>
                </>
              )}
            </div>
            <span
              className="truncate"
              style={{ color: "var(--text-secondary)", fontSize: "11px", maxWidth: "200px" }}
            >
              {selectedAirport.name}
            </span>
          </div>
        )}

        {/* Clock (right side) */}
        <div className="ml-auto flex items-center gap-3">
          <div
            className="data-value flex items-center gap-2"
            style={{ fontSize: "12px", color: "var(--text-secondary)" }}
          >
            <span style={{ color: "var(--text-muted)", fontSize: "9px", letterSpacing: "0.08em" }}>UTC</span>
            <span style={{ color: "#cbd5e1", fontWeight: 700, fontSize: "13px", letterSpacing: "0.02em" }}>
              {utcStr}
            </span>
            {localStr && (
              <>
                <span style={{ color: "var(--text-faint)" }}>|</span>
                <span style={{ color: "var(--text-muted)", fontSize: "9px", letterSpacing: "0.08em" }}>LCL</span>
                <span style={{ fontWeight: 600 }}>{localStr}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ===== FIDS HEADER - Airport Name + Tabs ===== */}
      {selectedAirport && (
        <div
          className="flex-shrink-0 flex items-center justify-between px-4"
          style={{
            height: "42px",
            background: "var(--surface-1)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          {/* Tabs */}
          <div className="flex items-center gap-1">
            {(["arrivals", "departures"] as BoardTab[]).map((tab) => {
              const isActive = activeTab === tab;
              const count = tab === "arrivals" ? arrivals.length : departures.length;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-lg transition-all duration-200"
                  style={{
                    background: isActive ? "rgba(203,213,225,0.1)" : "transparent",
                    border: isActive ? "1px solid rgba(203,213,225,0.2)" : "1px solid transparent",
                    color: isActive ? "#cbd5e1" : "var(--text-muted)",
                    fontSize: "12px",
                    fontWeight: isActive ? 700 : 500,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  {tab === "arrivals" ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 22h20" />
                      <path d="M3.77 10.77 2 9l2-4.5 1.1.55c.55.28.9.84.9 1.45s.35 1.17.9 1.45L8 8.5l3-6 1.05.53a2 2 0 0 1 1.09 1.52l.72 5.4a2 2 0 0 1-.29 1.3l-1.57 2.25" />
                      <path d="M15.77 10.77 14 9l-1 2 5.5 2.5" />
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 22h20" />
                      <path d="M6.36 17.4 4 17l-2-4 1.1-.55a2 2 0 0 1 1.8 0l.17.1a2 2 0 0 0 1.8 0L8 12 5 6l1.05-.53a2 2 0 0 1 2.15.18l4.56 3.42a2 2 0 0 0 1.3.36l5.4-.72a2 2 0 0 1 1.52 1.09L22 12l-4.5 2" />
                    </svg>
                  )}
                  {tab}
                  <span
                    className="data-value px-1.5 py-0.5 rounded text-[10px] font-bold"
                    style={{
                      background: isActive ? "rgba(203,213,225,0.15)" : "rgba(148,163,184,0.15)",
                      color: isActive ? "#cbd5e1" : "var(--text-muted)",
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Refresh rate */}
          <div className="flex items-center gap-2">
            <span style={{ color: "var(--text-muted)", fontSize: "10px", letterSpacing: "0.06em" }}>
              REFRESH
            </span>
            <div className="flex items-center gap-0.5">
              {REFRESH_OPTIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setRefreshRate(r)}
                  className="px-1.5 py-0.5 rounded text-[10px] transition-all data-value"
                  style={{
                    background: refreshRate === r ? "rgba(203,213,225,0.12)" : "transparent",
                    color: refreshRate === r ? "#cbd5e1" : "var(--text-muted)",
                    border: refreshRate === r ? "1px solid rgba(203,213,225,0.2)" : "1px solid transparent",
                    fontWeight: refreshRate === r ? 700 : 400,
                  }}
                >
                  {r}s
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== MAIN BOARD CONTENT ===== */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {!selectedAirport ? (
          /* Empty state */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center" style={{ maxWidth: "360px" }}>
              <div
                className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                style={{
                  background: "rgba(203,213,225,0.06)",
                  border: "1px solid rgba(203,213,225,0.12)",
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                  <line x1="6" y1="8" x2="18" y2="8" />
                  <line x1="6" y1="11" x2="14" y2="11" />
                </svg>
              </div>
              <h3 style={{ color: "var(--text-primary)", fontSize: "15px", fontWeight: 700, marginBottom: "6px" }}>
                Airport Flight Board
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "12px", lineHeight: "1.6" }}>
                Search for an airport above to view live arrivals and departures in FIDS format.
              </p>
            </div>
          </div>
        ) : (
          /* Table */
          <div className="flex-1 overflow-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "var(--border-default) transparent" }}>
            <table
              className="w-full border-collapse"
              style={{ fontFamily: "'Geist Mono', 'JetBrains Mono', monospace", fontSize: "12px" }}
            >
              <thead>
                <tr
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 10,
                    background: "var(--surface-1)",
                    borderBottom: "1px solid var(--border-default)",
                  }}
                >
                  {([
                    { key: "callsign" as SortKey, label: "FLIGHT", width: "12%" },
                    { key: "typeCode" as SortKey, label: "AIRCRAFT", width: "9%" },
                    { key: "origin" as SortKey, label: activeTab === "arrivals" ? "ORIGIN" : "DEST", width: "10%" },
                    { key: "altitude" as SortKey, label: "ALT (FT)", width: "10%" },
                    { key: "speed" as SortKey, label: "SPD (KTS)", width: "10%" },
                    { key: "distance" as SortKey, label: "DIST (NM)", width: "10%" },
                    { key: "status" as SortKey, label: "STATUS", width: "14%" },
                    ...(activeTab === "arrivals"
                      ? [{ key: "eta" as SortKey, label: "ETA", width: "10%" }]
                      : []),
                  ]).map((col) => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className="text-left cursor-pointer select-none hover:bg-white/5 transition-colors"
                      style={{
                        padding: "10px 12px",
                        fontSize: "10px",
                        fontWeight: 700,
                        color: sortKey === col.key ? "#cbd5e1" : "var(--text-muted)",
                        letterSpacing: "0.08em",
                        width: col.width,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {col.label}
                      <SortArrow col={col.key} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td
                      colSpan={activeTab === "arrivals" ? 8 : 7}
                      className="text-center py-16"
                      style={{ color: "var(--text-muted)", fontSize: "12px" }}
                    >
                      No {activeTab} detected within 100 NM
                    </td>
                  </tr>
                ) : (
                  sorted.map((cf, idx) => {
                    const cs = cf.flight.callsign?.trim() || cf.flight.icao24;
                    return (
                      <tr
                        key={cf.flight.icao24 + idx}
                        onClick={() => setSelectedDetail(cf)}
                        className="cursor-pointer transition-colors duration-150"
                        style={{
                          background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                          borderBottom: "1px solid var(--border-subtle)",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLTableRowElement).style.background =
                            "rgba(203,213,225,0.04)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLTableRowElement).style.background =
                            idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)";
                        }}
                      >
                        <td style={{ padding: "8px 12px", color: "#cbd5e1", fontWeight: 700, fontSize: "12px" }}>
                          {cs}
                        </td>
                        <td style={{ padding: "8px 12px", color: "var(--text-secondary)" }}>
                          {cf.flight.typeCode || "---"}
                        </td>
                        <td style={{ padding: "8px 12px", color: "var(--text-secondary)", fontWeight: 600 }}>
                          {cf.estimatedOriginDest}
                        </td>
                        <td
                          style={{
                            padding: "8px 12px",
                            color: "var(--text-primary)",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {formatAlt(cf.altitudeFt)}
                        </td>
                        <td
                          style={{
                            padding: "8px 12px",
                            color: "var(--text-primary)",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {formatSpeed(cf.speedKts)}
                        </td>
                        <td
                          style={{
                            padding: "8px 12px",
                            color: "var(--text-primary)",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {formatDist(cf.distanceNm)}
                        </td>
                        <td style={{ padding: "8px 12px" }}>
                          <StatusBadge status={cf.status} />
                        </td>
                        {activeTab === "arrivals" && (
                          <td
                            style={{
                              padding: "8px 12px",
                              color: cf.etaMinutes !== null && cf.etaMinutes < 10 ? "#cbd5e1" : "var(--text-secondary)",
                              fontWeight: cf.etaMinutes !== null && cf.etaMinutes < 10 ? 700 : 400,
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {formatEta(cf.etaMinutes)}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===== STATUS BAR ===== */}
      {selectedAirport && (
        <div
          className="flex-shrink-0 flex items-center justify-between px-4"
          style={{
            height: "30px",
            background: "var(--surface-1)",
            borderTop: "1px solid var(--border-subtle)",
            fontSize: "10px",
            fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
          }}
        >
          <div className="flex items-center gap-4">
            <span style={{ color: "var(--text-muted)" }}>
              Flights:{" "}
              <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{flights.length}</span>
            </span>
            <span style={{ color: "var(--text-muted)" }}>
              {activeTab === "arrivals" ? "Arrivals" : "Departures"}:{" "}
              <span style={{ color: "#cbd5e1", fontWeight: 600 }}>
                {activeTab === "arrivals" ? arrivals.length : departures.length}
              </span>
            </span>
            <span style={{ color: "var(--text-muted)" }}>
              Radius: <span style={{ color: "var(--text-secondary)" }}>100 NM</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span style={{ color: "var(--text-muted)" }}>
              Source: <span style={{ color: "var(--text-secondary)" }}>airplanes.live</span>
            </span>
            <span style={{ color: "var(--text-muted)" }}>
              Refresh: <span style={{ color: "var(--text-secondary)" }}>{refreshRate}s</span>
            </span>
            {lastUpdate && (
              <span style={{ color: "var(--text-muted)" }}>
                Updated:{" "}
                <span style={{ color: "var(--text-secondary)" }}>
                  {lastUpdate.toLocaleTimeString("en-GB", { hour12: false })}
                </span>
              </span>
            )}
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: "#cbd5e1",
                boxShadow: "0 0 6px rgba(203,213,225,0.5)",
                animation: "pulse-dot 2s ease-in-out infinite",
              }}
            />
          </div>
        </div>
      )}

      {/* Flight detail overlay */}
      {selectedDetail && selectedAirport && (
        <FlightDetailOverlay
          cf={selectedDetail}
          airportLat={selectedAirport.lat}
          airportLon={selectedAirport.lon}
          onClose={() => setSelectedDetail(null)}
        />
      )}

    </div>
  );
}
