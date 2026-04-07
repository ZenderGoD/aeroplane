"use client";

import { Check } from "lucide-react";

interface PricingCardProps {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  cta: string;
}

export default function PricingCard({ name, price, period, description, features, highlighted, cta }: PricingCardProps) {
  return (
    <div
      className={`relative rounded-2xl p-[1px] ${
        highlighted
          ? "bg-[linear-gradient(135deg,rgba(148,163,184,0.4),rgba(203,213,225,0.4),rgba(148,163,184,0.2))]"
          : ""
      }`}
    >
      {highlighted && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[linear-gradient(135deg,#94a3b8,#cbd5e1)] text-xs font-semibold text-white">
          Most Popular
        </div>
      )}
      <div
        className={`relative h-full rounded-2xl p-8 ${
          highlighted
            ? "bg-[var(--surface-1)]"
            : "bg-[var(--surface-1)] border border-[var(--border-default)]"
        }`}
      >
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">{name}</h3>
          <p className="text-xs text-[var(--text-muted)] mb-4">{description}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-[var(--text-primary)] font-mono">{price}</span>
            {period && <span className="text-sm text-[var(--text-muted)]">{period}</span>}
          </div>
        </div>

        <button
          className={`w-full py-2.5 rounded-lg font-medium text-sm transition-colors mb-6 ${
            highlighted
              ? "bg-[var(--accent-primary)] text-[var(--surface-0)] hover:bg-slate-300"
              : "bg-[var(--surface-3)] text-[var(--text-secondary)] hover:bg-[var(--surface-4)] border border-[var(--border-default)]"
          }`}
        >
          {cta}
        </button>

        <ul className="space-y-3">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5">
              <Check size={14} className={`mt-0.5 flex-shrink-0 ${highlighted ? "text-[var(--accent-primary)]" : "text-[var(--status-nominal)]"}`} />
              <span className="text-sm text-[var(--text-secondary)]">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
