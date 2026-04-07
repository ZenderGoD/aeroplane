"use client";

import { useEffect, useMemo, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import type { FlightState } from "@/types/flight";
import type { FlightHistoryMap } from "@/lib/flightHistory";

interface Props {
  visible: boolean;
  flights: FlightState[];
  flightHistory: FlightHistoryMap;
}

const GRID_SIZE = 0.5;

interface GridCell {
  row: number;
  col: number;
  count: number;
}

interface RouteSegment {
  from: [number, number];
  to: [number, number];
  key: string;
  count: number;
}

function getDensityColor(count: number): string {
  if (count >= 16) return "rgba(226, 232, 240, 0.5)";
  if (count >= 9) return "rgba(148, 163, 184, 0.4)";
  if (count >= 4) return "rgba(148, 163, 184, 0.3)";
  return "rgba(203, 213, 225, 0.15)";
}

function getSegmentColor(rank: number, total: number): string {
  const t = total > 1 ? rank / (total - 1) : 0;
  // Interpolate from slate-300 to slate-500 (monochromatic)
  const r = Math.round(203 + (100 - 203) * t);
  const g = Math.round(213 + (116 - 213) * t);
  const b = Math.round(225 + (139 - 225) * t);
  return `rgba(${r}, ${g}, ${b}, 0.4)`;
}

function toGridKey(lat: number, lon: number): string {
  const row = Math.floor(lat / GRID_SIZE);
  const col = Math.floor(lon / GRID_SIZE);
  return `${row}:${col}`;
}

function toSegmentKey(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): string {
  const r1 = Math.floor(lat1 / GRID_SIZE);
  const c1 = Math.floor(lon1 / GRID_SIZE);
  const r2 = Math.floor(lat2 / GRID_SIZE);
  const c2 = Math.floor(lon2 / GRID_SIZE);
  // Normalize so the key is direction-independent
  if (r1 < r2 || (r1 === r2 && c1 <= c2)) {
    return `${r1},${c1}->${r2},${c2}`;
  }
  return `${r2},${c2}->${r1},${c1}`;
}

export default function RouteDensityOverlay({
  visible,
  flights,
  flightHistory,
}: Props) {
  const map = useMap();
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const legendRef = useRef<HTMLDivElement | null>(null);

  const historySize = flightHistory.size;

  const { gridCells, topSegments } = useMemo(() => {
    if (!visible || historySize === 0) {
      return { gridCells: [] as GridCell[], topSegments: [] as RouteSegment[] };
    }

    const cellCounts = new Map<string, number>();
    const segmentCounts = new Map<
      string,
      { from: [number, number]; to: [number, number]; count: number }
    >();

    for (const [, entries] of flightHistory) {
      if (entries.length < 2) continue;

      for (let i = 0; i < entries.length - 1; i++) {
        const a = entries[i];
        const b = entries[i + 1];

        // Count grid cells touched by this segment (just endpoints for perf)
        const keyA = toGridKey(a.lat, a.lon);
        const keyB = toGridKey(b.lat, b.lon);
        cellCounts.set(keyA, (cellCounts.get(keyA) ?? 0) + 1);
        if (keyB !== keyA) {
          cellCounts.set(keyB, (cellCounts.get(keyB) ?? 0) + 1);
        }

        // Count route segments between grid cells
        const segKey = toSegmentKey(a.lat, a.lon, b.lat, b.lon);
        const existing = segmentCounts.get(segKey);
        if (existing) {
          existing.count += 1;
        } else {
          segmentCounts.set(segKey, {
            from: [a.lat, a.lon],
            to: [b.lat, b.lon],
            count: 1,
          });
        }
      }
    }

    // Build sparse grid cells
    const cells: GridCell[] = [];
    for (const [key, count] of cellCounts) {
      const [rowStr, colStr] = key.split(":");
      cells.push({
        row: parseInt(rowStr, 10),
        col: parseInt(colStr, 10),
        count,
      });
    }

    // Get top 20 busiest route segments
    const allSegments = Array.from(segmentCounts.entries())
      .map(([key, val]) => ({
        key,
        from: val.from,
        to: val.to,
        count: val.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    return { gridCells: cells, topSegments: allSegments };
  }, [visible, historySize, flightHistory]);

  // Render layers on the map
  useEffect(() => {
    if (!map) return;

    // Clean up previous layers
    if (layerGroupRef.current) {
      layerGroupRef.current.clearLayers();
      map.removeLayer(layerGroupRef.current);
      layerGroupRef.current = null;
    }

    if (!visible || gridCells.length === 0) return;

    const group = L.layerGroup();
    layerGroupRef.current = group;

    // Draw density rectangles
    for (const cell of gridCells) {
      const south = cell.row * GRID_SIZE;
      const west = cell.col * GRID_SIZE;
      const north = south + GRID_SIZE;
      const east = west + GRID_SIZE;

      const rect = L.rectangle(
        [
          [south, west],
          [north, east],
        ],
        {
          fillColor: getDensityColor(cell.count),
          fillOpacity: 1,
          stroke: false,
          interactive: false,
        }
      );
      // Override fill with the rgba color directly for proper opacity
      rect.setStyle({ fillColor: getDensityColor(cell.count), fillOpacity: 1 });
      group.addLayer(rect);
    }

    // Draw top route segments as polylines
    const segmentCount = topSegments.length;
    for (let i = 0; i < segmentCount; i++) {
      const seg = topSegments[i];
      // Rank: 0 = busiest, segmentCount-1 = least busy of the top 20
      const rank = i;
      const weight = 6 - (rank / Math.max(segmentCount - 1, 1)) * 4; // 6px down to 2px

      const polyline = L.polyline([seg.from, seg.to], {
        color: getSegmentColor(rank, segmentCount),
        weight,
        opacity: 1,
        smoothFactor: 1.5,
        interactive: false,
      });
      group.addLayer(polyline);
    }

    group.addTo(map);

    return () => {
      if (layerGroupRef.current) {
        layerGroupRef.current.clearLayers();
        map.removeLayer(layerGroupRef.current);
        layerGroupRef.current = null;
      }
    };
  }, [map, visible, gridCells, topSegments]);

  // Legend management
  useEffect(() => {
    if (!map) return;

    if (legendRef.current) {
      legendRef.current.remove();
      legendRef.current = null;
    }

    if (!visible) return;

    const container = map.getContainer();
    const legend = document.createElement("div");
    legend.setAttribute("aria-label", "Route density legend");
    legendRef.current = legend;

    Object.assign(legend.style, {
      position: "absolute",
      bottom: "24px",
      right: "12px",
      zIndex: "1000",
      padding: "10px 14px",
      background: "rgba(10, 10, 10, 0.75)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      borderRadius: "10px",
      border: "1px solid rgba(148, 163, 184, 0.2)",
      color: "#e2e8f0",
      fontSize: "11px",
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      lineHeight: "1.5",
      pointerEvents: "none",
      boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
    });

    const title = document.createElement("div");
    title.textContent = "Route Density";
    Object.assign(title.style, {
      fontWeight: "600",
      fontSize: "12px",
      marginBottom: "6px",
      color: "#f1f5f9",
    });
    legend.appendChild(title);

    const levels = [
      { color: "rgba(203, 213, 225, 0.6)", label: "Low (1-3)" },
      { color: "rgba(148, 163, 184, 0.7)", label: "Medium (4-8)" },
      { color: "rgba(148, 163, 184, 0.8)", label: "High (9-15)" },
      { color: "rgba(226, 232, 240, 0.9)", label: "Very High (16+)" },
    ];

    for (const level of levels) {
      const row = document.createElement("div");
      Object.assign(row.style, {
        display: "flex",
        alignItems: "center",
        gap: "6px",
        marginTop: "3px",
      });

      const swatch = document.createElement("div");
      Object.assign(swatch.style, {
        width: "14px",
        height: "10px",
        borderRadius: "2px",
        background: level.color,
        flexShrink: "0",
      });
      row.appendChild(swatch);

      const label = document.createElement("span");
      label.textContent = level.label;
      row.appendChild(label);

      legend.appendChild(row);
    }

    container.appendChild(legend);

    return () => {
      if (legendRef.current) {
        legendRef.current.remove();
        legendRef.current = null;
      }
    };
  }, [map, visible]);

  return null;
}
