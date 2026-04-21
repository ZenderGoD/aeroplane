"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

// ---------------------------------------------------------------------------
// Terrain tile sources
// ---------------------------------------------------------------------------

type TerrainMode = "relief" | "topo" | "satellite";

interface TileSource {
  label: string;
  url: string;
  attribution: string;
  opacity: number;
  maxZoom: number;
}

const TILE_SOURCES: Record<TerrainMode, TileSource> = {
  relief: {
    label: "Relief",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Tiles &copy; Esri &mdash; Source: Esri",
    opacity: 0.35,
    maxZoom: 13,
  },
  topo: {
    label: "Topo",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution:
      'Map data: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
    opacity: 0.35,
    maxZoom: 17,
  },
  satellite: {
    label: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics",
    opacity: 0.4,
    maxZoom: 19,
  },
};

// ---------------------------------------------------------------------------
// Elevation cache
// ---------------------------------------------------------------------------

const elevationCache = new Map<string, number>();

function cacheKey(lat: number, lon: number): string {
  // Round to ~100m grid to allow some reuse
  return `${lat.toFixed(3)},${lon.toFixed(3)}`;
}

async function fetchElevation(
  lat: number,
  lon: number
): Promise<number | null> {
  const key = cacheKey(lat, lon);
  if (elevationCache.has(key)) return elevationCache.get(key)!;

  try {
    const res = await fetch(
      `https://api.open-elevation.com/api/v1/lookup?locations=${lat.toFixed(
        6
      )},${lon.toFixed(6)}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const elev: number | undefined = data?.results?.[0]?.elevation;
    if (elev !== undefined && elev !== null) {
      elevationCache.set(key, elev);
      return elev;
    }
    return null;
  } catch {
    return null;
  }
}

function metersToFeet(m: number): number {
  return Math.round(m * 3.28084);
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TerrainOverlayProps {
  visible: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TerrainOverlay({ visible }: TerrainOverlayProps) {
  const map = useMap();
  const [mode, setMode] = useState<TerrainMode>("relief");
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const popupRef = useRef<L.Popup | null>(null);
  const [fetchingElevation, setFetchingElevation] = useState(false);

  // -- Manage tile layer lifecycle ------------------------------------------

  const addTileLayer = useCallback(
    (m: TerrainMode) => {
      // Remove existing layer first
      if (tileLayerRef.current) {
        map.removeLayer(tileLayerRef.current);
        tileLayerRef.current = null;
      }

      const src = TILE_SOURCES[m];
      const layer = L.tileLayer(src.url, {
        attribution: src.attribution,
        opacity: src.opacity,
        maxZoom: src.maxZoom,
        zIndex: 250, // above base, below markers
      });

      layer.addTo(map);

      // Apply mix-blend-mode on the tile container for better blending
      layer.on("load", () => {
        const container = layer.getContainer?.();
        if (container) {
          container.style.mixBlendMode = m === "satellite" ? "normal" : "screen";
          container.style.pointerEvents = "none";
        }
      });

      // Also try immediately in case tiles already loaded
      requestAnimationFrame(() => {
        const container = layer.getContainer?.();
        if (container) {
          container.style.mixBlendMode = m === "satellite" ? "normal" : "screen";
          container.style.pointerEvents = "none";
        }
      });

      tileLayerRef.current = layer;
    },
    [map]
  );

  const removeTileLayer = useCallback(() => {
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }
  }, [map]);

  // -- Add/remove when visible or mode changes -----------------------------

  useEffect(() => {
    if (visible) {
      addTileLayer(mode);
    } else {
      removeTileLayer();
    }

    return () => {
      removeTileLayer();
    };
  }, [visible, mode, addTileLayer, removeTileLayer]);

  // -- Click handler for elevation lookup -----------------------------------

  const handleMapClick = useCallback(
    async (e: L.LeafletMouseEvent) => {
      if (!visible) return;

      const { lat, lng: lon } = e.latlng;

      // Remove previous popup
      if (popupRef.current) {
        map.closePopup(popupRef.current);
        popupRef.current = null;
      }

      // Show loading popup
      const popup = L.popup({
        className: "terrain-elevation-popup",
        closeButton: true,
        maxWidth: 200,
        offset: [0, -4],
      })
        .setLatLng(e.latlng)
        .setContent(
          `<div style="font-family:ui-monospace,monospace;font-size:11px;color:#94a3b8;padding:2px 0">
            <span style="display:inline-block;width:10px;height:10px;border:2px solid #94a3b8;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;vertical-align:middle;margin-right:6px"></span>
            Fetching elevation...
          </div>`
        )
        .openOn(map);

      popupRef.current = popup;
      setFetchingElevation(true);

      const elevation = await fetchElevation(lat, lon);
      setFetchingElevation(false);

      // Popup may have been closed in the meantime
      if (!popupRef.current) return;

      if (elevation !== null) {
        const ft = metersToFeet(elevation);
        popup.setContent(
          `<div style="font-family:ui-monospace,monospace;font-size:11px;color:#e2e8f0;padding:2px 0;line-height:1.6">
            <div style="font-weight:700;font-size:12px;color:#f1f5f9;margin-bottom:2px">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px"><path d="M8 3l4 4 4-4"/><path d="M4 11l4-4 4 4 4-4 4 4"/><path d="M2 19l4-4 4 4 4-4 4 4 4-4"/></svg>
              Elevation
            </div>
            <div style="display:grid;grid-template-columns:auto 1fr;gap:2px 8px;font-size:10.5px">
              <span style="color:#9ca3af">Feet</span>
              <span style="font-weight:600;color:#94a3b8">${ft.toLocaleString()} ft</span>
              <span style="color:#9ca3af">Meters</span>
              <span style="font-weight:600;color:#94a3b8">${Math.round(elevation).toLocaleString()} m</span>
              <span style="color:#9ca3af">Coords</span>
              <span style="color:#94a3b8;font-size:9px">${lat.toFixed(4)}, ${lon.toFixed(4)}</span>
            </div>
          </div>`
        );
      } else {
        popup.setContent(
          `<div style="font-family:ui-monospace,monospace;font-size:11px;color:#e2e8f0;padding:2px 0">
            Elevation data unavailable
          </div>`
        );
      }
    },
    [visible, map]
  );

  // -- Bind/unbind click listener -------------------------------------------

  useEffect(() => {
    if (visible) {
      map.on("click", handleMapClick);
    }

    return () => {
      map.off("click", handleMapClick);
      if (popupRef.current) {
        map.closePopup(popupRef.current);
        popupRef.current = null;
      }
    };
  }, [visible, map, handleMapClick]);

  // -- Cleanup on unmount ---------------------------------------------------

  useEffect(() => {
    return () => {
      removeTileLayer();
      if (popupRef.current) {
        map.closePopup(popupRef.current);
        popupRef.current = null;
      }
    };
  }, [map, removeTileLayer]);

  // -- Render ---------------------------------------------------------------

  if (!visible) return null;

  return (
    <>
      {/* Popup styling */}
      <style jsx global>{`
        .terrain-elevation-popup .leaflet-popup-content-wrapper {
          background: #0f0f0f !important;
          border: 1px solid rgba(148, 163, 184, 0.15) !important;
          border-radius: 10px !important;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5) !important;
        }
        .terrain-elevation-popup .leaflet-popup-tip {
          background: #0f0f0f !important;
          border: 1px solid rgba(148, 163, 184, 0.1) !important;
        }
        .terrain-elevation-popup .leaflet-popup-close-button {
          color: #94a3b8 !important;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>

      {/* Terrain type selector panel */}
      <div
        className="absolute bottom-28 right-4 z-[800] flex flex-col gap-2"
        style={{ pointerEvents: "auto" }}
      >
        {/* Mode selector */}
        <div className="bg-[#0a0a0a]/90 backdrop-blur-xl border border-gray-700/40 rounded-lg px-1.5 py-1.5 flex items-center gap-1 shadow-2xl">
          {(Object.entries(TILE_SOURCES) as [TerrainMode, TileSource][]).map(
            ([key, src]) => (
              <button
                key={key}
                onClick={() => setMode(key)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all duration-200 ${
                  mode === key
                    ? "bg-slate-600/80 text-white shadow-lg shadow-slate-900/30"
                    : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
                }`}
              >
                {src.label}
              </button>
            )
          )}
        </div>

        {/* Info line */}
        <div className="bg-[#0a0a0a]/90 backdrop-blur-xl border border-gray-700/40 rounded-lg px-3 py-1.5 shadow-2xl">
          <div className="flex items-center gap-2 text-[11px] text-gray-500 font-mono">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-slate-500"
            >
              <path d="M8 3l4 4 4-4" />
              <path d="M4 11l4-4 4 4 4-4 4 4" />
              <path d="M2 19l4-4 4 4 4-4 4 4 4-4" />
            </svg>
            <span>
              TERRAIN &middot;{" "}
              {TILE_SOURCES[mode].label.toUpperCase()}
            </span>
            {fetchingElevation && (
              <span className="text-slate-400 animate-pulse">
                QUERYING
              </span>
            )}
          </div>
          <div className="text-[8px] text-gray-600 mt-0.5">
            Click map to query elevation
          </div>
        </div>
      </div>
    </>
  );
}
