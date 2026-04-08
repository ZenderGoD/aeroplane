"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import dynamic from "next/dynamic";
import type { FlightState } from "@/types/flight";
import airlines, { type Airline } from "@/data/airlines";
import L from "leaflet";
import { getMapStyle, getSavedMapStyleId } from "@/lib/mapStyles";
import "leaflet/dist/leaflet.css";

// ────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────

const REFRESH_OPTIONS = [15, 30, 60, 120];

const METERS_TO_FEET = 3.28084;
const MS_TO_KNOTS = 1.94384;

// ────────────────────────────────────────────────────
// Utilities
// ────────────────────────────────────────────────────

function altitudeColor(alt: number | null): string {
  if (alt === null) return "#64748b";
  const ft = alt * METERS_TO_FEET;
  if (ft < 10000) return "#cbd5e1";
  if (ft < 25000) return "#94a3b8";
  if (ft < 40000) return "#cbd5e1";
  return "#94a3b8";
}

function altitudeBand(alt: number | null): string {
  if (alt === null) return "N/A";
  const ft = alt * METERS_TO_FEET;
  if (ft < 10000) return "<10k";
  if (ft < 25000) return "10-25k";
  if (ft < 40000) return "25-40k";
  return ">40k";
}

function fmtAlt(alt: number | null): string {
  if (alt === null) return "---";
  return `${Math.round(alt * METERS_TO_FEET).toLocaleString()} ft`;
}

function fmtSpd(v: number | null): string {
  if (v === null) return "---";
  return `${Math.round(v * MS_TO_KNOTS)} kts`;
}

function fuzzyMatchAirline(airline: Airline, query: string): number {
  const q = query.toLowerCase();
  const icao = airline.icao.toLowerCase();
  const name = airline.name.toLowerCase();
  const prefix = airline.callsignPrefix.toLowerCase();
  if (icao === q || prefix === q) return 100;
  if (icao.startsWith(q) || prefix.startsWith(q)) return 80;
  if (name.startsWith(q)) return 60;
  if (name.includes(q)) return 40;
  if (icao.includes(q) || prefix.includes(q)) return 30;
  if (airline.country.toLowerCase() === q) return 20;
  return 0;
}

// ────────────────────────────────────────────────────
// Fleet Map (imperative Leaflet — SSR disabled)
// ────────────────────────────────────────────────────

function FleetMapInner({
  flights,
  selectedIcao24,
  onFlightClick,
}: {
  flights: FlightState[];
  selectedIcao24: string | null;
  onFlightClick: (f: FlightState) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [30, 0],
      zoom: 3,
      zoomControl: true,
      attributionControl: true,
    });
    const ms = getMapStyle(getSavedMapStyleId());
    L.tileLayer(ms.url, {
      attribution: ms.attribution,
      ...(ms.subdomains ? { subdomains: ms.subdomains } : {}),
      maxZoom: ms.maxZoom,
    }).addTo(map);
    mapRef.current = map;
    layersRef.current = L.layerGroup().addTo(map);

    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(containerRef.current);
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      layersRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fit bounds when flights change significantly
  const prevCountRef = useRef(0);
  useEffect(() => {
    if (!mapRef.current || flights.length === 0) return;
    const delta = Math.abs(flights.length - prevCountRef.current);
    if (prevCountRef.current === 0 || delta / Math.max(prevCountRef.current, 1) > 0.2) {
      const points = flights
        .filter((f) => f.latitude !== null && f.longitude !== null)
        .map((f) => [f.latitude!, f.longitude!] as [number, number]);
      if (points.length > 0) {
        const bounds = L.latLngBounds(points);
        mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 8 });
      }
    }
    prevCountRef.current = flights.length;
  }, [flights]);

  // Render markers
  useEffect(() => {
    if (!mapRef.current || !layersRef.current) return;
    layersRef.current.clearLayers();

    flights.forEach((f) => {
      if (f.latitude === null || f.longitude === null) return;
      const color = altitudeColor(f.baroAltitude);
      const hdgDeg = f.trueTrack ?? 0;
      const isSelected = f.icao24 === selectedIcao24;

      const size = isSelected ? 28 : 20;
      const half = size / 2;
      const svgSize = isSelected ? 20 : 14;
      const glow = isSelected
        ? `filter:drop-shadow(0 0 8px ${color});`
        : `filter:drop-shadow(0 0 3px ${color}80);`;

      const planeIcon = L.divIcon({
        className: "",
        html: `<div style="transform:rotate(${hdgDeg}deg);display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;${glow}">
          <svg width="${svgSize}" height="${svgSize}" viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L9.5 8.5L2 10.5L2 12L9.5 14L12 22L14.5 14L22 12L22 10.5L14.5 8.5L12 2Z"/>
          </svg>
        </div>`,
        iconSize: [size, size],
        iconAnchor: [half, half],
      });

      const marker = L.marker([f.latitude, f.longitude], { icon: planeIcon });

      const cs = f.callsign?.trim() || f.icao24;
      const alt = fmtAlt(f.baroAltitude);
      const spd = fmtSpd(f.velocity);
      const hdgStr = f.trueTrack !== null ? `${Math.round(f.trueTrack)}\u00B0` : "N/A";
      const reg = f.registration ? `<div style="color:#94a3b8">REG: ${f.registration}</div>` : "";
      const type = f.typeCode ? `<div style="color:#94a3b8">TYPE: ${f.typeCode}</div>` : "";

      marker.bindTooltip(
        `<div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#e2e8f0;line-height:1.5">
          <div style="font-weight:700;color:${color};font-size:12px">${cs}</div>
          ${reg}${type}
          <div>ALT: <span style="color:${color}">${alt}</span></div>
          <div>SPD: ${spd}</div>
          <div>HDG: ${hdgStr}</div>
        </div>`,
        { className: "fleet-tooltip" },
      );

      marker.on("click", () => onFlightClick(f));
      layersRef.current!.addLayer(marker);
    });
  }, [flights, selectedIcao24, onFlightClick]);

  return <div ref={containerRef} className="h-full w-full" />;
}

const FleetMap = dynamic(() => Promise.resolve(FleetMapInner), {
  ssr: false,
  loading: () => (
    <div
      className="h-full w-full flex items-center justify-center"
      style={{ background: "var(--surface-0)" }}
    >
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-slate-300/30 border-t-slate-300 rounded-full animate-spin mx-auto mb-3" />
        <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>
          Loading map...
        </span>
      </div>
    </div>
  ),
});

// ────────────────────────────────────────────────────
// Flight Detail Panel
// ────────────────────────────────────────────────────

function FlightDetailPanel({
  flight,
  onClose,
}: {
  flight: FlightState;
  onClose: () => void;
}) {
  const cs = flight.callsign?.trim() || flight.icao24;
  const alt = fmtAlt(flight.baroAltitude);
  const spd = fmtSpd(flight.velocity);
  const hdg =
    flight.trueTrack !== null ? `${Math.round(flight.trueTrack)}\u00B0` : "N/A";
  const vr =
    flight.verticalRate !== null
      ? `${Math.round(flight.verticalRate * 196.85)} fpm`
      : "N/A";
  const mach = flight.mach != null ? flight.mach.toFixed(3) : "---";
  const sq = flight.squawk ?? "---";

  return (
    <div
      className="absolute bottom-4 right-4 z-[1000] w-64 rounded-xl overflow-hidden"
      style={{
        background: "rgba(6,8,13,0.95)",
        border: "1px solid var(--border-default)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <span
          style={{
            color: altitudeColor(flight.baroAltitude),
            fontWeight: 700,
            fontSize: "13px",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {cs}
        </span>
        <button
          onClick={onClose}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10"
          style={{ color: "var(--text-muted)" }}
        >
          x
        </button>
      </div>
      <div
        className="px-3 py-2 space-y-1"
        style={{
          fontSize: "11px",
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        {flight.registration && (
          <DetailRow label="REG" value={flight.registration} />
        )}
        {flight.typeCode && (
          <DetailRow label="TYPE" value={flight.typeCode} />
        )}
        <DetailRow label="ICAO" value={flight.icao24.toUpperCase()} />
        <DetailRow label="ALT" value={alt} />
        <DetailRow label="SPD" value={spd} />
        <DetailRow label="HDG" value={hdg} />
        <DetailRow label="V/S" value={vr} />
        <DetailRow label="MACH" value={mach} />
        <DetailRow label="SQK" value={sq} />
        <DetailRow
          label="GND"
          value={flight.onGround ? "YES" : "NO"}
        />
        {flight.latitude !== null && flight.longitude !== null && (
          <DetailRow
            label="POS"
            value={`${flight.latitude.toFixed(3)}, ${flight.longitude.toFixed(3)}`}
          />
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span style={{ color: "var(--text-primary)" }}>{value}</span>
    </div>
  );
}

// ────────────────────────────────────────────────────
// Stats Header
// ────────────────────────────────────────────────────

function FleetStatsHeader({ flights }: { flights: FlightState[] }) {
  const stats = useMemo(() => {
    const airborne = flights.filter((f) => !f.onGround);
    const onGround = flights.filter((f) => f.onGround);

    const typeCounts: Record<string, number> = {};
    flights.forEach((f) => {
      const t = f.typeCode || "UNK";
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    });
    const topTypes = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const alts = airborne
      .map((f) => f.baroAltitude)
      .filter((a): a is number => a !== null);
    const speeds = airborne
      .map((f) => f.velocity)
      .filter((v): v is number => v !== null);

    const avgAlt =
      alts.length > 0 ? alts.reduce((s, a) => s + a, 0) / alts.length : null;
    const avgSpd =
      speeds.length > 0
        ? speeds.reduce((s, v) => s + v, 0) / speeds.length
        : null;

    return {
      total: flights.length,
      airborne: airborne.length,
      onGround: onGround.length,
      topTypes,
      avgAlt,
      avgSpd,
    };
  }, [flights]);

  return (
    <div
      className="flex items-center gap-4 px-4 py-2 flex-wrap"
      style={{
        borderBottom: "1px solid var(--border-subtle)",
        fontSize: "11px",
        fontFamily: "'JetBrains Mono', monospace",
        background: "var(--surface-1)",
      }}
    >
      <StatBadge label="TOTAL" value={`${stats.total}`} color="#cbd5e1" />
      <StatBadge label="AIRBORNE" value={`${stats.airborne}`} color="#cbd5e1" />
      <StatBadge label="GROUND" value={`${stats.onGround}`} color="#94a3b8" />
      <StatBadge label="AVG ALT" value={fmtAlt(stats.avgAlt)} color="#cbd5e1" />
      <StatBadge label="AVG SPD" value={fmtSpd(stats.avgSpd)} color="#94a3b8" />

      {stats.topTypes.length > 0 && (
        <div className="flex items-center gap-2 ml-auto">
          <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>
            FLEET:
          </span>
          {stats.topTypes.map(([type, count]) => (
            <span
              key={type}
              className="px-1.5 py-0.5 rounded"
              style={{
                background: "rgba(56,189,248,0.08)",
                border: "1px solid rgba(56,189,248,0.15)",
                color: "var(--text-secondary)",
                fontSize: "10px",
              }}
            >
              {type}:{count}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function StatBadge({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>
        {label}
      </span>
      <span style={{ color, fontWeight: 700, fontSize: "12px" }}>{value}</span>
    </div>
  );
}

// ────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────

export default function FleetTrackerMode({
  onExitMode,
}: {
  onExitMode?: () => void;
}) {
  // Airline selection
  const [selectedAirline, setSelectedAirline] = useState<Airline | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Flight data
  const [flights, setFlights] = useState<FlightState[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // UI state
  const [refreshRate, setRefreshRate] = useState(30);
  const [selectedFlight, setSelectedFlight] = useState<FlightState | null>(null);
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<"all" | "airborne" | "ground">("all");
  const [filterAltMin, setFilterAltMin] = useState("");
  const [filterAltMax, setFilterAltMax] = useState("");

  // ── Close dropdown on outside click ──
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

  // ── Search results ──
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return airlines
      .map((a) => ({ airline: a, score: fuzzyMatchAirline(a, searchQuery.trim()) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((r) => r.airline);
  }, [searchQuery]);

  // ── Select airline ──
  const selectAirline = useCallback((al: Airline) => {
    setSelectedAirline(al);
    setSearchQuery("");
    setShowDropdown(false);
    setSelectedFlight(null);
    setFlights([]);
    setError(null);
    setFilterType("ALL");
    setFilterStatus("all");
    setFilterAltMin("");
    setFilterAltMax("");
  }, []);

  // ── Enter key in search ──
  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        const q = searchQuery.trim().toUpperCase();
        const exact = airlines.find(
          (a) => a.icao === q || a.callsignPrefix === q,
        );
        if (exact) selectAirline(exact);
        else if (searchResults.length > 0) selectAirline(searchResults[0]);
      }
      if (e.key === "Escape") {
        setShowDropdown(false);
        searchRef.current?.blur();
      }
    },
    [searchQuery, searchResults, selectAirline],
  );

  // ── Fetch fleet data ──
  useEffect(() => {
    if (!selectedAirline) return;
    let cancelled = false;

    async function fetchFleet() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/fleet?airline=${encodeURIComponent(selectedAirline!.callsignPrefix)}`,
        );
        if (cancelled) return;
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            (body as { error?: string }).error || `HTTP ${res.status}`,
          );
        }
        const data = await res.json();
        const list: FlightState[] = data.flights ?? [];
        setFlights(list);
        setLastUpdated(new Date());
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to fetch fleet data",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchFleet();
    const iv = setInterval(fetchFleet, refreshRate * 1000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [selectedAirline, refreshRate]);

  // ── Available type codes for filter dropdown ──
  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    flights.forEach((f) => {
      if (f.typeCode) types.add(f.typeCode);
    });
    return Array.from(types).sort();
  }, [flights]);

  // ── Filtered flights ──
  const filteredFlights = useMemo(() => {
    let list = flights;

    if (filterStatus === "airborne") list = list.filter((f) => !f.onGround);
    if (filterStatus === "ground") list = list.filter((f) => f.onGround);

    if (filterType !== "ALL")
      list = list.filter((f) => f.typeCode === filterType);

    const minFt = parseFloat(filterAltMin);
    const maxFt = parseFloat(filterAltMax);
    if (!isNaN(minFt)) {
      list = list.filter(
        (f) => f.baroAltitude !== null && f.baroAltitude * METERS_TO_FEET >= minFt,
      );
    }
    if (!isNaN(maxFt)) {
      list = list.filter(
        (f) => f.baroAltitude !== null && f.baroAltitude * METERS_TO_FEET <= maxFt,
      );
    }

    return list;
  }, [flights, filterStatus, filterType, filterAltMin, filterAltMax]);

  // ── Handle flight click ──
  const handleFlightClick = useCallback((f: FlightState) => {
    setSelectedFlight(f);
  }, []);

  // ── Inject styles ──
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      .fleet-tooltip { background: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important; }
      .fleet-scrollbar::-webkit-scrollbar { width: 4px; }
      .fleet-scrollbar::-webkit-scrollbar-track { background: transparent; }
      .fleet-scrollbar::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.2); border-radius: 2px; }
      .fleet-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(148,163,184,0.35); }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // ────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────

  return (
    <div
      className="relative h-full w-full overflow-hidden flex flex-col"
      style={{ background: "var(--surface-0)" }}
    >
      {/* ── Top Bar ── */}
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

        {/* Fleet icon */}
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{
              background: "rgba(148,163,184,0.1)",
              border: "1px solid rgba(148,163,184,0.2)",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#94a3b8"
              strokeWidth="2"
            >
              <path d="M12 2L9.5 8.5L2 10.5V12L9.5 14L12 22L14.5 14L22 12V10.5L14.5 8.5L12 2Z" />
            </svg>
          </div>
          <span
            style={{
              color: "var(--text-primary)",
              fontWeight: 700,
              fontSize: "13px",
            }}
          >
            Fleet Tracker
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
            placeholder="Search airline (ICAO, name, callsign)..."
            className="w-full h-8 px-3 rounded-lg outline-none transition-all"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border-default)",
              color: "var(--text-primary)",
              fontSize: "12px",
              fontFamily: "'JetBrains Mono', monospace",
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
                maxHeight: "360px",
                overflowY: "auto",
              }}
            >
              {searchResults.map((al) => (
                <button
                  key={al.icao}
                  onClick={() => selectAirline(al)}
                  className="w-full text-left px-3 py-2 hover:bg-white/5 transition-colors flex items-center gap-3"
                  style={{
                    borderBottom: "1px solid var(--border-subtle)",
                  }}
                >
                  <div
                    className="flex-shrink-0 text-center"
                    style={{ minWidth: "44px" }}
                  >
                    <span
                      style={{
                        color: "#94a3b8",
                        fontSize: "12px",
                        fontWeight: 700,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      {al.icao}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className="truncate"
                      style={{
                        color: "var(--text-primary)",
                        fontSize: "12px",
                      }}
                    >
                      {al.name}
                    </div>
                    <div
                      className="truncate"
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "10px",
                      }}
                    >
                      {al.country} &middot; Prefix: {al.callsignPrefix}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected airline badge */}
        {selectedAirline && (
          <div className="flex items-center gap-2 ml-3">
            <div
              className="flex items-center gap-2 px-3 py-1 rounded-lg"
              style={{
                background: "rgba(148,163,184,0.08)",
                border: "1px solid rgba(148,163,184,0.15)",
              }}
            >
              <span
                style={{
                  color: "#94a3b8",
                  fontSize: "12px",
                  fontWeight: 700,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {selectedAirline.icao}
              </span>
              <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>
                /
              </span>
              <span style={{ color: "var(--text-secondary)", fontSize: "11px" }}>
                {selectedAirline.name}
              </span>
            </div>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Refresh rate */}
        {selectedAirline && (
          <div className="flex items-center gap-2">
            <span
              style={{
                color: "var(--text-muted)",
                fontSize: "10px",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              RATE
            </span>
            <div className="flex items-center">
              {REFRESH_OPTIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setRefreshRate(r)}
                  className="px-1.5 py-0.5 transition-colors"
                  style={{
                    fontSize: "10px",
                    fontFamily: "'JetBrains Mono', monospace",
                    color: refreshRate === r ? "#94a3b8" : "var(--text-muted)",
                    background: refreshRate === r ? "rgba(148,163,184,0.12)" : "transparent",
                    borderRadius: "4px",
                    border: refreshRate === r ? "1px solid rgba(148,163,184,0.2)" : "1px solid transparent",
                    cursor: "pointer",
                  }}
                >
                  {r}s
                </button>
              ))}
            </div>

            {loading && (
              <div className="w-3 h-3 border border-slate-300/30 border-t-slate-300 rounded-full animate-spin" />
            )}

            {lastUpdated && (
              <span
                style={{
                  color: "var(--text-faint)",
                  fontSize: "10px",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Stats Header (when airline selected) ── */}
      {selectedAirline && flights.length > 0 && (
        <FleetStatsHeader flights={flights} />
      )}

      {/* ── Main Content ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── Left Panel: Flight List ── */}
        {selectedAirline && (
          <div
            className="flex-shrink-0 flex flex-col"
            style={{
              width: panelCollapsed ? "0px" : "380px",
              borderRight: panelCollapsed ? "none" : "1px solid var(--border-default)",
              background: "var(--surface-1)",
              transition: "width 0.2s ease",
              overflow: "hidden",
            }}
          >
            {/* Filter Bar */}
            <div
              className="flex items-center gap-2 px-3 py-2 flex-wrap"
              style={{
                borderBottom: "1px solid var(--border-subtle)",
                fontSize: "10px",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {/* Status filter */}
              <div className="flex items-center gap-1">
                {(["all", "airborne", "ground"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className="px-2 py-0.5 rounded transition-colors"
                    style={{
                      color:
                        filterStatus === s
                          ? s === "airborne"
                            ? "#cbd5e1"
                            : s === "ground"
                              ? "#94a3b8"
                              : "#cbd5e1"
                          : "var(--text-muted)",
                      background:
                        filterStatus === s
                          ? s === "airborne"
                            ? "rgba(203,213,225,0.1)"
                            : s === "ground"
                              ? "rgba(148,163,184,0.1)"
                              : "rgba(56,189,248,0.1)"
                          : "transparent",
                      border:
                        filterStatus === s
                          ? `1px solid ${s === "airborne" ? "rgba(203,213,225,0.2)" : s === "ground" ? "rgba(148,163,184,0.2)" : "rgba(56,189,248,0.2)"}`
                          : "1px solid transparent",
                      cursor: "pointer",
                      textTransform: "uppercase",
                      fontSize: "10px",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Type filter */}
              {availableTypes.length > 0 && (
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-secondary)",
                    fontSize: "10px",
                    padding: "2px 4px",
                    borderRadius: "4px",
                    fontFamily: "'JetBrains Mono', monospace",
                    cursor: "pointer",
                  }}
                >
                  <option value="ALL">ALL TYPES</option>
                  {availableTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              )}

              {/* Altitude filter */}
              <div className="flex items-center gap-1">
                <span style={{ color: "var(--text-muted)" }}>ALT:</span>
                <input
                  type="text"
                  value={filterAltMin}
                  onChange={(e) => setFilterAltMin(e.target.value)}
                  placeholder="min"
                  className="w-12 px-1 py-0.5 rounded outline-none"
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-primary)",
                    fontSize: "10px",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                />
                <span style={{ color: "var(--text-muted)" }}>-</span>
                <input
                  type="text"
                  value={filterAltMax}
                  onChange={(e) => setFilterAltMax(e.target.value)}
                  placeholder="max"
                  className="w-12 px-1 py-0.5 rounded outline-none"
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-primary)",
                    fontSize: "10px",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                />
                <span style={{ color: "var(--text-faint)" }}>ft</span>
              </div>

              {/* Count */}
              <span className="ml-auto" style={{ color: "var(--text-muted)" }}>
                {filteredFlights.length}/{flights.length}
              </span>
            </div>

            {/* Column headers */}
            <div
              className="flex items-center px-3 py-1.5"
              style={{
                borderBottom: "1px solid var(--border-subtle)",
                fontSize: "9px",
                fontFamily: "'JetBrains Mono', monospace",
                color: "var(--text-faint)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              <span style={{ width: "72px" }}>CALLSIGN</span>
              <span style={{ width: "48px" }}>TYPE</span>
              <span style={{ width: "64px" }}>REG</span>
              <span style={{ width: "80px", textAlign: "right" }}>ALT</span>
              <span style={{ width: "60px", textAlign: "right" }}>SPD</span>
              <span style={{ flex: 1, textAlign: "right", paddingRight: "4px" }}>STATUS</span>
            </div>

            {/* Flight list */}
            <div className="flex-1 overflow-y-auto fleet-scrollbar" style={{ minHeight: 0 }}>
              {filteredFlights.length === 0 && !loading && (
                <div
                  className="flex items-center justify-center h-32"
                  style={{ color: "var(--text-muted)", fontSize: "12px" }}
                >
                  {flights.length === 0
                    ? "No active flights found"
                    : "No flights match filters"}
                </div>
              )}

              {filteredFlights.map((f) => {
                const isSelected = selectedFlight?.icao24 === f.icao24;
                const color = altitudeColor(f.baroAltitude);
                return (
                  <button
                    key={f.icao24}
                    onClick={() => handleFlightClick(f)}
                    className="w-full text-left flex items-center px-3 py-1.5 transition-colors hover:bg-white/[0.03]"
                    style={{
                      borderBottom: "1px solid var(--border-subtle)",
                      background: isSelected ? "rgba(148,163,184,0.06)" : "transparent",
                      borderLeft: isSelected ? "2px solid #94a3b8" : "2px solid transparent",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "11px",
                      cursor: "pointer",
                    }}
                  >
                    <span
                      style={{
                        width: "72px",
                        color: isSelected ? "#94a3b8" : color,
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {f.callsign?.trim() || f.icao24}
                    </span>
                    <span
                      style={{
                        width: "48px",
                        color: "var(--text-tertiary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {f.typeCode || "---"}
                    </span>
                    <span
                      style={{
                        width: "64px",
                        color: "var(--text-tertiary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {f.registration || "---"}
                    </span>
                    <span
                      style={{
                        width: "80px",
                        textAlign: "right",
                        color: color,
                      }}
                    >
                      {fmtAlt(f.baroAltitude)}
                    </span>
                    <span
                      style={{
                        width: "60px",
                        textAlign: "right",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {fmtSpd(f.velocity)}
                    </span>
                    <span style={{ flex: 1, textAlign: "right", paddingRight: "4px" }}>
                      {f.onGround ? (
                        <span
                          className="px-1.5 py-0.5 rounded"
                          style={{
                            background: "rgba(148,163,184,0.1)",
                            color: "#94a3b8",
                            fontSize: "9px",
                            border: "1px solid rgba(148,163,184,0.2)",
                          }}
                        >
                          GND
                        </span>
                      ) : (
                        <span
                          className="px-1.5 py-0.5 rounded"
                          style={{
                            background: "rgba(203,213,225,0.1)",
                            color: "#cbd5e1",
                            fontSize: "9px",
                            border: "1px solid rgba(203,213,225,0.2)",
                          }}
                        >
                          {altitudeBand(f.baroAltitude)}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Collapse / Expand Toggle ── */}
        {selectedAirline && (
          <button
            onClick={() => setPanelCollapsed((p) => !p)}
            className="flex-shrink-0 flex items-center justify-center hover:bg-white/5 transition-colors"
            style={{
              width: "20px",
              background: "var(--surface-1)",
              borderRight: "1px solid var(--border-subtle)",
              cursor: "pointer",
              color: "var(--text-muted)",
              border: "none",
            }}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{
                transform: panelCollapsed ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease",
              }}
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}

        {/* ── Right: Map ── */}
        <div className="flex-1 relative" style={{ minWidth: 0 }}>
          {!selectedAirline ? (
            <div
              className="h-full w-full flex flex-col items-center justify-center gap-4"
              style={{ background: "var(--surface-0)" }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{
                  background: "rgba(148,163,184,0.08)",
                  border: "1px solid rgba(148,163,184,0.15)",
                }}
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                >
                  <path d="M12 2L9.5 8.5L2 10.5V12L9.5 14L12 22L14.5 14L22 12V10.5L14.5 8.5L12 2Z" />
                </svg>
              </div>
              <div className="text-center">
                <div
                  style={{
                    color: "var(--text-primary)",
                    fontSize: "16px",
                    fontWeight: 600,
                    marginBottom: "4px",
                  }}
                >
                  Fleet Tracker
                </div>
                <div
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "12px",
                    maxWidth: "280px",
                  }}
                >
                  Search for an airline above to track all their active aircraft in real time.
                </div>
              </div>

              {/* Quick pick popular airlines */}
              <div className="flex flex-wrap gap-2 mt-2 justify-center" style={{ maxWidth: "600px" }}>
                {airlines.slice(0, 12).map((al) => (
                  <button
                    key={al.icao}
                    onClick={() => selectAirline(al)}
                    className="px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
                    style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--border-default)",
                      cursor: "pointer",
                      fontSize: "11px",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    <span style={{ color: "#94a3b8", fontWeight: 600 }}>
                      {al.icao}
                    </span>
                    <span style={{ color: "var(--text-muted)", marginLeft: "6px" }}>
                      {al.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <FleetMap
                flights={filteredFlights}
                selectedIcao24={selectedFlight?.icao24 ?? null}
                onFlightClick={handleFlightClick}
              />

              {/* Error overlay */}
              {error && (
                <div
                  className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] px-4 py-2 rounded-lg"
                  style={{
                    background: "rgba(226,232,240,0.12)",
                    border: "1px solid rgba(226,232,240,0.25)",
                    color: "#e2e8f0",
                    fontSize: "12px",
                    fontFamily: "'JetBrains Mono', monospace",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  {error}
                </div>
              )}

              {/* Flight detail panel */}
              {selectedFlight && (
                <FlightDetailPanel
                  flight={selectedFlight}
                  onClose={() => setSelectedFlight(null)}
                />
              )}

              {/* Altitude legend */}
              <div
                className="absolute bottom-4 left-4 z-[1000] px-3 py-2 rounded-lg"
                style={{
                  background: "rgba(6,8,13,0.88)",
                  border: "1px solid var(--border-default)",
                  backdropFilter: "blur(8px)",
                  fontSize: "10px",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                <div
                  style={{
                    color: "var(--text-muted)",
                    marginBottom: "4px",
                    fontSize: "9px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Altitude
                </div>
                <div className="flex items-center gap-3">
                  <LegendItem color="#cbd5e1" label="<10k ft" />
                  <LegendItem color="#94a3b8" label="10-25k" />
                  <LegendItem color="#cbd5e1" label="25-40k" />
                  <LegendItem color="#94a3b8" label=">40k ft" />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div
        className="w-2 h-2 rounded-full"
        style={{ background: color, boxShadow: `0 0 4px ${color}60` }}
      />
      <span style={{ color: "var(--text-tertiary)" }}>{label}</span>
    </div>
  );
}
