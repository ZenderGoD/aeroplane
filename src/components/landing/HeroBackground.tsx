"use client";

import { useEffect, useRef } from "react";

export default function HeroBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Particles representing aircraft
    const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number }[] = [];
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.3) * 0.6,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 1,
        alpha: Math.random() * 0.5 + 0.1,
      });
    }

    // Flight paths (curved arcs)
    const paths: { sx: number; sy: number; ex: number; ey: number; progress: number; speed: number }[] = [];
    for (let i = 0; i < 6; i++) {
      paths.push({
        sx: Math.random() * canvas.width * 0.3,
        sy: canvas.height * (0.3 + Math.random() * 0.4),
        ex: canvas.width * (0.7 + Math.random() * 0.3),
        ey: canvas.height * (0.2 + Math.random() * 0.5),
        progress: Math.random(),
        speed: 0.001 + Math.random() * 0.002,
      });
    }

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      t += 0.01;

      // Draw grid
      ctx.strokeStyle = "rgba(148, 163, 184, 0.03)";
      ctx.lineWidth = 1;
      const gridSize = 60;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw flight paths
      for (const path of paths) {
        const cx = (path.sx + path.ex) / 2;
        const cy = Math.min(path.sy, path.ey) - 100 - Math.random() * 0;

        ctx.strokeStyle = "rgba(56, 189, 248, 0.06)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(path.sx, path.sy);
        ctx.quadraticCurveTo(cx, cy, path.ex, path.ey);
        ctx.stroke();

        // Moving dot on path
        path.progress += path.speed;
        if (path.progress > 1) path.progress = 0;

        const p = path.progress;
        const px = (1 - p) * (1 - p) * path.sx + 2 * (1 - p) * p * cx + p * p * path.ex;
        const py = (1 - p) * (1 - p) * path.sy + 2 * (1 - p) * p * cy + p * p * path.ey;

        // Trail
        const grad = ctx.createRadialGradient(px, py, 0, px, py, 20);
        grad.addColorStop(0, "rgba(56, 189, 248, 0.3)");
        grad.addColorStop(1, "rgba(56, 189, 248, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, 20, 0, Math.PI * 2);
        ctx.fill();

        // Dot
        ctx.fillStyle = "rgba(56, 189, 248, 0.8)";
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.fillStyle = `rgba(148, 163, 184, ${p.alpha * (0.5 + 0.5 * Math.sin(t + p.x * 0.01))})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw connection lines between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            ctx.strokeStyle = `rgba(56, 189, 248, ${0.03 * (1 - dist / 150)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
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
      style={{ opacity: 0.7 }}
    />
  );
}
