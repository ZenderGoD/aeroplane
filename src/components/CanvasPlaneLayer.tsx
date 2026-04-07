"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { useMap } from "react-leaflet";
import L from "leaflet";
import type { FlightState } from "@/types/flight";
import type { ViewMode } from "@/types/viewMode";
import type { FlightHistoryMap } from "@/lib/flightHistory";
import type { FlightAirportEstimate } from "@/types/airport";
import { computeHeatmapGrid, getHeatmapColor, getCellSize } from "@/lib/heatmap";
import { getInstabilityColor } from "@/lib/instabilityScore";
import { greatCircleArc, haversineNm } from "@/lib/geo";
import { crossTrackDistanceNm } from "@/lib/routeDeviation";

/** Detect if the current theme is light by checking the <html> class */
function isLightTheme(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("light");
}

/** Theme-aware canvas colors for elements drawn on the map */
function getCanvasColors() {
  const light = isLightTheme();
  return {
    /** Stroke color for selected aircraft highlight ring */
    selectionStroke: light ? "#0f0f0f" : "#ffffff",
    /** Callsign label text color */
    labelText: light ? "rgba(10, 10, 10, 0.85)" : "rgba(255, 255, 255, 0.7)",
    /** Callsign label background */
    labelBg: light ? "rgba(255, 255, 255, 0.8)" : "rgba(0, 0, 0, 0.5)",
    /** Route / badge label background */
    routeLabelBg: light ? "rgba(255, 255, 255, 0.88)" : "rgba(0, 0, 0, 0.75)",
  };
}

interface Props {
  flights: FlightState[];
  selectedFlight: FlightState | null;
  onSelectFlight: (flight: FlightState | null) => void;
  anomalyIcaos?: Set<string>;
  instabilityScores?: Map<string, number>;
  viewMode?: ViewMode;
  flightHistory?: FlightHistoryMap;
  airportEstimate?: FlightAirportEstimate | null;
  showAirports?: boolean;
  hiddenCategories?: Set<number>;
}

const PLANE_SIZE = 10;
const SELECTED_SIZE = 14;
const CLICK_RADIUS = 15;
const TOOLTIP_WIDTH = 240;
const TOOLTIP_OFFSET = 16;
const VIEWPORT_PADDING = 12;

// Category -> color mapping
const CATEGORY_COLORS: Record<number, string> = {
  0: "#94a3b8",
  1: "#94a3b8",
  2: "#cbd5e1",
  3: "#cbd5e1",
  4: "#94a3b8",
  5: "#94a3b8",
  6: "#94a3b8",
  7: "#e2e8f0",
  8: "#94a3b8",
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

/** Dispatch to category-specific draw function */
function drawAircraft(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  heading: number,
  isSelected: boolean,
  category: number,
  sizeOverride?: number
) {
  switch (category) {
    case 8:
      drawRotorcraft(ctx, x, y, heading, isSelected, sizeOverride);
      break;
    case 2:
      drawLightAircraft(ctx, x, y, heading, isSelected, sizeOverride);
      break;
    case 6:
      drawHeavyJet(ctx, x, y, heading, isSelected, sizeOverride);
      break;
    case 7:
      drawFighterJet(ctx, x, y, heading, isSelected, sizeOverride);
      break;
    default:
      drawPlane(ctx, x, y, heading, isSelected, category, sizeOverride);
      break;
  }
}

/** Default plane shape (cats 0,1,3,4,5) */
function drawPlane(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  heading: number,
  isSelected: boolean,
  category: number,
  sizeOverride?: number
) {
  const size = sizeOverride ?? (isSelected ? SELECTED_SIZE : PLANE_SIZE);
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

  ctx.fillStyle = isSelected ? "#e2e8f0" : getCategoryColor(category);
  ctx.fill();

  if (isSelected) {
    ctx.strokeStyle = getCanvasColors().selectionStroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();
}

/** Rotorcraft (cat 8): circle body + rotor cross + tail boom */
function drawRotorcraft(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  heading: number,
  isSelected: boolean,
  sizeOverride?: number
) {
  const size = sizeOverride ?? (isSelected ? SELECTED_SIZE : PLANE_SIZE);
  const rad = ((heading - 90) * Math.PI) / 180;
  const color = isSelected ? "#e2e8f0" : getCategoryColor(8);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rad);

  // Body circle
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  // Rotor blades (cross)
  ctx.strokeStyle = color;
  ctx.lineWidth = isSelected ? 2 : 1.5;
  ctx.beginPath();
  ctx.moveTo(-size * 0.7, 0);
  ctx.lineTo(size * 0.7, 0);
  ctx.moveTo(0, -size * 0.7);
  ctx.lineTo(0, size * 0.7);
  ctx.stroke();

  // Tail boom
  ctx.beginPath();
  ctx.moveTo(-size * 0.3, 0);
  ctx.lineTo(-size * 0.9, 0);
  ctx.stroke();

  // Tail rotor (small circle)
  ctx.beginPath();
  ctx.arc(-size * 0.9, 0, size * 0.12, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  if (isSelected) {
    ctx.strokeStyle = getCanvasColors().selectionStroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

/** Light aircraft (cat 2): thin fuselage + straight wings + V-tail */
function drawLightAircraft(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  heading: number,
  isSelected: boolean,
  sizeOverride?: number
) {
  const size = (sizeOverride ?? (isSelected ? SELECTED_SIZE : PLANE_SIZE)) * 0.8;
  const rad = ((heading - 90) * Math.PI) / 180;
  const color = isSelected ? "#e2e8f0" : getCategoryColor(2);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rad);

  // Fuselage (thin line)
  ctx.strokeStyle = color;
  ctx.lineWidth = isSelected ? 2.5 : 2;
  ctx.beginPath();
  ctx.moveTo(size * 0.8, 0);
  ctx.lineTo(-size * 0.7, 0);
  ctx.stroke();

  // Straight wings
  ctx.lineWidth = isSelected ? 2 : 1.5;
  ctx.beginPath();
  ctx.moveTo(size * 0.1, -size * 0.7);
  ctx.lineTo(size * 0.1, size * 0.7);
  ctx.stroke();

  // Tail
  ctx.beginPath();
  ctx.moveTo(-size * 0.6, -size * 0.35);
  ctx.lineTo(-size * 0.6, size * 0.35);
  ctx.stroke();

  // Nose dot
  ctx.beginPath();
  ctx.arc(size * 0.8, 0, size * 0.1, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  if (isSelected) {
    ctx.strokeStyle = getCanvasColors().selectionStroke;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.9, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

/** Heavy jet (cat 6): wide body + swept wings + tail fin */
function drawHeavyJet(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  heading: number,
  isSelected: boolean,
  sizeOverride?: number
) {
  const size = (sizeOverride ?? (isSelected ? SELECTED_SIZE : PLANE_SIZE)) * 1.2;
  const rad = ((heading - 90) * Math.PI) / 180;
  const color = isSelected ? "#e2e8f0" : getCategoryColor(6);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rad);

  // Fuselage (wider)
  ctx.beginPath();
  ctx.moveTo(size * 0.9, 0);
  ctx.lineTo(-size * 0.7, -size * 0.12);
  ctx.lineTo(-size * 0.7, size * 0.12);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();

  // Swept wings
  ctx.beginPath();
  ctx.moveTo(size * 0.2, 0);
  ctx.lineTo(-size * 0.3, -size * 0.65);
  ctx.lineTo(-size * 0.45, -size * 0.65);
  ctx.lineTo(-size * 0.1, 0);
  ctx.lineTo(-size * 0.45, size * 0.65);
  ctx.lineTo(-size * 0.3, size * 0.65);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();

  // Tail fin (vertical stabilizer)
  ctx.beginPath();
  ctx.moveTo(-size * 0.5, 0);
  ctx.lineTo(-size * 0.7, -size * 0.3);
  ctx.lineTo(-size * 0.8, -size * 0.3);
  ctx.lineTo(-size * 0.7, 0);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();

  // Horizontal stabilizer
  ctx.beginPath();
  ctx.moveTo(-size * 0.6, -size * 0.25);
  ctx.lineTo(-size * 0.6, size * 0.25);
  ctx.strokeStyle = color;
  ctx.lineWidth = isSelected ? 2 : 1.5;
  ctx.stroke();

  if (isSelected) {
    ctx.strokeStyle = getCanvasColors().selectionStroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.85, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

/** Fighter / High performance (cat 7): delta wing + canards */
function drawFighterJet(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  heading: number,
  isSelected: boolean,
  sizeOverride?: number
) {
  const size = sizeOverride ?? (isSelected ? SELECTED_SIZE : PLANE_SIZE);
  const rad = ((heading - 90) * Math.PI) / 180;
  const color = isSelected ? "#e2e8f0" : getCategoryColor(7);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rad);

  // Delta wing body
  ctx.beginPath();
  ctx.moveTo(size * 1.0, 0);
  ctx.lineTo(-size * 0.7, -size * 0.55);
  ctx.lineTo(-size * 0.4, 0);
  ctx.lineTo(-size * 0.7, size * 0.55);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();

  // Canards (small forward wings)
  ctx.beginPath();
  ctx.moveTo(size * 0.5, -size * 0.1);
  ctx.lineTo(size * 0.3, -size * 0.3);
  ctx.lineTo(size * 0.2, -size * 0.1);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(size * 0.5, size * 0.1);
  ctx.lineTo(size * 0.3, size * 0.3);
  ctx.lineTo(size * 0.2, size * 0.1);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();

  // Vertical stabilizers (twin)
  ctx.strokeStyle = color;
  ctx.lineWidth = isSelected ? 2 : 1.5;
  ctx.beginPath();
  ctx.moveTo(-size * 0.5, -size * 0.15);
  ctx.lineTo(-size * 0.65, -size * 0.35);
  ctx.moveTo(-size * 0.5, size * 0.15);
  ctx.lineTo(-size * 0.65, size * 0.35);
  ctx.stroke();

  if (isSelected) {
    ctx.strokeStyle = getCanvasColors().selectionStroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.8, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawInstabilityDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  score: number
) {
  const radius = score >= 70 ? 4 : score >= 40 ? 3.5 : 3;
  const color = getInstabilityColor(score);

  // Outer glow
  ctx.beginPath();
  ctx.arc(x + 8, y - 8, radius + 1.5, 0, Math.PI * 2);
  ctx.fillStyle = `${color}40`;
  ctx.fill();

  // Inner dot
  ctx.beginPath();
  ctx.arc(x + 8, y - 8, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  // Score text for high instability
  if (score >= 40) {
    ctx.font = "bold 7px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#000";
    ctx.fillText(String(score), x + 8, y - 6);
  }
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
  ctx.strokeStyle = `rgba(226, 232, 240, ${alpha})`;
  ctx.lineWidth = 2;
  ctx.stroke();
}

/** Emergency squawk color mapping */
const SQUAWK_COLORS: Record<string, string> = {
  "7700": "#e2e8f0", // emergency
  "7600": "#94a3b8", // radio failure
  "7500": "#94a3b8", // hijack
};

/** Draw pulsing concentric rings for emergency squawk codes */
function drawEmergencySquawkRings(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  squawk: string,
  phase: number
) {
  const color = SQUAWK_COLORS[squawk];
  if (!color) return;

  ctx.save();
  ctx.lineWidth = 2.5;
  for (let ring = 0; ring < 2; ring++) {
    const ringPhase = (phase + ring * 0.5) % 1.0;
    const radius = 14 + ringPhase * 14; // 14 → 28px
    const alpha = 0.7 * (1 - ringPhase);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = color.replace("#", "");
    // Convert hex to rgba
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    ctx.stroke();
  }
  ctx.restore();
}

/** Draw amber glow behind military aircraft */
function drawMilitaryGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number
) {
  // Outer glow
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(148, 163, 184, 0.15)";
  ctx.fill();
  // Inner glow
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(148, 163, 184, 0.25)";
  ctx.fill();
}

/** Get trail segment color based on altitude in meters */
function getTrailAltitudeColor(altitudeMeters: number | null): string {
  if (altitudeMeters === null) return "#94a3b8"; // default
  const feet = altitudeMeters * 3.28084;
  if (feet < 10000) return "#cbd5e1";   // below 10k
  if (feet < 25000) return "#cbd5e1";   // 10-25k
  if (feet < 40000) return "#94a3b8";   // 25-40k
  return "#94a3b8";                      // above 40k
}

/** Get zoom-based aircraft size scaling factor */
function getZoomScale(zoom: number): number {
  if (zoom <= 5) return 0.7;
  if (zoom <= 8) return 0.85;
  if (zoom <= 11) return 1.0;
  return 1.3;
}

/** Draw callsign label below aircraft */
function drawCallsignLabel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  callsign: string
) {
  ctx.save();
  ctx.font = "bold 9px 'Geist Mono', monospace";
  ctx.textAlign = "center";
  const text = callsign.trim();
  const textWidth = ctx.measureText(text).width;
  const padH = 4;
  const padV = 2;
  const bgW = textWidth + padH * 2;
  const bgH = 12;
  const labelY = y + 14;

  // Background rounded rect
  const colors = getCanvasColors();
  ctx.fillStyle = colors.labelBg;
  ctx.beginPath();
  ctx.roundRect(x - bgW / 2, labelY - bgH / 2 - padV, bgW, bgH + padV, 3);
  ctx.fill();

  // Text
  ctx.fillStyle = colors.labelText;
  ctx.fillText(text, x, labelY + 3);
  ctx.restore();
}

/** Draw special-aircraft badges (MIL, PIA, LADD, etc.) next to icons */
function drawSpecialBadges(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dbFlags: number | undefined
) {
  if (!dbFlags) return;

  const badges: { text: string; color: string }[] = [];
  if (dbFlags & 1) badges.push({ text: "MIL", color: "#94a3b8" });
  if (dbFlags & 2) badges.push({ text: "\u2605", color: "#94a3b8" });
  if (dbFlags & 4) badges.push({ text: "PIA", color: "#94a3b8" });
  if (dbFlags & 8) badges.push({ text: "LADD", color: "#9ca3af" });

  if (badges.length === 0) return;

  ctx.save();
  ctx.font = "bold 9px system-ui, sans-serif";
  ctx.textAlign = "left";

  const badgeBg = getCanvasColors().routeLabelBg;
  let offsetX = 14;
  for (const badge of badges) {
    const w = ctx.measureText(badge.text).width + 6;
    // Background pill
    ctx.fillStyle = badgeBg;
    ctx.beginPath();
    ctx.roundRect(x + offsetX - 3, y - 14, w, 13, 3);
    ctx.fill();
    // Text
    ctx.fillStyle = badge.color;
    ctx.fillText(badge.text, x + offsetX, y - 4);
    offsetX += w + 2;
  }

  ctx.restore();
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
    ctx.strokeStyle = `rgba(148, 163, 184, ${alpha})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Draw small target circle at the end
  const end = points[points.length - 1];
  ctx.beginPath();
  ctx.arc(end.x, end.y, 4, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(148, 163, 184, 0.3)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);
  ctx.stroke();

  ctx.restore();
}

/** Draw ghost flight route: great circle arc with progress, waypoints, and deviation */
function drawGhostRoute(
  ctx: CanvasRenderingContext2D,
  map: L.Map,
  estimate: FlightAirportEstimate,
  flightLat: number,
  flightLon: number
) {
  const dep = estimate.departure;
  const near = estimate.nearest;
  if (!dep || !near) return;
  const routeBg = getCanvasColors().routeLabelBg;

  const lat1 = dep.airport.lat;
  const lon1 = dep.airport.lon;
  const lat2 = near.airport.lat;
  const lon2 = near.airport.lon;

  // Generate proper great circle arc points
  const segments = 60;
  const arcPoints = greatCircleArc(lat1, lon1, lat2, lon2, segments);

  // Calculate along-track progress (fraction 0..1)
  const totalDist = haversineNm(lat1, lon1, lat2, lon2);
  const distFromDep = haversineNm(lat1, lon1, flightLat, flightLon);
  const progress = totalDist > 0 ? Math.max(0, Math.min(1, distFromDep / totalDist)) : 0;
  const progressIndex = Math.round(progress * segments);

  // Convert all arc points to screen coords (single pass)
  const screenPts = arcPoints.map((p) => map.latLngToContainerPoint(p));

  ctx.save();

  // --- Outer glow (full path) ---
  ctx.setLineDash([]);
  ctx.lineWidth = 6;
  ctx.strokeStyle = "rgba(203, 213, 225, 0.08)";
  ctx.beginPath();
  ctx.moveTo(screenPts[0].x, screenPts[0].y);
  for (let i = 1; i < screenPts.length; i++) {
    ctx.lineTo(screenPts[i].x, screenPts[i].y);
  }
  ctx.stroke();

  // --- Inner dashed line with completed/upcoming gradient ---
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);

  // Completed portion (dimmer)
  if (progressIndex > 0) {
    ctx.strokeStyle = "rgba(203, 213, 225, 0.12)";
    ctx.beginPath();
    ctx.moveTo(screenPts[0].x, screenPts[0].y);
    for (let i = 1; i <= Math.min(progressIndex, screenPts.length - 1); i++) {
      ctx.lineTo(screenPts[i].x, screenPts[i].y);
    }
    ctx.stroke();
  }

  // Upcoming portion (brighter)
  if (progressIndex < screenPts.length - 1) {
    ctx.strokeStyle = "rgba(203, 213, 225, 0.25)";
    ctx.beginPath();
    ctx.moveTo(screenPts[Math.max(0, progressIndex)].x, screenPts[Math.max(0, progressIndex)].y);
    for (let i = progressIndex + 1; i < screenPts.length; i++) {
      ctx.lineTo(screenPts[i].x, screenPts[i].y);
    }
    ctx.stroke();
  }

  // --- Waypoint dots every 10% of the route ---
  ctx.setLineDash([]);
  for (let pct = 10; pct < 100; pct += 10) {
    const idx = Math.round((pct / 100) * segments);
    if (idx >= 0 && idx < screenPts.length) {
      const wp = screenPts[idx];
      const isPast = idx <= progressIndex;
      ctx.beginPath();
      ctx.arc(wp.x, wp.y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = isPast ? "rgba(203, 213, 225, 0.15)" : "rgba(203, 213, 225, 0.35)";
      ctx.fill();
    }
  }

  // --- Departure airport dot (green) ---
  const depPt = screenPts[0];
  ctx.beginPath();
  ctx.arc(depPt.x, depPt.y, 5, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(203, 213, 225, 0.5)";
  ctx.fill();
  ctx.strokeStyle = "rgba(203, 213, 225, 0.9)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Departure label
  ctx.font = "bold 9px system-ui, sans-serif";
  ctx.textAlign = "center";
  const depLabel = dep.airport.icao ?? "DEP";
  const depLabelW = ctx.measureText(depLabel).width + 8;
  ctx.fillStyle = routeBg;
  ctx.beginPath();
  ctx.roundRect(depPt.x - depLabelW / 2, depPt.y - 22, depLabelW, 16, 3);
  ctx.fill();
  ctx.fillStyle = "#cbd5e1";
  ctx.fillText(depLabel, depPt.x, depPt.y - 10);

  // --- Destination airport dot (blue) ---
  const nearPt = screenPts[screenPts.length - 1];
  ctx.beginPath();
  ctx.arc(nearPt.x, nearPt.y, 5, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(148, 163, 184, 0.5)";
  ctx.fill();
  ctx.strokeStyle = "rgba(148, 163, 184, 0.9)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Destination label
  const nearLabel = near.airport.icao ?? "DST";
  const nearLabelW = ctx.measureText(nearLabel).width + 8;
  ctx.fillStyle = routeBg;
  ctx.beginPath();
  ctx.roundRect(nearPt.x - nearLabelW / 2, nearPt.y - 22, nearLabelW, 16, 3);
  ctx.fill();
  ctx.fillStyle = "#94a3b8";
  ctx.fillText(nearLabel, nearPt.x, nearPt.y - 10);

  // --- Progress indicator (pill badge near aircraft) ---
  const progressPct = Math.round(progress * 100);
  const flightPt = map.latLngToContainerPoint([flightLat, flightLon]);
  const progText = `${progressPct}%`;
  ctx.font = "bold 9px system-ui, sans-serif";
  const progW = ctx.measureText(progText).width + 10;
  const progX = flightPt.x + 16;
  const progY = flightPt.y + 12;

  ctx.fillStyle = routeBg;
  ctx.beginPath();
  ctx.roundRect(progX - progW / 2, progY - 7, progW, 14, 4);
  ctx.fill();

  // Progress bar background inside pill
  ctx.fillStyle = "rgba(203, 213, 225, 0.2)";
  ctx.beginPath();
  ctx.roundRect(progX - progW / 2 + 1, progY - 6, (progW - 2) * progress, 12, 3);
  ctx.fill();

  ctx.fillStyle = "#cbd5e1";
  ctx.textAlign = "center";
  ctx.fillText(progText, progX, progY + 3);

  // --- Deviation connector line ---
  const deviationNm = crossTrackDistanceNm(
    flightLat, flightLon,
    lat1, lon1,
    lat2, lon2
  );

  if (deviationNm > 5) {
    // Find the nearest point on the ghost arc to the aircraft
    let closestIdx = 0;
    let closestDist = Infinity;
    for (let i = 0; i < arcPoints.length; i++) {
      const d = haversineNm(flightLat, flightLon, arcPoints[i][0], arcPoints[i][1]);
      if (d < closestDist) {
        closestDist = d;
        closestIdx = i;
      }
    }

    const nearestOnRoute = screenPts[closestIdx];

    // Deviation connector color based on severity
    const devColor = deviationNm >= 15
      ? "rgba(148, 163, 184, 0.7)"   // >= 15 NM
      : "rgba(148, 163, 184, 0.7)";  // < 15 NM

    // Draw thin perpendicular line
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = devColor;
    ctx.beginPath();
    ctx.moveTo(flightPt.x, flightPt.y);
    ctx.lineTo(nearestOnRoute.x, nearestOnRoute.y);
    ctx.stroke();

    // Small dot at the nearest point on route
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(nearestOnRoute.x, nearestOnRoute.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = devColor;
    ctx.fill();

    // Deviation distance label at midpoint of connector
    const midX = (flightPt.x + nearestOnRoute.x) / 2;
    const midY = (flightPt.y + nearestOnRoute.y) / 2;
    const devText = `${Math.round(deviationNm)} NM`;
    ctx.font = "bold 9px system-ui, sans-serif";
    const devTextW = ctx.measureText(devText).width + 8;

    ctx.fillStyle = routeBg;
    ctx.beginPath();
    ctx.roundRect(midX - devTextW / 2, midY - 8, devTextW, 14, 3);
    ctx.fill();

    ctx.fillStyle = deviationNm >= 15 ? "#94a3b8" : "#94a3b8";
    ctx.textAlign = "center";
    ctx.fillText(devText, midX, midY + 3);
  }

  ctx.restore();
}

/* ── Formatting helpers ─────────────────────────────── */

function formatAltitude(meters: number | null): string {
  if (meters === null) return "N/A";
  const feet = meters * 3.28084;
  if (feet >= 18000) {
    const fl = Math.round(feet / 100);
    return `FL${String(fl).padStart(3, "0")}`;
  }
  return `${Math.round(feet).toLocaleString()} ft`;
}

function formatSpeed(ms: number | null): string {
  if (ms === null) return "N/A";
  return `${Math.round(ms * 1.94384)} kts`;
}

function formatHeading(deg: number | null): string {
  if (deg === null) return "N/A";
  return `${String(Math.round(deg) % 360).padStart(3, "0")}\u00B0`;
}

function formatVerticalRate(ms: number | null): string {
  if (ms === null || Math.abs(ms) < 0.25) return "";
  const fpm = Math.round(ms * 196.85);
  const arrow = fpm > 0 ? "\u2191" : "\u2193";
  return `${arrow} ${Math.abs(fpm).toLocaleString()} fpm`;
}

function headingArrow(deg: number | null): string {
  if (deg === null) return "";
  const arrows = ["\u2191", "\u2197", "\u2192", "\u2198", "\u2193", "\u2199", "\u2190", "\u2196"];
  const idx = Math.round(((deg % 360) + 360) % 360 / 45) % 8;
  return arrows[idx];
}

/* ── Hover Tooltip Component ────────────────────────── */

function TooltipRow({
  label,
  value,
  dot,
}: {
  label: string;
  value: string;
  dot?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: 11,
      }}
    >
      <span
        style={{
          color: "var(--text-muted)",
          fontWeight: 600,
          fontSize: 9,
          letterSpacing: "0.06em",
          textTransform: "uppercase" as const,
          minWidth: 28,
        }}
      >
        {label}
      </span>
      <span
        style={{
          color: "var(--text-secondary)",
          fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
          fontVariantNumeric: "tabular-nums",
          fontSize: 11,
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        {dot && (
          <span
            style={{
              display: "inline-block",
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: dot,
              flexShrink: 0,
            }}
          />
        )}
        {value}
      </span>
    </div>
  );
}

function HoverTooltip({
  flight,
  pos,
  isAnomaly,
  instabilityScore,
}: {
  flight: FlightState;
  pos: { x: number; y: number };
  isAnomaly: boolean;
  instabilityScore: number | undefined;
}) {
  const estimatedHeight = 220;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1920;
  const vh = typeof window !== "undefined" ? window.innerHeight : 1080;

  let left = pos.x + TOOLTIP_OFFSET;
  let top = pos.y + TOOLTIP_OFFSET;

  if (left + TOOLTIP_WIDTH + VIEWPORT_PADDING > vw) {
    left = pos.x - TOOLTIP_WIDTH - TOOLTIP_OFFSET;
  }
  if (top + estimatedHeight + VIEWPORT_PADDING > vh) {
    top = pos.y - estimatedHeight - TOOLTIP_OFFSET;
  }
  if (left < VIEWPORT_PADDING) left = VIEWPORT_PADDING;
  if (top < VIEWPORT_PADDING) top = VIEWPORT_PADDING;

  const vrText = formatVerticalRate(flight.verticalRate);
  const catColor = getCategoryColor(flight.category);
  const catLabel = getCategoryLabel(flight.category);

  // dbFlags helpers
  const dbFlags = flight.dbFlags ?? 0;
  const isMilitary = !!(dbFlags & 1);
  const isInteresting = !!(dbFlags & 2);
  const isPIA = !!(dbFlags & 4);
  const isLADD = !!(dbFlags & 8);
  const hasSpecialFlags = isMilitary || isInteresting || isPIA || isLADD;

  // Position source badge color
  const sourceBadge = (() => {
    if (!flight.positionSource) return null;
    const src = flight.positionSource.toLowerCase();
    if (src.includes("adsb")) return { label: "ADS-B", color: "#cbd5e1", bg: "rgba(203,213,225,0.12)", border: "rgba(203,213,225,0.20)" };
    if (src.includes("mlat")) return { label: "MLAT", color: "#94a3b8", bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.20)" };
    return { label: src, color: "#9ca3af", bg: "rgba(156,163,175,0.12)", border: "rgba(156,163,175,0.20)" };
  })();

  return (
    <div
      style={{
        position: "fixed",
        left,
        top,
        width: TOOLTIP_WIDTH,
        zIndex: 10000,
        pointerEvents: "none",
        animation: "tooltip-fade-in 150ms ease-out",
      }}
    >
      <div
        style={{
          background: "var(--surface-2)",
          border: "1px solid var(--border-default)",
          borderRadius: 12,
          boxShadow: "0 8px 24px -4px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,0,0,0.2)",
          padding: "10px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {/* Row 1: Callsign + ICAO24 + badges */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span
            style={{
              color: "var(--text-primary)",
              fontWeight: 700,
              fontSize: 13,
              fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
              letterSpacing: "0.02em",
            }}
          >
            {flight.callsign?.trim() || flight.icao24.toUpperCase()}
          </span>
          <span
            style={{
              color: "var(--text-muted)",
              fontSize: 10,
              fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
            }}
          >
            {flight.icao24}
          </span>
          {isAnomaly && (
            <span
              style={{
                background: "rgba(226, 232, 240, 0.12)",
                color: "#e2e8f0",
                border: "1px solid rgba(226, 232, 240, 0.20)",
                borderRadius: 6,
                padding: "1px 6px",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.04em",
              }}
            >
              ANOMALY
            </span>
          )}
          {instabilityScore !== undefined && instabilityScore > 30 && (
            <span
              style={{
                background: "rgba(148, 163, 184, 0.12)",
                color: "#94a3b8",
                border: "1px solid rgba(148, 163, 184, 0.20)",
                borderRadius: 6,
                padding: "1px 6px",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.04em",
              }}
            >
              INST {instabilityScore}
            </span>
          )}
        </div>

        {/* Special flags badges */}
        {hasSpecialFlags && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {isMilitary && (
              <span style={{ background: "rgba(148,163,184,0.15)", color: "#94a3b8", border: "1px solid rgba(148,163,184,0.25)", borderRadius: 6, padding: "1px 6px", fontSize: 9, fontWeight: 700, letterSpacing: "0.04em" }}>
                MILITARY
              </span>
            )}
            {isInteresting && (
              <span style={{ background: "rgba(148,163,184,0.15)", color: "#94a3b8", border: "1px solid rgba(148,163,184,0.25)", borderRadius: 6, padding: "1px 6px", fontSize: 9, fontWeight: 700, letterSpacing: "0.04em" }}>
                {"\u2605"} SPECIAL
              </span>
            )}
            {isPIA && (
              <span style={{ background: "rgba(148,163,184,0.15)", color: "#94a3b8", border: "1px solid rgba(148,163,184,0.25)", borderRadius: 6, padding: "1px 6px", fontSize: 9, fontWeight: 700, letterSpacing: "0.04em" }}>
                PRIVACY
              </span>
            )}
            {isLADD && (
              <span style={{ background: "rgba(156,163,175,0.15)", color: "#9ca3af", border: "1px solid rgba(156,163,175,0.25)", borderRadius: 6, padding: "1px 6px", fontSize: 9, fontWeight: 700, letterSpacing: "0.04em" }}>
                LADD
              </span>
            )}
          </div>
        )}

        {/* Divider */}
        <div
          style={{
            height: 1,
            background:
              "linear-gradient(90deg, transparent 0%, var(--border-default) 20%, var(--border-default) 80%, transparent 100%)",
          }}
        />

        {/* Data rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {flight.registration !== undefined && (
            <TooltipRow label="REG" value={flight.registration} />
          )}
          {flight.typeCode !== undefined && (
            <TooltipRow label="TYPE" value={flight.typeCode} />
          )}
          <TooltipRow label="ALT" value={formatAltitude(flight.baroAltitude)} />
          <TooltipRow label="SPD" value={formatSpeed(flight.velocity)} />
          {(flight.ias !== undefined || flight.tas !== undefined) && (
            <TooltipRow
              label="IAS/TAS"
              value={`${flight.ias ?? "—"}/${flight.tas ?? "—"} kts`}
            />
          )}
          {flight.mach !== undefined && (
            <TooltipRow label="MACH" value={flight.mach.toFixed(3)} />
          )}
          <TooltipRow
            label="HDG"
            value={`${formatHeading(flight.trueTrack)} ${headingArrow(flight.trueTrack)}`}
          />
          <TooltipRow label="CAT" value={catLabel} dot={catColor} />
          {vrText && <TooltipRow label="V/S" value={vrText} />}
          {(flight.windSpeed !== undefined || flight.windDirection !== undefined) && (
            <TooltipRow
              label="WIND"
              value={`${flight.windSpeed ?? "—"}kts @ ${flight.windDirection ?? "—"}\u00B0`}
            />
          )}
          {flight.oat !== undefined && (
            <TooltipRow label="TEMP" value={`${flight.oat}\u00B0C`} />
          )}
          <TooltipRow label="CTY" value={flight.originCountry} />
          {sourceBadge && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: 11,
              }}
            >
              <span
                style={{
                  color: "var(--text-muted)",
                  fontWeight: 600,
                  fontSize: 9,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase" as const,
                  minWidth: 28,
                }}
              >
                SRC
              </span>
              <span
                style={{
                  background: sourceBadge.bg,
                  color: sourceBadge.color,
                  border: `1px solid ${sourceBadge.border}`,
                  borderRadius: 6,
                  padding: "1px 6px",
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                }}
              >
                {sourceBadge.label}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────── */

export default function CanvasPlaneLayer({
  flights,
  selectedFlight,
  onSelectFlight,
  anomalyIcaos,
  instabilityScores,
  viewMode = "normal",
  flightHistory,
  airportEstimate,
  hiddenCategories,
}: Props) {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const flightsRef = useRef(flights);
  const selectedRef = useRef(selectedFlight);
  const anomalyIcaosRef = useRef(anomalyIcaos);
  const instabilityRef = useRef(instabilityScores);
  const viewModeRef = useRef(viewMode);
  const flightHistoryRef = useRef(flightHistory);
  const airportEstimateRef = useRef(airportEstimate);
  const hiddenCategoriesRef = useRef(hiddenCategories);
  const animFrameRef = useRef<number>(0);

  // Hover state
  const [hoveredFlight, setHoveredFlight] = useState<FlightState | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [isHoveringFlight, setIsHoveringFlight] = useState(false);
  const lastThrottleRef = useRef(0);

  flightsRef.current = flights;
  selectedRef.current = selectedFlight;
  anomalyIcaosRef.current = anomalyIcaos;
  instabilityRef.current = instabilityScores;
  viewModeRef.current = viewMode;
  flightHistoryRef.current = flightHistory;
  airportEstimateRef.current = airportEstimate;
  hiddenCategoriesRef.current = hiddenCategories;

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
    const instabilities = instabilityRef.current;
    const history = flightHistoryRef.current;
    const estimate = airportEstimateRef.current;
    const hidden = hiddenCategoriesRef.current;

    // ==================== HEATMAP MODE ====================
    if (mode === "heatmap") {
      const points: { x: number; y: number }[] = [];
      for (const f of currentFlights) {
        if (f.latitude === null || f.longitude === null) continue;
        if (hidden?.has(f.category)) continue;
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
        drawAircraft(ctx, pt.x, pt.y, sel.trueTrack ?? 0, true, sel.category);
      }
      return;
    }

    // ==================== TRAILS MODE ====================
    if (mode === "trails" && history) {
      for (const f of currentFlights) {
        if (f.latitude === null || f.longitude === null) continue;
        if (hidden?.has(f.category)) continue;
        if (
          f.latitude < bounds.getSouth() || f.latitude > bounds.getNorth() ||
          f.longitude < bounds.getWest() || f.longitude > bounds.getEast()
        ) continue;

        const entries = history.get(f.icao24);
        if (entries && entries.length > 1) {
          for (let i = 1; i < entries.length; i++) {
            const p0 = map.latLngToContainerPoint([entries[i - 1].lat, entries[i - 1].lon]);
            const p1 = map.latLngToContainerPoint([entries[i].lat, entries[i].lon]);
            const alpha = (i / entries.length) * 0.8 + 0.1;
            const segColor = getTrailAltitudeColor(entries[i].altitude);

            // Glow pass: wider stroke at lower opacity
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.strokeStyle = segColor;
            ctx.globalAlpha = alpha * 0.2;
            ctx.lineWidth = 4;
            ctx.stroke();

            // Main trail pass
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.strokeStyle = segColor;
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
      drawGhostRoute(ctx, map, estimate, sel.latitude, sel.longitude);
    }

    // ==================== NORMAL + TRAILS: Draw planes ====================
    const phase = (Date.now() % 1000) / 1000;
    const zoom = map.getZoom();
    const zoomScale = getZoomScale(zoom);
    const scaledPlaneSize = PLANE_SIZE * zoomScale;
    const scaledSelectedSize = SELECTED_SIZE * zoomScale;

    for (let i = 0; i < currentFlights.length; i++) {
      const f = currentFlights[i];
      if (f.latitude === null || f.longitude === null) continue;
      if (
        f.latitude < bounds.getSouth() || f.latitude > bounds.getNorth() ||
        f.longitude < bounds.getWest() || f.longitude > bounds.getEast()
      ) continue;
      // Skip hidden categories (but always show selected flight)
      const isSel = sel?.icao24 === f.icao24;
      if (!isSel && hidden?.has(f.category)) continue;

      const pt = map.latLngToContainerPoint([f.latitude, f.longitude]);

      // Color differentiation for military / MLAT
      const isMilitary = !!(f.dbFlags && f.dbFlags & 1);
      const isMLAT = !!(f.positionSource && f.positionSource.includes("mlat"));

      // Military aircraft glow (rendered BEFORE the aircraft icon)
      if (isMilitary) {
        drawMilitaryGlow(ctx, pt.x, pt.y);
      }

      if (!isSel && (isMilitary || isMLAT)) {
        ctx.save();
        if (isMLAT) ctx.globalAlpha = 0.55;
      }

      const effectiveSize = isSel ? scaledSelectedSize : scaledPlaneSize;

      if (!isSel && isMilitary) {
        // Override category color for military aircraft — draw in amber
        const rad = (((f.trueTrack ?? 0) - 90) * Math.PI) / 180;
        ctx.save();
        ctx.translate(pt.x, pt.y);
        ctx.rotate(rad);
        ctx.beginPath();
        ctx.moveTo(effectiveSize, 0);
        ctx.lineTo(-effectiveSize * 0.6, -effectiveSize * 0.5);
        ctx.lineTo(-effectiveSize * 0.3, 0);
        ctx.lineTo(-effectiveSize * 0.6, effectiveSize * 0.5);
        ctx.closePath();
        ctx.fillStyle = "#94a3b8";
        ctx.fill();
        ctx.restore();
      } else {
        drawAircraft(ctx, pt.x, pt.y, f.trueTrack ?? 0, isSel, f.category, effectiveSize);
      }

      if (!isSel && (isMilitary || isMLAT)) {
        ctx.restore();
      }

      // Special badges (only at reasonable zoom)
      if (zoom >= 7 && f.dbFlags) {
        drawSpecialBadges(ctx, pt.x, pt.y, f.dbFlags);
      }

      // Emergency squawk pulsing rings (7700, 7600, 7500)
      if (f.squawk && SQUAWK_COLORS[f.squawk]) {
        drawEmergencySquawkRings(ctx, pt.x, pt.y, f.squawk, phase);
      }

      // Anomaly pulsing ring
      if (anomalies?.has(f.icao24)) {
        drawAnomalyRing(ctx, pt.x, pt.y, phase);
      }

      // Instability dot indicator
      const instScore = instabilities?.get(f.icao24);
      if (instScore && instScore >= 20 && !isSel) {
        drawInstabilityDot(ctx, pt.x, pt.y, instScore);
      }

      // Callsign labels at high zoom
      if (zoom >= 10 && f.callsign && f.callsign.trim()) {
        drawCallsignLabel(ctx, pt.x, pt.y, f.callsign);
      }
    }

    // ==================== PREDICTION LINE (for selected flight) ====================
    if (sel && sel.latitude !== null && sel.longitude !== null && !sel.onGround) {
      drawPredictionLine(ctx, map, sel);
    }

    // Redraw selected on top
    if (sel && sel.latitude !== null && sel.longitude !== null) {
      const pt = map.latLngToContainerPoint([sel.latitude, sel.longitude]);
      drawAircraft(ctx, pt.x, pt.y, sel.trueTrack ?? 0, true, sel.category, scaledSelectedSize);
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

  // Mousemove handler for hover detection — throttled to every 50ms
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastThrottleRef.current < 50) return;
      lastThrottleRef.current = now;

      const container = map.getContainer();
      const rect = container.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      let closest: FlightState | null = null;
      let closestDist = CLICK_RADIUS * CLICK_RADIUS;

      const currentFlights = flightsRef.current;
      const sel = selectedRef.current;

      for (let i = 0; i < currentFlights.length; i++) {
        const f = currentFlights[i];
        if (f.latitude === null || f.longitude === null) continue;
        // Skip the currently selected flight — it already has the sidebar
        if (sel && f.icao24 === sel.icao24) continue;
        const pt = map.latLngToContainerPoint([f.latitude, f.longitude]);
        const dx = pt.x - mx;
        const dy = pt.y - my;
        const dist = dx * dx + dy * dy;
        if (dist < closestDist) {
          closestDist = dist;
          closest = f;
        }
      }

      if (closest) {
        setHoveredFlight(closest);
        setHoverPos({ x: e.clientX, y: e.clientY });
        setIsHoveringFlight(true);
      } else {
        setHoveredFlight(null);
        setHoverPos(null);
        setIsHoveringFlight(false);
      }
    },
    [map]
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredFlight(null);
    setHoverPos(null);
    setIsHoveringFlight(false);
  }, []);

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

    // Add mousemove listener on the map container for hover detection
    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      map.off("moveend", redraw);
      map.off("zoomend", redraw);
      map.off("move", redraw);
      map.off("click", handleClick);
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
      canvas.remove();
    };
  }, [map, redraw, handleClick, handleMouseMove, handleMouseLeave]);

  // Redraw on data change
  useEffect(() => {
    redraw();
  }, [flights, selectedFlight, viewMode, flightHistory, airportEstimate, instabilityScores, hiddenCategories, redraw]);

  // Animation loop for anomaly pulsing rings and emergency squawk rings
  const hasEmergencySquawk = flights.some(
    (f) => f.squawk !== null && f.squawk !== undefined && SQUAWK_COLORS[f.squawk]
  );
  const needsAnimation = (anomalyIcaos && anomalyIcaos.size > 0) || hasEmergencySquawk;

  useEffect(() => {
    if (!needsAnimation) {
      cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const animate = () => {
      redraw();
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animFrameRef.current);
  }, [needsAnimation, redraw]);

  // Set cursor on the map container when hovering a flight
  useEffect(() => {
    const container = map.getContainer();
    container.style.cursor = isHoveringFlight ? "pointer" : "";
    return () => {
      container.style.cursor = "";
    };
  }, [map, isHoveringFlight]);

  // Render tooltip via portal
  const showTooltip = hoveredFlight && hoverPos;

  return (
    <>
      {showTooltip &&
        createPortal(
          <HoverTooltip
            flight={hoveredFlight}
            pos={hoverPos}
            isAnomaly={anomalyIcaos?.has(hoveredFlight.icao24) ?? false}
            instabilityScore={instabilityScores?.get(hoveredFlight.icao24)}
          />,
          document.body
        )}
    </>
  );
}
