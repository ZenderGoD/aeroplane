"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

// ── Types ────────────────────────────────────────────────────────────

interface MetarCloud {
  cover: string;
  base: number | null;
}

interface MetarStation {
  icaoId: string;
  rawOb: string;
  temp: number | null;
  dewp: number | null;
  wdir: number | null;
  wspd: number | null;
  wgst: number | null;
  visib: number | null;
  altim: number | null;
  fltcat: "VFR" | "MVFR" | "IFR" | "LIFR" | null;
  clouds: MetarCloud[];
  lat: number;
  lon: number;
  elev: number | null;
  reportTime: string;
  name: string | null;
}

interface MetarOverlayProps {
  visible: boolean;
}

// ── Flight Category Colors ───────────────────────────────────────────

const FLTCAT_COLORS: Record<string, string> = {
  VFR: "#34d399",
  MVFR: "#60a5fa",
  IFR: "#ef4444",
  LIFR: "#e879f9",
};

const FLTCAT_LABELS: Record<string, string> = {
  VFR: "Visual Flight Rules",
  MVFR: "Marginal VFR",
  IFR: "Instrument Flight Rules",
  LIFR: "Low IFR",
};

function getFltCatColor(cat: string | null): string {
  return FLTCAT_COLORS[cat ?? ""] ?? "#94a3b8";
}

// ── Wind Barb SVG Generator ─────────────────────────────────────────

function windBarbSvg(wdir: number | null, wspd: number | null): string | null {
  if (wdir === null || wspd === null || wspd < 1) return null;

  const stemLen = 40;
  const barbSpacing = 6;
  const shortBarbLen = 10;
  const longBarbLen = 18;
  const flagLen = 18;

  // Build barb elements — drawn from the top of the stem downward
  let remaining = wspd;
  const elements: string[] = [];
  let yPos = 4; // start near the top

  // 50-knot flags (pennants)
  while (remaining >= 50) {
    elements.push(
      `<polygon points="0,${yPos} ${flagLen},${yPos + barbSpacing / 2} 0,${yPos + barbSpacing}" fill="rgba(255,255,255,0.6)" stroke="none"/>`
    );
    yPos += barbSpacing + 2;
    remaining -= 50;
  }

  // 10-knot long barbs
  while (remaining >= 10) {
    elements.push(
      `<line x1="0" y1="${yPos}" x2="${longBarbLen}" y2="${yPos - 3}" stroke="rgba(255,255,255,0.6)" stroke-width="2" stroke-linecap="round"/>`
    );
    yPos += barbSpacing;
    remaining -= 10;
  }

  // 5-knot short barbs
  if (remaining >= 5) {
    elements.push(
      `<line x1="0" y1="${yPos}" x2="${shortBarbLen}" y2="${yPos - 2}" stroke="rgba(255,255,255,0.6)" stroke-width="2" stroke-linecap="round"/>`
    );
  }

  // Stem line
  elements.push(
    `<line x1="0" y1="4" x2="0" y2="${stemLen}" stroke="rgba(255,255,255,0.6)" stroke-width="2" stroke-linecap="round"/>`
  );

  // Meteorological wind direction: wind FROM that direction
  // Rotate so barbs point into the wind (barb points toward where wind comes from)
  const rotation = wdir;
  const svgSize = stemLen + 12;
  const cx = svgSize / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${svgSize}" height="${svgSize}" viewBox="0 0 ${svgSize} ${svgSize}">
    <g transform="translate(${cx}, ${cx}) rotate(${rotation})">
      ${elements.join("\n      ")}
    </g>
  </svg>`;
}

// ── Popup HTML ───────────────────────────────────────────────────────

function popupHtml(s: MetarStation): string {
  const catColor = getFltCatColor(s.fltcat);
  const catLabel = s.fltcat ?? "N/A";

  const windStr = s.wdir !== null && s.wspd !== null
    ? `${String(s.wdir).padStart(3, "0")}° @ ${s.wspd}kt${s.wgst ? ` G${s.wgst}kt` : ""}`
    : "Calm / N/A";

  const visStr = s.visib !== null ? `${s.visib} SM` : "N/A";
  const altStr = s.altim !== null ? `${s.altim.toFixed(2)} inHg` : "N/A";

  const cloudStr = s.clouds.length > 0
    ? s.clouds
        .map((c) => `${c.cover}${c.base !== null ? ` ${(c.base * 100).toLocaleString()}ft` : ""}`)
        .join(", ")
    : "CLR";

  const tempStr = s.temp !== null ? `${s.temp}°C` : "N/A";
  const dewStr = s.dewp !== null ? `${s.dewp}°C` : "N/A";

  const reported = s.reportTime
    ? new Date(s.reportTime).toLocaleString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
        month: "short",
        day: "numeric",
      })
    : "N/A";

  return `
    <div style="min-width:280px;max-width:380px;font-family:ui-sans-serif,system-ui,sans-serif;color:var(--text-primary, #f1f5f9);line-height:1.5">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="font-size:15px;font-weight:700;letter-spacing:0.02em">${s.icaoId}</span>
        <span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;letter-spacing:0.05em;background:${catColor};color:#000">${catLabel}</span>
        ${s.name ? `<span style="font-size:11px;color:var(--text-muted, #64748b);margin-left:auto">${s.name}</span>` : ""}
      </div>
      <div style="background:var(--surface-0, #06080d);border:1px solid var(--border-default, rgba(148,163,184,0.10));border-radius:6px;padding:8px 10px;margin-bottom:10px;font-family:ui-monospace,SFMono-Regular,monospace;font-size:11px;color:var(--text-secondary, #cbd5e1);word-break:break-all;line-height:1.6">${s.rawOb}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 16px;font-size:11.5px">
        <div><span style="color:var(--text-muted, #64748b);font-size:10px;text-transform:uppercase;letter-spacing:0.04em">Temp / Dewpt</span><br/>${tempStr} / ${dewStr}</div>
        <div><span style="color:var(--text-muted, #64748b);font-size:10px;text-transform:uppercase;letter-spacing:0.04em">Wind</span><br/>${windStr}</div>
        <div><span style="color:var(--text-muted, #64748b);font-size:10px;text-transform:uppercase;letter-spacing:0.04em">Visibility</span><br/>${visStr}</div>
        <div><span style="color:var(--text-muted, #64748b);font-size:10px;text-transform:uppercase;letter-spacing:0.04em">Altimeter</span><br/>${altStr}</div>
        <div style="grid-column:span 2"><span style="color:var(--text-muted, #64748b);font-size:10px;text-transform:uppercase;letter-spacing:0.04em">Clouds</span><br/>${cloudStr}</div>
      </div>
      <div style="margin-top:8px;font-size:9px;color:var(--text-faint, #475569)">Reported ${reported}</div>
    </div>`;
}

// ── Component ────────────────────────────────────────────────────────

export default function MetarOverlay({ visible }: MetarOverlayProps) {
  const map = useMap();
  const [stations, setStations] = useState<MetarStation[]>([]);
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState<number>(map.getZoom());

  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const barbLayerRef = useRef<L.LayerGroup | null>(null);
  const labelLayerRef = useRef<L.LayerGroup | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch METARs for current viewport ─────────────────────────────

  const fetchMetars = useCallback(async () => {
    if (!map) return;

    const currentZoom = map.getZoom();
    setZoom(currentZoom);

    if (currentZoom < 5) {
      setStations([]);
      return;
    }

    // Abort any in-flight request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const bounds = map.getBounds();
    const lamin = bounds.getSouth().toFixed(4);
    const lomin = bounds.getWest().toFixed(4);
    const lamax = bounds.getNorth().toFixed(4);
    const lomax = bounds.getEast().toFixed(4);

    setLoading(true);

    try {
      const res = await fetch(
        `/api/metar?bbox=${lamin},${lomin},${lamax},${lomax}`,
        { signal: controller.signal }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!controller.signal.aborted) {
        setStations(data.stations ?? []);
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("[MetarOverlay] fetch error:", err);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [map]);

  // ── Debounced fetch on map move ────────────────────────────────────

  useEffect(() => {
    if (!visible || !map) return;

    fetchMetars();

    const handleMove = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setZoom(map.getZoom());
        fetchMetars();
      }, 1000);
    };

    map.on("moveend", handleMove);
    map.on("zoomend", handleMove);

    return () => {
      map.off("moveend", handleMove);
      map.off("zoomend", handleMove);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [visible, map, fetchMetars]);

  // ── Render Leaflet layers ──────────────────────────────────────────

  useEffect(() => {
    if (!map) return;

    // Clean up previous layers
    if (layerGroupRef.current) {
      layerGroupRef.current.clearLayers();
      map.removeLayer(layerGroupRef.current);
      layerGroupRef.current = null;
    }
    if (barbLayerRef.current) {
      barbLayerRef.current.clearLayers();
      map.removeLayer(barbLayerRef.current);
      barbLayerRef.current = null;
    }
    if (labelLayerRef.current) {
      labelLayerRef.current.clearLayers();
      map.removeLayer(labelLayerRef.current);
      labelLayerRef.current = null;
    }

    if (!visible || zoom < 5 || stations.length === 0) return;

    const stationGroup = L.layerGroup();
    const barbGroup = L.layerGroup();
    const labelGroup = L.layerGroup();

    const currentZoom = map.getZoom();

    for (const s of stations) {
      const color = getFltCatColor(s.fltcat);
      const latlng: L.LatLngExpression = [s.lat, s.lon];

      // Station circle marker
      const circle = L.circleMarker(latlng, {
        radius: 8,
        fillColor: color,
        fillOpacity: 0.85,
        color: color,
        weight: 2,
        opacity: 0.9,
      });

      circle.bindPopup(popupHtml(s), {
        className: "metar-popup",
        maxWidth: 400,
        closeButton: true,
      });

      stationGroup.addLayer(circle);

      // Wind barb
      const barbSvg = windBarbSvg(s.wdir, s.wspd);
      if (barbSvg) {
        const barbIcon = L.divIcon({
          html: barbSvg,
          className: "metar-wind-barb",
          iconSize: [52, 52],
          iconAnchor: [26, 26],
        });
        const barbMarker = L.marker(latlng, {
          icon: barbIcon,
          interactive: false,
          zIndexOffset: -100,
        });
        barbGroup.addLayer(barbMarker);
      }

      // ICAO label (only at zoom >= 7)
      if (currentZoom >= 7) {
        const labelIcon = L.divIcon({
          html: `<div style="
            font-family:ui-monospace,SFMono-Regular,monospace;
            font-size:10px;
            font-weight:600;
            color:var(--text-secondary, #cbd5e1);
            text-align:center;
            text-shadow:0 1px 3px rgba(0,0,0,0.8);
            white-space:nowrap;
            pointer-events:none;
          ">${s.icaoId}</div>`,
          className: "metar-label",
          iconSize: [50, 14],
          iconAnchor: [25, -10],
        });
        const labelMarker = L.marker(latlng, {
          icon: labelIcon,
          interactive: false,
          zIndexOffset: -200,
        });
        labelGroup.addLayer(labelMarker);
      }
    }

    stationGroup.addTo(map);
    barbGroup.addTo(map);
    labelGroup.addTo(map);

    layerGroupRef.current = stationGroup;
    barbLayerRef.current = barbGroup;
    labelLayerRef.current = labelGroup;

    return () => {
      if (layerGroupRef.current) {
        map.removeLayer(layerGroupRef.current);
        layerGroupRef.current = null;
      }
      if (barbLayerRef.current) {
        map.removeLayer(barbLayerRef.current);
        barbLayerRef.current = null;
      }
      if (labelLayerRef.current) {
        map.removeLayer(labelLayerRef.current);
        labelLayerRef.current = null;
      }
    };
  }, [map, visible, stations, zoom]);

  // ── Clear layers when hidden ───────────────────────────────────────

  useEffect(() => {
    if (!visible && map) {
      if (layerGroupRef.current) {
        map.removeLayer(layerGroupRef.current);
        layerGroupRef.current = null;
      }
      if (barbLayerRef.current) {
        map.removeLayer(barbLayerRef.current);
        barbLayerRef.current = null;
      }
      if (labelLayerRef.current) {
        map.removeLayer(labelLayerRef.current);
        labelLayerRef.current = null;
      }
      setStations([]);
    }
  }, [visible, map]);

  // ── Render UI overlay (legend + zoom message) ──────────────────────

  if (!visible) return null;

  return (
    <>
      {/* Zoom-in message */}
      {zoom < 5 && (
        <div
          style={{
            position: "absolute",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            background: "var(--surface-2, #111827)",
            border: "1px solid var(--border-default, rgba(148,163,184,0.10))",
            borderRadius: 8,
            padding: "8px 16px",
            fontSize: 12,
            color: "var(--text-muted, #64748b)",
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
          Zoom in for METAR weather data
        </div>
      )}

      {/* Loading indicator */}
      {loading && zoom >= 5 && (
        <div
          style={{
            position: "absolute",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            background: "var(--surface-2, #111827)",
            border: "1px solid var(--border-accent, rgba(56,189,248,0.20))",
            borderRadius: 8,
            padding: "6px 14px",
            fontSize: 11,
            color: "var(--accent-primary, #38bdf8)",
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
            pointerEvents: "none",
          }}
        >
          Loading METARs...
        </div>
      )}

      {/* Flight category legend */}
      <div
        style={{
          position: "absolute",
          bottom: 32,
          right: 12,
          zIndex: 1000,
          background: "var(--surface-1, #0c1018)",
          border: "1px solid var(--border-default, rgba(148,163,184,0.10))",
          borderRadius: 8,
          padding: "10px 14px",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          pointerEvents: "auto",
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "var(--text-muted, #64748b)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 6,
          }}
        >
          Flight Category
        </div>
        {(["VFR", "MVFR", "IFR", "LIFR"] as const).map((cat) => (
          <div
            key={cat}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 3,
              fontSize: 11,
              color: "var(--text-secondary, #cbd5e1)",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: FLTCAT_COLORS[cat],
                flexShrink: 0,
              }}
            />
            <span style={{ fontWeight: 600 }}>{cat}</span>
            <span style={{ color: "var(--text-muted, #64748b)", fontSize: 10 }}>
              {FLTCAT_LABELS[cat]}
            </span>
          </div>
        ))}
        {stations.length > 0 && zoom >= 5 && (
          <div
            style={{
              marginTop: 6,
              paddingTop: 6,
              borderTop: "1px solid var(--border-subtle, rgba(148,163,184,0.06))",
              fontSize: 10,
              color: "var(--text-faint, #475569)",
            }}
          >
            {stations.length} station{stations.length !== 1 ? "s" : ""} reporting
          </div>
        )}
      </div>

      {/* Popup styling */}
      <style>{`
        .metar-popup .leaflet-popup-content-wrapper {
          background: var(--surface-1, #0c1018);
          border: 1px solid var(--border-default, rgba(148,163,184,0.10));
          border-radius: 10px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
          color: var(--text-primary, #f1f5f9);
        }
        .metar-popup .leaflet-popup-tip {
          background: var(--surface-1, #0c1018);
          border: 1px solid var(--border-default, rgba(148,163,184,0.10));
        }
        .metar-popup .leaflet-popup-close-button {
          color: var(--text-muted, #64748b) !important;
          font-size: 18px !important;
          top: 6px !important;
          right: 8px !important;
        }
        .metar-popup .leaflet-popup-close-button:hover {
          color: var(--text-primary, #f1f5f9) !important;
        }
        .metar-wind-barb {
          background: transparent !important;
          border: none !important;
        }
        .metar-label {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
    </>
  );
}
