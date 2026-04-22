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
import {
  haversineNm,
  bearing,
  closingSpeedKts,
  verticalSeparationFt,
  timeToClosestApproachMin,
} from "@/lib/geo";
import { useSharedFlightData } from "@/contexts/FlightDataContext";
import airportsData from "@/data/airports.json";
import ATCPanel from "@/components/ATCPanel";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getMapStyle, getSavedMapStyleId } from "@/lib/mapStyles";

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

type WeatherLayerType = "precipitation" | "clouds" | "wind" | "temperature" | null;
type FlightCategory = "VFR" | "MVFR" | "IFR" | "LIFR" | "UNKNOWN";

interface SeparationPair {
  flightA: FlightState;
  flightB: FlightState | null;
}

interface MetarData {
  raw: string;
  category: FlightCategory;
  // When the requested airport has no METAR and we fell back to a
  // nearby station (common for Indian, African, some Asian airports),
  // we show this tag so the user knows it's not the airport itself.
  fallbackFrom?: {
    station: string;       // e.g. "VANP"
    distanceNm: number;    // miles to fallback station
  };
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
  large: { label: "Large", color: "var(--text-secondary)", icon: "\u2708" },
  medium: { label: "Medium", color: "var(--text-secondary)", icon: "\u2708" },
  small: { label: "Small", color: "var(--text-secondary)", icon: "\ud83d\udee9" },
  heliport: { label: "Heliport", color: "var(--accent-primary)", icon: "\ud83d\ude81" },
  seaplane: { label: "Seaplane", color: "var(--text-secondary)", icon: "\ud83c\udf0a" },
  balloon: { label: "Balloon", color: "var(--text-tertiary)", icon: "\ud83c\udf88" },
};

const WEATHER_URLS: Record<string, string> = {
  precipitation: "https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=9de243494c0b295cca9337e1e96b00e2",
  clouds: "https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=9de243494c0b295cca9337e1e96b00e2",
  wind: "https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=9de243494c0b295cca9337e1e96b00e2",
  temperature: "https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=9de243494c0b295cca9337e1e96b00e2",
};

const SATELLITE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

const CATEGORY_COLORS: Record<FlightCategory, string> = {
  VFR: "var(--text-tertiary)",
  MVFR: "var(--text-secondary)",
  IFR: "var(--text-muted)",
  LIFR: "var(--text-faint)",
  UNKNOWN: "var(--text-muted)",
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
  if (alt === null) return "var(--text-muted)";       // unknown — gray
  const ft = alt * 3.28084;
  if (ft < 0) return "var(--text-muted)";             // below sea level
  if (ft < 2000) return "#22c55e";          // ground / low — green
  if (ft < 5000) return "#3b82f6";          // departure/approach — blue
  if (ft < 10000) return "#38bdf8";         // transition — cyan
  if (ft < 18000) return "#a78bfa";         // mid-altitude — purple
  if (ft < 25000) return "#f59e0b";         // upper transition — amber
  if (ft < 35000) return "#f97316";         // cruise — orange
  if (ft < 41000) return "#ef4444";         // high cruise — red
  return "#ec4899";                          // FL410+ — pink
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

function parseFlightCategory(rawMetar: string): FlightCategory {
  // Parse visibility and ceiling from raw METAR to determine flight category
  const visMatcher = rawMetar.match(/\s(\d+)SM/);
  const visKm = rawMetar.match(/\s(\d{4})\s/);
  let visNm = 10; // default good visibility
  if (visMatcher) visNm = parseInt(visMatcher[1], 10);
  else if (visKm) visNm = parseInt(visKm[1], 10) / 1852;

  // Parse ceiling (lowest BKN or OVC layer)
  let ceiling = 99999;
  const cloudLayers = rawMetar.matchAll(/(BKN|OVC)(\d{3})/g);
  for (const m of cloudLayers) {
    const agl = parseInt(m[2], 10) * 100;
    if (agl < ceiling) ceiling = agl;
  }

  if (visNm < 1 || ceiling < 500) return "LIFR";
  if (visNm < 3 || ceiling < 1000) return "IFR";
  if (visNm < 5 || ceiling < 3000) return "MVFR";
  return "VFR";
}

// ---------- Pill Toggle Button ----------

function PillButton({
  label, active, onClick, icon,
}: {
  label: string; active: boolean; onClick: () => void; icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all"
      style={{
        fontSize: "10px",
        fontWeight: 600,
        letterSpacing: "0.03em",
        background: active ? "rgba(203,213,225,0.12)" : "var(--border-subtle)",
        border: `1px solid ${active ? "rgba(203,213,225,0.3)" : "var(--border-strong)"}`,
        color: active ? "var(--text-secondary)" : "var(--text-muted)",
        cursor: "pointer",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

// ---------- Section Header ----------

function SectionHeader({ label, collapsed, onToggle }: { label: string; collapsed: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center justify-between w-full py-1.5 transition-colors hover:opacity-80"
      style={{ color: "var(--text-tertiary)" }}
    >
      <span className="section-label" style={{ letterSpacing: "0.06em", fontSize: "9px", fontWeight: 700 }}>{label}</span>
      <svg
        width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
  );
}

// ---------- Map Component ----------

function AirportMapInner({
  airport, flights, bearingLines, onFlightClick,
  weatherLayer, terrainOn, separationPair, onMapFlightClick,
}: {
  airport: Airport; flights: FlightState[]; bearingLines: BearingLine[];
  onFlightClick: (f: FlightState) => void;
  weatherLayer: WeatherLayerType;
  terrainOn: boolean;
  separationPair: SeparationPair | null;
  onMapFlightClick: (f: FlightState) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);
  const weatherLayerRef = useRef<L.TileLayer | null>(null);
  const terrainLayerRef = useRef<L.TileLayer | null>(null);
  const separationLayerRef = useRef<L.LayerGroup | null>(null);
  const runwayLayerRef = useRef<L.LayerGroup | null>(null);

  const ringColors = [
    "rgba(203,213,225,0.50)", "rgba(203,213,225,0.45)", "rgba(203,213,225,0.40)",
    "rgba(203,213,225,0.35)", "rgba(203,213,225,0.30)", "rgba(203,213,225,0.25)",
    "rgba(203,213,225,0.20)", "rgba(203,213,225,0.15)", "rgba(203,213,225,0.10)",
  ];

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [airport.lat, airport.lon],
      zoom: 7,
      zoomControl: true,
      attributionControl: true,
      // Zoom smoothness: canvas renderer is dramatically smoother than SVG
      // for our marker volume. wheelPxPerZoomLevel tuned so a normal scroll
      // doesn't jump multiple zoom levels. zoomSnap: 0.25 gives smoother
      // intermediate zooms. zoomDelta: 0.5 for keyboard +/- to step less
      // aggressively. inertia keeps pans feeling natural.
      preferCanvas: true,
      zoomSnap: 1,
      zoomDelta: 1,
      wheelPxPerZoomLevel: 100,
      zoomAnimation: true,
      fadeAnimation: true,
      markerZoomAnimation: true,
      inertia: true,
      worldCopyJump: true,
    });
    const ms = getMapStyle(getSavedMapStyleId());
    L.tileLayer(ms.url, {
      attribution: ms.attribution,
      maxZoom: ms.maxZoom,
      // Tile smoothness: keepBuffer keeps offscreen tiles in memory so they
      // don't need to be re-fetched when panning back. updateWhenZooming:false
      // delays re-fetch until the zoom animation finishes (no mid-zoom reload).
      keepBuffer: 4,
      updateWhenZooming: false,
      updateWhenIdle: true,
      crossOrigin: true,
      ...(ms.subdomains ? { subdomains: ms.subdomains } : {}),
    }).addTo(map);
    mapRef.current = map;
    layersRef.current = L.layerGroup().addTo(map);
    separationLayerRef.current = L.layerGroup().addTo(map);
    runwayLayerRef.current = L.layerGroup().addTo(map);

    // Range rings — each ring is a separate L.circle + L.marker pair stored
    // so we can show/hide them based on zoom (small rings stack into an
    // unreadable blob at low zoom).
    type RingEntry = { ringNm: number; circle: L.Circle; label: L.Marker };
    const ringEntries: RingEntry[] = [];
    RANGE_RINGS.forEach((ringNm, i) => {
      const circle = L.circle([airport.lat, airport.lon], {
        radius: ringNm * NM_TO_METERS, color: ringColors[i] || "rgba(203,213,225,0.10)",
        weight: 1, dashArray: "6 4", fill: false,
      }).addTo(map);
      const northLat = airport.lat + (ringNm / 60);
      const labelIcon = L.divIcon({
        className: "range-ring-label",
        html: `<div style="color:#cbd5e1;font-size:10px;font-weight:700;font-family:'JetBrains Mono',monospace;background:rgba(6,8,13,0.88);padding:1px 6px;border-radius:3px;border:1px solid rgba(203,213,225,0.25);white-space:nowrap;text-align:center;letter-spacing:0.5px">${ringNm} NM</div>`,
        iconSize: [0, 0], iconAnchor: [0, 8],
      });
      const label = L.marker([northLat, airport.lon], { icon: labelIcon, interactive: false }).addTo(map);
      ringEntries.push({ ringNm, circle, label });
    });

    // Show only rings that are visually distinguishable at the current zoom.
    // Rule of thumb: a ring needs at least ~40 pixels between its edge and
    // the next ring for its label to be readable.
    const updateRingVisibility = () => {
      const zoom = map.getZoom();
      // Pick which rings to show based on zoom level
      // zoom 5-6: only 100, 150 (very wide view)
      // zoom 7-8: 50, 75, 100, 150
      // zoom 9-10: 10, 25, 50, 100, 150
      // zoom 11+: all rings
      let visible: number[];
      if (zoom <= 6) visible = [100, 150];
      else if (zoom <= 8) visible = [25, 50, 75, 100, 150];
      else if (zoom <= 10) visible = [10, 25, 50, 75, 100, 150];
      else visible = RANGE_RINGS;

      for (const entry of ringEntries) {
        const show = visible.includes(entry.ringNm);
        const hasCircle = map.hasLayer(entry.circle);
        const hasLabel = map.hasLayer(entry.label);
        if (show && !hasCircle) entry.circle.addTo(map);
        if (show && !hasLabel) entry.label.addTo(map);
        if (!show && hasCircle) map.removeLayer(entry.circle);
        if (!show && hasLabel) map.removeLayer(entry.label);
      }
    };
    updateRingVisibility();
    map.on("zoomend", updateRingVisibility);

    const airportIcon = L.divIcon({
      className: "leaflet-div-icon",
      html: `<div style="position:relative;width:28px;height:28px;">
        <div style="position:absolute;inset:0;border:2px solid #cbd5e1;border-radius:50%;animation:pulse 2s ease-in-out infinite;opacity:0.6;"></div>
        <div style="position:absolute;inset:4px;border:2px solid #cbd5e1;border-radius:50%;background:rgba(203,213,225,0.15);"></div>
        <div style="position:absolute;top:50%;left:0;right:0;height:1px;background:#cbd5e1;opacity:0.5;"></div>
        <div style="position:absolute;left:50%;top:0;bottom:0;width:1px;background:#cbd5e1;opacity:0.5;"></div>
      </div>`,
      iconSize: [28, 28], iconAnchor: [14, 14],
    });
    L.marker([airport.lat, airport.lon], { icon: airportIcon }).addTo(map);

    // Radar sweep — anchored to the airport (not the viewport center) so
    // it doesn't drift away when the user pans the map. Scales with zoom
    // to always represent ~150nm radius in world coordinates.
    const sweepMarkerRef: { marker: L.Marker | null } = { marker: null };
    const updateSweep = () => {
      if (sweepMarkerRef.marker) {
        map.removeLayer(sweepMarkerRef.marker);
        sweepMarkerRef.marker = null;
      }
      // Compute 150nm in pixels at current zoom, centered on airport
      const edgeLat = airport.lat + 150 / 60; // 150 NM north
      const airportPx = map.latLngToContainerPoint([airport.lat, airport.lon]);
      const edgePx = map.latLngToContainerPoint([edgeLat, airport.lon]);
      const radiusPx = Math.max(60, Math.min(600, Math.abs(edgePx.y - airportPx.y)));
      const diameter = radiusPx * 2;

      const sweepIcon = L.divIcon({
        className: "radar-sweep-icon",
        html: `<div style="position:relative;width:${diameter}px;height:${diameter}px;pointer-events:none;">
          <div style="position:absolute;inset:0;border-radius:50%;background:conic-gradient(from 0deg, transparent 0deg, rgba(203,213,225,0.10) 30deg, transparent 60deg);animation:radarSweep 4s linear infinite;"></div>
        </div>`,
        iconSize: [diameter, diameter],
        iconAnchor: [radiusPx, radiusPx],
      });
      sweepMarkerRef.marker = L.marker([airport.lat, airport.lon], {
        icon: sweepIcon,
        interactive: false,
        zIndexOffset: -1000, // behind everything else
        keyboard: false,
      }).addTo(map);
    };
    updateSweep();
    map.on("zoomend", updateSweep);

    // Runway overlay on zoom
    const updateRunway = () => {
      if (!runwayLayerRef.current) return;
      runwayLayerRef.current.clearLayers();
      if (map.getZoom() >= 12) {
        // Draw a stylized runway line (~1km long, N-S by default)
        const runwayHalfLenDeg = 0.005; // ~0.5km in degrees
        const rwyStart: L.LatLngExpression = [airport.lat - runwayHalfLenDeg, airport.lon];
        const rwyEnd: L.LatLngExpression = [airport.lat + runwayHalfLenDeg, airport.lon];
        runwayLayerRef.current.addLayer(
          L.polyline([rwyStart, rwyEnd], { color: "var(--text-tertiary)", weight: 6, opacity: 0.7 })
        );
        // Runway center line
        runwayLayerRef.current.addLayer(
          L.polyline([rwyStart, rwyEnd], { color: "var(--text-secondary)", weight: 1, opacity: 0.5, dashArray: "8 6" })
        );
        // Threshold markers
        [rwyStart, rwyEnd].forEach((pt) => {
          const threshIcon = L.divIcon({
            className: "",
            html: `<div style="width:14px;height:3px;background:#cbd5e1;opacity:0.6;border-radius:1px;"></div>`,
            iconSize: [14, 3], iconAnchor: [7, 1],
          });
          runwayLayerRef.current!.addLayer(L.marker(pt, { icon: threshIcon, interactive: false }));
        });
      }
    };
    map.on("zoomend", updateRunway);
    updateRunway();

    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(containerRef.current);
    return () => { ro.disconnect(); map.off("zoomend", updateRunway); map.off("zoomend", updateRingVisibility); map.off("zoomend", updateSweep); map.remove(); mapRef.current = null; layersRef.current = null; separationLayerRef.current = null; runwayLayerRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [airport.lat, airport.lon]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView([airport.lat, airport.lon], 7, { animate: true });
  }, [airport.lat, airport.lon]);

  // Weather layer management
  useEffect(() => {
    if (!mapRef.current) return;
    // Remove existing weather layer
    if (weatherLayerRef.current) {
      mapRef.current.removeLayer(weatherLayerRef.current);
      weatherLayerRef.current = null;
    }
    // Add new one if selected
    if (weatherLayer && WEATHER_URLS[weatherLayer]) {
      weatherLayerRef.current = L.tileLayer(WEATHER_URLS[weatherLayer], {
        opacity: 0.6,
        attribution: "&copy; OpenWeatherMap",
      }).addTo(mapRef.current);
    }
  }, [weatherLayer]);

  // Terrain/satellite layer management
  useEffect(() => {
    if (!mapRef.current) return;
    if (terrainLayerRef.current) {
      mapRef.current.removeLayer(terrainLayerRef.current);
      terrainLayerRef.current = null;
    }
    if (terrainOn) {
      terrainLayerRef.current = L.tileLayer(SATELLITE_URL, {
        opacity: 0.5,
        attribution: "&copy; Esri",
      }).addTo(mapRef.current);
    }
  }, [terrainOn]);

  // Separation tool overlay
  useEffect(() => {
    if (!mapRef.current || !separationLayerRef.current) return;
    separationLayerRef.current.clearLayers();
    if (!separationPair) return;

    const { flightA, flightB } = separationPair;

    // Draw ring on flight A
    if (flightA.latitude !== null && flightA.longitude !== null) {
      separationLayerRef.current.addLayer(
        L.circleMarker([flightA.latitude, flightA.longitude], {
          radius: 18, color: "var(--text-secondary)", weight: 2, opacity: 0.8, fill: false, dashArray: "4 3",
        })
      );
    }

    if (flightB && flightB.latitude !== null && flightB.longitude !== null) {
      // Ring on B
      separationLayerRef.current.addLayer(
        L.circleMarker([flightB.latitude, flightB.longitude], {
          radius: 18, color: "var(--text-secondary)", weight: 2, opacity: 0.8, fill: false, dashArray: "4 3",
        })
      );

      if (flightA.latitude !== null && flightA.longitude !== null) {
        const latDist = haversineNm(flightA.latitude, flightA.longitude, flightB.latitude, flightB.longitude);
        const vertSep = verticalSeparationFt(flightA.baroAltitude, flightB.baroAltitude);

        let closingKts = 0;
        if (flightA.velocity !== null && flightB.velocity !== null) {
          closingKts = closingSpeedKts(
            flightA.latitude, flightA.longitude, flightA.trueTrack ?? 0, flightA.velocity,
            flightB.latitude, flightB.longitude, flightB.trueTrack ?? 0, flightB.velocity
          );
        }
        const tca = timeToClosestApproachMin(latDist, closingKts);

        // Dashed line between
        separationLayerRef.current.addLayer(
          L.polyline(
            [[flightA.latitude, flightA.longitude], [flightB.latitude, flightB.longitude]],
            { color: "var(--text-tertiary)", weight: 1.5, opacity: 0.7, dashArray: "6 4" }
          )
        );

        // Midpoint label
        const midLat = (flightA.latitude + flightB.latitude) / 2;
        const midLon = (flightA.longitude + flightB.longitude) / 2;
        const labelParts = [
          `${latDist.toFixed(1)} NM`,
          vertSep !== null ? `${Math.round(vertSep)} ft vert` : null,
          closingKts > 0 ? `${Math.round(closingKts)} kts closing` : closingKts < 0 ? `${Math.round(Math.abs(closingKts))} kts separating` : null,
          tca !== null ? `CPA ${tca.toFixed(1)} min` : null,
        ].filter(Boolean).join(" | ");

        const midIcon = L.divIcon({
          className: "range-ring-label",
          html: `<div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#cbd5e1;background:rgba(6,8,13,0.92);padding:3px 8px;border-radius:4px;border:1px solid rgba(203,213,225,0.25);white-space:nowrap;letter-spacing:0.3px">${labelParts}</div>`,
          iconSize: [0, 0], iconAnchor: [0, 8],
        });
        separationLayerRef.current.addLayer(L.marker([midLat, midLon], { icon: midIcon, interactive: false }));
      }
    }
  }, [separationPair]);

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
      const planeColor = isMilitary ? "var(--text-tertiary)" : color;
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
      marker.on("click", () => onMapFlightClick(f));
      layersRef.current!.addLayer(marker);
    });
  }, [flights, onMapFlightClick]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.eachLayer((layer: L.Layer & { _bearingLine?: boolean }) => {
      if (layer._bearingLine) mapRef.current!.removeLayer(layer);
    });
    const endpointIcon = L.divIcon({
      className: "leaflet-div-icon",
      html: `<div style="width:10px;height:10px;background:#94a3b8;border:1.5px solid #94a3b8;transform:rotate(45deg);box-shadow:0 0 6px rgba(148,163,184,0.5);"></div>`,
      iconSize: [10, 10], iconAnchor: [5, 5],
    });
    bearingLines.forEach((line) => {
      const polyline = L.polyline([line.from, line.to], {
        color: "var(--text-tertiary)", weight: 2, opacity: 0.9,
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

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}

const AirportMap = dynamic(() => Promise.resolve(AirportMapInner), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center" style={{ background: "var(--surface-0)" }}>
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-slate-300/30 border-t-slate-300 rounded-full animate-spin mx-auto mb-3" />
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
        <span style={{ color: "var(--text-secondary)", fontWeight: 700, fontSize: "13px", fontFamily: "monospace" }}>{cs}</span>
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

  const { getFlightsNear, isLoading: sharedLoading, setBbox: setSharedBbox } = useSharedFlightData();
  const [selectedFlight, setSelectedFlight] = useState<FlightState | null>(null);

  const [bearingLines, setBearingLines] = useState<BearingLine[]>([]);
  const [bearingMode, setBearingMode] = useState<"latlon" | "cardinal">("latlon");
  const [latInput, setLatInput] = useState("");
  const [lonInput, setLonInput] = useState("");
  const [cardinalDir, setCardinalDir] = useState("N");
  const [cardinalDist, setCardinalDist] = useState("");

  const REFRESH_OPTIONS = [15, 30, 60, 120];
  const [refreshRate, setRefreshRate] = useState(30);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [showATCPanel, setShowATCPanel] = useState(false);

  // --- New feature state ---
  const [weatherLayer, setWeatherLayer] = useState<WeatherLayerType>(null);
  const [terrainOn, setTerrainOn] = useState(false);
  const [metarData, setMetarData] = useState<MetarData | null>(null);
  const [metarVisible, setMetarVisible] = useState(false);
  const [separationMode, setSeparationMode] = useState(false);
  const [separationPair, setSeparationPair] = useState<SeparationPair | null>(null);
  const [flightListOpen, setFlightListOpen] = useState(true);
  const [dataLayersOpen, setDataLayersOpen] = useState(true);
  const [weatherSectionOpen, setWeatherSectionOpen] = useState(false);

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

  // ESC key handler for separation mode
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && separationMode) {
        setSeparationMode(false);
        setSeparationPair(null);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [separationMode]);

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
    setMetarData(null);
    setSeparationMode(false);
    setSeparationPair(null);
    setWeatherLayer(null);
    setTerrainOn(false);
    setTimeout(() => setMapReady(true), 50);

    // Tell the shared FlightDataProvider to fetch ~200nm around the
    // selected airport. Without this, airport mode inherits whatever
    // bbox the main tracker had, so a Gondia-centered radar shows
    // aircraft from whatever region the user last viewed (e.g. empty
    // if they'd been looking at open ocean).
    const latDelta = 200 / 60; // ~200 NM in latitude
    const lonDelta = 200 / (60 * Math.cos(apt.lat * Math.PI / 180));
    setSharedBbox({
      lamin: apt.lat - latDelta,
      lamax: apt.lat + latDelta,
      lomin: apt.lon - lonDelta,
      lomax: apt.lon + lonDelta,
    });

    // Persist to recent airports (last 8, most-recent first)
    try {
      const raw = localStorage.getItem("aerointel.recent_airports");
      const recent: string[] = raw ? JSON.parse(raw) : [];
      const filtered = recent.filter((icao) => icao !== apt.icao);
      filtered.unshift(apt.icao);
      localStorage.setItem(
        "aerointel.recent_airports",
        JSON.stringify(filtered.slice(0, 8)),
      );
    } catch { /* ignore quota errors */ }

    // Update URL so the view is shareable without triggering navigation
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("airport", apt.icao);
      window.history.replaceState({}, "", url.toString());
    } catch { /* non-browser env */ }
  }, [setSharedBbox]);

  // Restore airport from ?airport= URL param on mount (deep-linking).
  // This lets us share links like /airport?airport=VAGD that land directly
  // on Gondia without the user needing to search.
  useEffect(() => {
    if (selectedAirport) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const icaoParam = params.get("airport");
      if (!icaoParam) return;
      const q = icaoParam.trim().toUpperCase();
      const found = airports.find((a) => a.icao === q || a.iata === q);
      if (found) selectAirport(found);
    } catch { /* non-browser env */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load recent airports from localStorage (shown as quick-picks in search)
  const recentAirports = useMemo(() => {
    if (typeof window === "undefined") return [] as Airport[];
    try {
      const raw = localStorage.getItem("aerointel.recent_airports");
      if (!raw) return [] as Airport[];
      const icaos: string[] = JSON.parse(raw);
      return icaos
        .map((icao) => airports.find((a) => a.icao === icao))
        .filter((a): a is Airport => Boolean(a));
    } catch {
      return [] as Airport[];
    }
    // We deliberately recompute when selectedAirport changes so the list
    // refreshes after a selection.
  }, [selectedAirport]);

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

  // Derive flights from shared context (no independent polling)
  const flights = useMemo(() => {
    if (!selectedAirport) return [];
    return getFlightsNear(selectedAirport.lat, selectedAirport.lon, 100);
  }, [selectedAirport, getFlightsNear]);

  const flightCount = flights.length;

  // Fetch METAR — pass lat/lon so the API can fall back to the nearest
  // reporting station for airports outside AWC coverage (most of India,
  // Africa, etc.).  Without the fallback, these airports show no weather.
  useEffect(() => {
    if (!selectedAirport || !metarVisible) { setMetarData(null); return; }
    let cancelled = false;
    async function fetchMetar() {
      try {
        const apt = selectedAirport!;
        const url = `/api/metar?icao=${apt.icao}&lat=${apt.lat}&lon=${apt.lon}`;
        const r = await fetch(url);
        if (cancelled) return;
        if (!r.ok) { setMetarData(null); return; }
        const data = await r.json();

        // New response shape: { stations: [{ rawOb, ... }], fallback?: {...} }
        const station = Array.isArray(data.stations) && data.stations.length > 0
          ? data.stations[0]
          : null;
        const raw = station?.rawOb || data.raw || data.metar || data.data || "";

        if (raw) {
          setMetarData({
            raw,
            category: parseFlightCategory(raw),
            fallbackFrom: data.fallback
              ? {
                  station: data.fallback.usedStation,
                  distanceNm: data.fallback.distanceNm,
                }
              : undefined,
          });
        } else {
          setMetarData(null);
        }
      } catch { setMetarData(null); }
    }
    fetchMetar();
    const iv = setInterval(fetchMetar, 5 * 60 * 1000); // 5 min refresh
    return () => { cancelled = true; clearInterval(iv); };
  }, [selectedAirport, metarVisible]);

  // Handle map flight clicks (for separation tool and normal detail)
  const handleMapFlightClick = useCallback((f: FlightState) => {
    if (separationMode) {
      setSeparationPair((prev) => {
        if (!prev) {
          return { flightA: f, flightB: null };
        }
        if (!prev.flightB) {
          return { ...prev, flightB: f };
        }
        // Reset: start new pair
        return { flightA: f, flightB: null };
      });
    }
    setSelectedFlight(f);
  }, [separationMode]);

  // Flight list sorted by distance
  const sortedFlights = useMemo(() => {
    if (!selectedAirport) return [];
    return [...flights]
      .filter((f) => f.latitude !== null && f.longitude !== null)
      .map((f) => ({
        flight: f,
        dist: haversineNm(selectedAirport.lat, selectedAirport.lon, f.latitude!, f.longitude!),
      }))
      .sort((a, b) => a.dist - b.dist);
  }, [flights, selectedAirport]);

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

  const toggleWeather = useCallback((type: "precipitation" | "clouds" | "wind" | "temperature") => {
    setWeatherLayer((prev) => prev === type ? null : type);
  }, []);

  const toggleSeparation = useCallback(() => {
    setSeparationMode((prev) => {
      if (prev) {
        setSeparationPair(null);
        return false;
      }
      return true;
    });
  }, []);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 0.6; } 50% { transform: scale(1.4); opacity: 0; } }
      .range-ring-label { background: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important; }
      @keyframes radarSweep { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes radarPulse { 0%, 100% { transform: scale(1); opacity: 0.3; } 50% { transform: scale(2.5); opacity: 0; } }
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
            style={{ background: "rgba(203,213,225,0.1)", border: "1px solid rgba(203,213,225,0.2)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2">
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
                    <span className="data-value" style={{ color: TYPE_LABELS[apt.type || "large"]?.color || "var(--text-secondary)", fontSize: "11px", fontWeight: 700 }}>{apt.icao}</span>
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
              style={{ background: "rgba(203,213,225,0.08)", border: "1px solid rgba(203,213,225,0.15)" }}>
              <span className="data-value" style={{ color: "var(--text-secondary)", fontSize: "12px", fontWeight: 700 }}>{selectedAirport.icao}</span>
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

        {/* Separation Tool toggle */}
        {selectedAirport && (
          <PillButton
            label={separationMode ? "SEP ON" : "SEP"}
            active={separationMode}
            onClick={toggleSeparation}
            icon={
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12H3M21 12l-4-4M21 12l-4 4M3 12l4-4M3 12l4 4" />
              </svg>
            }
          />
        )}

        {/* ATC Panel toggle */}
        {selectedAirport && (
          <button
            onClick={() => setShowATCPanel((v) => !v)}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all hover:brightness-125"
            style={{
              background: showATCPanel ? "var(--border-strong)" : "var(--border-subtle)",
              border: `1px solid ${showATCPanel ? "rgba(148,163,184,0.35)" : "var(--border-strong)"}`,
              color: showATCPanel ? "var(--text-tertiary)" : "var(--text-muted)",
              fontSize: "11px",
              fontWeight: 600,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 16.1A5 5 0 0 1 5.9 20M2 12.05A9 9 0 0 1 9.95 20M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6" />
              <line x1="2" y1="20" x2="2.01" y2="20" />
            </svg>
            ATC
          </button>
        )}
      </div>

      {/* METAR display below top bar */}
      {metarVisible && metarData && selectedAirport && (
        <div
          className="flex-shrink-0 flex items-center gap-3 px-4 py-1.5"
          style={{
            background: "rgba(6,8,13,0.88)",
            borderBottom: "1px solid var(--border-subtle)",
            zIndex: 1099,
          }}
        >
          <span
            className="px-2 py-0.5 rounded-md"
            style={{
              fontSize: "10px",
              fontWeight: 700,
              fontFamily: "monospace",
              color: CATEGORY_COLORS[metarData.category],
              background: `${CATEGORY_COLORS[metarData.category]}15`,
              border: `1px solid ${CATEGORY_COLORS[metarData.category]}40`,
              letterSpacing: "0.05em",
            }}
          >
            {metarData.category}
          </span>
          <span
            style={{
              fontSize: "10px",
              fontFamily: "'JetBrains Mono', monospace",
              color: "var(--text-tertiary)",
              letterSpacing: "0.02em",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
            }}
          >
            {metarData.raw}
          </span>
          {metarData.fallbackFrom && (
            <span
              className="px-2 py-0.5 rounded-md"
              style={{
                fontSize: "9px",
                fontWeight: 600,
                color: "#f59e0b",
                background: "rgba(245,158,11,0.12)",
                border: "1px solid rgba(245,158,11,0.35)",
                letterSpacing: "0.05em",
                whiteSpace: "nowrap",
              }}
              title={`${selectedAirport.icao} has no METAR — showing data from ${metarData.fallbackFrom.station}`}
            >
              FROM {metarData.fallbackFrom.station} · {metarData.fallbackFrom.distanceNm} NM
            </span>
          )}
        </div>
      )}

      {/* Separation mode banner */}
      {separationMode && (
        <div
          className="flex-shrink-0 flex items-center gap-2 px-4 py-1"
          style={{
            background: "rgba(203,213,225,0.06)",
            borderBottom: "1px solid rgba(203,213,225,0.15)",
            zIndex: 1098,
          }}
        >
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--text-secondary)", animation: "pulse 2s ease-in-out infinite" }} />
          <span style={{ fontSize: "10px", color: "var(--text-tertiary)", fontWeight: 600 }}>
            SEPARATION TOOL
            {!separationPair ? " - Click first aircraft" :
             !separationPair.flightB ? ` - ${separationPair.flightA.callsign?.trim() || separationPair.flightA.icao24} selected. Click second aircraft.` :
             ` - ${separationPair.flightA.callsign?.trim() || separationPair.flightA.icao24} / ${separationPair.flightB.callsign?.trim() || separationPair.flightB.icao24}`
            }
          </span>
          <button
            onClick={() => { setSeparationMode(false); setSeparationPair(null); }}
            className="ml-auto text-xs px-2 py-0.5 rounded hover:bg-white/5"
            style={{ color: "var(--text-muted)", fontSize: "10px" }}
          >
            ESC to close
          </button>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-hidden relative">
        {/* Left panel */}
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
                  <span className="section-label" style={{ letterSpacing: "0.06em" }}>TOOLS</span>
                </div>
              )}
            </button>

            {!panelCollapsed && (
              <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-3">

                {/* ---------- BEARING LINE TOOL ---------- */}
                <div>
                  <span className="section-label" style={{ letterSpacing: "0.06em", fontSize: "9px", fontWeight: 700, color: "var(--text-tertiary)" }}>BEARING LINE TOOL</span>
                </div>
                {/* Mode tabs */}
                <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--border-default)" }}>
                  <button onClick={() => setBearingMode("latlon")} className="flex-1 py-1.5 text-center transition-colors"
                    style={{ fontSize: "10px", fontWeight: 600, background: bearingMode === "latlon" ? "rgba(203,213,225,0.12)" : "transparent",
                      color: bearingMode === "latlon" ? "var(--text-secondary)" : "var(--text-muted)" }}>LAT/LON</button>
                  <button onClick={() => setBearingMode("cardinal")} className="flex-1 py-1.5 text-center transition-colors"
                    style={{ fontSize: "10px", fontWeight: 600, background: bearingMode === "cardinal" ? "rgba(203,213,225,0.12)" : "transparent",
                      color: bearingMode === "cardinal" ? "var(--text-secondary)" : "var(--text-muted)", borderLeft: "1px solid var(--border-default)" }}>DIRECTION</button>
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
                      style={{ background: "var(--border-strong)", border: "1px solid rgba(148,163,184,0.3)", color: "var(--text-tertiary)", fontSize: "11px", fontWeight: 600 }}>Draw Line</button>
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
                              background: cardinalDir === dir ? "rgba(203,213,225,0.15)" : "var(--surface-2)",
                              border: `1px solid ${cardinalDir === dir ? "rgba(203,213,225,0.3)" : "var(--border-default)"}`,
                              color: cardinalDir === dir ? "var(--text-secondary)" : "var(--text-muted)" }}>{dir}</button>
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
                      style={{ background: "var(--border-strong)", border: "1px solid rgba(148,163,184,0.3)", color: "var(--text-tertiary)", fontSize: "11px", fontWeight: 600 }}>Draw Line</button>
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
                          <span style={{ color: "var(--text-tertiary)" }}>{line.distanceNm.toFixed(1)} NM</span>
                          <span style={{ color: "var(--text-muted)", margin: "0 4px" }}>/</span>
                          <span style={{ color: "var(--text-secondary)" }}>{Math.round(line.bearingDeg)}{"\u00B0"}</span>
                        </div>
                        <button onClick={() => removeLine(line.id)} className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
                          style={{ color: "var(--text-muted)", fontSize: "12px" }}>x</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Divider */}
                <div style={{ height: "1px", background: "var(--border-subtle)" }} />

                {/* ---------- DATA LAYERS ---------- */}
                <SectionHeader label="DATA LAYERS" collapsed={!dataLayersOpen} onToggle={() => setDataLayersOpen((v) => !v)} />
                {dataLayersOpen && (
                  <div className="space-y-2">
                    {/* Weather sub-section */}
                    <SectionHeader label="WEATHER" collapsed={!weatherSectionOpen} onToggle={() => setWeatherSectionOpen((v) => !v)} />
                    {weatherSectionOpen && (
                      <div className="flex flex-wrap gap-1.5">
                        <PillButton label="Rain" active={weatherLayer === "precipitation"} onClick={() => toggleWeather("precipitation")} />
                        <PillButton label="Clouds" active={weatherLayer === "clouds"} onClick={() => toggleWeather("clouds")} />
                        <PillButton label="Wind" active={weatherLayer === "wind"} onClick={() => toggleWeather("wind")} />
                        <PillButton label="Temp" active={weatherLayer === "temperature"} onClick={() => toggleWeather("temperature")} />
                      </div>
                    )}

                    {/* Other data layers */}
                    <div className="flex flex-wrap gap-1.5">
                      <PillButton
                        label="METAR"
                        active={metarVisible}
                        onClick={() => setMetarVisible((v) => !v)}
                      />
                      <PillButton
                        label="Separation"
                        active={separationMode}
                        onClick={toggleSeparation}
                      />
                      <PillButton
                        label="Terrain"
                        active={terrainOn}
                        onClick={() => setTerrainOn((v) => !v)}
                      />
                    </div>
                  </div>
                )}

                {/* Divider */}
                <div style={{ height: "1px", background: "var(--border-subtle)" }} />

                {/* ---------- FLIGHT LIST ---------- */}
                <SectionHeader
                  label={`FLIGHTS (${sortedFlights.length})`}
                  collapsed={!flightListOpen}
                  onToggle={() => setFlightListOpen((v) => !v)}
                />
                {flightListOpen && (
                  <div
                    className="space-y-0.5 overflow-y-auto scrollbar-thin"
                    style={{ maxHeight: "200px" }}
                  >
                    {sortedFlights.length === 0 && (
                      <div style={{ fontSize: "10px", color: "var(--text-muted)", padding: "8px 0", textAlign: "center" }}>
                        No flights in range
                      </div>
                    )}
                    {sortedFlights.map(({ flight: f, dist }) => {
                      const cs = f.callsign?.trim() || f.icao24;
                      const alt = f.baroAltitude !== null ? `${Math.round(f.baroAltitude * 3.28084 / 100)}` : "--";
                      const spd = f.velocity !== null ? `${Math.round(f.velocity * 1.94384)}` : "--";
                      const isSelected = selectedFlight?.icao24 === f.icao24;
                      return (
                        <button
                          key={f.icao24}
                          onClick={() => { setSelectedFlight(f); }}
                          className="w-full flex items-center gap-2 px-2 py-1 rounded-md transition-colors hover:bg-white/5"
                          style={{
                            background: isSelected ? "rgba(203,213,225,0.1)" : "transparent",
                            border: isSelected ? "1px solid rgba(203,213,225,0.2)" : "1px solid transparent",
                          }}
                        >
                          <span style={{ color: "var(--text-secondary)", fontSize: "10px", fontWeight: 700, fontFamily: "monospace", minWidth: "58px", textAlign: "left" }}>
                            {cs}
                          </span>
                          <span style={{ color: "var(--text-muted)", fontSize: "9px", fontFamily: "monospace" }}>
                            FL{alt}
                          </span>
                          <span style={{ color: "var(--text-muted)", fontSize: "9px", fontFamily: "monospace" }}>
                            {spd}kt
                          </span>
                          <span style={{ color: "var(--text-faint)", fontSize: "9px", fontFamily: "monospace", marginLeft: "auto" }}>
                            {dist.toFixed(0)}nm
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Divider */}
                <div style={{ height: "1px", background: "var(--border-subtle)" }} />

                {/* Altitude Legend */}
                <div className="pt-1">
                  <span className="section-label" style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-tertiary)", letterSpacing: "0.06em" }}>ALTITUDE LEGEND</span>
                  <div className="mt-2 space-y-1">
                    {[
                      { color: "#22c55e", label: "Ground / < 2k ft" },
                      { color: "#3b82f6", label: "2k – 5k ft" },
                      { color: "#38bdf8", label: "5k – 10k ft" },
                      { color: "#a78bfa", label: "10k – 18k ft" },
                      { color: "#f59e0b", label: "18k – 25k ft" },
                      { color: "#f97316", label: "25k – 35k ft" },
                      { color: "#ef4444", label: "35k – 41k ft" },
                      { color: "#ec4899", label: "> 41k ft" },
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
            <AirportMap
              airport={selectedAirport}
              flights={flights}
              bearingLines={bearingLines}
              onFlightClick={setSelectedFlight}
              weatherLayer={weatherLayer}
              terrainOn={terrainOn}
              separationPair={separationPair}
              onMapFlightClick={handleMapFlightClick}
            />
          ) : selectedAirport && !mapReady ? (
            // Skeleton: map is being mounted — show the airport info + a
            // pulsing circle so the user sees something instantly instead
            // of a blank screen.
            <div className="h-full w-full flex items-center justify-center" style={{ background: "var(--surface-0)" }}>
              <div className="text-center space-y-3">
                <div
                  className="w-20 h-20 mx-auto rounded-full relative"
                  style={{
                    background: "rgba(203,213,225,0.04)",
                    border: "1px solid rgba(203,213,225,0.12)",
                  }}
                >
                  <div
                    className="absolute inset-2 rounded-full"
                    style={{
                      border: "1px dashed rgba(203,213,225,0.3)",
                      animation: "pulse-ring 1.6s ease-in-out infinite",
                    }}
                  />
                </div>
                <div style={{ color: "var(--text-primary)", fontSize: "14px", fontWeight: 600, fontFamily: "monospace" }}>
                  {selectedAirport.icao} · {selectedAirport.name}
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: "11px" }}>
                  Initializing radar view...
                </div>
                <style jsx>{`
                  @keyframes pulse-ring {
                    0%, 100% { opacity: 0.35; transform: scale(0.9); }
                    50% { opacity: 1; transform: scale(1.1); }
                  }
                `}</style>
              </div>
            </div>
          ) : (
            <div className="h-full w-full flex items-center justify-center overflow-auto" style={{ background: "var(--surface-0)" }}>
              <div className="text-center space-y-5 max-w-lg px-6 py-8">
                <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center"
                  style={{ background: "rgba(203,213,225,0.06)", border: "1px solid rgba(203,213,225,0.12)" }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" opacity="0.7">
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

                {/* Recently viewed */}
                {recentAirports.length > 0 && (
                  <div>
                    <div style={{ color: "var(--text-muted)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", marginBottom: "8px" }}>
                      RECENT
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {recentAirports.map((apt) => (
                        <button
                          key={apt.icao}
                          onClick={() => selectAirport(apt)}
                          className="px-3 py-1.5 rounded-md transition-colors hover:bg-white/5"
                          style={{
                            background: "var(--surface-2)",
                            border: "1px solid var(--border-subtle)",
                            color: "var(--text-secondary)",
                            fontSize: "11px",
                            fontFamily: "monospace",
                            fontWeight: 600,
                          }}
                          title={`${apt.name} · ${apt.city}`}
                        >
                          {apt.icao}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick picks: curated list of frequently-used airports */}
                <div>
                  <div style={{ color: "var(--text-muted)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", marginBottom: "8px" }}>
                    QUICK PICKS
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {(["VAGD", "VABB", "VIDP", "VOBL", "VECC", "KJFK", "EGLL"] as const).map((icao) => {
                      const apt = airports.find((a) => a.icao === icao);
                      if (!apt) return null;
                      return (
                        <button
                          key={apt.icao}
                          onClick={() => selectAirport(apt)}
                          className="px-3 py-1.5 rounded-md transition-colors hover:bg-white/5"
                          style={{
                            background: "transparent",
                            border: "1px solid var(--border-subtle)",
                            color: "var(--text-muted)",
                            fontSize: "11px",
                            fontFamily: "monospace",
                            fontWeight: 600,
                          }}
                          title={`${apt.name} · ${apt.city}`}
                        >
                          {apt.iata || apt.icao}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                  </svg>
                  <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>Try &quot;VAGD&quot;, &quot;Gondia&quot;, or &quot;KJFK&quot;</span>
                </div>
              </div>
            </div>
          )}

          {selectedFlight && selectedAirport && (
            <FlightDetailPanel flight={selectedFlight} airportLat={selectedAirport.lat} airportLon={selectedAirport.lon} onClose={() => setSelectedFlight(null)} />
          )}

          {/* ATC Panel slide-out */}
          {showATCPanel && selectedAirport && (
            <ATCPanel icao={selectedAirport.icao} onClose={() => setShowATCPanel(false)} />
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
                  style={{ background: flightCount > 0 ? "var(--text-secondary)" : "var(--text-muted)", boxShadow: flightCount > 0 ? "0 0 6px rgba(203,213,225,0.4)" : "none" }} />
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
