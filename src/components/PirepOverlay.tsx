"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";

// ── Types ───────────────────────────────────────────────────────────

interface PIREPTurbulence {
  intensity:
    | "NEG"
    | "SMTH-LGT"
    | "LGT"
    | "LGT-MOD"
    | "MOD"
    | "MOD-SEV"
    | "SEV"
    | "EXTRM";
  type?: "CAT" | "MECH" | "LLWS";
  frequency?: "ISOL" | "OCNL" | "CONT";
  baseAlt?: number;
  topAlt?: number;
}

interface PIREPIcing {
  intensity: "NEG" | "TRC" | "LGT" | "MOD" | "SEV";
  type?: "RIME" | "CLR" | "MXD";
  baseAlt?: number;
  topAlt?: number;
}

interface PIREP {
  id: string;
  reportType: "UA" | "UUA";
  lat: number;
  lon: number;
  altitude: number;
  time: string;
  aircraftType: string;
  turbulence?: PIREPTurbulence;
  icing?: PIREPIcing;
  skyCover?: string;
  visibility?: number;
  temp?: number;
  wind?: { dir: number; speed: number };
  rawText: string;
}

// ── Constants ───────────────────────────────────────────────────────

const TURB_COLORS: Record<string, string> = {
  NEG: "#cbd5e1",
  "SMTH-LGT": "#cbd5e1",
  LGT: "#94a3b8",
  "LGT-MOD": "#94a3b8",
  MOD: "#94a3b8",
  "MOD-SEV": "#94a3b8",
  SEV: "#94a3b8",
  EXTRM: "#e2e8f0",
};

const ICING_COLORS: Record<string, string> = {
  NEG: "#cbd5e1",
  TRC: "#cbd5e1",
  LGT: "#94a3b8",
  MOD: "#94a3b8",
  SEV: "#e2e8f0",
};

const TURB_SEVERITY_ORDER: Record<string, number> = {
  NEG: 0,
  "SMTH-LGT": 1,
  LGT: 2,
  "LGT-MOD": 3,
  MOD: 4,
  "MOD-SEV": 5,
  SEV: 6,
  EXTRM: 7,
};

const ICING_SEVERITY_ORDER: Record<string, number> = {
  NEG: 0,
  TRC: 1,
  LGT: 2,
  MOD: 3,
  SEV: 4,
};

type AltitudeFilter =
  | "ALL"
  | "BELOW_FL100"
  | "FL100_FL200"
  | "FL200_FL300"
  | "FL300_FL400"
  | "ABOVE_FL400";

type TypeFilter = "ALL" | "TURB" | "ICE";

const ALT_FILTERS: { key: AltitudeFilter; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "BELOW_FL100", label: "<FL100" },
  { key: "FL100_FL200", label: "FL100-200" },
  { key: "FL200_FL300", label: "FL200-300" },
  { key: "FL300_FL400", label: "FL300-400" },
  { key: "ABOVE_FL400", label: ">FL400" },
];

const TYPE_FILTERS: { key: TypeFilter; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "TURB", label: "Turbulence" },
  { key: "ICE", label: "Icing" },
];

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

// ── SVG Marker generators ───────────────────────────────────────────

function turbulenceMarkerSvg(
  color: string,
  size: number,
  pulse: boolean
): string {
  const half = size / 2;
  const triH = size * 0.8;
  const triW = size * 0.7;
  const cx = half;
  const cy = half;
  const points = `${cx},${cy - triH / 2} ${cx - triW / 2},${cy + triH / 2} ${cx + triW / 2},${cy + triH / 2}`;

  const pulseRing = pulse
    ? `<circle cx="${cx}" cy="${cx}" r="${half - 2}" fill="none" stroke="${color}" stroke-width="2" opacity="0.6">
         <animate attributeName="r" from="${half - 2}" to="${half + 6}" dur="1.2s" repeatCount="indefinite"/>
         <animate attributeName="opacity" from="0.7" to="0" dur="1.2s" repeatCount="indefinite"/>
       </circle>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${pulseRing}
    <polygon points="${points}" fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="1.5" stroke-linejoin="round"/>
    <text x="${cx}" y="${cy + 3}" text-anchor="middle" font-size="${size * 0.35}" font-weight="bold" fill="${color}">T</text>
  </svg>`;
}

function icingMarkerSvg(
  color: string,
  size: number,
  pulse: boolean
): string {
  const half = size / 2;
  const d = size * 0.35;
  const points = `${half},${half - d} ${half + d},${half} ${half},${half + d} ${half - d},${half}`;

  const pulseRing = pulse
    ? `<circle cx="${half}" cy="${half}" r="${half - 2}" fill="none" stroke="${color}" stroke-width="2" opacity="0.6">
         <animate attributeName="r" from="${half - 2}" to="${half + 6}" dur="1.2s" repeatCount="indefinite"/>
         <animate attributeName="opacity" from="0.7" to="0" dur="1.2s" repeatCount="indefinite"/>
       </circle>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${pulseRing}
    <polygon points="${points}" fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>
    <text x="${half}" y="${half + 3}" text-anchor="middle" font-size="${size * 0.35}" font-weight="bold" fill="${color}">I</text>
  </svg>`;
}

// ── Popup HTML ──────────────────────────────────────────────────────

function pirepPopupHtml(p: PIREP): string {
  const isUrgent = p.reportType === "UUA";
  const badgeColor = isUrgent ? "#e2e8f0" : "#94a3b8";
  const badgeLabel = isUrgent ? "URGENT" : "ROUTINE";

  let detailsHtml = "";

  if (p.turbulence) {
    const tc = TURB_COLORS[p.turbulence.intensity] ?? "#94a3b8";
    detailsHtml += `
      <div style="margin-top:8px;padding:6px 8px;background:rgba(0,0,0,0.3);border-radius:4px;border-left:3px solid ${tc}">
        <div style="font-size:10px;color:#94a3b8;margin-bottom:2px">TURBULENCE</div>
        <div style="font-size:12px;font-weight:600;color:${tc}">${p.turbulence.intensity}</div>
        ${p.turbulence.type ? `<div style="font-size:10px;color:#cbd5e1">Type: ${p.turbulence.type}</div>` : ""}
        ${p.turbulence.frequency ? `<div style="font-size:10px;color:#cbd5e1">Freq: ${p.turbulence.frequency}</div>` : ""}
        ${p.turbulence.baseAlt != null || p.turbulence.topAlt != null ? `<div style="font-size:10px;color:#cbd5e1">Alt: ${p.turbulence.baseAlt ?? "?"} - ${p.turbulence.topAlt ?? "?"} ft</div>` : ""}
      </div>`;
  }

  if (p.icing) {
    const ic = ICING_COLORS[p.icing.intensity] ?? "#94a3b8";
    detailsHtml += `
      <div style="margin-top:8px;padding:6px 8px;background:rgba(0,0,0,0.3);border-radius:4px;border-left:3px solid ${ic}">
        <div style="font-size:10px;color:#94a3b8;margin-bottom:2px">ICING</div>
        <div style="font-size:12px;font-weight:600;color:${ic}">${p.icing.intensity}</div>
        ${p.icing.type ? `<div style="font-size:10px;color:#cbd5e1">Type: ${p.icing.type}</div>` : ""}
        ${p.icing.baseAlt != null || p.icing.topAlt != null ? `<div style="font-size:10px;color:#cbd5e1">Alt: ${p.icing.baseAlt ?? "?"} - ${p.icing.topAlt ?? "?"} ft</div>` : ""}
      </div>`;
  }

  const timeStr = new Date(p.time).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  return `
    <div style="min-width:280px;max-width:360px;font-family:ui-sans-serif,system-ui,sans-serif;color:#e2e8f0;line-height:1.5">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
        <span style="font-size:9px;font-weight:700;background:${badgeColor};color:#fff;padding:2px 8px;border-radius:4px;text-transform:uppercase;letter-spacing:0.05em">${badgeLabel}</span>
        <span style="font-size:11px;color:#94a3b8;margin-left:auto">${timeStr}</span>
      </div>

      <div style="font-family:ui-monospace,monospace;font-size:10px;color:#94a3b8;background:rgba(0,0,0,0.4);padding:6px 8px;border-radius:4px;word-break:break-all;margin-bottom:8px;max-height:80px;overflow-y:auto">${p.rawText || "No raw text available"}</div>

      ${detailsHtml}

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;font-size:10px;color:#cbd5e1;margin-top:8px">
        <div><span style="color:#64748b">AIRCRAFT</span><br/>${p.aircraftType}</div>
        <div><span style="color:#64748b">ALTITUDE</span><br/>${p.altitude.toLocaleString()} ft (FL${Math.round(p.altitude / 100)})</div>
        ${p.temp != null ? `<div><span style="color:#64748b">TEMP</span><br/>${p.temp}&deg;C</div>` : ""}
        ${p.wind ? `<div><span style="color:#64748b">WIND</span><br/>${p.wind.dir}&deg; / ${p.wind.speed} kt</div>` : ""}
        ${p.visibility != null ? `<div><span style="color:#64748b">VIS</span><br/>${p.visibility} SM</div>` : ""}
        ${p.skyCover ? `<div><span style="color:#64748b">SKY</span><br/>${p.skyCover}</div>` : ""}
      </div>
    </div>`;
}

// ── Helpers ─────────────────────────────────────────────────────────

function passesAltFilter(p: PIREP, filter: AltitudeFilter): boolean {
  if (filter === "ALL") return true;
  const alt = p.altitude;
  switch (filter) {
    case "BELOW_FL100":
      return alt < 10000;
    case "FL100_FL200":
      return alt >= 10000 && alt < 20000;
    case "FL200_FL300":
      return alt >= 20000 && alt < 30000;
    case "FL300_FL400":
      return alt >= 30000 && alt < 40000;
    case "ABOVE_FL400":
      return alt >= 40000;
    default:
      return true;
  }
}

function passesTypeFilter(p: PIREP, filter: TypeFilter): boolean {
  if (filter === "ALL") return true;
  if (filter === "TURB") return !!p.turbulence;
  if (filter === "ICE") return !!p.icing;
  return true;
}

function pirepSeverityOrder(p: PIREP): number {
  let worst = 0;
  if (p.turbulence) {
    worst = Math.max(worst, TURB_SEVERITY_ORDER[p.turbulence.intensity] ?? 0);
  }
  if (p.icing) {
    worst = Math.max(worst, ICING_SEVERITY_ORDER[p.icing.intensity] ?? 0);
  }
  return worst;
}

function pirepColor(p: PIREP): string {
  if (p.turbulence) return TURB_COLORS[p.turbulence.intensity] ?? "#94a3b8";
  if (p.icing) return ICING_COLORS[p.icing.intensity] ?? "#94a3b8";
  return "#94a3b8";
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m ago`;
}

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Clustering for low zoom ─────────────────────────────────────────

interface Cluster {
  lat: number;
  lon: number;
  pireps: PIREP[];
  worstSeverity: number;
  color: string;
}

function clusterPireps(pireps: PIREP[], radiusKm: number): Cluster[] {
  const clusters: Cluster[] = [];
  const assigned = new Set<number>();

  for (let i = 0; i < pireps.length; i++) {
    if (assigned.has(i)) continue;
    const seed = pireps[i];
    const group: PIREP[] = [seed];
    assigned.add(i);

    for (let j = i + 1; j < pireps.length; j++) {
      if (assigned.has(j)) continue;
      if (haversineDistance(seed.lat, seed.lon, pireps[j].lat, pireps[j].lon) < radiusKm) {
        group.push(pireps[j]);
        assigned.add(j);
      }
    }

    const avgLat = group.reduce((s, p) => s + p.lat, 0) / group.length;
    const avgLon = group.reduce((s, p) => s + p.lon, 0) / group.length;
    let worstSev = 0;
    for (const p of group) {
      worstSev = Math.max(worstSev, pirepSeverityOrder(p));
    }

    // Determine color from worst severity
    const sevColors = [
      "#cbd5e1", // 0 - NEG
      "#cbd5e1", // 1 - SMTH-LGT / TRC
      "#94a3b8", // 2 - LGT
      "#94a3b8", // 3 - LGT-MOD
      "#94a3b8", // 4 - MOD
      "#94a3b8", // 5 - MOD-SEV
      "#94a3b8", // 6 - SEV
      "#e2e8f0", // 7 - EXTRM
    ];

    clusters.push({
      lat: avgLat,
      lon: avgLon,
      pireps: group,
      worstSeverity: worstSev,
      color: sevColors[worstSev] ?? "#94a3b8",
    });
  }

  return clusters;
}

// ── Severity summary ────────────────────────────────────────────────

interface SeveritySummary {
  total: number;
  neg: number;
  light: number;
  moderate: number;
  severe: number;
  extreme: number;
  mostRecent: string | null;
}

function computeSummary(pireps: PIREP[]): SeveritySummary {
  const summary: SeveritySummary = {
    total: pireps.length,
    neg: 0,
    light: 0,
    moderate: 0,
    severe: 0,
    extreme: 0,
    mostRecent: null,
  };

  let latest = 0;

  for (const p of pireps) {
    const sev = pirepSeverityOrder(p);
    if (sev <= 1) summary.neg++;
    else if (sev <= 2) summary.light++;
    else if (sev <= 4) summary.moderate++;
    else if (sev <= 6) summary.severe++;
    else summary.extreme++;

    const t = new Date(p.time).getTime();
    if (t > latest) {
      latest = t;
      summary.mostRecent = p.time;
    }
  }

  return summary;
}

// ── Props ───────────────────────────────────────────────────────────

interface PirepOverlayProps {
  visible: boolean;
}

// ── Component ───────────────────────────────────────────────────────

export default function PirepOverlay({ visible }: PirepOverlayProps) {
  const map = useMap();

  const [pireps, setPireps] = useState<PIREP[]>([]);
  const [lastFetch, setLastFetch] = useState<number>(0);
  const [altFilter, setAltFilter] = useState<AltitudeFilter>("ALL");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [zoom, setZoom] = useState<number>(map.getZoom());

  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // ── Fetch PIREPs ────────────────────────────────────────────────

  const fetchPireps = useCallback(async () => {
    try {
      const res = await fetch("/api/pireps");
      if (!res.ok) return;
      const json = await res.json();
      if (Array.isArray(json.pireps)) {
        setPireps(json.pireps);
        setLastFetch(Date.now());
      }
    } catch (err) {
      console.error("[PirepOverlay] Fetch failed:", err);
    }
  }, []);

  // Fetch on mount + poll
  useEffect(() => {
    if (!visible) return;
    fetchPireps();
    const interval = setInterval(fetchPireps, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [visible, fetchPireps]);

  // Track zoom
  useEffect(() => {
    const onZoom = () => setZoom(map.getZoom());
    map.on("zoomend", onZoom);
    return () => {
      map.off("zoomend", onZoom);
    };
  }, [map]);

  // ── Filtered PIREPs ─────────────────────────────────────────────

  const filtered = useMemo(() => {
    return pireps.filter(
      (p) => passesAltFilter(p, altFilter) && passesTypeFilter(p, typeFilter)
    );
  }, [pireps, altFilter, typeFilter]);

  const summary = useMemo(() => computeSummary(filtered), [filtered]);

  // ── Render map layers ───────────────────────────────────────────

  useEffect(() => {
    // Clean up previous layers
    if (layerGroupRef.current) {
      layerGroupRef.current.clearLayers();
      map.removeLayer(layerGroupRef.current);
      layerGroupRef.current = null;
    }

    if (!visible || filtered.length === 0) return;

    const group = L.layerGroup();
    layerGroupRef.current = group;

    const popupOptions: L.PopupOptions = {
      className: "pirep-popup-dark",
      maxWidth: 380,
      minWidth: 280,
      closeButton: true,
    };

    if (zoom < 6) {
      // ── Cluster mode ──────────────────────────────────────────
      const clusters = clusterPireps(filtered, 200);

      for (const cluster of clusters) {
        const radius = Math.min(12 + cluster.pireps.length * 2, 40);
        const circle = L.circleMarker([cluster.lat, cluster.lon], {
          radius,
          fillColor: cluster.color,
          fillOpacity: 0.35,
          color: cluster.color,
          weight: 2,
          opacity: 0.8,
        });

        // Tooltip
        circle.bindTooltip(
          `<div style="font-family:ui-monospace,monospace;font-size:10px;color:#e2e8f0">
            <strong>${cluster.pireps.length}</strong> PIREPs
          </div>`,
          {
            className: "pirep-tooltip-dark",
            direction: "top",
            offset: [0, -radius],
          }
        );

        group.addLayer(circle);
      }
    } else {
      // ── Individual markers ────────────────────────────────────
      for (const p of filtered) {
        const isUrgent = p.reportType === "UUA";
        const size = isUrgent ? 28 : 20;
        const color = pirepColor(p);

        let svgHtml: string;
        if (p.turbulence) {
          svgHtml = turbulenceMarkerSvg(color, size, isUrgent);
        } else if (p.icing) {
          svgHtml = icingMarkerSvg(color, size, isUrgent);
        } else {
          // Generic marker — small circle
          svgHtml = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
            <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="1.5"/>
          </svg>`;
        }

        const icon = L.divIcon({
          html: svgHtml,
          className: "pirep-marker",
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
          popupAnchor: [0, -size / 2],
        });

        const marker = L.marker([p.lat, p.lon], { icon });
        marker.bindPopup(pirepPopupHtml(p), popupOptions);
        group.addLayer(marker);
      }
    }

    group.addTo(map);

    return () => {
      if (layerGroupRef.current) {
        layerGroupRef.current.clearLayers();
        map.removeLayer(layerGroupRef.current);
        layerGroupRef.current = null;
      }
    };
  }, [map, visible, filtered, zoom]);

  // ── Don't render UI if not visible ──────────────────────────────

  if (!visible) return null;

  // ── Render ────────────────────────────────────────────────────────

  return (
    <>
      {/* Inject popup + marker styles */}
      <style>{`
        .pirep-popup-dark .leaflet-popup-content-wrapper {
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(148, 163, 184, 0.12);
          border-radius: 8px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
          color: #e2e8f0;
          padding: 0;
        }
        .pirep-popup-dark .leaflet-popup-content {
          margin: 12px;
          line-height: 1.4;
        }
        .pirep-popup-dark .leaflet-popup-tip {
          background: rgba(15, 23, 42, 0.95);
          border: 1px solid rgba(148, 163, 184, 0.12);
        }
        .pirep-popup-dark .leaflet-popup-close-button {
          color: #94a3b8 !important;
          font-size: 18px !important;
          top: 6px !important;
          right: 8px !important;
        }
        .pirep-popup-dark .leaflet-popup-close-button:hover {
          color: #e2e8f0 !important;
        }
        .pirep-tooltip-dark {
          background: rgba(15, 23, 42, 0.9) !important;
          border: 1px solid rgba(148, 163, 184, 0.15) !important;
          border-radius: 4px !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4) !important;
          padding: 4px 8px !important;
          color: #e2e8f0 !important;
        }
        .pirep-tooltip-dark::before {
          border-top-color: rgba(15, 23, 42, 0.9) !important;
        }
        .pirep-marker {
          background: none !important;
          border: none !important;
        }
      `}</style>

      {/* Filter controls */}
      <div
        className="absolute top-20 right-4 z-[1000] flex flex-col gap-2"
        style={{ pointerEvents: "auto" }}
      >
        {/* Altitude filter */}
        <div
          style={{
            background: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(148, 163, 184, 0.1)",
            borderRadius: "8px",
            padding: "8px",
          }}
        >
          <div
            style={{
              fontSize: "9px",
              fontWeight: 600,
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "4px",
              fontFamily: "ui-monospace, monospace",
            }}
          >
            Altitude
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "2px" }}>
            {ALT_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setAltFilter(f.key)}
                style={{
                  padding: "3px 6px",
                  fontSize: "9px",
                  fontWeight: 600,
                  borderRadius: "4px",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "ui-monospace, monospace",
                  background:
                    altFilter === f.key
                      ? "rgba(148, 163, 184, 0.2)"
                      : "transparent",
                  color:
                    altFilter === f.key ? "#cbd5e1" : "#94a3b8",
                  transition: "all 0.15s ease",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Type filter */}
        <div
          style={{
            background: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(148, 163, 184, 0.1)",
            borderRadius: "8px",
            padding: "8px",
          }}
        >
          <div
            style={{
              fontSize: "9px",
              fontWeight: 600,
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "4px",
              fontFamily: "ui-monospace, monospace",
            }}
          >
            Type
          </div>
          <div style={{ display: "flex", gap: "2px" }}>
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setTypeFilter(f.key)}
                style={{
                  padding: "3px 6px",
                  fontSize: "9px",
                  fontWeight: 600,
                  borderRadius: "4px",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "ui-monospace, monospace",
                  background:
                    typeFilter === f.key
                      ? "rgba(148, 163, 184, 0.2)"
                      : "transparent",
                  color:
                    typeFilter === f.key ? "#cbd5e1" : "#94a3b8",
                  transition: "all 0.15s ease",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary panel */}
      <div
        className="absolute bottom-20 right-4 z-[1000]"
        style={{
          background: "rgba(15, 23, 42, 0.85)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(148, 163, 184, 0.1)",
          borderRadius: "8px",
          padding: "10px 12px",
          minWidth: "180px",
          pointerEvents: "auto",
          fontFamily: "ui-monospace, monospace",
        }}
      >
        <div
          style={{
            fontSize: "10px",
            fontWeight: 700,
            color: "#e2e8f0",
            marginBottom: "8px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: pireps.length > 0 ? "#cbd5e1" : "#64748b",
              display: "inline-block",
            }}
          />
          PIREPs
          <span style={{ fontSize: "9px", color: "#64748b", marginLeft: "auto" }}>
            {summary.total} total
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "4px 8px",
            fontSize: "9px",
          }}
        >
          {summary.neg > 0 && (
            <div style={{ color: "#cbd5e1" }}>
              NEG/LGT: {summary.neg}
            </div>
          )}
          {summary.light > 0 && (
            <div style={{ color: "#94a3b8" }}>
              LIGHT: {summary.light}
            </div>
          )}
          {summary.moderate > 0 && (
            <div style={{ color: "#94a3b8" }}>
              MOD: {summary.moderate}
            </div>
          )}
          {summary.severe > 0 && (
            <div style={{ color: "#94a3b8" }}>
              SEV: {summary.severe}
            </div>
          )}
          {summary.extreme > 0 && (
            <div style={{ color: "#e2e8f0" }}>
              EXTRM: {summary.extreme}
            </div>
          )}
        </div>

        {summary.mostRecent && (
          <div
            style={{
              marginTop: "6px",
              paddingTop: "6px",
              borderTop: "1px solid rgba(148, 163, 184, 0.1)",
              fontSize: "9px",
              color: "#64748b",
            }}
          >
            Latest:{" "}
            {new Date(summary.mostRecent).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              timeZoneName: "short",
            })}
          </div>
        )}

        {lastFetch > 0 && (
          <div style={{ fontSize: "8px", color: "#475569", marginTop: "2px" }}>
            Updated {timeAgo(lastFetch)}
          </div>
        )}
      </div>
    </>
  );
}
