"use client";

import {
  useState,
  useEffect,
  useRef,
  useMemo,
} from "react";
import dynamic from "next/dynamic";
import type { FlightState } from "@/types/flight";
import {
  type TurbulencePoint,
  type TurbulenceSeverity,
  type AircraftTrack,
  updateTracks,
  generateTurbulencePoints,
  countBySeverity,
  severityColor,
  severityLabel,
  metersToFeet,
  feetToFlightLevel,
  ALTITUDE_BANDS,
} from "@/lib/turbulenceDetection";
import { useSharedFlightData } from "@/contexts/FlightDataContext";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getMapStyle, getSavedMapStyleId } from "@/lib/mapStyles";

// ── Types ──────────────────────────────────────────────────────────

interface TurbulenceModeProps {
  onExitMode?: () => void;
}

type AltitudeFilter = "all" | "FL100-200" | "FL200-300" | "FL300-400" | "FL400+";

interface RecentReport {
  id: string;
  timestamp: number;
  severity: TurbulenceSeverity;
  location: string;
  altitude: string;
  aircraft: string;
}

// ── Helpers ────────────────────────────────────────────────────────

function formatTimeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 10) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function latLonToString(lat: number, lon: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(1)}${ns} ${Math.abs(lon).toFixed(1)}${ew}`;
}

// ── Map Inner Component (imperative Leaflet) ───────────────────────

function TurbulenceMapInner({
  turbulencePoints,
  flights,
  altitudeFilter,
  showAllAircraft,
  tracks,
}: {
  turbulencePoints: TurbulencePoint[];
  flights: FlightState[];
  altitudeFilter: AltitudeFilter;
  showAllAircraft: boolean;
  tracks: Map<string, AircraftTrack>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const turbLayerRef = useRef<L.LayerGroup | null>(null);
  const heatLayerRef = useRef<L.LayerGroup | null>(null);
  const flightLayerRef = useRef<L.LayerGroup | null>(null);


  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [30, 0],
      zoom: 3,
      zoomControl: true,
      attributionControl: true,
      minZoom: 2,
      maxZoom: 14,
    });

    const ms = getMapStyle(getSavedMapStyleId());
    L.tileLayer(ms.url, {
      attribution: ms.attribution,
      subdomains: ms.subdomains ?? "abc",
      maxZoom: ms.maxZoom,
    }).addTo(map);

    mapRef.current = map;
    turbLayerRef.current = L.layerGroup().addTo(map);
    heatLayerRef.current = L.layerGroup().addTo(map);
    flightLayerRef.current = L.layerGroup().addTo(map);

    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      turbLayerRef.current = null;
      heatLayerRef.current = null;
      flightLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter points by altitude
  const filteredPoints = useMemo(() => {
    if (altitudeFilter === "all") return turbulencePoints;
    const band = ALTITUDE_BANDS.find((b) => b.label === altitudeFilter);
    if (!band) return turbulencePoints;
    return turbulencePoints.filter(
      (p) => p.flightLevel >= band.min && p.flightLevel < band.max
    );
  }, [turbulencePoints, altitudeFilter]);

  // Render turbulence circles
  useEffect(() => {
    if (!turbLayerRef.current) return;
    turbLayerRef.current.clearLayers();

    for (const point of filteredPoints) {
      const color = severityColor(point.severity);
      const radiusMap: Record<TurbulenceSeverity, number> = {
        light: 18000,
        moderate: 30000,
        severe: 50000,
      };
      const opacityMap: Record<TurbulenceSeverity, number> = {
        light: 0.15,
        moderate: 0.25,
        severe: 0.35,
      };

      // Outer glow circle
      const outerCircle = L.circle([point.lat, point.lon], {
        radius: radiusMap[point.severity] * 1.5,
        color: "transparent",
        fillColor: color,
        fillOpacity: opacityMap[point.severity] * 0.3,
        weight: 0,
      });
      turbLayerRef.current!.addLayer(outerCircle);

      // Main circle
      const circle = L.circle([point.lat, point.lon], {
        radius: radiusMap[point.severity],
        color,
        fillColor: color,
        fillOpacity: opacityMap[point.severity],
        weight: point.severity === "severe" ? 2 : 1,
        opacity: point.severity === "severe" ? 0.8 : 0.5,
        dashArray: point.severity === "light" ? "4 4" : undefined,
        className: point.severity === "severe" ? "turbulence-severe-pulse" : "",
      });

      // Popup content
      const ageStr = formatTimeAgo(point.timestamp);
      const acList = point.reportingAircraft.slice(0, 5).join(", ");
      const popupHtml = `
        <div style="font-family:'JetBrains Mono',monospace;font-size:11px;padding:10px;color:#e2e8f0;line-height:1.6">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
            <div style="width:8px;height:8px;border-radius:50%;background:${color};box-shadow:0 0 6px ${color}"></div>
            <span style="font-weight:700;color:${color};font-size:12px;text-transform:uppercase">${severityLabel(point.severity)} Turbulence</span>
          </div>
          <div style="border-top:1px solid rgba(148,163,184,0.1);padding-top:6px;display:grid;gap:3px">
            <div><span style="color:#64748b">ALT:</span> FL${point.flightLevel} (${Math.round(point.altitude).toLocaleString()} ft)</div>
            <div><span style="color:#64748b">VR VAR:</span> <span style="color:${color}">${Math.round(point.verticalRateVariance)} fpm</span></div>
            <div><span style="color:#64748b">SPD VAR:</span> ${Math.round(point.speedVariance)} kts</div>
            <div><span style="color:#64748b">TIME:</span> ${ageStr}</div>
            <div><span style="color:#64748b">ACFT (${point.reportingAircraft.length}):</span> ${acList}</div>
          </div>
        </div>
      `;
      circle.bindPopup(popupHtml, { className: "" });
      turbLayerRef.current!.addLayer(circle);

      // Center dot for severe
      if (point.severity === "severe") {
        const dot = L.circleMarker([point.lat, point.lon], {
          radius: 4,
          color,
          fillColor: color,
          fillOpacity: 0.9,
          weight: 2,
        });
        turbLayerRef.current!.addLayer(dot);
      }
    }
  }, [filteredPoints]);

  // Render heat zones (cluster nearby points)
  useEffect(() => {
    if (!heatLayerRef.current) return;
    heatLayerRef.current.clearLayers();

    // Simple clustering: group points within ~2deg
    const clusters: Array<{
      lat: number;
      lon: number;
      count: number;
      maxSeverity: TurbulenceSeverity;
    }> = [];

    for (const point of filteredPoints) {
      const existing = clusters.find(
        (c) =>
          Math.abs(c.lat - point.lat) < 2 &&
          Math.abs(c.lon - point.lon) < 2
      );
      if (existing) {
        existing.count++;
        existing.lat = (existing.lat + point.lat) / 2;
        existing.lon = (existing.lon + point.lon) / 2;
        const rank: Record<TurbulenceSeverity, number> = { light: 1, moderate: 2, severe: 3 };
        if (rank[point.severity] > rank[existing.maxSeverity]) {
          existing.maxSeverity = point.severity;
        }
      } else {
        clusters.push({
          lat: point.lat,
          lon: point.lon,
          count: 1,
          maxSeverity: point.severity,
        });
      }
    }

    // Draw heat zone for clusters with 2+ reports
    for (const cluster of clusters) {
      if (cluster.count < 2) continue;
      const color = severityColor(cluster.maxSeverity);
      const radius = 60000 + cluster.count * 15000;

      const zone = L.circle([cluster.lat, cluster.lon], {
        radius,
        color: "transparent",
        fillColor: color,
        fillOpacity: 0.06 + cluster.count * 0.02,
        weight: 0,
      });
      heatLayerRef.current!.addLayer(zone);
    }
  }, [filteredPoints]);

  // Render aircraft markers
  useEffect(() => {
    if (!flightLayerRef.current) return;
    flightLayerRef.current.clearLayers();

    const visibleFlights = showAllAircraft
      ? flights.filter((f) => f.latitude !== null && f.longitude !== null && !f.onGround)
      : flights.filter((f) => {
          if (f.latitude === null || f.longitude === null || f.onGround) return false;
          const track = tracks.get(f.icao24);
          return track?.isTurbulent;
        });

    // Filter by altitude
    const altFiltered =
      altitudeFilter === "all"
        ? visibleFlights
        : visibleFlights.filter((f) => {
            if (f.baroAltitude === null) return false;
            const fl = feetToFlightLevel(metersToFeet(f.baroAltitude));
            const band = ALTITUDE_BANDS.find((b) => b.label === altitudeFilter);
            if (!band) return true;
            return fl >= band.min && fl < band.max;
          });

    for (const f of altFiltered) {
      if (f.latitude === null || f.longitude === null) continue;

      const track = tracks.get(f.icao24);
      const isTurbulent = track?.isTurbulent ?? false;
      const hdg = f.trueTrack ?? 0;
      const altFt = f.baroAltitude !== null ? metersToFeet(f.baroAltitude) : 0;

      // Color by altitude
      let color = "#64748b";
      if (altFt < 10000) color = "#cbd5e1";
      else if (altFt < 25000) color = "#94a3b8";
      else if (altFt < 40000) color = "#cbd5e1";
      else color = "#94a3b8";

      // Turbulent aircraft get a red outline glow
      const glowFilter = isTurbulent
        ? `drop-shadow(0 0 6px ${severityColor(track!.severity!)}) drop-shadow(0 0 3px ${severityColor(track!.severity!)})`
        : `drop-shadow(0 0 2px ${color}60)`;

      const planeIcon = L.divIcon({
        className: "",
        html: `<div style="transform:rotate(${hdg}deg);display:flex;align-items:center;justify-content:center;width:20px;height:20px;filter:${glowFilter}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="${isTurbulent ? severityColor(track!.severity!) : color}" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L9.5 8.5L2 10.5V12L9.5 14L12 22L14.5 14L22 12V10.5L14.5 8.5L12 2Z"/>
          </svg>
        </div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const marker = L.marker([f.latitude, f.longitude], { icon: planeIcon });
      const cs = f.callsign?.trim() || f.icao24;
      const alt = f.baroAltitude !== null ? `${Math.round(altFt).toLocaleString()} ft` : "N/A";
      const spd = f.velocity !== null ? `${Math.round(f.velocity * 1.94384)} kts` : "N/A";

      let tooltipExtra = "";
      if (isTurbulent && track) {
        tooltipExtra = `
          <div style="border-top:1px solid rgba(148,163,184,0.1);margin-top:4px;padding-top:4px">
            <div style="color:${severityColor(track.severity!)};font-weight:700">${severityLabel(track.severity!).toUpperCase()} TURBULENCE</div>
            <div>VR VAR: ${Math.round(track.maxVrVariance)} fpm</div>
            <div>SPD VAR: ${Math.round(track.maxSpdVariance)} kts</div>
          </div>`;
      }

      marker.bindTooltip(
        `<div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#e2e8f0;line-height:1.4">
          <div style="font-weight:700;color:${isTurbulent ? severityColor(track!.severity!) : color};font-size:11px">${cs}</div>
          <div>ALT: <span style="color:${color}">${alt}</span></div>
          <div>SPD: ${spd}</div>
          ${tooltipExtra}
        </div>`,
        { className: "range-ring-label" }
      );

      flightLayerRef.current!.addLayer(marker);
    }
  }, [flights, tracks, altitudeFilter, showAllAircraft]);

  return <div ref={containerRef} className="h-full w-full" />;
}

// Wrap in dynamic import to avoid SSR issues with Leaflet
const TurbulenceMap = dynamic(() => Promise.resolve(TurbulenceMapInner), {
  ssr: false,
  loading: () => (
    <div
      className="h-full w-full flex items-center justify-center"
      style={{ background: "var(--surface-0)" }}
    >
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-slate-300/30 border-t-slate-300 rounded-full animate-spin mx-auto mb-3" />
        <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>
          Loading turbulence map...
        </span>
      </div>
    </div>
  ),
});

// ── Main Component ─────────────────────────────────────────────────

export default function TurbulenceMode({ onExitMode }: TurbulenceModeProps) {
  const { rawFlights: sharedFlights, isLoading: sharedLoading, totalCount, lastUpdated } = useSharedFlightData();

  const [flights, setFlights] = useState<FlightState[]>([]);
  const [turbulencePoints, setTurbulencePoints] = useState<TurbulencePoint[]>([]);
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [altitudeFilter, setAltitudeFilter] = useState<AltitudeFilter>("all");
  const [showAllAircraft, setShowAllAircraft] = useState(true);

  const tracksRef = useRef<Map<string, AircraftTrack>>(new Map());
  const pointsRef = useRef<TurbulencePoint[]>([]);

  // Run turbulence detection whenever shared flight data updates
  useEffect(() => {
    if (sharedFlights.length === 0) return;

    setFlights(sharedFlights);

    // Update tracks with new flight data
    tracksRef.current = updateTracks(tracksRef.current, sharedFlights);

    // Generate turbulence points
    const newPoints = generateTurbulencePoints(tracksRef.current, pointsRef.current);
    pointsRef.current = newPoints;
    setTurbulencePoints([...newPoints]);

    // Build recent reports from new turbulence detections
    const now = Date.now();
    const newReports: RecentReport[] = [];
    for (const track of tracksRef.current.values()) {
      if (!track.isTurbulent || !track.severity) continue;
      const lastPos = track.positions[track.positions.length - 1];
      if (!lastPos) continue;
      newReports.push({
        id: `report-${track.icao24}-${now}`,
        timestamp: now,
        severity: track.severity,
        location: latLonToString(lastPos.lat, lastPos.lon),
        altitude: `FL${feetToFlightLevel(lastPos.alt)}`,
        aircraft: track.callsign,
      });
    }

    setRecentReports((prev) => {
      // Deduplicate by aircraft callsign, keep most recent
      const merged = [...newReports, ...prev];
      const seen = new Set<string>();
      const deduped: RecentReport[] = [];
      for (const r of merged) {
        if (!seen.has(r.aircraft)) {
          seen.add(r.aircraft);
          deduped.push(r);
        }
      }
      return deduped.slice(0, 50);
    });
  }, [sharedFlights]);

  // Severity counts
  const severityCounts = useMemo(() => countBySeverity(turbulencePoints), [turbulencePoints]);

  // Filtered reports
  const filteredReports = useMemo(() => {
    if (altitudeFilter === "all") return recentReports;
    return recentReports.filter((r) => {
      const fl = parseInt(r.altitude.replace("FL", ""), 10);
      const band = ALTITUDE_BANDS.find((b) => b.label === altitudeFilter);
      if (!band) return true;
      return fl >= band.min && fl < band.max;
    });
  }, [recentReports, altitudeFilter]);

  const totalReports = turbulencePoints.length;
  const flightCount = totalCount;
  const loading = sharedLoading;
  const dataAge = lastUpdated ? formatTimeAgo(lastUpdated.getTime()) : "loading...";

  return (
    <div className="relative h-full w-full" style={{ background: "var(--surface-0)" }}>
      {/* Severe turbulence pulse animation style */}
      <style>{`
        @keyframes turb-pulse {
          0%, 100% { opacity: 1; stroke-opacity: 0.8; }
          50% { opacity: 0.5; stroke-opacity: 0.3; }
        }
        .turbulence-severe-pulse {
          animation: turb-pulse 1.2s ease-in-out infinite;
        }
      `}</style>

      {/* Full-screen map */}
      <div className="absolute inset-0">
        <TurbulenceMap
          turbulencePoints={turbulencePoints}
          flights={flights}
          altitudeFilter={altitudeFilter}
          showAllAircraft={showAllAircraft}
          tracks={tracksRef.current}
        />
      </div>

      {/* Left floating panel */}
      <div
        className="absolute top-3 left-3 bottom-14 w-[320px] flex flex-col gap-2 z-[1000] overflow-hidden"
      >
        {/* Header */}
        <div
          className="glass-heavy rounded-xl px-4 py-3 flex items-center justify-between"
          style={{ border: "1px solid var(--border-default)" }}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(226,232,240,0.15)", border: "1px solid rgba(226,232,240,0.25)" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 14h4l3-8 4 16 3-8h4" />
                </svg>
              </div>
              {turbulencePoints.length > 0 && (
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-slate-300 animate-anomaly-pulse" />
              )}
            </div>
            <div>
              <div className="panel-title">Turbulence Map</div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                {loading ? "Scanning..." : `${flightCount} aircraft tracked`}
              </div>
            </div>
          </div>
          {onExitMode && (
            <button
              onClick={onExitMode}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
              style={{ color: "var(--text-muted)" }}
              title="Exit turbulence mode"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Severity legend */}
        <div
          className="glass-heavy rounded-xl px-4 py-3"
          style={{ border: "1px solid var(--border-default)" }}
        >
          <div className="section-label mb-2">Turbulence Severity</div>
          <div className="flex flex-col gap-1.5">
            {(["light", "moderate", "severe"] as TurbulenceSeverity[]).map((sev) => (
              <div key={sev} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      background: severityColor(sev),
                      boxShadow: `0 0 6px ${severityColor(sev)}60`,
                    }}
                  />
                  <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                    {severityLabel(sev)}
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {sev === "light" && "(500-1000 fpm)"}
                    {sev === "moderate" && "(1000-2000 fpm)"}
                    {sev === "severe" && "(2000+ fpm)"}
                  </span>
                </div>
                <span
                  className="data-value text-xs font-bold tabular-nums"
                  style={{ color: severityColor(sev) }}
                >
                  {severityCounts[sev]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Altitude filter */}
        <div
          className="glass-heavy rounded-xl px-4 py-3"
          style={{ border: "1px solid var(--border-default)" }}
        >
          <div className="section-label mb-2">Altitude Filter</div>
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => setAltitudeFilter("all")}
              className="text-xs font-semibold px-2 py-1.5 rounded-md transition-all"
              style={{
                background: altitudeFilter === "all" ? "rgba(56,189,248,0.2)" : "rgba(255,255,255,0.04)",
                color: altitudeFilter === "all" ? "#cbd5e1" : "var(--text-muted)",
                border: `1px solid ${altitudeFilter === "all" ? "rgba(56,189,248,0.3)" : "transparent"}`,
              }}
            >
              ALL
            </button>
            {ALTITUDE_BANDS.map((band) => (
              <button
                key={band.label}
                onClick={() => setAltitudeFilter(band.label as AltitudeFilter)}
                className="text-xs font-semibold px-2 py-1.5 rounded-md transition-all"
                style={{
                  background:
                    altitudeFilter === band.label
                      ? "rgba(56,189,248,0.2)"
                      : "rgba(255,255,255,0.04)",
                  color: altitudeFilter === band.label ? "#cbd5e1" : "var(--text-muted)",
                  border: `1px solid ${altitudeFilter === band.label ? "rgba(56,189,248,0.3)" : "transparent"}`,
                }}
              >
                {band.label}
              </button>
            ))}
          </div>
        </div>

        {/* Toggle: show all aircraft */}
        <div
          className="glass-heavy rounded-xl px-4 py-2.5"
          style={{ border: "1px solid var(--border-default)" }}
        >
          <button
            onClick={() => setShowAllAircraft((v) => !v)}
            className="flex items-center justify-between w-full"
          >
            <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              {showAllAircraft ? "Showing all aircraft" : "Affected aircraft only"}
            </span>
            <div
              className="w-8 h-4.5 rounded-full relative transition-colors"
              style={{
                background: showAllAircraft ? "rgba(56,189,248,0.3)" : "rgba(255,255,255,0.1)",
                border: `1px solid ${showAllAircraft ? "rgba(56,189,248,0.4)" : "rgba(255,255,255,0.15)"}`,
              }}
            >
              <div
                className="absolute top-0.5 w-3 h-3 rounded-full transition-all"
                style={{
                  left: showAllAircraft ? "calc(100% - 14px)" : "2px",
                  background: showAllAircraft ? "#cbd5e1" : "#64748b",
                }}
              />
            </div>
          </button>
        </div>

        {/* Recent reports feed */}
        <div
          className="glass-heavy rounded-xl flex-1 min-h-0 flex flex-col overflow-hidden"
          style={{ border: "1px solid var(--border-default)" }}
        >
          <div className="px-4 pt-3 pb-2">
            <div className="section-label">
              Recent Reports ({filteredReports.length})
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-3 scrollbar-thin scroll-fade-both">
            {filteredReports.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-2xl mb-2 opacity-40">~</div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                  No turbulence reports yet.
                </div>
                <div className="text-xs mt-1" style={{ color: "var(--text-faint)" }}>
                  Monitoring aircraft for irregular flight patterns...
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {filteredReports.map((report) => (
                  <div
                    key={report.id}
                    className="rounded-lg px-3 py-2 transition-colors"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: `1px solid ${severityColor(report.severity)}15`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{
                            background: severityColor(report.severity),
                            boxShadow: `0 0 4px ${severityColor(report.severity)}60`,
                          }}
                        />
                        <span
                          className="text-xs font-bold uppercase"
                          style={{ color: severityColor(report.severity) }}
                        >
                          {report.severity}
                        </span>
                      </div>
                      <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>
                        {formatTimeAgo(report.timestamp)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="data-value" style={{ color: "var(--text-secondary)" }}>
                        {report.aircraft}
                      </span>
                      <span style={{ color: "var(--text-muted)" }}>
                        {report.altitude} / {report.location}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom stats bar */}
      <div
        className="absolute bottom-0 left-0 right-0 h-11 z-[1000] flex items-center px-4 gap-6"
        style={{
          background: "linear-gradient(180deg, rgba(6,8,13,0.85) 0%, rgba(6,8,13,0.95) 100%)",
          backdropFilter: "blur(16px)",
          borderTop: "1px solid var(--border-subtle)",
        }}
      >
        {/* Total reports */}
        <div className="flex items-center gap-2">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: totalReports > 0 ? "#e2e8f0" : "#cbd5e1",
              boxShadow: totalReports > 0 ? "0 0 6px #e2e8f060" : "0 0 6px #cbd5e160",
            }}
          />
          <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
            REPORTS
          </span>
          <span className="data-value text-xs font-bold" style={{ color: "var(--text-primary)" }}>
            {totalReports}
          </span>
        </div>

        {/* Severity breakdown */}
        <div className="flex items-center gap-3">
          {(["severe", "moderate", "light"] as TurbulenceSeverity[]).map((sev) => (
            <div key={sev} className="flex items-center gap-1">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: severityColor(sev) }}
              />
              <span className="text-xs data-value font-semibold" style={{ color: severityColor(sev) }}>
                {severityCounts[sev]}
              </span>
            </div>
          ))}
        </div>

        <div className="h-3 w-px" style={{ background: "var(--border-default)" }} />

        {/* Current filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            FILTER
          </span>
          <span
            className="text-xs font-bold data-value px-1.5 py-0.5 rounded"
            style={{
              color: "#cbd5e1",
              background: "rgba(56,189,248,0.1)",
              border: "1px solid rgba(56,189,248,0.2)",
            }}
          >
            {altitudeFilter === "all" ? "ALL ALT" : altitudeFilter}
          </span>
        </div>

        <div className="h-3 w-px" style={{ background: "var(--border-default)" }} />

        {/* Data age */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            DATA
          </span>
          <span className="text-xs font-semibold data-value" style={{ color: "var(--text-secondary)" }}>
            {dataAge}
          </span>
        </div>

        {/* Aircraft toggle indicator */}
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {showAllAircraft ? "ALL ACFT" : "AFFECTED ONLY"}
          </span>
          <span className="data-value text-xs font-bold" style={{ color: "var(--text-secondary)" }}>
            {flightCount}
          </span>
        </div>
      </div>
    </div>
  );
}
