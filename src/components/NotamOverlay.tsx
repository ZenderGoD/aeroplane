"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import L from "leaflet";
import { NOTAMS, type Notam } from "@/data/notams";

// ── Severity palette ────────────────────────────────────────────────
const SEVERITY_COLORS: Record<Notam["severity"], string> = {
  critical: "#ef4444",
  warning: "#f59e0b",
  info: "#3b82f6",
};

const SEVERITY_BG: Record<Notam["severity"], string> = {
  critical: "rgba(239,68,68,0.15)",
  warning: "rgba(245,158,11,0.12)",
  info: "rgba(59,130,246,0.10)",
};

// ── Helpers ─────────────────────────────────────────────────────────

/** NM → metres */
function nmToMetres(nm: number): number {
  return nm * 1852;
}

function isActive(n: Notam): boolean {
  const now = Date.now();
  return (
    new Date(n.effectiveFrom).getTime() <= now &&
    new Date(n.effectiveTo).getTime() >= now
  );
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function fmtAlt(ft: number | undefined): string {
  if (ft === undefined) return "N/A";
  if (ft >= 99999) return "UNL";
  return `${ft.toLocaleString()} ft`;
}

function severityRank(s: Notam["severity"]): number {
  return s === "critical" ? 0 : s === "warning" ? 1 : 2;
}

// ── SVG Icons for markers ───────────────────────────────────────────

function tfrIconSvg(color: string, pulse: boolean): string {
  const pulseRing = pulse
    ? `<circle cx="16" cy="16" r="14" fill="none" stroke="${color}" stroke-width="2" opacity="0.5">
         <animate attributeName="r" from="14" to="22" dur="1.5s" repeatCount="indefinite"/>
         <animate attributeName="opacity" from="0.6" to="0" dur="1.5s" repeatCount="indefinite"/>
       </circle>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    ${pulseRing}
    <circle cx="16" cy="16" r="12" fill="${color}" fill-opacity="0.25" stroke="${color}" stroke-width="2"/>
    <text x="16" y="21" text-anchor="middle" font-size="14" font-weight="bold" fill="${color}">!</text>
  </svg>`;
}

function notamIconSvg(color: string, pulse: boolean): string {
  const pulseRing = pulse
    ? `<circle cx="14" cy="14" r="12" fill="none" stroke="${color}" stroke-width="2" opacity="0.5">
         <animate attributeName="r" from="12" to="20" dur="1.5s" repeatCount="indefinite"/>
         <animate attributeName="opacity" from="0.6" to="0" dur="1.5s" repeatCount="indefinite"/>
       </circle>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
    ${pulseRing}
    <rect x="4" y="4" width="20" height="20" rx="4" fill="${color}" fill-opacity="0.2" stroke="${color}" stroke-width="1.5"/>
    <text x="14" y="19" text-anchor="middle" font-size="13" font-weight="bold" fill="${color}">N</text>
  </svg>`;
}

// ── Popup HTML ──────────────────────────────────────────────────────

function popupHtml(n: Notam): string {
  const color = SEVERITY_COLORS[n.severity];
  const active = isActive(n);
  return `
    <div style="min-width:260px;max-width:340px;font-family:ui-monospace,monospace;color:#e2e8f0;line-height:1.45">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0"></span>
        <span style="font-size:11px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:0.05em">${n.type} &mdash; ${n.severity}</span>
        ${active ? '<span style="margin-left:auto;font-size:9px;background:#22c55e;color:#000;padding:1px 6px;border-radius:4px;font-weight:600">ACTIVE</span>' : '<span style="margin-left:auto;font-size:9px;background:#64748b;color:#fff;padding:1px 6px;border-radius:4px;font-weight:600">SCHED</span>'}
      </div>
      <div style="font-size:12px;font-weight:600;margin-bottom:6px">${n.title}</div>
      <div style="font-size:10.5px;color:#94a3b8;margin-bottom:8px">${n.description}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;font-size:10px;color:#cbd5e1">
        <div><span style="color:#64748b">FROM</span><br/>${fmtDate(n.effectiveFrom)}</div>
        <div><span style="color:#64748b">TO</span><br/>${fmtDate(n.effectiveTo)}</div>
        <div><span style="color:#64748b">ALT</span><br/>${fmtAlt(n.lowerAlt)} &ndash; ${fmtAlt(n.upperAlt)}</div>
        ${n.radius ? `<div><span style="color:#64748b">RADIUS</span><br/>${n.radius} NM</div>` : ""}
        ${n.affectedAirport ? `<div><span style="color:#64748b">AIRPORT</span><br/>${n.affectedAirport}</div>` : ""}
      </div>
      <div style="margin-top:8px;font-size:9px;color:#475569">${n.source}</div>
    </div>`;
}

// ── Props ───────────────────────────────────────────────────────────

interface NotamOverlayProps {
  map: L.Map | null;
  visible: boolean;
}

// ── Component ───────────────────────────────────────────────────────

export default function NotamOverlay({ map, visible }: NotamOverlayProps) {
  // Filter state
  const [showTFR, setShowTFR] = useState(true);
  const [showNOTAM, setShowNOTAM] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<Set<Notam["severity"]>>(
    new Set(["critical", "warning", "info"])
  );
  const [activeOnly, setActiveOnly] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Leaflet layer references
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // ── Filtered list ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return NOTAMS.filter((n) => {
      if (n.type === "TFR" && !showTFR) return false;
      if (n.type === "NOTAM" && !showNOTAM) return false;
      if (!severityFilter.has(n.severity)) return false;
      if (activeOnly && !isActive(n)) return false;
      return true;
    }).sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
  }, [showTFR, showNOTAM, severityFilter, activeOnly]);

  // ── Toggle severity ───────────────────────────────────────────────
  const toggleSeverity = useCallback((sev: Notam["severity"]) => {
    setSeverityFilter((prev) => {
      const next = new Set(prev);
      if (next.has(sev)) next.delete(sev);
      else next.add(sev);
      return next;
    });
  }, []);

  // ── Render map layers ─────────────────────────────────────────────
  useEffect(() => {
    if (!map) return;

    // Remove previous layers
    if (layerGroupRef.current) {
      layerGroupRef.current.clearLayers();
      map.removeLayer(layerGroupRef.current);
      layerGroupRef.current = null;
    }

    if (!visible) return;

    const group = L.layerGroup();
    layerGroupRef.current = group;

    for (const n of filtered) {
      const color = SEVERITY_COLORS[n.severity];
      const isCritical = n.severity === "critical";

      // ── TFR zones (circles / polygons) ──────────────────────────
      if (n.type === "TFR") {
        // Zone shape
        if (n.polygon && n.polygon.length > 2) {
          const poly = L.polygon(
            n.polygon.map(([lat, lon]) => [lat, lon] as L.LatLngTuple),
            {
              color,
              weight: 2,
              fillColor: color,
              fillOpacity: 0.12,
              dashArray: "6 4",
              className: isCritical ? "notam-pulse-zone" : undefined,
            }
          );
          poly.bindPopup(popupHtml(n), { className: "notam-popup", maxWidth: 360 });
          poly.on("click", () => setSelectedId(n.id));
          group.addLayer(poly);
        } else if (n.radius) {
          const circle = L.circle([n.location.lat, n.location.lon], {
            radius: nmToMetres(n.radius),
            color,
            weight: 2,
            fillColor: color,
            fillOpacity: 0.1,
            dashArray: "6 4",
            className: isCritical ? "notam-pulse-zone" : undefined,
          });
          circle.bindPopup(popupHtml(n), { className: "notam-popup", maxWidth: 360 });
          circle.on("click", () => setSelectedId(n.id));
          group.addLayer(circle);
        }

        // Centre marker for TFR
        const icon = L.divIcon({
          html: tfrIconSvg(color, isCritical),
          className: "",
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });
        const marker = L.marker([n.location.lat, n.location.lon], { icon });
        marker.bindPopup(popupHtml(n), { className: "notam-popup", maxWidth: 360 });
        marker.on("click", () => setSelectedId(n.id));
        group.addLayer(marker);
      }

      // ── NOTAM point markers ──────────────────────────────────────
      if (n.type === "NOTAM") {
        // Optional radius
        if (n.radius) {
          const circle = L.circle([n.location.lat, n.location.lon], {
            radius: nmToMetres(n.radius),
            color,
            weight: 1.5,
            fillColor: color,
            fillOpacity: 0.07,
            dashArray: "4 3",
          });
          circle.bindPopup(popupHtml(n), { className: "notam-popup", maxWidth: 360 });
          group.addLayer(circle);
        }

        const icon = L.divIcon({
          html: notamIconSvg(color, isCritical),
          className: "",
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        const marker = L.marker([n.location.lat, n.location.lon], { icon });
        marker.bindPopup(popupHtml(n), { className: "notam-popup", maxWidth: 360 });
        marker.on("click", () => setSelectedId(n.id));
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
  }, [map, visible, filtered]);

  // ── Pan to selected NOTAM ─────────────────────────────────────────
  useEffect(() => {
    if (!map || !selectedId) return;
    const n = NOTAMS.find((x) => x.id === selectedId);
    if (n) {
      map.flyTo([n.location.lat, n.location.lon], Math.max(map.getZoom(), 8), {
        duration: 0.8,
      });
    }
  }, [map, selectedId]);

  // ── Early exit ────────────────────────────────────────────────────
  if (!visible) return null;

  // ── Counts ────────────────────────────────────────────────────────
  const tfrCount = filtered.filter((n) => n.type === "TFR").length;
  const notamCount = filtered.filter((n) => n.type === "NOTAM").length;
  const criticalCount = filtered.filter((n) => n.severity === "critical").length;

  return (
    <>
      {/* ── Inject pulsing keyframe animation ────────────────────── */}
      <style jsx global>{`
        .notam-popup .leaflet-popup-content-wrapper {
          background: #0f172a !important;
          border: 1px solid rgba(148, 163, 184, 0.15) !important;
          border-radius: 12px !important;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5) !important;
        }
        .notam-popup .leaflet-popup-tip {
          background: #0f172a !important;
          border: 1px solid rgba(148, 163, 184, 0.1) !important;
        }
        .notam-popup .leaflet-popup-close-button {
          color: #94a3b8 !important;
        }
        @keyframes notam-zone-pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        .notam-pulse-zone {
          animation: notam-zone-pulse 2s ease-in-out infinite;
        }
      `}</style>

      {/* ── Side panel ───────────────────────────────────────────── */}
      <div
        className={`absolute top-14 right-2 z-[1000] flex flex-col transition-all duration-300 ${
          panelOpen ? "w-80" : "w-10"
        }`}
      >
        {/* Collapse toggle */}
        <button
          onClick={() => setPanelOpen((o) => !o)}
          className="self-end mb-1 w-8 h-8 rounded-lg bg-gray-900/90 backdrop-blur border border-gray-700/60 flex items-center justify-center text-gray-400 hover:text-gray-200 transition-colors text-xs"
          title={panelOpen ? "Collapse NOTAM panel" : "Expand NOTAM panel"}
        >
          {panelOpen ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {panelOpen && (
          <div className="bg-[#0c1018]/95 backdrop-blur-xl border border-gray-700/40 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-120px)]">
            {/* ── Header ─────────────────────────────────────────── */}
            <div className="px-4 py-3 border-b border-gray-700/30">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <h3 className="text-sm font-semibold text-gray-100 tracking-wide">
                  NOTAM / TFR Overlay
                </h3>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-gray-400 font-mono">
                <span>
                  <span className="text-red-400 font-bold">{tfrCount}</span> TFR
                </span>
                <span>
                  <span className="text-amber-400 font-bold">{notamCount}</span> NOTAM
                </span>
                {criticalCount > 0 && (
                  <span className="text-red-400 font-bold animate-pulse">
                    {criticalCount} CRITICAL
                  </span>
                )}
              </div>
            </div>

            {/* ── Filters ────────────────────────────────────────── */}
            <div className="px-4 py-2.5 border-b border-gray-700/20 flex flex-wrap gap-1.5">
              {/* Type toggles */}
              <button
                onClick={() => setShowTFR((v) => !v)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                  showTFR
                    ? "bg-red-500/20 border-red-500/40 text-red-300"
                    : "bg-gray-800/40 border-gray-700/30 text-gray-500"
                }`}
              >
                TFR
              </button>
              <button
                onClick={() => setShowNOTAM((v) => !v)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                  showNOTAM
                    ? "bg-blue-500/20 border-blue-500/40 text-blue-300"
                    : "bg-gray-800/40 border-gray-700/30 text-gray-500"
                }`}
              >
                NOTAM
              </button>

              <div className="w-px h-4 bg-gray-700/40 mx-0.5" />

              {/* Severity toggles */}
              {(["critical", "warning", "info"] as const).map((sev) => (
                <button
                  key={sev}
                  onClick={() => toggleSeverity(sev)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                    severityFilter.has(sev)
                      ? `border-current`
                      : "bg-gray-800/40 border-gray-700/30 text-gray-500"
                  }`}
                  style={
                    severityFilter.has(sev)
                      ? {
                          background: SEVERITY_BG[sev],
                          borderColor: SEVERITY_COLORS[sev] + "66",
                          color: SEVERITY_COLORS[sev],
                        }
                      : undefined
                  }
                >
                  {sev.toUpperCase()}
                </button>
              ))}

              <div className="w-px h-4 bg-gray-700/40 mx-0.5" />

              {/* Active only */}
              <button
                onClick={() => setActiveOnly((v) => !v)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                  activeOnly
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                    : "bg-gray-800/40 border-gray-700/30 text-gray-500"
                }`}
              >
                ACTIVE ONLY
              </button>
            </div>

            {/* ── List ────────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {filtered.length === 0 && (
                <div className="px-4 py-8 text-center text-xs text-gray-500">
                  No NOTAMs match the current filters.
                </div>
              )}
              {filtered.map((n) => {
                const color = SEVERITY_COLORS[n.severity];
                const active = isActive(n);
                const isSelected = n.id === selectedId;
                return (
                  <button
                    key={n.id}
                    onClick={() => setSelectedId(n.id)}
                    className={`w-full text-left px-4 py-2.5 border-b border-gray-700/15 transition-colors hover:bg-white/[0.03] ${
                      isSelected ? "bg-white/[0.06]" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          n.severity === "critical" ? "animate-pulse" : ""
                        }`}
                        style={{ background: color }}
                      />
                      <span
                        className="text-[9px] font-bold tracking-wider"
                        style={{ color }}
                      >
                        {n.type}
                      </span>
                      <span className="text-[9px] text-gray-500 font-mono">
                        {n.id}
                      </span>
                      {active && (
                        <span className="ml-auto text-[8px] bg-emerald-500/20 text-emerald-400 px-1.5 py-px rounded font-semibold">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-200 font-medium leading-tight line-clamp-2 mb-1">
                      {n.title}
                    </div>
                    <div className="flex items-center gap-2 text-[9px] text-gray-500 font-mono">
                      {n.affectedAirport && (
                        <span className="text-sky-400">{n.affectedAirport}</span>
                      )}
                      <span>{fmtDate(n.effectiveFrom).split(",")[0]}</span>
                      {n.radius && <span>{n.radius} NM</span>}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* ── Footer ─────────────────────────────────────────── */}
            <div className="px-4 py-2 border-t border-gray-700/20 text-[9px] text-gray-600 font-mono">
              {filtered.length} of {NOTAMS.length} items shown
            </div>
          </div>
        )}
      </div>
    </>
  );
}
