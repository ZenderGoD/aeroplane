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
import { haversineNm, bearing } from "@/lib/geo";
import airportsData from "@/data/airports.json";

// Re-export the airport radar as an embeddable component
// This avoids Next.js page export restrictions

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

interface BearingLine {
  id: string;
  from: [number, number];
  to: [number, number];
  distanceNm: number;
  bearingDeg: number;
  label: string;
}

// ---------- Constants ----------

const NM_TO_METERS = 1852;
const EARTH_RADIUS_NM = 3440.065;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

const RANGE_RINGS = [5, 10, 15, 20, 25, 50, 75, 100, 150]; // nautical miles

const CARDINAL_BEARINGS: Record<string, number> = {
  N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315,
};

const TYPE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  large: { label: "Large", color: "#22d3ee", icon: "\u2708" },
  medium: { label: "Medium", color: "#60a5fa", icon: "\u2708" },
  small: { label: "Small", color: "#a3e635", icon: "\ud83d\udee9" },
  heliport: { label: "Heliport", color: "#f472b6", icon: "\ud83d\ude81" },
  seaplane: { label: "Seaplane", color: "#38bdf8", icon: "\ud83c\udf0a" },
  balloon: { label: "Balloon", color: "#fbbf24", icon: "\ud83c\udf88" },
};

const airports = airportsData as Airport[];

// ---------- Utility Functions ----------

function destinationPoint(
  lat: number, lon: number, bearingDeg: number, distanceNm: number
): [number, number] {
  const lat1 = lat * DEG_TO_RAD;
  const lon1 = lon * DEG_TO_RAD;
  const brng = bearingDeg * DEG_TO_RAD;
  const d = distanceNm / EARTH_RADIUS_NM;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng)
  );
  const lon2 = lon1 + Math.atan2(
    Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
    Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
  );
  return [lat2 * RAD_TO_DEG, lon2 * RAD_TO_DEG];
}

function altitudeColor(alt: number | null): string {
  if (alt === null) return "#64748b";
  const ft = alt * 3.28084;
  if (ft < 10000) return "#34d399";
  if (ft < 25000) return "#fbbf24";
  if (ft < 40000) return "#22d3ee";
  return "#a78bfa";
}

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

// ---------- Map Component ----------

function AirportMapInner({
  airport, flights, bearingLines, onFlightClick,
}: {
  airport: Airport; flights: FlightState[]; bearingLines: BearingLine[];
  onFlightClick: (f: FlightState) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);
  const L = require("leaflet");
  require("leaflet/dist/leaflet.css");

  const ringColors = [
    "rgba(34,211,238,0.50)", "rgba(34,211,238,0.45)", "rgba(34,211,238,0.40)",
    "rgba(34,211,238,0.35)", "rgba(34,211,238,0.30)", "rgba(34,211,238,0.25)",
    "rgba(34,211,238,0.20)", "rgba(34,211,238,0.15)", "rgba(34,211,238,0.10)",
  ];

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [airport.lat, airport.lon], zoom: 7, zoomControl: true, attributionControl: true,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    }).addTo(map);
    mapRef.current = map;
    layersRef.current = L.layerGroup().addTo(map);

    RANGE_RINGS.forEach((ringNm, i) => {
      L.circle([airport.lat, airport.lon], {
        radius: ringNm * NM_TO_METERS, color: ringColors[i] || "rgba(34,211,238,0.10)",
        weight: 1, dashArray: "6 4", fill: false,
      }).addTo(map);
      const northLat = airport.lat + (ringNm / 60);
      const labelIcon = L.divIcon({
        className: "range-ring-label",
        html: `<div style="color:#22d3ee;font-size:10px;font-weight:700;font-family:'JetBrains Mono',monospace;background:rgba(6,8,13,0.88);padding:1px 6px;border-radius:3px;border:1px solid rgba(34,211,238,0.25);white-space:nowrap;text-align:center;letter-spacing:0.5px">${ringNm} NM</div>`,
        iconSize: [0, 0], iconAnchor: [0, 8],
      });
      L.marker([northLat, airport.lon], { icon: labelIcon, interactive: false }).addTo(map);
    });

    const airportIcon = L.divIcon({
      className: "leaflet-div-icon",
      html: `<div style="position:relative;width:28px;height:28px;">
        <div style="position:absolute;inset:0;border:2px solid #22d3ee;border-radius:50%;animation:pulse 2s ease-in-out infinite;opacity:0.6;"></div>
        <div style="position:absolute;inset:4px;border:2px solid #22d3ee;border-radius:50%;background:rgba(34,211,238,0.15);"></div>
        <div style="position:absolute;top:50%;left:0;right:0;height:1px;background:#22d3ee;opacity:0.5;"></div>
        <div style="position:absolute;left:50%;top:0;bottom:0;width:1px;background:#22d3ee;opacity:0.5;"></div>
      </div>`,
      iconSize: [28, 28], iconAnchor: [14, 14],
    });
    L.marker([airport.lat, airport.lon], { icon: airportIcon }).addTo(map);

    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(containerRef.current);
    return () => { ro.disconnect(); map.remove(); mapRef.current = null; layersRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [airport.lat, airport.lon]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView([airport.lat, airport.lon], 7, { animate: true });
  }, [airport.lat, airport.lon]);

  const flightHistoryRef = useRef<Map<string, Array<[number, number]>>>(new Map());

  useEffect(() => {
    if (!mapRef.current || !layersRef.current) return;
    layersRef.current.clearLayers();
    const history = flightHistoryRef.current;

    flights.forEach((f) => {
      if (f.latitude === null || f.longitude === null) return;
      const color = altitudeColor(f.baroAltitude);
      const hdgDeg = f.trueTrack ?? 0;
      const key = f.icao24 || f.callsign || `${f.latitude},${f.longitude}`;

      if (!history.has(key)) history.set(key, []);
      const trail = history.get(key)!;
      const last = trail[trail.length - 1];
      if (!last || last[0] !== f.latitude || last[1] !== f.longitude) {
        trail.push([f.latitude, f.longitude]);
        if (trail.length > 20) trail.shift();
      }

      if (trail.length >= 2) {
        layersRef.current!.addLayer(L.polyline(trail as L.LatLngExpression[], {
          color, weight: 1.5, opacity: 0.4, dashArray: "3 4",
        }));
        trail.slice(0, -1).forEach((pos, i) => {
          layersRef.current!.addLayer(L.circleMarker(pos as L.LatLngExpression, {
            radius: 1.5, color, fillColor: color, fillOpacity: 0.15 + (i / trail.length) * 0.35, weight: 0,
          }));
        });
      }

      if (f.velocity !== null && f.velocity > 0) {
        const distNm = (f.velocity * 1.94384 / 3600) * 90;
        const destPt = destinationPoint(f.latitude, f.longitude, hdgDeg, distNm);
        layersRef.current!.addLayer(L.polyline(
          [[f.latitude, f.longitude], destPt] as L.LatLngExpression[],
          { color, weight: 1.5, opacity: 0.5, dashArray: "2 3" }
        ));
        const arrowIcon = L.divIcon({
          className: "",
          html: `<div style="width:0;height:0;border-left:3px solid transparent;border-right:3px solid transparent;border-bottom:6px solid ${color};transform:rotate(${hdgDeg}deg);opacity:0.5;"></div>`,
          iconSize: [6, 6], iconAnchor: [3, 3],
        });
        layersRef.current!.addLayer(L.marker(destPt as L.LatLngExpression, { icon: arrowIcon, interactive: false }));
      }

      const isMilitary = (f.dbFlags ?? 0) & 1;
      const planeColor = isMilitary ? "#f59e0b" : color;
      const planeIcon = L.divIcon({
        className: "",
        html: `<div style="transform:rotate(${hdgDeg}deg);display:flex;align-items:center;justify-content:center;width:22px;height:22px;filter:drop-shadow(0 0 3px ${planeColor}80);">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="${planeColor}" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L9.5 8.5L2 10.5L2 12L9.5 14L12 22L14.5 14L22 12L22 10.5L14.5 8.5L12 2Z"/>
          </svg>
        </div>`,
        iconSize: [22, 22], iconAnchor: [11, 11],
      });

      const marker = L.marker([f.latitude, f.longitude], { icon: planeIcon });
      const cs = f.callsign?.trim() || f.icao24;
      const alt = f.baroAltitude !== null ? `${Math.round(f.baroAltitude * 3.28084).toLocaleString()} ft` : "N/A";
      const spd = f.velocity !== null ? `${Math.round(f.velocity * 1.94384)} kts` : "N/A";
      const hdgStr = f.trueTrack !== null ? `${Math.round(f.trueTrack)}\u00B0` : "N/A";
      const reg = f.registration ? `<div style="color:#94a3b8">REG: ${f.registration}</div>` : "";
      const type = f.typeCode ? `<div style="color:#94a3b8">TYPE: ${f.typeCode}</div>` : "";
      marker.bindTooltip(
        `<div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#e2e8f0;line-height:1.5">
          <div style="font-weight:700;color:${planeColor};font-size:12px">${isMilitary ? "\u2605 " : ""}${cs}</div>
          ${reg}${type}
          <div>ALT: <span style="color:${color}">${alt}</span></div>
          <div>SPD: ${spd}</div>
          <div>HDG: ${hdgStr}</div>
        </div>`,
        { className: "range-ring-label" }
      );
      marker.on("click", () => onFlightClick(f));
      layersRef.current!.addLayer(marker);
    });
  }, [flights, onFlightClick]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.eachLayer((layer: L.Layer & { _bearingLine?: boolean }) => {
      if (layer._bearingLine) mapRef.current!.removeLayer(layer);
    });
    const endpointIcon = L.divIcon({
      className: "leaflet-div-icon",
      html: `<div style="width:10px;height:10px;background:#f59e0b;border:1.5px solid #fbbf24;transform:rotate(45deg);box-shadow:0 0 6px rgba(245,158,11,0.5);"></div>`,
      iconSize: [10, 10], iconAnchor: [5, 5],
    });
    bearingLines.forEach((line) => {
      const polyline = L.polyline([line.from, line.to], {
        color: "#f59e0b", weight: 2, opacity: 0.9,
      }) as L.Polyline & { _bearingLine?: boolean };
      polyline._bearingLine = true;
      polyline.bindTooltip(
        `<span style="font-family:monospace;font-size:10px;color:#fbbf24;background:rgba(6,8,13,0.9);padding:2px 6px;border-radius:4px;border:1px solid rgba(245,158,11,0.3)">${line.distanceNm.toFixed(1)} NM / ${Math.round(line.bearingDeg)}\u00B0</span>`,
        { permanent: true, direction: "center", className: "range-ring-label" }
      );
      polyline.addTo(mapRef.current!);
      const ep = L.marker(line.to as L.LatLngExpression, { icon: endpointIcon }) as L.Marker & { _bearingLine?: boolean };
      ep._bearingLine = true;
      ep.addTo(mapRef.current!);
    });
  }, [bearingLines]);

  return <div ref={containerRef} className="h-full w-full" />;
}

const AirportMap = dynamic(() => Promise.resolve(AirportMapInner), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center" style={{ background: "var(--surface-0)" }}>
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-3" />
        <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>Loading map...</span>
      </div>
    </div>
  ),
});

// ---------- Flight Detail Panel ----------

function FlightDetailPanel({
  flight, airportLat, airportLon, onClose,
}: {
  flight: FlightState; airportLat: number; airportLon: number; onClose: () => void;
}) {
  const distNm = flight.latitude !== null && flight.longitude !== null
    ? haversineNm(airportLat, airportLon, flight.latitude, flight.longitude) : null;
  const brg = flight.latitude !== null && flight.longitude !== null
    ? bearing(airportLat, airportLon, flight.latitude, flight.longitude) : null;
  const cs = flight.callsign?.trim() || flight.icao24;
  const alt = flight.baroAltitude !== null ? `${Math.round(flight.baroAltitude * 3.28084).toLocaleString()} ft` : "N/A";
  const spd = flight.velocity !== null ? `${Math.round(flight.velocity * 1.94384)} kts` : "N/A";
  const hdg = flight.trueTrack !== null ? `${Math.round(flight.trueTrack)}\u00B0` : "N/A";

  return (
    <div className="absolute bottom-16 right-4 z-[1000] w-56 rounded-xl overflow-hidden"
      style={{ background: "rgba(6,8,13,0.95)", border: "1px solid var(--border-default)", backdropFilter: "blur(12px)" }}>
      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <span style={{ color: "#22d3ee", fontWeight: 700, fontSize: "13px", fontFamily: "monospace" }}>{cs}</span>
        <button onClick={onClose} className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10" style={{ color: "var(--text-muted)" }}>x</button>
      </div>
      <div className="px-3 py-2 space-y-1" style={{ fontSize: "11px", fontFamily: "monospace" }}>
        <Row label="ALT" value={alt} />
        <Row label="SPD" value={spd} />
        <Row label="HDG" value={hdg} />
        {distNm !== null && <Row label="DIST" value={`${distNm.toFixed(1)} NM`} />}
        {brg !== null && <Row label="BRG" value={`${Math.round(brg)}\u00B0`} />}
        <Row label="GND" value={flight.onGround ? "YES" : "NO"} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span style={{ color: "var(--text-primary)" }}>{value}</span>
    </div>
  );
}

// ---------- Airport Radar Mode (embedded in main page) ----------

export default function AirportRadarMode({ onExitMode }: { onExitMode?: () => void } = {}) {
  const [selectedAirport, setSelectedAirport] = useState<Airport | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [flights, setFlights] = useState<FlightState[]>([]);
  const [flightCount, setFlightCount] = useState(0);
  const [selectedFlight, setSelectedFlight] = useState<FlightState | null>(null);

  const [bearingLines, setBearingLines] = useState<BearingLine[]>([]);
  const [bearingMode, setBearingMode] = useState<"latlon" | "cardinal">("latlon");
  const [latInput, setLatInput] = useState("");
  const [lonInput, setLonInput] = useState("");
  const [cardinalDir, setCardinalDir] = useState("N");
  const [cardinalDist, setCardinalDist] = useState("");

  const REFRESH_OPTIONS = [3, 5, 10, 15, 30, 60];
  const [refreshRate, setRefreshRate] = useState(10);
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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
    setMapReady(false);
    setSelectedAirport(apt);
    setSearchQuery("");
    setShowDropdown(false);
    setSelectedFlight(null);
    setBearingLines([]);
    setTimeout(() => setMapReady(true), 50);
  }, []);

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        const q = searchQuery.trim().toUpperCase();
        const found = airports.find((a) => a.icao === q || a.iata === q);
        if (found) selectAirport(found);
        else if (searchResults.length > 0) selectAirport(searchResults[0]);
      }
      if (e.key === "Escape") { setShowDropdown(false); searchRef.current?.blur(); }
    },
    [searchQuery, searchResults, selectAirport]
  );

  // Fetch flights
  useEffect(() => {
    if (!selectedAirport) return;
    let cancelled = false;
    async function fetchFlights() {
      try {
        const r = await fetch(`/api/flights?lat=${selectedAirport!.lat}&lon=${selectedAirport!.lon}&radius=100`);
        if (cancelled) return;
        const data = await r.json();
        const list: FlightState[] = data.flights ?? data.states ?? [];
        setFlights(list);
        setFlightCount(list.length);
      } catch { /* silent */ }
    }
    fetchFlights();
    const iv = setInterval(fetchFlights, refreshRate * 1000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [selectedAirport, refreshRate]);

  const drawLatLonLine = useCallback(() => {
    if (!selectedAirport) return;
    const lat = parseFloat(latInput); const lon = parseFloat(lonInput);
    if (isNaN(lat) || isNaN(lon)) return;
    const distNm = haversineNm(selectedAirport.lat, selectedAirport.lon, lat, lon);
    const brg = bearing(selectedAirport.lat, selectedAirport.lon, lat, lon);
    setBearingLines((prev) => [...prev, {
      id: `${Date.now()}`, from: [selectedAirport.lat, selectedAirport.lon],
      to: [lat, lon], distanceNm: distNm, bearingDeg: brg, label: `${lat.toFixed(3)},${lon.toFixed(3)}`,
    }]);
    setLatInput(""); setLonInput("");
  }, [selectedAirport, latInput, lonInput]);

  const drawCardinalLine = useCallback(() => {
    if (!selectedAirport) return;
    const dist = parseFloat(cardinalDist);
    if (isNaN(dist) || dist <= 0) return;
    const brg = CARDINAL_BEARINGS[cardinalDir] ?? 0;
    const dest = destinationPoint(selectedAirport.lat, selectedAirport.lon, brg, dist);
    setBearingLines((prev) => [...prev, {
      id: `${Date.now()}`, from: [selectedAirport.lat, selectedAirport.lon],
      to: dest, distanceNm: dist, bearingDeg: brg, label: `${cardinalDir} ${dist} NM`,
    }]);
    setCardinalDist("");
  }, [selectedAirport, cardinalDir, cardinalDist]);

  const removeLine = useCallback((id: string) => {
    setBearingLines((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const clearAllLines = useCallback(() => { setBearingLines([]); }, []);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 0.6; } 50% { transform: scale(1.4); opacity: 0; } }
      .range-ring-label { background: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important; }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden flex flex-col" style={{ background: "var(--surface-0)" }}>
      {/* Top Bar */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4"
        style={{ height: "48px", background: "rgba(6,8,13,0.92)", borderBottom: "1px solid var(--border-default)", backdropFilter: "blur(12px)", position: "relative", zIndex: 1100 }}>
        {/* Back to map */}
        {onExitMode && (
          <button onClick={onExitMode} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity mr-1"
            style={{ color: "var(--text-muted)", fontSize: "12px", background: "none", border: "none", cursor: "pointer" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Map
          </button>
        )}
        {/* Radar icon */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.2)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
              <line x1="12" y1="2" x2="12" y2="12" />
            </svg>
          </div>
          <span style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "13px" }}>Airport Radar</span>
        </div>

        {/* Search */}
        <div className="relative ml-3" style={{ width: "300px" }}>
          <input ref={searchRef} type="text" value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); }}
            onFocus={() => { if (searchQuery.trim()) setShowDropdown(true); }}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search airport (ICAO, IATA, name, city)..."
            className="w-full h-8 px-3 rounded-lg outline-none transition-all data-value"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border-default)", color: "var(--text-primary)", fontSize: "12px" }} />
          <svg className="absolute right-2.5 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>

          {showDropdown && searchResults.length > 0 && (
            <div ref={dropdownRef} className="absolute top-full left-0 right-0 mt-1 z-[2000] overflow-hidden"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border-default)", borderRadius: "8px", boxShadow: "0 12px 40px rgba(0,0,0,0.5)", maxHeight: "320px", overflowY: "auto" }}>
              {searchResults.map((apt) => (
                <button key={apt.id} onClick={() => selectAirport(apt)}
                  className="w-full text-left px-3 py-2 hover:bg-white/5 transition-colors flex items-center gap-3"
                  style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <div className="flex-shrink-0 text-center" style={{ minWidth: "40px" }}>
                    <span className="data-value" style={{ color: TYPE_LABELS[apt.type || "large"]?.color || "#22d3ee", fontSize: "11px", fontWeight: 700 }}>{apt.icao}</span>
                    {apt.type && apt.type !== "large" && apt.type !== "medium" && (
                      <div style={{ fontSize: "9px", color: TYPE_LABELS[apt.type]?.color || "#888", marginTop: "1px" }}>
                        {TYPE_LABELS[apt.type]?.icon} {TYPE_LABELS[apt.type]?.label}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate" style={{ color: "var(--text-primary)", fontSize: "12px" }}>{apt.name}</div>
                    <div className="truncate" style={{ color: "var(--text-muted)", fontSize: "10px" }}>
                      {apt.city}, {apt.country}{apt.iata ? ` \u00b7 ${apt.iata}` : ""}
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
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg"
              style={{ background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.15)" }}>
              <span className="data-value" style={{ color: "#22d3ee", fontSize: "12px", fontWeight: 700 }}>{selectedAirport.icao}</span>
              {selectedAirport.iata && (
                <><span style={{ color: "var(--text-muted)", fontSize: "10px" }}>/</span>
                <span className="data-value" style={{ color: "var(--text-secondary)", fontSize: "11px" }}>{selectedAirport.iata}</span></>
              )}
              {selectedAirport.type && selectedAirport.type !== "large" && selectedAirport.type !== "medium" && (
                <span style={{ fontSize: "9px", fontWeight: 600, color: TYPE_LABELS[selectedAirport.type]?.color || "#888",
                  background: `${TYPE_LABELS[selectedAirport.type]?.color || "#888"}15`, padding: "1px 5px", borderRadius: "4px" }}>
                  {TYPE_LABELS[selectedAirport.type]?.icon} {TYPE_LABELS[selectedAirport.type]?.label}
                </span>
              )}
            </div>
            <span className="truncate" style={{ color: "var(--text-secondary)", fontSize: "11px", maxWidth: "200px" }}>{selectedAirport.name}</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden relative">
        {/* Left panel - bearing tool */}
        {selectedAirport && (
          <div className="absolute top-0 left-0 bottom-0 z-[1000] flex flex-col overflow-hidden transition-all duration-300"
            style={{ width: panelCollapsed ? "36px" : "260px", background: "color-mix(in srgb, var(--surface-1) 95%, transparent)",
              borderRight: "1px solid var(--border-default)", backdropFilter: "blur(12px)" }}>
            <button onClick={() => setPanelCollapsed((v) => !v)}
              className="flex-shrink-0 h-9 flex items-center justify-center hover:bg-white/5 transition-colors"
              style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
              {panelCollapsed ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
              ) : (
                <div className="flex items-center gap-2 w-full px-3">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>
                  <span className="section-label" style={{ letterSpacing: "0.06em" }}>BEARING LINE TOOL</span>
                </div>
              )}
            </button>

            {!panelCollapsed && (
              <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-3">
                {/* Mode tabs */}
                <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--border-default)" }}>
                  <button onClick={() => setBearingMode("latlon")} className="flex-1 py-1.5 text-center transition-colors"
                    style={{ fontSize: "10px", fontWeight: 600, background: bearingMode === "latlon" ? "rgba(34,211,238,0.12)" : "transparent",
                      color: bearingMode === "latlon" ? "#22d3ee" : "var(--text-muted)" }}>LAT/LON</button>
                  <button onClick={() => setBearingMode("cardinal")} className="flex-1 py-1.5 text-center transition-colors"
                    style={{ fontSize: "10px", fontWeight: 600, background: bearingMode === "cardinal" ? "rgba(34,211,238,0.12)" : "transparent",
                      color: bearingMode === "cardinal" ? "#22d3ee" : "var(--text-muted)", borderLeft: "1px solid var(--border-default)" }}>DIRECTION</button>
                </div>

                {bearingMode === "latlon" && (
                  <div className="space-y-2">
                    <div>
                      <label className="data-label block mb-1">Latitude</label>
                      <input type="number" step="any" value={latInput} onChange={(e) => setLatInput(e.target.value)} placeholder="e.g. 28.5665"
                        className="w-full h-7 px-2 rounded-md data-value outline-none"
                        style={{ background: "var(--surface-2)", border: "1px solid var(--border-default)", color: "var(--text-primary)", fontSize: "11px" }} />
                    </div>
                    <div>
                      <label className="data-label block mb-1">Longitude</label>
                      <input type="number" step="any" value={lonInput} onChange={(e) => setLonInput(e.target.value)} placeholder="e.g. 77.1031"
                        className="w-full h-7 px-2 rounded-md data-value outline-none"
                        style={{ background: "var(--surface-2)", border: "1px solid var(--border-default)", color: "var(--text-primary)", fontSize: "11px" }} />
                    </div>
                    <button onClick={drawLatLonLine} className="w-full h-7 rounded-md transition-colors"
                      style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b", fontSize: "11px", fontWeight: 600 }}>Draw Line</button>
                  </div>
                )}

                {bearingMode === "cardinal" && (
                  <div className="space-y-2">
                    <div>
                      <label className="data-label block mb-1">Direction</label>
                      <div className="grid grid-cols-4 gap-1">
                        {Object.keys(CARDINAL_BEARINGS).map((dir) => (
                          <button key={dir} onClick={() => setCardinalDir(dir)} className="h-7 rounded-md transition-colors"
                            style={{ fontSize: "10px", fontWeight: 700,
                              background: cardinalDir === dir ? "rgba(34,211,238,0.15)" : "var(--surface-2)",
                              border: `1px solid ${cardinalDir === dir ? "rgba(34,211,238,0.3)" : "var(--border-default)"}`,
                              color: cardinalDir === dir ? "#22d3ee" : "var(--text-muted)" }}>{dir}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="data-label block mb-1">Distance (NM)</label>
                      <input type="number" step="any" min="0" value={cardinalDist} onChange={(e) => setCardinalDist(e.target.value)} placeholder="e.g. 50"
                        className="w-full h-7 px-2 rounded-md data-value outline-none"
                        style={{ background: "var(--surface-2)", border: "1px solid var(--border-default)", color: "var(--text-primary)", fontSize: "11px" }} />
                    </div>
                    <button onClick={drawCardinalLine} className="w-full h-7 rounded-md transition-colors"
                      style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b", fontSize: "11px", fontWeight: 600 }}>Draw Line</button>
                  </div>
                )}

                {/* Lines list */}
                {bearingLines.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="section-label">LINES ({bearingLines.length})</span>
                      <button onClick={clearAllLines} className="transition-colors hover:opacity-80"
                        style={{ fontSize: "10px", color: "var(--status-critical)", fontWeight: 600 }}>Clear All</button>
                    </div>
                    {bearingLines.map((line) => (
                      <div key={line.id} className="flex items-center justify-between px-2 py-1.5 rounded-md"
                        style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)" }}>
                        <div className="data-value" style={{ fontSize: "10px" }}>
                          <span style={{ color: "#f59e0b" }}>{line.distanceNm.toFixed(1)} NM</span>
                          <span style={{ color: "var(--text-muted)", margin: "0 4px" }}>/</span>
                          <span style={{ color: "var(--text-secondary)" }}>{Math.round(line.bearingDeg)}{"\u00B0"}</span>
                        </div>
                        <button onClick={() => removeLine(line.id)} className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
                          style={{ color: "var(--text-muted)", fontSize: "12px" }}>x</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Altitude Legend */}
                <div className="pt-2">
                  <span className="section-label">ALTITUDE LEGEND</span>
                  <div className="mt-2 space-y-1">
                    {[
                      { color: "#34d399", label: "< 10,000 ft" },
                      { color: "#fbbf24", label: "10,000 - 25,000 ft" },
                      { color: "#22d3ee", label: "25,000 - 40,000 ft" },
                      { color: "#a78bfa", label: "> 40,000 ft" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                        <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Map */}
        <div className="absolute inset-0">
          {selectedAirport && mapReady ? (
            <AirportMap airport={selectedAirport} flights={flights} bearingLines={bearingLines} onFlightClick={setSelectedFlight} />
          ) : (
            <div className="h-full w-full flex items-center justify-center" style={{ background: "var(--surface-0)" }}>
              <div className="text-center space-y-4 max-w-md">
                <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center"
                  style={{ background: "rgba(34,211,238,0.06)", border: "1px solid rgba(34,211,238,0.12)" }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="1.5" opacity="0.7">
                    <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
                    <line x1="12" y1="2" x2="12" y2="12" />
                  </svg>
                </div>
                <div>
                  <h2 style={{ color: "var(--text-primary)", fontSize: "18px", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "8px" }}>Airport Radar View</h2>
                  <p style={{ color: "var(--text-muted)", fontSize: "13px", lineHeight: 1.6 }}>
                    Search for an airport above to view a radar-style display with range rings, live flights, and bearing line tools.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                  </svg>
                  <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>Try &quot;KJFK&quot;, &quot;Heathrow&quot;, or &quot;DEL&quot;</span>
                </div>
              </div>
            </div>
          )}

          {selectedFlight && selectedAirport && (
            <FlightDetailPanel flight={selectedFlight} airportLat={selectedAirport.lat} airportLon={selectedAirport.lon} onClose={() => setSelectedFlight(null)} />
          )}

          {/* Bottom-right badge */}
          {selectedAirport && (
            <div className="absolute bottom-4 right-4 z-[1000] flex items-center gap-3 px-3 py-1.5 rounded-lg"
              style={{ background: "rgba(6,8,13,0.9)", border: "1px solid var(--border-default)", backdropFilter: "blur(12px)" }}>
              <div className="flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                <select value={refreshRate} onChange={(e) => setRefreshRate(Number(e.target.value))} className="appearance-none cursor-pointer"
                  style={{ background: "var(--surface-3)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)",
                    borderRadius: "4px", padding: "1px 6px", fontSize: "10px", fontFamily: "monospace", fontWeight: 600, outline: "none" }}>
                  {REFRESH_OPTIONS.map((s) => <option key={s} value={s}>{s}s</option>)}
                </select>
              </div>
              <div style={{ width: "1px", height: "12px", background: "var(--border-subtle)" }} />
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full"
                  style={{ background: flightCount > 0 ? "#34d399" : "#64748b", boxShadow: flightCount > 0 ? "0 0 6px rgba(52,211,153,0.4)" : "none" }} />
                <span className="data-value" style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{flightCount} flights</span>
                <span style={{ color: "var(--text-faint)", fontSize: "10px" }}>&middot; airplanes.live</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
