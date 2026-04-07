"use client";

import { useEffect, useRef } from "react";

const aircraftPositions = [
  { x: 15, y: 25, size: 2.5, color: "#cbd5e1" },
  { x: 35, y: 18, size: 2, color: "#cbd5e1" },
  { x: 52, y: 42, size: 3, color: "#cbd5e1" },
  { x: 78, y: 30, size: 2, color: "#cbd5e1" },
  { x: 22, y: 55, size: 2.5, color: "#94a3b8" },
  { x: 65, y: 60, size: 2, color: "#cbd5e1" },
  { x: 88, y: 48, size: 2.5, color: "#cbd5e1" },
  { x: 42, y: 72, size: 2, color: "#cbd5e1" },
  { x: 70, y: 78, size: 3, color: "#e2e8f0" },
  { x: 25, y: 80, size: 2, color: "#cbd5e1" },
  { x: 55, y: 20, size: 2, color: "#cbd5e1" },
  { x: 82, y: 65, size: 2.5, color: "#cbd5e1" },
  { x: 10, y: 40, size: 2, color: "#cbd5e1" },
  { x: 48, y: 50, size: 2, color: "#cbd5e1" },
  { x: 92, y: 22, size: 2, color: "#cbd5e1" },
  { x: 30, y: 35, size: 2.5, color: "#cbd5e1" },
  { x: 60, y: 85, size: 2, color: "#cbd5e1" },
  { x: 75, y: 15, size: 2, color: "#94a3b8" },
  { x: 40, y: 90, size: 2.5, color: "#cbd5e1" },
  { x: 58, y: 35, size: 2, color: "#cbd5e1" },
];

export default function MapPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 600;
    const H = 300;
    canvas.width = W;
    canvas.height = H;

    let frame: number;
    let t = 0;

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      t += 0.015;

      // Grid lines
      ctx.strokeStyle = "rgba(203,213,225,0.04)";
      ctx.lineWidth = 0.5;
      for (let x = 0; x < W; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y < H; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      // Continent-like shapes (subtle, darker)
      ctx.fillStyle = "rgba(203,213,225,0.02)";
      ctx.beginPath();
      ctx.ellipse(180, 120, 100, 60, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(420, 140, 80, 50, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(300, 80, 60, 35, 0, 0, Math.PI * 2);
      ctx.fill();

      // Aircraft dots
      for (const ac of aircraftPositions) {
        const px = (ac.x / 100) * W;
        const py = (ac.y / 100) * H;
        const pulse = 0.5 + 0.5 * Math.sin(t * 2 + px * 0.01 + py * 0.01);

        // Glow
        const grad = ctx.createRadialGradient(px, py, 0, px, py, ac.size * 4);
        grad.addColorStop(0, ac.color + "40");
        grad.addColorStop(1, ac.color + "00");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, ac.size * 4, 0, Math.PI * 2);
        ctx.fill();

        // Dot
        ctx.globalAlpha = 0.6 + 0.4 * pulse;
        ctx.fillStyle = ac.color;
        ctx.beginPath();
        ctx.arc(px, py, ac.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      frame = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="relative w-full">
      {/* Browser-window chrome bar */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-[rgba(15,23,42,0.8)] border-b border-[var(--border-subtle)]">
        <span className="w-2 h-2 rounded-full bg-[#e2e8f0] opacity-60" />
        <span className="w-2 h-2 rounded-full bg-[#94a3b8] opacity-60" />
        <span className="w-2 h-2 rounded-full bg-[#cbd5e1] opacity-60" />
        <span className="ml-3 text-[10px] font-mono text-[var(--text-faint)]">
          aerointel.io/map
        </span>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          className="w-full h-auto block"
          style={{ imageRendering: "auto" }}
        />

        {/* HUD overlay */}
        <div className="absolute top-3 left-3 px-2.5 py-1.5 rounded-md bg-[rgba(6,8,13,0.85)] border border-[var(--border-subtle)] backdrop-blur-sm">
          <span className="text-[10px] font-mono text-[var(--text-muted)] block">LIVE TRACKING</span>
          <span className="text-sm font-mono font-bold text-slate-300">2,847</span>
        </div>

        {/* Mini controls */}
        <div className="absolute top-3 right-3 flex flex-col gap-1">
          <div className="w-6 h-6 rounded bg-[rgba(6,8,13,0.85)] border border-[var(--border-subtle)] flex items-center justify-center text-[10px] text-[var(--text-muted)]">+</div>
          <div className="w-6 h-6 rounded bg-[rgba(6,8,13,0.85)] border border-[var(--border-subtle)] flex items-center justify-center text-[10px] text-[var(--text-muted)]">-</div>
        </div>

        {/* Bottom status bar */}
        <div className="absolute bottom-0 left-0 right-0 px-3 py-1.5 bg-[rgba(6,8,13,0.85)] border-t border-[var(--border-subtle)] flex items-center justify-between">
          <span className="text-[9px] font-mono text-[var(--text-faint)]">METAR: ACTIVE</span>
          <span className="text-[9px] font-mono text-[var(--text-faint)]">LAYERS: 6</span>
          <span className="text-[9px] font-mono text-slate-300/70">3s REFRESH</span>
        </div>
      </div>
    </div>
  );
}
