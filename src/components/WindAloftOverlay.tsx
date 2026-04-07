"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

// ── Types ────────────────────────────────────────────────────────────
interface WindLevel {
  altitude: number;
  windDir: number;
  windSpeed: number;
  temp: number;
}

interface WindAloftStation {
  stationId: string;
  lat: number;
  lon: number;
  levels: WindLevel[];
}

interface Props {
  visible: boolean;
}

// ── Constants ────────────────────────────────────────────────────────
const FLIGHT_LEVELS = [
  { label: "FL030", altitude: 3_000 },
  { label: "FL060", altitude: 6_000 },
  { label: "FL090", altitude: 9_000 },
  { label: "FL120", altitude: 12_000 },
  { label: "FL180", altitude: 18_000 },
  { label: "FL240", altitude: 24_000 },
  { label: "FL300", altitude: 30_000 },
  { label: "FL390", altitude: 39_000 },
] as const;

const DEFAULT_ALTITUDE = 30_000;

const SPEED_COLORS = {
  light: "#cbd5e1",
  moderate: "#94a3b8",
  strong: "#94a3b8",
  severe: "#e2e8f0",
} as const;

function getSpeedColor(speed: number): string {
  if (speed < 20) return SPEED_COLORS.light;
  if (speed < 50) return SPEED_COLORS.moderate;
  if (speed < 80) return SPEED_COLORS.strong;
  return SPEED_COLORS.severe;
}

function speedToLength(speed: number): number {
  if (speed <= 0) return 5;
  return Math.min(120, Math.max(10, 10 + speed * 0.9));
}

function getWindAtAltitude(station: WindAloftStation, targetAlt: number): WindLevel | null {
  if (station.levels.length === 0) return null;
  let closest = station.levels[0];
  let minDiff = Math.abs(closest.altitude - targetAlt);
  for (const level of station.levels) {
    const diff = Math.abs(level.altitude - targetAlt);
    if (diff < minDiff) {
      minDiff = diff;
      closest = level;
    }
  }
  return minDiff <= 2000 ? closest : null;
}

function getWindDirectionTendency(stations: WindAloftStation[], altitude: number): string {
  let sinSum = 0, cosSum = 0, count = 0;
  for (const s of stations) {
    const w = getWindAtAltitude(s, altitude);
    if (w && w.windSpeed > 5) {
      const rad = (w.windDir * Math.PI) / 180;
      sinSum += Math.sin(rad);
      cosSum += Math.cos(rad);
      count++;
    }
  }
  if (count === 0) return "Calm";
  const avgDir = ((Math.atan2(sinSum, cosSum) * 180) / Math.PI + 360) % 360;
  const labels = [
    "Northerly", "Northeasterly", "Easterly", "Southeasterly",
    "Southerly", "Southwesterly", "Westerly", "Northwesterly",
  ];
  const idx = Math.round(avgDir / 45) % 8;
  return `${labels[idx]} flow dominant`;
}

// ── Component ────────────────────────────────────────────────────────
export default function WindAloftOverlay({ visible }: Props) {
  const map = useMap();
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const jetStreamLayerRef = useRef<L.LayerGroup | null>(null);

  const [stations, setStations] = useState<WindAloftStation[]>([]);
  const [selectedAltitude, setSelectedAltitude] = useState(DEFAULT_ALTITUDE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renderTick, setRenderTick] = useState(0);

  // ── Fetch wind data ──────────────────────────────────────────────
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch("/api/winds")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: WindAloftStation[]) => {
        if (!cancelled) { setStations(data); setLoading(false); }
      })
      .catch((err) => {
        if (!cancelled) { setError((err as Error).message); setLoading(false); }
      });

    return () => { cancelled = true; };
  }, [visible]);

  // ── Popup builder ────────────────────────────────────────────────
  const buildPopupHtml = useCallback((station: WindAloftStation): string => {
    const rows = station.levels
      .sort((a, b) => a.altitude - b.altitude)
      .map((l) => {
        const color = getSpeedColor(l.windSpeed);
        const fl = `FL${String(Math.round(l.altitude / 100)).padStart(3, "0")}`;
        return `<tr style="border-bottom:1px solid rgba(148,163,184,0.1)">
          <td style="padding:3px 8px 3px 0;font-family:monospace;color:#cbd5e1">${fl}</td>
          <td style="padding:3px 8px;font-family:monospace;color:${color};font-weight:600">${l.windSpeed}kt</td>
          <td style="padding:3px 8px;font-family:monospace;color:#94a3b8">${l.windDir}&deg;</td>
          <td style="padding:3px 0 3px 8px;font-family:monospace;color:#94a3b8">${l.temp > 0 ? "+" : ""}${l.temp}&deg;C</td>
        </tr>`;
      }).join("");

    return `<div style="min-width:220px">
      <div style="font-weight:700;font-size:14px;color:#f1f5f9;margin-bottom:6px;font-family:monospace;letter-spacing:0.5px">${station.stationId}</div>
      <div style="font-size:10px;color:#64748b;margin-bottom:8px">${station.lat.toFixed(2)}N, ${Math.abs(station.lon).toFixed(2)}${station.lon < 0 ? "W" : "E"}</div>
      <table style="width:100%;font-size:11px;border-collapse:collapse">
        <thead><tr style="border-bottom:1px solid rgba(148,163,184,0.2)">
          <th style="text-align:left;padding:0 8px 4px 0;color:#64748b;font-weight:500">FL</th>
          <th style="text-align:left;padding:0 8px 4px;color:#64748b;font-weight:500">Speed</th>
          <th style="text-align:left;padding:0 8px 4px;color:#64748b;font-weight:500">Dir</th>
          <th style="text-align:left;padding:0 0 4px 8px;color:#64748b;font-weight:500">Temp</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }, []);

  // ── Single rendering function ────────────────────────────────────
  const renderLayers = useCallback(() => {
    // Ensure layer groups exist
    if (!layerGroupRef.current) {
      layerGroupRef.current = L.layerGroup().addTo(map);
    }
    if (!jetStreamLayerRef.current) {
      jetStreamLayerRef.current = L.layerGroup().addTo(map);
    }

    const windGroup = layerGroupRef.current;
    const jetGroup = jetStreamLayerRef.current;
    windGroup.clearLayers();
    jetGroup.clearLayers();

    if (stations.length === 0) return;

    const zoom = map.getZoom();
    const showLabels = zoom >= 5;
    const showTemp = zoom >= 6;
    const jetCandidates: { lat: number; lon: number; speed: number }[] = [];

    for (const station of stations) {
      const wind = getWindAtAltitude(station, selectedAltitude);
      if (!wind) continue;

      const color = getSpeedColor(wind.windSpeed);
      const length = speedToLength(wind.windSpeed);

      // Arrow direction: windDir is "from" direction; arrow points where wind goes TO
      const toRad = (wind.windDir * Math.PI) / 180;
      const origin = map.latLngToContainerPoint([station.lat, station.lon]);
      const tipX = origin.x + Math.sin(toRad) * length;
      const tipY = origin.y - Math.cos(toRad) * length;
      const tipLatLng = map.containerPointToLatLng(L.point(tipX, tipY));

      // Arrow shaft
      windGroup.addLayer(
        L.polyline([[station.lat, station.lon], tipLatLng], {
          color,
          weight: Math.max(2, Math.min(4, wind.windSpeed / 25)),
          opacity: 0.85,
        })
      );

      // Arrowhead
      const headLen = Math.max(6, length * 0.25);
      const ha1 = toRad + (155 * Math.PI) / 180;
      const ha2 = toRad - (155 * Math.PI) / 180;
      const h1 = map.containerPointToLatLng(
        L.point(tipX + Math.sin(ha1) * headLen, tipY - Math.cos(ha1) * headLen)
      );
      const h2 = map.containerPointToLatLng(
        L.point(tipX + Math.sin(ha2) * headLen, tipY - Math.cos(ha2) * headLen)
      );
      windGroup.addLayer(
        L.polyline([h1, tipLatLng, h2], { color, weight: 2.5, opacity: 0.9 })
      );

      // Labels
      if (showLabels) {
        let html = `<span style="color:${color};font-weight:600">${wind.windSpeed}kt</span>`;
        if (showTemp) {
          html += `<br><span style="color:#64748b;font-size:9px">${wind.temp > 0 ? "+" : ""}${wind.temp}&deg;C</span>`;
        }
        windGroup.addLayer(
          L.marker([station.lat, station.lon], {
            icon: L.divIcon({
              className: "wind-label",
              html: `<div style="font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10px;line-height:1.3;white-space:nowrap;text-shadow:0 1px 3px rgba(0,0,0,0.8);pointer-events:none">${html}</div>`,
              iconSize: [60, 20],
              iconAnchor: [-8, 10],
            }),
            interactive: false,
          })
        );
      }

      // Clickable dot
      const dot = L.marker([station.lat, station.lon], {
        icon: L.divIcon({
          className: "wind-station-dot",
          html: `<div style="width:6px;height:6px;border-radius:50%;background:${color};border:1px solid rgba(0,0,0,0.4);box-shadow:0 0 4px ${color}40;cursor:pointer"></div>`,
          iconSize: [6, 6],
          iconAnchor: [3, 3],
        }),
      });
      dot.bindPopup(buildPopupHtml(station), { className: "wind-popup", maxWidth: 280 });
      windGroup.addLayer(dot);

      if (wind.windSpeed > 60) {
        jetCandidates.push({ lat: station.lat, lon: station.lon, speed: wind.windSpeed });
      }
    }

    // ── Jet stream ───────────────────────────────────────────────
    if (jetCandidates.length >= 2) {
      jetCandidates.sort((a, b) => a.lon - b.lon);
      const used = new Set<number>();
      const path: typeof jetCandidates = [];
      let cur = 0;
      used.add(0);
      path.push(jetCandidates[0]);

      while (used.size < jetCandidates.length) {
        let bestIdx = -1, bestDist = Infinity;
        for (let i = 0; i < jetCandidates.length; i++) {
          if (used.has(i)) continue;
          const dx = jetCandidates[i].lon - jetCandidates[cur].lon;
          const dy = jetCandidates[i].lat - jetCandidates[cur].lat;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < bestDist && d < 20) { bestDist = d; bestIdx = i; }
        }
        if (bestIdx === -1) break;
        used.add(bestIdx);
        path.push(jetCandidates[bestIdx]);
        cur = bestIdx;
      }

      for (let i = 0; i < path.length - 1; i++) {
        const avg = (path[i].speed + path[i + 1].speed) / 2;
        const c = avg >= 100 ? "#e2e8f0" : avg >= 80 ? "#94a3b8" : "#94a3b8";
        const coords: L.LatLngExpression[] = [
          [path[i].lat, path[i].lon],
          [path[i + 1].lat, path[i + 1].lon],
        ];
        jetGroup.addLayer(L.polyline(coords, { color: c, weight: 8, opacity: 0.3, lineCap: "round", lineJoin: "round" }));
        jetGroup.addLayer(L.polyline(coords, { color: c, weight: 3, opacity: 0.6, lineCap: "round", lineJoin: "round" }));
      }
    }
  }, [map, stations, selectedAltitude, buildPopupHtml]);

  // ── Main render effect ───────────────────────────────────────────
  useEffect(() => {
    if (!visible) {
      if (layerGroupRef.current) { layerGroupRef.current.clearLayers(); map.removeLayer(layerGroupRef.current); layerGroupRef.current = null; }
      if (jetStreamLayerRef.current) { jetStreamLayerRef.current.clearLayers(); map.removeLayer(jetStreamLayerRef.current); jetStreamLayerRef.current = null; }
      return;
    }
    renderLayers();
  }, [visible, renderLayers, renderTick]);

  // ── Redraw on zoom/pan ───────────────────────────────────────────
  useEffect(() => {
    if (!visible) return;
    const tick = () => setRenderTick((k) => k + 1);
    map.on("zoomend", tick);
    map.on("moveend", tick);
    return () => { map.off("zoomend", tick); map.off("moveend", tick); };
  }, [map, visible]);

  // ── Cleanup on unmount ───────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (layerGroupRef.current) { layerGroupRef.current.clearLayers(); map.removeLayer(layerGroupRef.current); layerGroupRef.current = null; }
      if (jetStreamLayerRef.current) { jetStreamLayerRef.current.clearLayers(); map.removeLayer(jetStreamLayerRef.current); jetStreamLayerRef.current = null; }
    };
  }, [map]);

  // ── Stats ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (stations.length === 0) return null;
    let totalSpeed = 0, count = 0, maxSpeed = 0, maxStation = "";
    for (const s of stations) {
      const w = getWindAtAltitude(s, selectedAltitude);
      if (!w) continue;
      totalSpeed += w.windSpeed; count++;
      if (w.windSpeed > maxSpeed) { maxSpeed = w.windSpeed; maxStation = s.stationId; }
    }
    return {
      avgSpeed: count > 0 ? Math.round(totalSpeed / count) : 0,
      maxSpeed, maxStation,
      tendency: getWindDirectionTendency(stations, selectedAltitude),
    };
  }, [stations, selectedAltitude]);

  if (!visible) return null;

  const selectedFL = FLIGHT_LEVELS.find((fl) => fl.altitude === selectedAltitude);

  return (
    <>
      {/* Altitude selector */}
      <div
        className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-1 px-2 py-1.5 rounded-lg"
        style={{
          background: "rgba(6,8,13,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid var(--border-default,rgba(148,163,184,0.10))",
          boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
        }}
      >
        <span style={{ fontSize: "10px", color: "var(--text-muted,#64748b)", marginRight: "4px", fontFamily: "ui-monospace,monospace" }}>
          ALT
        </span>
        {FLIGHT_LEVELS.map((fl) => (
          <button
            key={fl.altitude}
            onClick={() => setSelectedAltitude(fl.altitude)}
            style={{
              padding: "4px 8px",
              borderRadius: "6px",
              fontSize: "10px",
              fontWeight: 600,
              fontFamily: "ui-monospace,monospace",
              letterSpacing: "0.3px",
              border: "none",
              cursor: "pointer",
              transition: "all 150ms ease",
              background: selectedAltitude === fl.altitude ? "var(--accent-primary,#94a3b8)" : "transparent",
              color: selectedAltitude === fl.altitude ? "#0c1018" : "var(--text-tertiary,#94a3b8)",
            }}
            onMouseEnter={(e) => {
              if (selectedAltitude !== fl.altitude) {
                (e.target as HTMLButtonElement).style.background = "rgba(148,163,184,0.1)";
                (e.target as HTMLButtonElement).style.color = "var(--text-secondary,#cbd5e1)";
              }
            }}
            onMouseLeave={(e) => {
              if (selectedAltitude !== fl.altitude) {
                (e.target as HTMLButtonElement).style.background = "transparent";
                (e.target as HTMLButtonElement).style.color = "var(--text-tertiary,#94a3b8)";
              }
            }}
          >
            {fl.label}
          </button>
        ))}
      </div>

      {/* Info panel */}
      {stats && (
        <div
          className="absolute bottom-20 left-4 z-[1000] rounded-lg"
          style={{
            background: "rgba(6,8,13,0.85)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid var(--border-default,rgba(148,163,184,0.10))",
            boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
            padding: "12px 16px",
            minWidth: "200px",
          }}
        >
          <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--accent-primary,#94a3b8)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px", fontFamily: "ui-monospace,monospace" }}>
            Wind Aloft
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <Row label="Altitude" value={selectedFL?.label ?? "---"} color="var(--text-primary,#f1f5f9)" />
            <Row label="Avg Speed" value={`${stats.avgSpeed} kt`} color={getSpeedColor(stats.avgSpeed)} />
            <Row label="Max Wind" value={`${stats.maxSpeed} kt`} color={getSpeedColor(stats.maxSpeed)} suffix={`(${stats.maxStation})`} />
            <div style={{ borderTop: "1px solid var(--border-subtle,rgba(148,163,184,0.06))", paddingTop: "6px", marginTop: "2px" }}>
              <span style={{ fontSize: "10px", color: "var(--text-tertiary,#94a3b8)", fontStyle: "italic" }}>{stats.tendency}</span>
            </div>
          </div>

          {/* Speed legend */}
          <div style={{ display: "flex", gap: "8px", marginTop: "10px", paddingTop: "8px", borderTop: "1px solid var(--border-subtle,rgba(148,163,184,0.06))" }}>
            {([
              { color: SPEED_COLORS.light, label: "<20" },
              { color: SPEED_COLORS.moderate, label: "20-50" },
              { color: SPEED_COLORS.strong, label: "50-80" },
              { color: SPEED_COLORS.severe, label: "80+" },
            ] as const).map((item) => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                <div style={{ width: "8px", height: "3px", borderRadius: "1px", background: item.color }} />
                <span style={{ fontSize: "8px", color: "var(--text-muted,#64748b)", fontFamily: "ui-monospace,monospace" }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1000] px-4 py-2 rounded-lg"
          style={{ background: "rgba(6,8,13,0.9)", backdropFilter: "blur(8px)", border: "1px solid var(--border-default)", color: "#cbd5e1", fontSize: "12px", fontFamily: "ui-monospace,monospace" }}>
          Loading wind aloft data...
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1000] px-4 py-2 rounded-lg"
          style={{ background: "rgba(30,41,59,0.8)", backdropFilter: "blur(8px)", border: "1px solid rgba(148,163,184,0.3)", color: "#e2e8f0", fontSize: "12px", fontFamily: "ui-monospace,monospace" }}>
          Wind data error: {error}
        </div>
      )}

      {/* Popup + label styling */}
      <style>{`
        .wind-popup .leaflet-popup-content-wrapper {
          background: rgba(6,8,13,0.95);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(148,163,184,0.1);
          border-radius: 8px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
          color: #f1f5f9;
        }
        .wind-popup .leaflet-popup-tip {
          background: rgba(6,8,13,0.95);
          border: 1px solid rgba(148,163,184,0.1);
        }
        .wind-popup .leaflet-popup-close-button { color: #94a3b8 !important; }
        .wind-popup .leaflet-popup-close-button:hover { color: #f1f5f9 !important; }
        .wind-label, .wind-station-dot {
          background: none !important;
          border: none !important;
          box-shadow: none !important;
        }
      `}</style>
    </>
  );
}

// ── Small helper for info panel rows ──────────────────────────────
function Row({ label, value, color, suffix }: { label: string; value: string; color: string; suffix?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <span style={{ fontSize: "10px", color: "var(--text-muted,#64748b)" }}>{label}</span>
      <span style={{ fontSize: "12px", fontWeight: 600, color, fontFamily: "ui-monospace,monospace" }}>
        {value}
        {suffix && <span style={{ fontSize: "9px", color: "var(--text-tertiary,#94a3b8)", marginLeft: "4px" }}>{suffix}</span>}
      </span>
    </div>
  );
}
