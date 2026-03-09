"use client";

import { getCategoryColor, getCategoryLabel } from "./CanvasPlaneLayer";

const LEGEND_ITEMS = [
  { category: 6, label: "Heavy" },
  { category: 4, label: "Large" },
  { category: 3, label: "Small" },
  { category: 2, label: "Light" },
  { category: 5, label: "High Vortex" },
  { category: 7, label: "High Perf" },
  { category: 8, label: "Rotorcraft" },
  { category: 0, label: "Unknown" },
];

interface Props {
  inline?: boolean;
}

export default function Legend({ inline = false }: Props) {
  return (
    <div className={inline ? "" : "absolute bottom-6 left-4 z-[1000] bg-gray-900/90 backdrop-blur border border-gray-700 rounded-lg px-3 py-2.5"}>
      {!inline && (
        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
          Aircraft Type
        </div>
      )}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {LEGEND_ITEMS.map((item) => (
          <div key={item.category} className="flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 12 12">
              <polygon
                points="12,6 3,2 5,6 3,10"
                fill={getCategoryColor(item.category)}
              />
            </svg>
            <span className="text-[11px] text-gray-300">
              {getCategoryLabel(item.category)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
