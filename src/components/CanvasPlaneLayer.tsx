"use client";

import { useEffect, useRef, useCallback } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import type { FlightState } from "@/types/flight";
import type { ViewMode } from "@/types/viewMode";
import type { FlightHistoryMap } from "@/lib/flightHistory";
import type { FlightAirportEstimate } from "@/types/airport";
import { computeHeatmapGrid, getHeatmapColor, getCellSize } from "@/lib/heatmap";

interface Props {
  flights: FlightState[];
  selectedFlight: FlightState | null;
  onSelectFlight: (flight: FlightState | null) => void;
  anomalyIcaos?: Set<string>;
  viewMode?: ViewMode;
  flightHistory?: FlightHistoryMap;
  airportEstimate?: FlightAirportEstimate | null;
  showAirports?: boolean;
}

const PLANE_SIZE = 10;
const SELECTED_SIZE = 14;
const CLICK_RADIUS = 15;

// Category -> color mapping
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

/** Draw the prediction line ahead of the selected flight */
function drawPredictionLine(
  ctx: CanvasRenderingContext2D,
  map: L.Map,
  flight: FlightState
) {
  if (
    flight.latitude === null ||
    flight.longitude === null ||
    flight.trueTrack === null ||
    flight.velocity === null ||
    flight.velocity < 10
  )
    return;

  const headingRad = (flight.trueTrack * Math.PI) / 180;
  const speedNm = flight.velocity * 1.94384; // m/s to knots
  // Project 5 minutes ahead (distance in nm)
  const distNm = (speedNm / 60) * 5;
  // Convert nm to approximate degrees
  const distDeg = distNm / 60;

  const lat1 = flight.latitude;
  const lon1 = flight.longitude;

  // Generate points along the prediction path
  const segments = 20;
  const points: { x: number; y: number }[] = [];
  const start = map.latLngToContainerPoint([lat1, lon1]);
  points.push({ x: start.x, y: start.y });

  for (let i = 1; i <= segments; i++) {
    const frac = i / segments;
    const d = distDeg * frac;
    const lat2 = lat1 + d * Math.cos(headingRad);
    const lon2 = lon1 + d * Math.sin(headingRad) / Math.cos((lat1 * Math.PI) / 180);
    const pt = map.latLngToContainerPoint([lat2, lon2]);
    points.push({ x: pt.x, y: pt.y });
  }

  // Draw dashed line with fading opacity
  ctx.save();
  ctx.setLineDash([8, 6]);
  for (let i = 1; i < points.length; i++) {
    const alpha = 1.0 - (i / points.length) * 0.8;
    ctx.beginPath();
    ctx.moveTo(points[i - 1].x, points[i - 1].y);
    ctx.lineTo(points[i].x, points[i].y);
    ctx.strokeStyle = `rgba(250, 204, 21, ${alpha})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Draw small target circle at the end
  const end = points[points.length - 1];
  ctx.beginPath();
  ctx.arc(end.x, end.y, 4, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(250, 204, 21, 0.3)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);
  ctx.stroke();

  ctx.restore();
}

/** Draw great circle arc between departure and destination airports */
function drawGreatCircleRoute(
  ctx: CanvasRenderingContext2D,
  map: L.Map,
  estimate: FlightAirportEstimate,
  flightLat: number,
  flightLon: number
) {
  const dep = estimate.departure;
  const near = estimate.nearest;
  if (!dep || !near) return;

  const points: [number, number][] = [];
  const lat1 = dep.airport.lat;
  const lon1 = dep.airport.lon;
  const lat2 = near.airport.lat;
  const lon2 = near.airport.lon;

  // Generate great circle arc points
  const segments = 40;
  for (let i = 0; i <= segments; i++) {
    const f = i / segments;
    // Simple linear interpolation (close enough for display)
    const lat = lat1 + (lat2 - lat1) * f;
    const lon = lon1 + (lon2 - lon1) * f;
    points.push([lat, lon]);
  }

  // Draw the route arc
  ctx.save();
  ctx.setLineDash([4, 8]);
  ctx.lineWidth = 1.5;

  for (let i = 1; i < points.length; i++) {
    const p0 = map.latLngToContainerPoint(points[i - 1]);
    const p1 = map.latLngToContainerPoint(points[i]);

    // Calculate distance from flight position to determine past vs future
    const midLat = (points[i - 1][0] + points[i][0]) / 2;
    const midLon = (points[i - 1][1] + points[i][1]) / 2;
    const distToFlight = Math.hypot(midLat - flightLat, midLon - flightLon);
    const totalDist = Math.hypot(lat2 - lat1, lon2 - lon1);
    const relDist = Math.min(distToFlight / (totalDist * 0.3), 1);

    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.strokeStyle = `rgba(96, 165, 250, ${0.15 + relDist * 0.2})`;
    ctx.stroke();
  }

  // Draw airport dots
  const depPt = map.latLngToContainerPoint([lat1, lon1]);
  const nearPt = map.latLngToContainerPoint([lat2, lon2]);

  // Departure dot (green)
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(depPt.x, depPt.y, 5, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(34, 197, 94, 0.6)";
  ctx.fill();
  ctx.strokeStyle = "rgba(34, 197, 94, 0.9)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Nearest airport dot (blue)
  ctx.beginPath();
  ctx.arc(nearPt.x, nearPt.y, 5, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(96, 165, 250, 0.6)";
  ctx.fill();
  ctx.strokeStyle = "rgba(96, 165, 250, 0.9)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Labels
  ctx.font = "10px system-ui, sans-serif";
  ctx.textAlign = "center";

  // Dep label
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(depPt.x - 18, depPt.y - 20, 36, 14);
  ctx.fillStyle = "#22c55e";
  ctx.fillText(dep.airport.icao ?? "DEP", depPt.x, depPt.y - 10);

  // Near label
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(nearPt.x - 18, nearPt.y - 20, 36, 14);
  ctx.fillStyle = "#60a5fa";
  ctx.fillText(near.airport.icao ?? "NR", nearPt.x, nearPt.y - 10);

  ctx.restore();
}

export default function CanvasPlaneLayer({
  flights,
  selectedFlight,
  onSelectFlight,
  anomalyIcaos,
  viewMode = "normal",
  flightHistory,
  airportEstimate,
}: Props) {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const flightsRef = useRef(flights);
  const selectedRef = useRef(selectedFlight);
  const anomalyIcaosRef = useRef(anomalyIcaos);
  const viewModeRef = useRef(viewMode);
  const flightHistoryRef = useRef(flightHistory);
  const airportEstimateRef = useRef(airportEstimate);
  const animFrameRef = useRef<number>(0);

  flightsRef.current = flights;
  selectedRef.current = selectedFlight;
  anomalyIcaosRef.current = anomalyIcaos;
  viewModeRef.current = viewMode;
  flightHistoryRef.current = flightHistory;
  airportEstimateRef.current = airportEstimate;

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
    const estimate = airportEstimateRef.current;

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

    // ==================== GREAT CIRCLE ROUTE (for selected flight) ====================
    if (sel && sel.latitude !== null && sel.longitude !== null && estimate) {
      drawGreatCircleRoute(ctx, map, estimate, sel.latitude, sel.longitude);
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

    // ==================== PREDICTION LINE (for selected flight) ====================
    if (sel && sel.latitude !== null && sel.longitude !== null && !sel.onGround) {
      drawPredictionLine(ctx, map, sel);
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
  }, [flights, selectedFlight, viewMode, flightHistory, airportEstimate, redraw]);

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
