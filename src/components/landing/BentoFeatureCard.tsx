"use client";

import { type ReactNode } from "react";

interface BentoFeatureCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  colSpan?: number;
  children?: ReactNode;
}

export default function BentoFeatureCard({
  title,
  description,
  icon,
  colSpan = 1,
  children,
}: BentoFeatureCardProps) {
  return (
    <div
      className={`group relative rounded-2xl border border-[var(--border-subtle)] overflow-hidden transition-all duration-500 hover:border-[rgba(56,189,248,0.3)] ${
        colSpan === 2 ? "sm:col-span-2" : "col-span-1"
      }`}
      style={{
        background:
          "linear-gradient(135deg, rgba(30,41,59,0.35) 0%, rgba(15,23,42,0.5) 100%)",
      }}
    >
      {/* Gradient border glow on hover */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
        style={{
          background:
            "radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 0%), rgba(56,189,248,0.06), transparent 40%)",
        }}
      />

      {/* Top glow line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(56,189,248,0.3)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

      <div className="relative p-6 h-full flex flex-col">
        <div className="flex items-start gap-4 mb-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(56,189,248,0.08)] border border-[rgba(56,189,248,0.1)] flex items-center justify-center text-[var(--accent-primary)] flex-shrink-0 group-hover:scale-110 group-hover:bg-[rgba(56,189,248,0.12)] transition-all duration-300">
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
              {title}
            </h3>
            <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {children && (
          <div className="mt-auto pt-4 flex-1 min-h-0">
            <div className="rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-[rgba(6,8,13,0.6)]">
              {children}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
