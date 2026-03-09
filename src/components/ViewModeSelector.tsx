"use client";

import type { ViewMode } from "@/types/viewMode";

interface Props {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

const MODES: { key: ViewMode; label: string; icon: string }[] = [
  { key: "normal", label: "Normal", icon: "M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" },
  { key: "heatmap", label: "Heatmap", icon: "M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" },
  { key: "trails", label: "Trails", icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" },
];

export default function ViewModeSelector({ value, onChange }: Props) {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] flex bg-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg shadow-lg overflow-hidden">
      {MODES.map((mode) => (
        <button
          key={mode.key}
          onClick={() => onChange(mode.key)}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all ${
            value === mode.key
              ? "bg-blue-600 text-white"
              : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mode.icon} />
          </svg>
          {mode.label}
        </button>
      ))}
    </div>
  );
}
