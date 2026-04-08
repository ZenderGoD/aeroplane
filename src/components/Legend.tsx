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
  hiddenCategories?: Set<number>;
  onToggleCategory?: (category: number) => void;
}

export default function Legend({ inline = false, hiddenCategories, onToggleCategory }: Props) {
  return (
    <div
      className={inline ? "" : "absolute bottom-6 left-4 z-[1000] backdrop-blur rounded-lg px-3 py-2.5"}
      style={inline ? { background: 'var(--surface-2)' } : { background: 'var(--surface-2)', border: '1px solid var(--border-default)' }}
    >
      {!inline && (
        <div className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
          Aircraft Type
        </div>
      )}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {LEGEND_ITEMS.map((item) => {
          const isHidden = hiddenCategories?.has(item.category) ?? false;
          const isInteractive = !!onToggleCategory;
          return (
          <div
            key={item.category}
            className={`flex items-center gap-1.5 ${isInteractive ? "cursor-pointer select-none rounded px-1 py-0.5 -mx-1 transition-colors" : ""} ${isHidden ? "opacity-30" : ""}`}
            style={isInteractive ? { ['--hover-bg' as string]: 'var(--surface-3)' } : undefined}
            onMouseEnter={(e) => { if (isInteractive) e.currentTarget.style.background = 'var(--surface-3)'; }}
            onMouseLeave={(e) => { if (isInteractive) e.currentTarget.style.background = 'transparent'; }}
            onClick={() => onToggleCategory?.(item.category)}
          >
            <svg width="14" height="14" viewBox="0 0 14 14">
              {item.category === 8 ? (
                // Rotorcraft: circle + cross
                <g>
                  <circle cx="7" cy="7" r="2.5" fill={getCategoryColor(item.category)} />
                  <line x1="2" y1="7" x2="12" y2="7" stroke={getCategoryColor(item.category)} strokeWidth="1.5" />
                  <line x1="7" y1="2" x2="7" y2="12" stroke={getCategoryColor(item.category)} strokeWidth="1.5" />
                </g>
              ) : item.category === 2 ? (
                // Light: thin fuselage + straight wings
                <g>
                  <line x1="12" y1="7" x2="2" y2="7" stroke={getCategoryColor(item.category)} strokeWidth="1.5" />
                  <line x1="8" y1="2" x2="8" y2="12" stroke={getCategoryColor(item.category)} strokeWidth="1.5" />
                  <line x1="3" y1="4" x2="3" y2="10" stroke={getCategoryColor(item.category)} strokeWidth="1" />
                  <circle cx="12" cy="7" r="1" fill={getCategoryColor(item.category)} />
                </g>
              ) : item.category === 6 ? (
                // Heavy: wide body + swept wings
                <polygon
                  points="13,7 3,2 5,5 1,5 5,7 1,9 5,9 3,12"
                  fill={getCategoryColor(item.category)}
                />
              ) : item.category === 7 ? (
                // Fighter: delta + canards
                <g>
                  <polygon points="13,7 2,2 5,7 2,12" fill={getCategoryColor(item.category)} />
                  <polygon points="10,5 9,3 8,5" fill={getCategoryColor(item.category)} />
                  <polygon points="10,9 9,11 8,9" fill={getCategoryColor(item.category)} />
                </g>
              ) : (
                // Default plane
                <polygon
                  points="13,7 3,3 5.5,7 3,11"
                  fill={getCategoryColor(item.category)}
                />
              )}
            </svg>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {getCategoryLabel(item.category)}
            </span>
          </div>
          );
        })}
      </div>
    </div>
  );
}
