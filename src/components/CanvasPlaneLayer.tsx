"use client";

import { useEffect, useRef, useCallback } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import type { FlightState } from "@/types/flight";
import type { ViewMode } from "@/types/viewMode";
import type { FlightHistoryMap } from "@/lib/flightHistory";
import { computeHeatmapGrid, getHeatmapColor, getCellSize } from "@/lib/heatmap";

interface Props {
  flights: FlightState[];
  selectedFlight: FlightState | null;
  onSelectFlight: (flight: FlightState | null) => void;
  anomalyIcaos?: Set<string>;
  viewMode?: ViewMode;
  flightHistory?: FlightHistoryMap;
}

const PLANE_SIZE = 10;
const SELECTED_SIZE = 14;
const CLICK_RADIUS = 15;

// Category -> color mapping
// 0=unknown, 1=none, 2=light, 3=small, 4=large, 5=high-vortex, 6=heavy, 7=high-perf, 8=rotorcraft
const CATEGORY_COLORS: Record<number, string> = {
  0: "#94a3b8",
  1: "#94a3b8",
  2: "#22d3ee",
  3: "#34d399",
  4: "#60a5fa",
  5: "#a78bfa",
  6: "#f97316",
  7: "#ef4444",
  8: "#e879f9",
};

export function getCategoryColor(category: number): string {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS[0];
}

export function getCategoryLabel(category: number): string {
  const labels: Record<number, string> = {
    0: "Unknown",
    1: "Unknown",
    2: "Light",
    3: "Small",
    4: "Large",
    5: "High Vortex",
    6: "Heavy",
    7: "High Perf",
    8: "Rotorcraft",
  };
  return labels[category] ?? "Unknown";
}

function drawPlane(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  heading: number,
  isSelected: boolean,
  category: number
) {
  const size = isSelected ? SELECTED_SIZE : PLANE_SIZE;
  const rad = ((heading - 90) * Math.PI) / 180;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rad);

  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(-size * 0.6, -size * 0.5);
  ctx.lineTo(-size * 0.3, 0);
  ctx.lineTo(-size * 0.6, size * 0.5);
  ctx.closePath();

  ctx.fillStyle = isSelected ? "#facc15" : getCategoryColor(category);
  ctx.fill();

  if (isSelected) {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();
}

function drawAnomalyRing(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  phase: number
) {
  const radius = 12 + phase * 6;
  const alpha = 0.3 + (1 - phase) * 0.7;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(239, 68, 68, ${alpha})`;
  ctx.lineWidth = 2;
  ctx.stroke();
}

export default function CanvasPlaneLayer({
  flights,
  selectedFlight,
  onSelectFlight,
  anomalyIcaos,
  viewMode = "normal",
  flightHistory,
}: Props) {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const flightsRef = useRef(flights);
  const selectedRef = useRef(selectedFlight);
  const anomalyIcaosRef = useRef(anomalyIcaos);
  const viewModeRef = useRef(viewMode);
  const flightHistoryRef = useRef(flightHistory);
  const animFrameRef = useRef<number>(0);

  flightsRef.current = flights;
  selectedRef.current = selectedFlight;
  anomalyIcaosRef.current = anomalyIcaos;
  viewModeRef.current = viewMode;
  flightHistoryRef.current = flightHistory;

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const mapSize = map.getSize();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = mapSize.x * ratio;
    canvas.height = mapSize.y * ratio;
    canvas.style.width = mapSize.x + "px";
    canvas.style.height = mapSize.y + "px";

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.clearRect(0, 0, mapSize.x, mapSize.y);

    const bounds = map.getBounds();
    const currentFlights = flightsRef.current;
    const sel = selectedRef.current;
    const mode = viewModeRef.current;
    const anomalies = anomalyIcaosRef.current;
    const history = flightHistoryRef.current;

    // ==================== HEATMAP MODE ====================
    if (mode === "heatmap") {
      const points: { x: number; y: number }[] = [];
      for (const f of currentFlights) {
        if (f.latitude === null || f.longitude === null) continue;
        if (
          f.latitude < bounds.getSouth() || f.latitude > bounds.getNorth() ||
          f.longitude < bounds.getWest() || f.longitude > bounds.getEast()
        ) continue;
        const pt = map.latLngToContainerPoint([f.latitude, f.longitude]);
        points.push({ x: pt.x, y: pt.y });
      }

      const cellSize = getCellSize(map.getZoom());
      const { cells, maxCount } = computeHeatmapGrid(points, mapSize.x, mapSize.y, cellSize);

      for (const cell of cells) {
        ctx.fillStyle = getHeatmapColor(cell.count, maxCount);
        ctx.fillRect(cell.x, cell.y, cellSize, cellSize);
      }

      // Still draw selected flight marker on top
      if (sel && sel.latitude !== null && sel.longitude !== null) {
        const pt = map.latLngToContainerPoint([sel.latitude, sel.longitude]);
        drawPlane(ctx, pt.x, pt.y, sel.trueTrack ?? 0, true, sel.category);
      }
      return;
    }

    // ==================== TRAILS MODE ====================
    if (mode === "trails" && history) {
      for (const f of currentFlights) {
        if (f.latitude === null || f.longitude === null) continue;
        if (
          f.latitude < bounds.getSouth() || f.latitude > bounds.getNorth() ||
          f.longitude < bounds.getWest() || f.longitude > bounds.getEast()
        ) continue;

        const entries = history.get(f.icao24);
        if (entries && entries.length > 1) {
          const color = getCategoryColor(f.category);
          for (let i = 1; i < entries.length; i++) {
            const p0 = map.latLngToContainerPoint([entries[i - 1].lat, entries[i - 1].lon]);
            const p1 = map.latLngToContainerPoint([entries[i].lat, entries[i].lon]);
            const alpha = (i / entries.length) * 0.8 + 0.1;

            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.strokeStyle = color;
            ctx.globalAlpha = alpha;
            ctx.lineWidth = 2;
            ctx.stroke();
          }
          ctx.globalAlpha = 1.0;
        }
      }
    }

    // ==================== NORMAL + TRAILS: Draw planes ====================
    const phase = (Date.now() % 1000) / 1000;

    for (let i = 0; i < currentFlights.length; i++) {
      const f = currentFlights[i];
      if (f.latitude === null || f.longitude === null) continue;
      if (
        f.latitude < bounds.getSouth() || f.latitude > bounds.getNorth() ||
        f.longitude < bounds.getWest() || f.longitude > bounds.getEast()
      ) continue;

      const pt = map.latLngToContainerPoint([f.latitude, f.longitude]);
      const isSel = sel?.icao24 === f.icao24;
      drawPlane(ctx, pt.x, pt.y, f.trueTrack ?? 0, isSel, f.category);

      // Anomaly pulsing ring
      if (anomalies?.has(f.icao24)) {
        drawAnomalyRing(ctx, pt.x, pt.y, phase);
      }
    }

    // Redraw selected on top
    if (sel && sel.latitude !== null && sel.longitude !== null) {
      const pt = map.latLngToContainerPoint([sel.latitude, sel.longitude]);
      drawPlane(ctx, pt.x, pt.y, sel.trueTrack ?? 0, true, sel.category);
    }
  }, [map]);

  const handleClick = useCallback(
    (e: L.LeafletMouseEvent) => {
      const clickPt = map.latLngToContainerPoint(e.latlng);
      let closest: FlightState | null = null;
      let closestDist = CLICK_RADIUS * CLICK_RADIUS;

      for (const f of flightsRef.current) {
        if (f.latitude === null || f.longitude === null) continue;
        const pt = map.latLngToContainerPoint([f.latitude, f.longitude]);
        const dx = pt.x - clickPt.x;
        const dy = pt.y - clickPt.y;
        const dist = dx * dx + dy * dy;
        if (dist < closestDist) {
          closestDist = dist;
          closest = f;
        }
      }

      onSelectFlight(closest);
    },
    [map, onSelectFlight]
  );

  // Canvas setup
  useEffect(() => {
    const container = map.getContainer();

    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "450";
    container.appendChild(canvas);
    canvasRef.current = canvas;

    map.on("moveend", redraw);
    map.on("zoomend", redraw);
    map.on("move", redraw);
    map.on("click", handleClick);
    redraw();

    return () => {
      map.off("moveend", redraw);
      map.off("zoomend", redraw);
      map.off("move", redraw);
      map.off("click", handleClick);
      canvas.remove();
    };
  }, [map, redraw, handleClick]);

  // Redraw on data change
  useEffect(() => {
    redraw();
  }, [flights, selectedFlight, viewMode, flightHistory, redraw]);

  // Animation loop for anomaly pulsing rings
  useEffect(() => {
    if (!anomalyIcaos || anomalyIcaos.size === 0) {
      cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const animate = () => {
      redraw();
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animFrameRef.current);
  }, [anomalyIcaos, redraw]);

  return null;
}
