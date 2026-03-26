"use client";

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  type KeyboardEvent,
} from "react";
import type { FlightState } from "@/types/flight";
import type { ViewMode } from "@/types/viewMode";
import type { Airport } from "@/types/airport";
import type { Corridor } from "@/types/corridor";
import airportsData from "@/data/airports.json";
import { CORRIDORS } from "@/lib/corridors";

/* ── Airport data (parsed once) ─────────────────────── */
const airports: Airport[] = (airportsData as Record<string, unknown>[]).map(
  (raw) => ({
    id: raw.id as number,
    name: raw.name as string,
    city: raw.city as string,
    country: raw.country as string,
    iata: (raw.iata as string) || null,
    icao: (raw.icao as string) || null,
    lat: raw.lat as number,
    lon: raw.lon as number,
    altitude: raw.alt as number,
    timezone: (raw.tz as string) || "",
    type: (raw.type as Airport["type"]) || undefined,
  })
);

/* ── Fuzzy matching ─────────────────────────────────── */
function fuzzyMatch(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (t.includes(q)) return 100 + (q.length / t.length) * 50; // substring match bonus

  let qi = 0;
  let score = 0;
  let consecutive = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      qi++;
      consecutive++;
      score += consecutive * 2; // reward consecutive matches
    } else {
      consecutive = 0;
    }
  }
  return qi === q.length ? score : 0;
}

function bestFuzzy(query: string, targets: string[]): number {
  let best = 0;
  for (const t of targets) {
    const s = fuzzyMatch(query, t);
    if (s > best) best = s;
  }
  return best;
}

/* ── Result types ───────────────────────────────────── */
type ResultCategory = "flights" | "airports" | "corridors" | "actions";

interface SearchResult {
  id: string;
  category: ResultCategory;
  icon: string;
  primary: string;
  secondary: string;
  score: number;
  onSelect: () => void;
}

/* ── Actions definition ─────────────────────────────── */
interface ActionDef {
  id: string;
  label: string;
  secondary: string;
  icon: string;
  handler: () => void;
}

/* ── Props ──────────────────────────────────────────── */
interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allFlights: FlightState[];
  onSelectFlight: (flight: FlightState) => void;
  onSelectAirport: (icao: string) => void;
  onSelectCorridor: (id: string) => void;
  onToggleCorridors: () => void;
  onToggleWeather: () => void;
  onToggleMeasure: () => void;
  onToggleReplay: () => void;
  onViewModeChange: (mode: ViewMode) => void;
  onShowKeyboardHelp: () => void;
}

/* ── Category labels & ordering ─────────────────────── */
const CATEGORY_LABELS: Record<ResultCategory, string> = {
  flights: "Flights",
  airports: "Airports",
  corridors: "Corridors",
  actions: "Actions",
};

const CATEGORY_ORDER: ResultCategory[] = [
  "flights",
  "airports",
  "corridors",
  "actions",
];

const MAX_PER_CATEGORY = 8;
const MAX_TOTAL = 20;

/* ── Component ──────────────────────────────────────── */
export default function CommandPalette({
  open,
  onOpenChange,
  allFlights,
  onSelectFlight,
  onSelectAirport,
  onSelectCorridor,
  onToggleCorridors,
  onToggleWeather,
  onToggleMeasure,
  onToggleReplay,
  onViewModeChange,
  onShowKeyboardHelp,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      // Focus input after render
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Build actions list
  const actions = useMemo<ActionDef[]>(
    () => [
      {
        id: "toggle-corridors",
        label: "Toggle Corridors",
        secondary: "Show/hide air corridors",
        icon: "\u2194\uFE0F",
        handler: onToggleCorridors,
      },
      {
        id: "toggle-weather",
        label: "Toggle Weather Layer",
        secondary: "Show/hide weather overlay",
        icon: "\u26C5",
        handler: onToggleWeather,
      },
      {
        id: "toggle-measure",
        label: "Toggle Measure Mode",
        secondary: "Measure distances on the map",
        icon: "\uD83D\uDCCF",
        handler: onToggleMeasure,
      },
      {
        id: "toggle-replay",
        label: "Toggle Replay Mode",
        secondary: "Replay flight history",
        icon: "\u23EA",
        handler: onToggleReplay,
      },
      {
        id: "view-normal",
        label: "Change View: Normal",
        secondary: "Default map view",
        icon: "\uD83D\uDDFA\uFE0F",
        handler: () => onViewModeChange("normal"),
      },
      {
        id: "view-heatmap",
        label: "Change View: Heatmap",
        secondary: "Traffic density view",
        icon: "\uD83D\uDD25",
        handler: () => onViewModeChange("heatmap"),
      },
      {
        id: "view-trails",
        label: "Change View: Trails",
        secondary: "Flight trail visualization",
        icon: "\u2728",
        handler: () => onViewModeChange("trails"),
      },
      {
        id: "keyboard-shortcuts",
        label: "Keyboard Shortcuts",
        secondary: "View all keyboard shortcuts",
        icon: "\u2328\uFE0F",
        handler: onShowKeyboardHelp,
      },
    ],
    [
      onToggleCorridors,
      onToggleWeather,
      onToggleMeasure,
      onToggleReplay,
      onViewModeChange,
      onShowKeyboardHelp,
    ]
  );

  // Compute filtered results
  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim();

    // When empty, show a curated set of actions
    if (!q) {
      return actions.map((a) => ({
        id: `action-${a.id}`,
        category: "actions" as ResultCategory,
        icon: a.icon,
        primary: a.label,
        secondary: a.secondary,
        score: 0,
        onSelect: a.handler,
      }));
    }

    const buckets: Record<ResultCategory, SearchResult[]> = {
      flights: [],
      airports: [],
      corridors: [],
      actions: [],
    };

    // Search flights
    for (const f of allFlights) {
      const targets = [f.callsign ?? "", f.icao24];
      const score = bestFuzzy(q, targets);
      if (score > 0 && buckets.flights.length < MAX_PER_CATEGORY) {
        const alt = f.baroAltitude
          ? `${Math.round(f.baroAltitude * 3.28084).toLocaleString()} ft`
          : "N/A";
        const spd = f.velocity
          ? `${Math.round(f.velocity * 1.944)} kts`
          : "N/A";
        buckets.flights.push({
          id: `flight-${f.icao24}`,
          category: "flights",
          icon: "\u2708\uFE0F",
          primary: f.callsign?.trim() || f.icao24,
          secondary: `${f.icao24} \u00B7 ${alt} \u00B7 ${spd}`,
          score,
          onSelect: () => onSelectFlight(f),
        });
      }
    }

    // Search airports
    for (const a of airports) {
      if (!a.icao) continue;
      const targets = [
        a.icao,
        a.iata ?? "",
        a.name,
        a.city,
      ];
      const score = bestFuzzy(q, targets);
      if (score > 0 && buckets.airports.length < MAX_PER_CATEGORY) {
        buckets.airports.push({
          id: `airport-${a.icao}`,
          category: "airports",
          icon: "\uD83D\uDEEB",
          primary: `${a.icao}${a.iata ? ` / ${a.iata}` : ""}`,
          secondary: `${a.name} \u00B7 ${a.city}`,
          score,
          onSelect: () => onSelectAirport(a.icao!),
        });
      }
    }

    // Search corridors
    for (const c of CORRIDORS) {
      const targets = [c.name, c.id, c.originIcao, c.destinationIcao];
      const score = bestFuzzy(q, targets);
      if (score > 0 && buckets.corridors.length < MAX_PER_CATEGORY) {
        buckets.corridors.push({
          id: `corridor-${c.id}`,
          category: "corridors",
          icon: "\uD83D\uDEE4\uFE0F",
          primary: c.name,
          secondary: `${c.originIcao} \u2192 ${c.destinationIcao}`,
          score,
          onSelect: () => onSelectCorridor(c.id),
        });
      }
    }

    // Search actions
    for (const a of actions) {
      const score = bestFuzzy(q, [a.label, a.secondary]);
      if (score > 0) {
        buckets.actions.push({
          id: `action-${a.id}`,
          category: "actions",
          icon: a.icon,
          primary: a.label,
          secondary: a.secondary,
          score,
          onSelect: a.handler,
        });
      }
    }

    // Sort each bucket by score descending
    for (const key of CATEGORY_ORDER) {
      buckets[key].sort((a, b) => b.score - a.score);
    }

    // Flatten in category order, respecting limits
    const flat: SearchResult[] = [];
    for (const cat of CATEGORY_ORDER) {
      for (const r of buckets[cat]) {
        if (flat.length >= MAX_TOTAL) break;
        flat.push(r);
      }
    }

    return flat;
  }, [query, allFlights, actions, onSelectFlight, onSelectAirport, onSelectCorridor]);

  // Clamp active index
  useEffect(() => {
    if (activeIndex >= results.length) {
      setActiveIndex(Math.max(0, results.length - 1));
    }
  }, [results.length, activeIndex]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const active = listRef.current.querySelector(
      `[data-index="${activeIndex}"]`
    );
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  const selectItem = useCallback(
    (index: number) => {
      const item = results[index];
      if (item) {
        close();
        // Defer to allow modal to close first
        requestAnimationFrame(() => item.onSelect());
      }
    },
    [results, close]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((i) => (i + 1) % Math.max(1, results.length));
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex(
            (i) => (i - 1 + results.length) % Math.max(1, results.length)
          );
          break;
        case "Enter":
          e.preventDefault();
          selectItem(activeIndex);
          break;
        case "Escape":
          e.preventDefault();
          close();
          break;
      }
    },
    [results.length, activeIndex, selectItem, close]
  );

  if (!open) return null;

  // Group results by category for rendering
  const grouped: { category: ResultCategory; items: SearchResult[] }[] = [];
  let currentCat: ResultCategory | null = null;
  for (const r of results) {
    if (r.category !== currentCat) {
      currentCat = r.category;
      grouped.push({ category: r.category, items: [] });
    }
    grouped[grouped.length - 1].items.push(r);
  }

  // Map from result to flat index
  let flatIndex = 0;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "min(20vh, 160px)",
        background:
          "color-mix(in srgb, var(--surface-0) 80%, transparent)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        animation: "cmdPaletteFadeIn 150ms var(--ease-out-expo)",
      }}
      onClick={close}
    >
      {/* Inline keyframes */}
      <style>{`
        @keyframes cmdPaletteFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes cmdPaletteSlideIn {
          from { opacity: 0; transform: scale(0.96) translateY(-8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 560,
          margin: "0 16px",
          background: "var(--surface-1)",
          border: "1px solid var(--border-default)",
          borderRadius: 16,
          boxShadow:
            "0 24px 64px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03) inset",
          overflow: "hidden",
          animation: "cmdPaletteSlideIn 200ms var(--ease-spring)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "min(70vh, 520px)",
        }}
      >
        {/* Search input */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 16px",
            borderBottom: "1px solid var(--border-default)",
          }}
        >
          <svg
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-muted)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flexShrink: 0 }}
          >
            <circle cx={11} cy={11} r={8} />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search flights, airports, actions..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text-primary)",
              fontSize: 15,
              fontFamily: "inherit",
              lineHeight: 1.4,
            }}
          />
          <kbd
            style={{
              fontSize: 11,
              padding: "2px 6px",
              borderRadius: 5,
              background: "var(--surface-3)",
              color: "var(--text-muted)",
              border: "1px solid var(--border-default)",
              fontFamily: "inherit",
              lineHeight: 1.4,
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results list */}
        <div
          ref={listRef}
          style={{
            overflowY: "auto",
            padding: "6px 0",
          }}
        >
          {results.length === 0 ? (
            <div
              style={{
                padding: "32px 16px",
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: 14,
              }}
            >
              No results for &ldquo;{query}&rdquo;
            </div>
          ) : (
            grouped.map((group) => {
              const header = (
                <div
                  key={`header-${group.category}`}
                  className="section-label"
                  style={{
                    padding: "8px 16px 4px",
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "var(--text-muted)",
                  }}
                >
                  {CATEGORY_LABELS[group.category]}
                </div>
              );

              const rows = group.items.map((item) => {
                const idx = flatIndex++;
                const isActive = idx === activeIndex;
                return (
                  <div
                    key={item.id}
                    data-index={idx}
                    onClick={() => selectItem(idx)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 16px",
                      margin: "0 6px",
                      borderRadius: 8,
                      cursor: "pointer",
                      transition: "background 80ms ease",
                      background: isActive
                        ? "var(--surface-3)"
                        : "transparent",
                      borderLeft: isActive
                        ? "2px solid var(--border-accent)"
                        : "2px solid transparent",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 16,
                        width: 24,
                        textAlign: "center",
                        flexShrink: 0,
                      }}
                    >
                      {item.icon}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          color: "var(--text-primary)",
                          fontSize: 14,
                          fontWeight: 500,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {item.primary}
                      </div>
                      <div
                        style={{
                          color: "var(--text-tertiary)",
                          fontSize: 12,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {item.secondary}
                      </div>
                    </div>
                    {isActive && (
                      <kbd
                        style={{
                          fontSize: 10,
                          padding: "1px 5px",
                          borderRadius: 4,
                          background: "var(--surface-4)",
                          color: "var(--text-muted)",
                          border: "1px solid var(--border-default)",
                          fontFamily: "inherit",
                          flexShrink: 0,
                        }}
                      >
                        ENTER
                      </kbd>
                    )}
                  </div>
                );
              });

              return [header, ...rows];
            })
          )}
        </div>

        {/* Footer hint */}
        <div
          style={{
            padding: "8px 16px",
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            gap: 16,
            fontSize: 11,
            color: "var(--text-faint)",
          }}
        >
          <span>
            <kbd
              style={{
                padding: "1px 4px",
                borderRadius: 3,
                background: "var(--surface-3)",
                border: "1px solid var(--border-subtle)",
                marginRight: 4,
              }}
            >
              &uarr;&darr;
            </kbd>
            Navigate
          </span>
          <span>
            <kbd
              style={{
                padding: "1px 4px",
                borderRadius: 3,
                background: "var(--surface-3)",
                border: "1px solid var(--border-subtle)",
                marginRight: 4,
              }}
            >
              &crarr;
            </kbd>
            Select
          </span>
          <span>
            <kbd
              style={{
                padding: "1px 4px",
                borderRadius: 3,
                background: "var(--surface-3)",
                border: "1px solid var(--border-subtle)",
                marginRight: 4,
              }}
            >
              esc
            </kbd>
            Close
          </span>
        </div>
      </div>
    </div>
  );
}
