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
// Leaflet loaded dynamically to avoid SSR "window is not defined"
// eslint-disable-next-line @typescript-eslint/no-require-imports
const L: typeof import("leaflet") = typeof window !== "undefined" ? require("leaflet") : null;
if (typeof window !== "undefined") require("leaflet/dist/leaflet.css");
import { getMapStyle, getSavedMapStyleId } from "@/lib/mapStyles";

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

const TYPE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  large: { label: "Large", color: "var(--text-secondary)", icon: "✈" },
  medium: { label: "Medium", color: "var(--text-tertiary)", icon: "✈" },
  small: { label: "Small", color: "var(--text-secondary)", icon: "🛩" },
  heliport: { label: "Heliport", color: "var(--accent-primary)", icon: "🚁" },
  seaplane: { label: "Seaplane", color: "var(--text-secondary)", icon: "🌊" },
  balloon: { label: "Balloon", color: "var(--text-tertiary)", icon: "🎈" },
};

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
  N: 0,
  NE: 45,
  E: 90,
  SE: 135,
  S: 180,
  SW: 225,
  W: 270,
  NW: 315,
};

const airports = airportsData as Airport[];

// ---------- Utility Functions ----------

function destinationPoint(
  lat: number,
  lon: number,
  bearingDeg: number,
  distanceNm: number
): [number, number] {
  const lat1 = lat * DEG_TO_RAD;
  const lon1 = lon * DEG_TO_RAD;
  const brng = bearingDeg * DEG_TO_RAD;
  const d = distanceNm / EARTH_RADIUS_NM;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng)
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
    );

  return [lat2 * RAD_TO_DEG, lon2 * RAD_TO_DEG];
}

function altitudeColor(altMeters: number | null): string {
  if (altMeters === null) return "#6b7280";
  const ft = altMeters * 3.28084;
  if (ft < 10000) return "var(--text-secondary)"; // low
  if (ft < 25000) return "var(--text-tertiary)"; // mid
  if (ft < 40000) return "var(--text-secondary)"; // high
  return "var(--text-tertiary)"; // very high
}

function fuzzyMatch(airport: Airport, query: string): number {
  const q = query.toLowerCase();
  const icao = (airport.icao ?? "").toLowerCase();
  const iata = (airport.iata ?? "").toLowerCase();
  const name = (airport.name ?? "").toLowerCase();
  const city = (airport.city ?? "").toLowerCase();

  if ((icao && icao === q) || (iata && iata === q)) return 100;
  if ((icao && icao.startsWith(q)) || (iata && iata.startsWith(q))) return 80;
  if ((name && name.startsWith(q)) || (city && city.startsWith(q))) return 60;
  if ((icao && icao.includes(q)) || (iata && iata.includes(q))) return 50;
  if ((name && name.includes(q)) || (city && city.includes(q))) return 30;
  return 0;
}

// ---------- Map Component (loaded dynamically, SSR disabled) ----------

interface AirportMapProps {
  airport: Airport;
  flights: FlightState[];
  bearingLines: BearingLine[];
  onFlightClick: (f: FlightState) => void;
}

function AirportMapInner({
  airport,
  flights,
  bearingLines,
  onFlightClick,
}: AirportMapProps) {

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);

  // Colors fade out as rings get larger: 5,10,15,20,25,50,75,100,150
  const ringColors = [
    "rgba(203,213,225,0.50)",
    "rgba(203,213,225,0.45)",
    "rgba(203,213,225,0.40)",
    "rgba(203,213,225,0.35)",
    "rgba(203,213,225,0.30)",
    "rgba(203,213,225,0.25)",
    "rgba(203,213,225,0.20)",
    "rgba(203,213,225,0.15)",
    "rgba(203,213,225,0.10)",
  ];

  // ── Create map imperatively ──
  useEffect(() => {
    if (!containerRef.current || mapRef.current || !L) return;
    const map = L.map(containerRef.current, {
      center: [airport.lat, airport.lon],
      zoom: 7,
      zoomControl: true,
      attributionControl: true,
    });
    const ms = getMapStyle(getSavedMapStyleId());
    L.tileLayer(ms.url, {
      attribution: ms.attribution,
      maxZoom: ms.maxZoom,
      ...(ms.subdomains ? { subdomains: ms.subdomains } : {}),
    }).addTo(map);
    mapRef.current = map;
    layersRef.current = L.layerGroup().addTo(map);

    // Add range rings with labels at north point
    RANGE_RINGS.forEach((ringNm, i) => {
      L.circle([airport.lat, airport.lon], {
        radius: ringNm * NM_TO_METERS,
        color: ringColors[i] || "rgba(203,213,225,0.10)",
        weight: 1,
        dashArray: "6 4",
        fill: false,
      }).addTo(map);

      // Place label at the north point of the ring
      const northLat = airport.lat + (ringNm / 60); // 1 NM ≈ 1/60 degree lat
      const labelIcon = L.divIcon({
        className: "range-ring-label",
        html: `<div style="
          color:#cbd5e1;
          font-size:10px;
          font-weight:700;
          font-family:'JetBrains Mono',monospace;
          background:rgba(6,8,13,0.88);
          padding:1px 6px;
          border-radius:3px;
          border:1px solid rgba(203,213,225,0.25);
          white-space:nowrap;
          text-align:center;
          letter-spacing:0.5px;
        ">${ringNm} NM</div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 8],
      });
      L.marker([northLat, airport.lon], { icon: labelIcon, interactive: false }).addTo(map);
    });

    // Airport marker
    const airportIcon = L.divIcon({
      className: "leaflet-div-icon",
      html: `<div style="position:relative;width:28px;height:28px;">
        <div style="position:absolute;inset:0;border:2px solid #cbd5e1;border-radius:50%;animation:pulse 2s ease-in-out infinite;opacity:0.6;"></div>
        <div style="position:absolute;inset:4px;border:2px solid #cbd5e1;border-radius:50%;background:rgba(203,213,225,0.15);"></div>
        <div style="position:absolute;top:50%;left:0;right:0;height:1px;background:#cbd5e1;opacity:0.5;"></div>
        <div style="position:absolute;left:50%;top:0;bottom:0;width:1px;background:#cbd5e1;opacity:0.5;"></div>
      </div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
    L.marker([airport.lat, airport.lon], { icon: airportIcon }).addTo(map);

    // Resize observer
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      layersRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [airport.lat, airport.lon]);

  // ── Recenter on airport change ──
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView([airport.lat, airport.lon], 7, { animate: true });
  }, [airport.lat, airport.lon]);

  // ── Track flight history for trails ──
  const flightHistoryRef = useRef<Map<string, Array<[number, number]>>>(new Map());

  // ── Update flight markers ──
  useEffect(() => {
    if (!mapRef.current || !layersRef.current) return;
    layersRef.current.clearLayers();

    const history = flightHistoryRef.current;

    flights.forEach((f) => {
      if (f.latitude === null || f.longitude === null) return;
      const color = altitudeColor(f.baroAltitude);
      const hdgDeg = f.trueTrack ?? 0;
      const key = f.icao24 || f.callsign || `${f.latitude},${f.longitude}`;

      // ── Update trail history ──
      if (!history.has(key)) history.set(key, []);
      const trail = history.get(key)!;
      const last = trail[trail.length - 1];
      if (!last || last[0] !== f.latitude || last[1] !== f.longitude) {
        trail.push([f.latitude, f.longitude]);
        if (trail.length > 20) trail.shift(); // keep last 20 positions
      }

      // ── Draw trail (past positions) ──
      if (trail.length >= 2) {
        const trailLine = L.polyline(trail as L.LatLngExpression[], {
          color,
          weight: 1.5,
          opacity: 0.4,
          dashArray: "3 4",
        });
        layersRef.current!.addLayer(trailLine);

        // Trail dots (fading opacity)
        trail.slice(0, -1).forEach((pos, i) => {
          const opacity = 0.15 + (i / trail.length) * 0.35;
          const dot = L.circleMarker(pos as L.LatLngExpression, {
            radius: 1.5,
            color,
            fillColor: color,
            fillOpacity: opacity,
            weight: 0,
          });
          layersRef.current!.addLayer(dot);
        });
      }

      // ── Forward projection line (heading indicator) ──
      if (f.velocity !== null && f.velocity > 0) {
        // Project forward ~60 seconds of flight
        const projectionTimeSec = 90;
        const distNm = (f.velocity * 1.94384 / 3600) * projectionTimeSec;
        const destPt = destinationPoint(f.latitude, f.longitude, hdgDeg, distNm);

        // Gradient effect: solid near plane, fading out
        const fwdLine = L.polyline(
          [[f.latitude, f.longitude], destPt] as L.LatLngExpression[],
          {
            color,
            weight: 1.5,
            opacity: 0.5,
            dashArray: "2 3",
          }
        );
        layersRef.current!.addLayer(fwdLine);

        // Small arrowhead at the tip
        const arrowIcon = L.divIcon({
          className: "",
          html: `<div style="
            width:0;height:0;
            border-left:3px solid transparent;
            border-right:3px solid transparent;
            border-bottom:6px solid ${color};
            transform:rotate(${hdgDeg}deg);
            opacity:0.5;
          "></div>`,
          iconSize: [6, 6],
          iconAnchor: [3, 3],
        });
        const arrowMarker = L.marker(destPt as L.LatLngExpression, { icon: arrowIcon, interactive: false });
        layersRef.current!.addLayer(arrowMarker);
      }

      // ── Plane icon (rotated SVG) ──
      const isMilitary = (f.dbFlags ?? 0) & 1;
      const planeColor = isMilitary ? "var(--text-tertiary)" : color;
      const planeIcon = L.divIcon({
        className: "",
        html: `<div style="transform:rotate(${hdgDeg}deg);display:flex;align-items:center;justify-content:center;width:22px;height:22px;filter:drop-shadow(0 0 3px ${planeColor}80);">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="${planeColor}" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L9.5 8.5L2 10.5L2 12L9.5 14L12 22L14.5 14L22 12L22 10.5L14.5 8.5L12 2Z"/>
          </svg>
        </div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
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

  // ── Update bearing lines ──
  useEffect(() => {
    if (!mapRef.current) return;
    // Remove old bearing line layers (tagged with _bearingLine)
    mapRef.current.eachLayer((layer: L.Layer & { _bearingLine?: boolean }) => {
      if (layer._bearingLine) mapRef.current!.removeLayer(layer);
    });

    const endpointIcon = L.divIcon({
      className: "leaflet-div-icon",
      html: `<div style="width:10px;height:10px;background:#94a3b8;border:1.5px solid #94a3b8;transform:rotate(45deg);box-shadow:0 0 6px rgba(148,163,184,0.5);"></div>`,
      iconSize: [10, 10],
      iconAnchor: [5, 5],
    });

    bearingLines.forEach((line) => {
      const polyline = L.polyline([line.from, line.to], {
        color: "var(--text-tertiary)",
        weight: 2,
        opacity: 0.9,
      }) as L.Polyline & { _bearingLine?: boolean };
      polyline._bearingLine = true;
      polyline.bindTooltip(
        `<span style="font-family:monospace;font-size:10px;color:#94a3b8;background:rgba(6,8,13,0.9);padding:2px 6px;border-radius:4px;border:1px solid rgba(148,163,184,0.3)">${line.distanceNm.toFixed(1)} NM / ${Math.round(line.bearingDeg)}\u00B0</span>`,
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
        <div className="w-8 h-8 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin mx-auto mb-3" />
        <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>Loading map...</span>
      </div>
    </div>
  ),
});

// ---------- Flight Detail Panel ----------

function FlightDetailPanel({
  flight,
  airportLat,
  airportLon,
  onClose,
}: {
  flight: FlightState;
  airportLat: number;
  airportLon: number;
  onClose: () => void;
}) {
  const distNm =
    flight.latitude !== null && flight.longitude !== null
      ? haversineNm(airportLat, airportLon, flight.latitude, flight.longitude)
      : null;
  const brg =
    flight.latitude !== null && flight.longitude !== null
      ? bearing(airportLat, airportLon, flight.latitude, flight.longitude)
      : null;

  return (
    <div
      className="absolute top-[60px] right-4 z-[1000] w-72 animate-slide-up"
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border-default)",
        borderRadius: "12px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <span className="data-readout" style={{ fontSize: "14px" }}>
          {flight.callsign?.trim() || flight.icao24}
        </span>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/5 transition-colors"
          style={{ color: "var(--text-muted)" }}
        >
          x
        </button>
      </div>
      <div className="p-4 space-y-2" style={{ fontSize: "12px", fontFamily: "monospace" }}>
        <Row label="ICAO24" value={flight.icao24} />
        {flight.registration && <Row label="REG" value={flight.registration} />}
        {flight.typeCode && <Row label="TYPE" value={flight.typeCode} />}
        <Row
          label="ALT"
          value={
            flight.baroAltitude !== null
              ? `${Math.round(flight.baroAltitude * 3.28084).toLocaleString()} ft`
              : "N/A"
          }
        />
        <Row
          label="SPD"
          value={
            flight.velocity !== null
              ? `${Math.round(flight.velocity * 1.94384)} kts`
              : "N/A"
          }
        />
        <Row
          label="HDG"
          value={flight.trueTrack !== null ? `${Math.round(flight.trueTrack)}\u00B0` : "N/A"}
        />
        <Row
          label="VRATE"
          value={
            flight.verticalRate !== null
              ? `${Math.round(flight.verticalRate * 196.85)} ft/min`
              : "N/A"
          }
        />
        {flight.squawk && <Row label="SQUAWK" value={flight.squawk} />}
        {distNm !== null && (
          <Row label="DIST" value={`${distNm.toFixed(1)} NM`} />
        )}
        {brg !== null && (
          <Row label="BRG" value={`${Math.round(brg)}\u00B0`} />
        )}
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

// ---------- Main Page ----------

export default function AirportRadarPage() {
  return <AirportRadarCore embedded={false} />;
}

function AirportRadarCore({ embedded = false }: { embedded?: boolean }) {
  // Airport selection
  const [selectedAirport, setSelectedAirport] = useState<Airport | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Flights
  const [flights, setFlights] = useState<FlightState[]>([]);
  const [flightCount, setFlightCount] = useState(0);
  const [selectedFlight, setSelectedFlight] = useState<FlightState | null>(null);

  // Bearing lines
  const [bearingLines, setBearingLines] = useState<BearingLine[]>([]);
  const [bearingMode, setBearingMode] = useState<"latlon" | "cardinal">("latlon");
  const [latInput, setLatInput] = useState("");
  const [lonInput, setLonInput] = useState("");
  const [cardinalDir, setCardinalDir] = useState("N");
  const [cardinalDist, setCardinalDist] = useState("");

  // Refresh rate (seconds)
  const REFRESH_OPTIONS = [15, 30, 60, 120];
  const [refreshRate, setRefreshRate] = useState(30);

  // Panel state
  const [panelCollapsed, setPanelCollapsed] = useState(false);

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

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return airports
      .map((a) => ({ airport: a, score: fuzzyMatch(a, searchQuery.trim()) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((r) => r.airport);
  }, [searchQuery]);

  // Select airport
  const selectAirport = useCallback((apt: Airport) => {
    setMapReady(false);
    setSelectedAirport(apt);
    setSearchQuery("");
    setShowDropdown(false);
    setSelectedFlight(null);
    setBearingLines([]);
    // Delay map mount so the container has its final size
    setTimeout(() => setMapReady(true), 50);
  }, []);

  // Handle Enter on search input (raw ICAO)
  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        const q = searchQuery.trim().toUpperCase();
        const found = airports.find(
          (a) => a.icao === q || a.iata === q
        );
        if (found) {
          selectAirport(found);
        } else if (searchResults.length > 0) {
          selectAirport(searchResults[0]);
        }
      }
      if (e.key === "Escape") {
        setShowDropdown(false);
      }
    },
    [searchQuery, searchResults, selectAirport]
  );

  // Fetch flights around selected airport
  useEffect(() => {
    if (!selectedAirport) return;

    let cancelled = false;

    async function fetchFlights() {
      if (!selectedAirport) return;
      // Build bounding box covering ~120 NM in each direction
      const latSpan = 120 / 60; // ~2 degrees
      const lonSpan = 120 / (60 * Math.cos(selectedAirport.lat * DEG_TO_RAD));

      const params = new URLSearchParams({
        lamin: String(selectedAirport.lat - latSpan),
        lomin: String(selectedAirport.lon - lonSpan),
        lamax: String(selectedAirport.lat + latSpan),
        lomax: String(selectedAirport.lon + lonSpan),
      });

      try {
        const res = await fetch(`/api/flights?${params.toString()}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data.flights)) {
          setFlights(data.flights);
          setFlightCount(data.flights.length);
        }
      } catch {
        // silent
      }
    }

    fetchFlights();
    const iv = setInterval(fetchFlights, refreshRate * 1000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [selectedAirport, refreshRate]);

  // Draw bearing line (lat/lon mode)
  const drawLatLonLine = useCallback(() => {
    if (!selectedAirport) return;
    const lat = parseFloat(latInput);
    const lon = parseFloat(lonInput);
    if (isNaN(lat) || isNaN(lon)) return;

    const dist = haversineNm(selectedAirport.lat, selectedAirport.lon, lat, lon);
    const brg = bearing(selectedAirport.lat, selectedAirport.lon, lat, lon);

    setBearingLines((prev) => [
      ...prev,
      {
        id: `bl-${Date.now()}`,
        from: [selectedAirport.lat, selectedAirport.lon],
        to: [lat, lon],
        distanceNm: dist,
        bearingDeg: brg,
        label: `${dist.toFixed(1)} NM / ${Math.round(brg)}\u00B0`,
      },
    ]);
    setLatInput("");
    setLonInput("");
  }, [selectedAirport, latInput, lonInput]);

  // Draw bearing line (cardinal mode)
  const drawCardinalLine = useCallback(() => {
    if (!selectedAirport) return;
    const dist = parseFloat(cardinalDist);
    if (isNaN(dist) || dist <= 0) return;

    const brg = CARDINAL_BEARINGS[cardinalDir];
    const [toLat, toLon] = destinationPoint(
      selectedAirport.lat,
      selectedAirport.lon,
      brg,
      dist
    );

    setBearingLines((prev) => [
      ...prev,
      {
        id: `bl-${Date.now()}`,
        from: [selectedAirport.lat, selectedAirport.lon],
        to: [toLat, toLon],
        distanceNm: dist,
        bearingDeg: brg,
        label: `${dist.toFixed(1)} NM / ${cardinalDir}`,
      },
    ]);
    setCardinalDist("");
  }, [selectedAirport, cardinalDir, cardinalDist]);

  const removeLine = useCallback((id: string) => {
    setBearingLines((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const clearAllLines = useCallback(() => {
    setBearingLines([]);
  }, []);

  // Inject pulse keyframe for airport marker
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 0.6; }
        50% { transform: scale(1.4); opacity: 0; }
      }
      .range-ring-label .leaflet-tooltip-content { background: transparent !important; }
      .range-ring-label {
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // ---- Render ----

  return (
    <div
      className={embedded ? "relative h-full w-full overflow-hidden flex flex-col" : "relative h-screen w-screen overflow-hidden flex flex-col"}
      style={{ background: "var(--surface-0)" }}
    >
      {/* ===== TOP BAR ===== */}
      <div
        className="flex-shrink-0 flex items-center gap-3 px-4"
        style={{
          height: embedded ? "48px" : "60px",
          background: embedded ? "rgba(6,8,13,0.92)" : "var(--surface-1)",
          borderBottom: "1px solid var(--border-default)",
          backdropFilter: embedded ? "blur(12px)" : undefined,
        }}
      >
        {/* Back link (standalone page only) */}
        {!embedded && (
          <a
            href="/"
            className="flex items-center gap-1.5 mr-2 hover:opacity-80 transition-opacity"
            style={{ color: "var(--text-muted)", fontSize: "12px", textDecoration: "none" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Map
          </a>
        )}

        {/* Radar icon */}
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: "rgba(203,213,225,0.1)",
              border: "1px solid rgba(203,213,225,0.2)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" />
              <line x1="12" y1="2" x2="12" y2="12" />
            </svg>
          </div>
          <span style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "14px", letterSpacing: "-0.01em" }}>
            Airport Radar
          </span>
        </div>

        {/* Search */}
        <div className="relative ml-4" style={{ width: "340px" }}>
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
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="var(--text-muted)" strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>

          {/* Dropdown */}
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
                      style={{
                        color: TYPE_LABELS[apt.type || "large"]?.color || "var(--text-secondary)",
                        fontSize: "11px",
                        fontWeight: 700,
                      }}
                    >
                      {apt.icao}
                    </span>
                    {apt.type && apt.type !== "large" && apt.type !== "medium" && (
                      <div style={{ fontSize: "9px", color: TYPE_LABELS[apt.type]?.color || "#888", marginTop: "1px" }}>
                        {TYPE_LABELS[apt.type]?.icon} {TYPE_LABELS[apt.type]?.label}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className="truncate"
                      style={{ color: "var(--text-primary)", fontSize: "12px" }}
                    >
                      {apt.name}
                    </div>
                    <div
                      className="truncate"
                      style={{ color: "var(--text-muted)", fontSize: "10px" }}
                    >
                      {apt.city}, {apt.country}{apt.iata ? ` \u00b7 ${apt.iata}` : ""}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected airport info */}
        {selectedAirport && (
          <div className="flex items-center gap-3 ml-4">
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{
                background: "rgba(203,213,225,0.08)",
                border: "1px solid rgba(203,213,225,0.15)",
              }}
            >
              <span className="data-value" style={{ color: "var(--text-secondary)", fontSize: "13px", fontWeight: 700 }}>
                {selectedAirport.icao}
              </span>
              {selectedAirport.iata && (
                <>
                  <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>/</span>
                  <span className="data-value" style={{ color: "var(--text-secondary)", fontSize: "12px" }}>
                    {selectedAirport.iata}
                  </span>
                </>
              )}
              {selectedAirport.type && selectedAirport.type !== "large" && selectedAirport.type !== "medium" && (
                <span style={{
                  fontSize: "9px",
                  fontWeight: 600,
                  color: TYPE_LABELS[selectedAirport.type]?.color || "#888",
                  background: `${TYPE_LABELS[selectedAirport.type]?.color || "#888"}15`,
                  padding: "1px 5px",
                  borderRadius: "4px",
                  marginLeft: "4px",
                }}>
                  {TYPE_LABELS[selectedAirport.type]?.icon} {TYPE_LABELS[selectedAirport.type]?.label}
                </span>
              )}
            </div>
            <span
              className="truncate"
              style={{
                color: "var(--text-secondary)",
                fontSize: "12px",
                maxWidth: "240px",
              }}
            >
              {selectedAirport.name}
            </span>
          </div>
        )}
      </div>

      {/* ===== BODY ===== */}
      <div className="flex-1 overflow-hidden relative">
        {/* LEFT PANEL — Bearing Line Tool (floating overlay) */}
        {selectedAirport && (
          <div
            className="absolute top-0 left-0 bottom-0 z-[1000] flex flex-col overflow-hidden transition-all duration-300"
            style={{
              width: panelCollapsed ? "36px" : "280px",
              background: "color-mix(in srgb, var(--surface-1) 95%, transparent)",
              borderRight: "1px solid var(--border-default)",
              backdropFilter: "blur(12px)",
            }}
          >
            {/* Collapse toggle */}
            <button
              onClick={() => setPanelCollapsed((v) => !v)}
              className="flex-shrink-0 h-9 flex items-center justify-center hover:bg-white/5 transition-colors"
              style={{
                borderBottom: "1px solid var(--border-subtle)",
                color: "var(--text-muted)",
              }}
            >
              {panelCollapsed ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              ) : (
                <div className="flex items-center gap-2 w-full px-3">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                  <span className="section-label" style={{ letterSpacing: "0.06em" }}>
                    BEARING LINE TOOL
                  </span>
                </div>
              )}
            </button>

            {!panelCollapsed && (
              <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-3">
                {/* Mode tabs */}
                <div
                  className="flex rounded-lg overflow-hidden"
                  style={{
                    border: "1px solid var(--border-default)",
                  }}
                >
                  <button
                    onClick={() => setBearingMode("latlon")}
                    className="flex-1 py-1.5 text-center transition-colors"
                    style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      background:
                        bearingMode === "latlon"
                          ? "rgba(203,213,225,0.12)"
                          : "transparent",
                      color:
                        bearingMode === "latlon"
                          ? "var(--text-secondary)"
                          : "var(--text-muted)",
                    }}
                  >
                    LAT/LON
                  </button>
                  <button
                    onClick={() => setBearingMode("cardinal")}
                    className="flex-1 py-1.5 text-center transition-colors"
                    style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      background:
                        bearingMode === "cardinal"
                          ? "rgba(203,213,225,0.12)"
                          : "transparent",
                      color:
                        bearingMode === "cardinal"
                          ? "var(--text-secondary)"
                          : "var(--text-muted)",
                      borderLeft: "1px solid var(--border-default)",
                    }}
                  >
                    DIRECTION
                  </button>
                </div>

                {/* Mode A: Lat/Lon */}
                {bearingMode === "latlon" && (
                  <div className="space-y-2">
                    <div>
                      <label className="data-label block mb-1">Latitude</label>
                      <input
                        type="number"
                        step="any"
                        value={latInput}
                        onChange={(e) => setLatInput(e.target.value)}
                        placeholder="e.g. 28.5665"
                        className="w-full h-7 px-2 rounded-md data-value outline-none"
                        style={{
                          background: "var(--surface-2)",
                          border: "1px solid var(--border-default)",
                          color: "var(--text-primary)",
                          fontSize: "11px",
                        }}
                      />
                    </div>
                    <div>
                      <label className="data-label block mb-1">Longitude</label>
                      <input
                        type="number"
                        step="any"
                        value={lonInput}
                        onChange={(e) => setLonInput(e.target.value)}
                        placeholder="e.g. 77.1031"
                        className="w-full h-7 px-2 rounded-md data-value outline-none"
                        style={{
                          background: "var(--surface-2)",
                          border: "1px solid var(--border-default)",
                          color: "var(--text-primary)",
                          fontSize: "11px",
                        }}
                      />
                    </div>
                    <button
                      onClick={drawLatLonLine}
                      className="w-full h-7 rounded-md transition-colors"
                      style={{
                        background: "var(--border-strong)",
                        border: "1px solid rgba(148,163,184,0.3)",
                        color: "var(--text-tertiary)",
                        fontSize: "11px",
                        fontWeight: 600,
                      }}
                    >
                      Draw Line
                    </button>
                  </div>
                )}

                {/* Mode B: Cardinal Direction */}
                {bearingMode === "cardinal" && (
                  <div className="space-y-2">
                    <div>
                      <label className="data-label block mb-1">Direction</label>
                      <div className="grid grid-cols-4 gap-1">
                        {Object.keys(CARDINAL_BEARINGS).map((dir) => (
                          <button
                            key={dir}
                            onClick={() => setCardinalDir(dir)}
                            className="h-7 rounded-md transition-colors"
                            style={{
                              fontSize: "10px",
                              fontWeight: 700,
                              background:
                                cardinalDir === dir
                                  ? "rgba(203,213,225,0.15)"
                                  : "var(--surface-2)",
                              border: `1px solid ${
                                cardinalDir === dir
                                  ? "rgba(203,213,225,0.3)"
                                  : "var(--border-default)"
                              }`,
                              color:
                                cardinalDir === dir
                                  ? "var(--text-secondary)"
                                  : "var(--text-muted)",
                            }}
                          >
                            {dir}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="data-label block mb-1">
                        Distance (NM)
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={cardinalDist}
                        onChange={(e) => setCardinalDist(e.target.value)}
                        placeholder="e.g. 50"
                        className="w-full h-7 px-2 rounded-md data-value outline-none"
                        style={{
                          background: "var(--surface-2)",
                          border: "1px solid var(--border-default)",
                          color: "var(--text-primary)",
                          fontSize: "11px",
                        }}
                      />
                    </div>
                    <button
                      onClick={drawCardinalLine}
                      className="w-full h-7 rounded-md transition-colors"
                      style={{
                        background: "var(--border-strong)",
                        border: "1px solid rgba(148,163,184,0.3)",
                        color: "var(--text-tertiary)",
                        fontSize: "11px",
                        fontWeight: 600,
                      }}
                    >
                      Draw Line
                    </button>
                  </div>
                )}

                {/* Drawn lines list */}
                {bearingLines.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="section-label">
                        LINES ({bearingLines.length})
                      </span>
                      <button
                        onClick={clearAllLines}
                        className="transition-colors hover:opacity-80"
                        style={{
                          fontSize: "10px",
                          color: "var(--status-critical)",
                          fontWeight: 600,
                        }}
                      >
                        Clear All
                      </button>
                    </div>
                    {bearingLines.map((line) => (
                      <div
                        key={line.id}
                        className="flex items-center justify-between px-2 py-1.5 rounded-md"
                        style={{
                          background: "var(--surface-2)",
                          border: "1px solid var(--border-subtle)",
                        }}
                      >
                        <div className="data-value" style={{ fontSize: "10px" }}>
                          <span style={{ color: "var(--text-tertiary)" }}>
                            {line.distanceNm.toFixed(1)} NM
                          </span>
                          <span style={{ color: "var(--text-muted)", margin: "0 4px" }}>
                            /
                          </span>
                          <span style={{ color: "var(--text-secondary)" }}>
                            {Math.round(line.bearingDeg)}{"\u00B0"}
                          </span>
                        </div>
                        <button
                          onClick={() => removeLine(line.id)}
                          className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
                          style={{
                            color: "var(--text-muted)",
                            fontSize: "12px",
                          }}
                        >
                          x
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Altitude Legend */}
                <div className="pt-2">
                  <span className="section-label">ALTITUDE LEGEND</span>
                  <div className="mt-2 space-y-1">
                    {[
                      { color: "var(--text-secondary)", label: "< 10,000 ft" },
                      { color: "var(--text-tertiary)", label: "10,000 - 25,000 ft" },
                      { color: "var(--text-secondary)", label: "25,000 - 40,000 ft" },
                      { color: "var(--text-tertiary)", label: "> 40,000 ft" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: item.color }}
                        />
                        <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MAP (full area, under the floating panel) */}
        <div className="absolute inset-0">
          {selectedAirport && mapReady ? (
            <AirportMap
              airport={selectedAirport}
              flights={flights}
              bearingLines={bearingLines}
              onFlightClick={setSelectedFlight}
            />
          ) : (
            <div
              className="h-full w-full flex items-center justify-center"
              style={{ background: "var(--surface-0)" }}
            >
              <div className="text-center space-y-4 max-w-md">
                <div
                  className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center"
                  style={{
                    background: "rgba(203,213,225,0.06)",
                    border: "1px solid rgba(203,213,225,0.12)",
                  }}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" opacity="0.7">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="6" />
                    <circle cx="12" cy="12" r="2" />
                    <line x1="12" y1="2" x2="12" y2="12" />
                  </svg>
                </div>
                <div>
                  <h2
                    style={{
                      color: "var(--text-primary)",
                      fontSize: "18px",
                      fontWeight: 700,
                      letterSpacing: "-0.02em",
                      marginBottom: "8px",
                    }}
                  >
                    Airport Radar View
                  </h2>
                  <p style={{ color: "var(--text-muted)", fontSize: "13px", lineHeight: 1.6 }}>
                    Search for an airport above to view a radar-style display with range rings,
                    live flights, and bearing line tools.
                  </p>
                </div>
                <div
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg"
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                  <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>
                    Try &quot;KJFK&quot;, &quot;Heathrow&quot;, or &quot;DEL&quot;
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Flight detail panel */}
          {selectedFlight && selectedAirport && (
            <FlightDetailPanel
              flight={selectedFlight}
              airportLat={selectedAirport.lat}
              airportLon={selectedAirport.lon}
              onClose={() => setSelectedFlight(null)}
            />
          )}

          {/* Bottom-right badge */}
          {selectedAirport && (
            <div
              className="absolute bottom-4 right-4 z-[1000] flex items-center gap-3 px-3 py-1.5 rounded-lg"
              style={{
                background: "rgba(6,8,13,0.9)",
                border: "1px solid var(--border-default)",
                backdropFilter: "blur(12px)",
              }}
            >
              {/* Refresh rate control */}
              <div className="flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                <select
                  value={refreshRate}
                  onChange={(e) => setRefreshRate(Number(e.target.value))}
                  className="appearance-none cursor-pointer"
                  style={{
                    background: "var(--surface-3)",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "4px",
                    padding: "1px 6px",
                    fontSize: "10px",
                    fontFamily: "monospace",
                    fontWeight: 600,
                    outline: "none",
                  }}
                >
                  {REFRESH_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}s
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ width: "1px", height: "12px", background: "var(--border-subtle)" }} />

              {/* Flight count */}
              <div className="flex items-center gap-1.5">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: flightCount > 0 ? "var(--text-secondary)" : "var(--text-muted)",
                    boxShadow: flightCount > 0 ? "0 0 6px rgba(148,163,184,0.4)" : "none",
                  }}
                />
                <span className="data-value" style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                  {flightCount} flights
                </span>
                <span style={{ color: "var(--text-faint)", fontSize: "10px" }}>
                  &middot; airplanes.live
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
