"use client";

import { useState, useRef, type ReactNode } from "react";

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  index: number;
}

export default function FeatureCard({ icon, title, description, index }: FeatureCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState("");

  const handleMouseMove = (e: React.MouseEvent) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / 20;
    const rotateY = (centerX - x) / 20;
    setTransform(`perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`);
  };

  const handleMouseLeave = () => {
    setTransform("");
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="group relative p-6 rounded-xl border border-[var(--border-subtle)] bg-[linear-gradient(135deg,rgba(28,28,28,0.4)_0%,rgba(10,10,10,0.6)_100%)] backdrop-blur-md hover:border-[rgba(56,189,248,0.2)] transition-all duration-300"
      style={{
        transform: transform || "perspective(600px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)",
        transition: transform ? "none" : "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.3s, box-shadow 0.3s",
        animationDelay: `${index * 50}ms`,
      }}
    >
      {/* Glow effect on hover */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{
        background: "radial-gradient(circle at 50% 0%, rgba(56, 189, 248, 0.06) 0%, transparent 60%)",
      }} />

      <div className="relative">
        <div className="w-10 h-10 rounded-lg bg-[var(--accent-primary-dim)] flex items-center justify-center text-[var(--accent-primary)] mb-4 group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1.5">{title}</h3>
        <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
