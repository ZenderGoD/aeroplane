"use client";

import { useRef, useEffect } from "react";
import type { FlightHistoryEntry } from "@/types/flight";

interface Props {
  history: FlightHistoryEntry[];
}

const CHART_HEIGHT = 80;
const PADDING = { top: 12, bottom: 18, left: 36, right: 8 };

export default function FlightChart({ history }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || history.length < 2) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const ratio = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = CHART_HEIGHT;
    canvas.width = w * ratio;
    canvas.height = h * ratio;
    ctx.scale(ratio, ratio);
    ctx.clearRect(0, 0, w, h);

    const plotW = w - PADDING.left - PADDING.right;
    const plotH = h - PADDING.top - PADDING.bottom;

    // Extract altitude (feet) and speed (knots) data
    const altitudes: (number | null)[] = [];
    const speeds: (number | null)[] = [];
    const timestamps: number[] = [];

    for (const entry of history) {
      altitudes.push(entry.altitude !== null ? Math.round(entry.altitude * 3.28084) : null);
      speeds.push(entry.velocity !== null ? Math.round(entry.velocity * 1.94384) : null);
      timestamps.push(entry.timestamp);
    }

    // Compute ranges
    const validAlts = altitudes.filter((a): a is number => a !== null);
    const validSpeeds = speeds.filter((s): s is number => s !== null);
    if (validAlts.length < 2 && validSpeeds.length < 2) return;

    const altMin = Math.min(...validAlts, 0);
    const altMax = Math.max(...validAlts, 100);
    const spdMin = Math.min(...validSpeeds, 0);
    const spdMax = Math.max(...validSpeeds, 100);

    const altRange = altMax - altMin || 1;
    const spdRange = spdMax - spdMin || 1;

    // Background
    ctx.fillStyle = "rgba(15, 23, 42, 0.6)";
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, 6);
    ctx.fill();

    // Grid lines
    ctx.strokeStyle = "rgba(100, 116, 139, 0.15)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 3; i++) {
      const y = PADDING.top + (plotH / 3) * i;
      ctx.beginPath();
      ctx.moveTo(PADDING.left, y);
      ctx.lineTo(w - PADDING.right, y);
      ctx.stroke();
    }

    // Helper to map data index to x
    const toX = (i: number) => PADDING.left + (i / (history.length - 1)) * plotW;

    // Draw altitude line (blue area fill + line)
    const altToY = (val: number) => PADDING.top + plotH - ((val - altMin) / altRange) * plotH;

    // Altitude area fill
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < altitudes.length; i++) {
      if (altitudes[i] === null) continue;
      const x = toX(i);
      const y = altToY(altitudes[i]!);
      if (!started) {
        ctx.moveTo(x, PADDING.top + plotH);
        ctx.lineTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    if (started) {
      // Close the area at the bottom
      for (let i = altitudes.length - 1; i >= 0; i--) {
        if (altitudes[i] !== null) {
          ctx.lineTo(toX(i), PADDING.top + plotH);
          break;
        }
      }
      ctx.closePath();
      ctx.fillStyle = "rgba(59, 130, 246, 0.12)";
      ctx.fill();
    }

    // Altitude line
    ctx.beginPath();
    started = false;
    for (let i = 0; i < altitudes.length; i++) {
      if (altitudes[i] === null) continue;
      const x = toX(i);
      const y = altToY(altitudes[i]!);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw speed line (green)
    const spdToY = (val: number) => PADDING.top + plotH - ((val - spdMin) / spdRange) * plotH;

    ctx.beginPath();
    started = false;
    for (let i = 0; i < speeds.length; i++) {
      if (speeds[i] === null) continue;
      const x = toX(i);
      const y = spdToY(speeds[i]!);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Y-axis labels for altitude (left side)
    ctx.font = "9px system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillStyle = "#3b82f6";
    ctx.fillText(`${Math.round(altMax / 1000)}k`, PADDING.left - 3, PADDING.top + 3);
    ctx.fillText(`${Math.round(altMin / 1000)}k`, PADDING.left - 3, PADDING.top + plotH + 3);

    // Speed range label (right side)
    ctx.textAlign = "left";
    ctx.fillStyle = "#22c55e";
    ctx.fillText(`${Math.round(spdMax)}kt`, w - PADDING.right + 1, PADDING.top + 3);

    // Time labels
    ctx.fillStyle = "rgba(148, 163, 184, 0.6)";
    ctx.textAlign = "center";
    ctx.font = "8px system-ui, sans-serif";
    if (timestamps.length >= 2) {
      const first = new Date(timestamps[0] * 1000);
      const last = new Date(timestamps[timestamps.length - 1] * 1000);
      ctx.fillText(
        first.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        PADDING.left, h - 3
      );
      ctx.fillText(
        last.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        w - PADDING.right, h - 3
      );
    }

    // Legend
    ctx.font = "bold 8px system-ui, sans-serif";
    ctx.textAlign = "left";
    // Altitude legend
    ctx.fillStyle = "#3b82f6";
    ctx.fillRect(PADDING.left, 2, 6, 2);
    ctx.fillText("ALT", PADDING.left + 8, 6);
    // Speed legend
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(PADDING.left + 35, 2, 6, 2);
    ctx.fillText("SPD", PADDING.left + 43, 6);

  }, [history]);

  if (history.length < 2) return null;

  return (
    <div className="px-3 py-2">
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: CHART_HEIGHT }}
        className="rounded-md"
      />
    </div>
  );
}
