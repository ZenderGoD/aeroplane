"use client";

import { useEffect, useRef } from "react";

/* ── Plane SVG path (top-down silhouette) ─────────────────── */
// Path2D is browser-only — created lazily inside useEffect
let PLANE_PATH: Path2D | null = null;

interface Aircraft {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  heading: number;
  trailPoints: { x: number; y: number; age: number }[];
  blinkPhase: number;
}

export default function HeroBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!PLANE_PATH) {
      PLANE_PATH = new Path2D("M12 2L8 10H3L5 13H8L10 22H14L12 13H15L17 13H21L19 10H16L12 2Z");
    }
    const planePath = PLANE_PATH;

    let animId: number;
    let w = 0;
    let h = 0;

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    /* ── Create aircraft ──────────────────────────────────── */
    const aircraft: Aircraft[] = [];
    const NUM_PLANES = 12;

    function spawnAircraft(startRandom = true): Aircraft {
      // Random heading mostly left-to-right with some variation
      const headingDeg = -30 + Math.random() * 60; // -30° to +30°
      const headingRad = (headingDeg * Math.PI) / 180;
      const speed = 0.4 + Math.random() * 0.8;

      const x = startRandom ? Math.random() * w : -40;
      const y = startRandom ? Math.random() * h : Math.random() * h;

      return {
        x,
        y,
        vx: Math.cos(headingRad) * speed,
        vy: Math.sin(headingRad) * speed,
        size: 10 + Math.random() * 10,
        alpha: 0.15 + Math.random() * 0.35,
        heading: headingDeg,
        trailPoints: [],
        blinkPhase: Math.random() * Math.PI * 2,
      };
    }

    for (let i = 0; i < NUM_PLANES; i++) {
      aircraft.push(spawnAircraft(true));
    }

    /* ── Radar sweep ──────────────────────────────────────── */
    let radarAngle = 0;

    /* ── Great-circle route arcs (decorative) ─────────────── */
    const routes: { sx: number; sy: number; ex: number; ey: number; curve: number }[] = [];
    for (let i = 0; i < 4; i++) {
      routes.push({
        sx: w * (0.05 + Math.random() * 0.3),
        sy: h * (0.2 + Math.random() * 0.6),
        ex: w * (0.65 + Math.random() * 0.3),
        ey: h * (0.15 + Math.random() * 0.5),
        curve: -80 - Math.random() * 120,
      });
    }

    /* ── Draw loop ────────────────────────────────────────── */
    let frame = 0;

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
      frame++;

      /* — Subtle grid (runway/taxiway vibe) — */
      ctx.strokeStyle = "rgba(148, 163, 184, 0.025)";
      ctx.lineWidth = 1;
      const gridSize = 80;
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      /* — Great-circle route arcs — */
      for (const r of routes) {
        const cx = (r.sx + r.ex) / 2;
        const cy = Math.min(r.sy, r.ey) + r.curve;

        ctx.strokeStyle = "rgba(148, 163, 184, 0.035)";
        ctx.lineWidth = 1;
        ctx.setLineDash([8, 12]);
        ctx.beginPath();
        ctx.moveTo(r.sx, r.sy);
        ctx.quadraticCurveTo(cx, cy, r.ex, r.ey);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      /* — Radar sweep from center — */
      radarAngle += 0.004;
      const rcx = w * 0.5;
      const rcy = h * 0.45;
      const rRadius = Math.max(w, h) * 0.6;

      const sweepGrad = ctx.createConicalGradient
        ? null // not widely supported, use fallback
        : null;

      // Draw sweep as a filled arc sector
      const sweepWidth = 0.3; // radians
      ctx.beginPath();
      ctx.moveTo(rcx, rcy);
      ctx.arc(rcx, rcy, rRadius, radarAngle, radarAngle + sweepWidth);
      ctx.closePath();
      const grad = ctx.createRadialGradient(rcx, rcy, 0, rcx, rcy, rRadius);
      grad.addColorStop(0, "rgba(148, 163, 184, 0.03)");
      grad.addColorStop(1, "rgba(148, 163, 184, 0)");
      ctx.fillStyle = grad;
      ctx.fill();

      // Radar range rings
      for (const ringR of [rRadius * 0.25, rRadius * 0.5, rRadius * 0.75]) {
        ctx.strokeStyle = "rgba(148, 163, 184, 0.025)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(rcx, rcy, ringR, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Radar crosshair
      ctx.strokeStyle = "rgba(148, 163, 184, 0.02)";
      ctx.beginPath();
      ctx.moveTo(rcx - rRadius, rcy);
      ctx.lineTo(rcx + rRadius, rcy);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(rcx, rcy - rRadius);
      ctx.lineTo(rcx, rcy + rRadius);
      ctx.stroke();

      /* — Aircraft — */
      for (let i = aircraft.length - 1; i >= 0; i--) {
        const ac = aircraft[i];

        // Move
        ac.x += ac.vx;
        ac.y += ac.vy;

        // Add trail point every few frames
        if (frame % 3 === 0) {
          ac.trailPoints.push({ x: ac.x, y: ac.y, age: 0 });
        }

        // Age trail points and remove old ones
        for (let j = ac.trailPoints.length - 1; j >= 0; j--) {
          ac.trailPoints[j].age++;
          if (ac.trailPoints[j].age > 80) {
            ac.trailPoints.splice(j, 1);
          }
        }

        // Respawn if out of bounds
        if (ac.x > w + 60 || ac.x < -60 || ac.y > h + 60 || ac.y < -60) {
          aircraft[i] = spawnAircraft(false);
          continue;
        }

        // Draw contrail
        if (ac.trailPoints.length > 1) {
          ctx.beginPath();
          ctx.moveTo(ac.trailPoints[0].x, ac.trailPoints[0].y);
          for (let j = 1; j < ac.trailPoints.length; j++) {
            ctx.lineTo(ac.trailPoints[j].x, ac.trailPoints[j].y);
          }
          ctx.strokeStyle = `rgba(148, 163, 184, ${ac.alpha * 0.15})`;
          ctx.lineWidth = ac.size * 0.08;
          ctx.stroke();

          // Second, thinner contrail line (dual engine look)
          ctx.beginPath();
          ctx.moveTo(ac.trailPoints[0].x, ac.trailPoints[0].y);
          for (let j = 1; j < ac.trailPoints.length; j++) {
            ctx.lineTo(ac.trailPoints[j].x, ac.trailPoints[j].y);
          }
          ctx.strokeStyle = `rgba(200, 210, 225, ${ac.alpha * 0.06})`;
          ctx.lineWidth = ac.size * 0.2;
          ctx.stroke();
        }

        // Draw plane silhouette
        ctx.save();
        ctx.translate(ac.x, ac.y);
        ctx.rotate(((ac.heading + 90) * Math.PI) / 180); // +90 because SVG path points up
        const scale = ac.size / 24;
        ctx.scale(scale, scale);
        ctx.translate(-12, -12); // center the 24x24 path

        ctx.fillStyle = `rgba(203, 213, 225, ${ac.alpha})`;
        ctx.shadowColor = `rgba(203, 213, 225, ${ac.alpha * 0.5})`;
        ctx.shadowBlur = 8;
        ctx.fill(planePath);
        ctx.shadowBlur = 0;
        ctx.restore();

        // Nav light blink (red/green on wingtips, white strobe)
        ac.blinkPhase += 0.05;
        if (Math.sin(ac.blinkPhase) > 0.7) {
          // White strobe flash
          ctx.fillStyle = `rgba(255, 255, 255, ${ac.alpha * 0.8})`;
          ctx.beginPath();
          ctx.arc(ac.x, ac.y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      /* — Runway center line at bottom (decorative) — */
      const rlY = h * 0.92;
      ctx.strokeStyle = "rgba(148, 163, 184, 0.04)";
      ctx.lineWidth = 2;
      ctx.setLineDash([30, 20]);
      ctx.beginPath();
      ctx.moveTo(w * 0.2, rlY);
      ctx.lineTo(w * 0.8, rlY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Threshold marks
      for (let i = 0; i < 8; i++) {
        const tx = w * 0.18 - i * 0;
        const ty = rlY - 8 + i * 2;
        ctx.fillStyle = "rgba(148, 163, 184, 0.03)";
        ctx.fillRect(w * 0.18 + i * 8, rlY - 15, 3, 12);
      }

      animId = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.8 }}
    />
  );
}
