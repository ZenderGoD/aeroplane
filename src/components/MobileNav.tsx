"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import SearchBar from "@/components/SearchBar";
import type { SearchBarHandle } from "@/components/SearchBar";
import RegionSelector from "@/components/RegionSelector";
import type { ViewMode } from "@/types/viewMode";

/* ── Tab definitions ───────────────────────────────────── */

type TabKey = "map" | "search" | "layers" | "tools" | "menu";

const TABS: { key: TabKey; label: string; icon: string }[] = [
  {
    key: "map",
    label: "Map",
    icon: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7",
  },
  {
    key: "search",
    label: "Search",
    icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  },
  {
    key: "layers",
    label: "Layers",
    icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
  },
  {
    key: "tools",
    label: "Tools",
    icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
  },
  {
    key: "menu",
    label: "More",
    icon: "M4 6h16M4 12h16M4 18h16",
  },
];

/* ── View mode + tool + data layer definitions ─────────── */

const VIEW_MODES: { key: ViewMode; label: string; icon: string }[] = [
  { key: "normal", label: "Normal", icon: "M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" },
  { key: "heatmap", label: "Heatmap", icon: "M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" },
  { key: "trails", label: "Trails", icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" },
  { key: "globe", label: "Globe", icon: "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" },
  { key: "airport", label: "Airport", icon: "M12 19V5m0 0l-3 3m3-3l3 3M5 12a7 7 0 1014 0M3 12a9 9 0 1118 0 9 9 0 01-18 0z" },
  { key: "fids", label: "FIDS", icon: "M4 6h16M4 10h16M4 14h16M4 18h16" },
  { key: "fleet", label: "Fleet", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
  { key: "aircraft", label: "Aircraft", icon: "M12 2L9.5 8.5 2 10.5v1.5l7.5 2L12 22l2.5-8 7.5-2v-1.5L14.5 8.5 12 2z" },
  { key: "stats", label: "Stats", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { key: "comparison", label: "Compare", icon: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" },
  { key: "alerts", label: "Alerts", icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" },
  { key: "turbulence", label: "Turb.", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
  { key: "embed", label: "Embed", icon: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" },
  { key: "api", label: "API", icon: "M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { key: "exports", label: "Export", icon: "M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
];

const TOOL_BUTTONS = [
  { key: "measure", label: "Measure", color: "#cbd5e1", icon: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" },
  { key: "replay", label: "Replay", color: "#94a3b8", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  { key: "corridors", label: "Corridors", color: "#cbd5e1", icon: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" },
  { key: "separation", label: "Separation", color: "#94a3b8", icon: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" },
  { key: "weather", label: "Weather", color: "#94a3b8", icon: "M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" },
] as const;

const DATA_LAYERS = [
  { key: "metar", label: "METAR", color: "#cbd5e1", icon: "M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" },
  { key: "runways", label: "Runways", color: "#cbd5e1", icon: "M4 20h16M4 4l8 8 8-8" },
  { key: "density", label: "Density", color: "#94a3b8", icon: "M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" },
  { key: "winds", label: "Winds", color: "#cbd5e1", icon: "M5 12h14M12 5l7 7-7 7" },
  { key: "terrain", label: "Terrain", color: "#94a3b8", icon: "M4 20l4.5-9 3.5 4 4-8 4 13H4z" },
  { key: "pirep", label: "PIREPs", color: "#e2e8f0", icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" },
];

/* ── Props ─────────────────────────────────────────────── */

interface MobileNavProps {
  // Search
  searchBarRef: React.RefObject<SearchBarHandle | null>;
  rawQuery: string;
  onRawQueryChange: (value: string) => void;
  isAISearching: boolean;
  isNaturalLanguage: boolean;
  // Region
  regionKey: string;
  onRegionChange: (key: string) => void;
  // View mode
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  // Tools
  measureActive: boolean;
  onMeasureToggle: () => void;
  replayActive: boolean;
  onReplayToggle: () => void;
  corridorsVisible: boolean;
  onCorridorsToggle: () => void;
  flightDistanceActive: boolean;
  onFlightDistanceToggle: () => void;
  // Weather
  weatherVisible?: boolean;
  onWeatherToggle?: () => void;
  // Data layers
  metarVisible?: boolean;
  onMetarToggle?: () => void;
  runwaysVisible?: boolean;
  onRunwaysToggle?: () => void;
  routeDensityVisible?: boolean;
  onRouteDensityToggle?: () => void;
  windAloftVisible?: boolean;
  onWindAloftToggle?: () => void;
  terrainVisible?: boolean;
  onTerrainToggle?: () => void;
  pirepVisible?: boolean;
  onPirepToggle?: () => void;
  routeLinesVisible?: boolean;
  onRouteLinesToggle?: () => void;
}

/* ── Component ─────────────────────────────────────────── */

export default function MobileNav({
  searchBarRef,
  rawQuery,
  onRawQueryChange,
  isAISearching,
  isNaturalLanguage,
  regionKey,
  onRegionChange,
  viewMode,
  onViewModeChange,
  measureActive,
  onMeasureToggle,
  replayActive,
  onReplayToggle,
  corridorsVisible,
  onCorridorsToggle,
  flightDistanceActive,
  onFlightDistanceToggle,
  weatherVisible,
  onWeatherToggle,
  metarVisible,
  onMetarToggle,
  runwaysVisible,
  onRunwaysToggle,
  routeDensityVisible,
  onRouteDensityToggle,
  windAloftVisible,
  onWindAloftToggle,
  terrainVisible,
  onTerrainToggle,
  pirepVisible,
  onPirepToggle,
  routeLinesVisible,
  onRouteLinesToggle,
}: MobileNavProps) {
  const [activeSheet, setActiveSheet] = useState<TabKey | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number>(0);
  const dragCurrentY = useRef<number>(0);
  const isDragging = useRef(false);

  const toolStates: Record<string, boolean> = {
    measure: measureActive,
    replay: replayActive,
    corridors: corridorsVisible,
    separation: flightDistanceActive,
    weather: weatherVisible ?? false,
  };

  const toolToggles: Record<string, () => void> = {
    measure: onMeasureToggle,
    replay: onReplayToggle,
    corridors: onCorridorsToggle,
    separation: onFlightDistanceToggle,
    weather: onWeatherToggle ?? (() => {}),
  };

  const dataLayerStates: Record<string, boolean> = {
    metar: metarVisible ?? false,
    runways: runwaysVisible ?? false,
    density: routeDensityVisible ?? false,
    winds: windAloftVisible ?? false,
    terrain: terrainVisible ?? false,
    pirep: pirepVisible ?? false,
    routes: routeLinesVisible ?? false,
  };

  const dataLayerToggles: Record<string, () => void> = {
    metar: onMetarToggle ?? (() => {}),
    runways: onRunwaysToggle ?? (() => {}),
    density: onRouteDensityToggle ?? (() => {}),
    winds: onWindAloftToggle ?? (() => {}),
    terrain: onTerrainToggle ?? (() => {}),
    pirep: onPirepToggle ?? (() => {}),
    routes: onRouteLinesToggle ?? (() => {}),
  };

  const handleTabTap = useCallback((key: TabKey) => {
    if (key === "map") {
      setActiveSheet(null);
      return;
    }
    setActiveSheet((prev) => (prev === key ? null : key));
  }, []);

  const closeSheet = useCallback(() => setActiveSheet(null), []);

  /* ── Touch drag-to-dismiss ────────────────────────────── */
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    dragCurrentY.current = e.touches[0].clientY;
    isDragging.current = true;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    dragCurrentY.current = e.touches[0].clientY;
    const delta = dragCurrentY.current - dragStartY.current;
    if (delta > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${delta}px)`;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const delta = dragCurrentY.current - dragStartY.current;
    if (sheetRef.current) {
      sheetRef.current.style.transform = "";
    }
    if (delta > 100) {
      closeSheet();
    }
  }, [closeSheet]);

  /* ── Close sheet on Escape key ────────────────────────── */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSheet();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeSheet]);

  /* ── Sheet content renderer ──────────────────────────── */
  const renderSheetContent = () => {
    switch (activeSheet) {
      case "search":
        return (
          <div className="space-y-4">
            <div className="section-label">Search Flights</div>
            <SearchBar
              ref={searchBarRef}
              value={rawQuery}
              onChange={onRawQueryChange}
              isAISearching={isAISearching}
              isNaturalLanguage={isNaturalLanguage}
              inline
            />
            <div className="section-label mt-4">Region</div>
            <RegionSelector value={regionKey} onChange={onRegionChange} inline />
          </div>
        );

      case "layers":
        return (
          <div className="space-y-4">
            <div className="section-label">Data Layers</div>
            <div className="grid grid-cols-3 gap-3">
              {DATA_LAYERS.map((layer) => {
                const active = dataLayerStates[layer.key];
                return (
                  <button
                    key={layer.key}
                    onClick={dataLayerToggles[layer.key]}
                    className="mobile-tool-btn relative flex flex-col items-center gap-2 py-4 px-2 rounded-xl text-[11px] font-semibold"
                    style={{
                      background: active
                        ? `linear-gradient(180deg, var(--surface-4), var(--surface-3))`
                        : "var(--surface-2)",
                      border: active
                        ? `1px solid ${layer.color}30`
                        : "1px solid transparent",
                      color: active ? "#fff" : "var(--text-muted)",
                      boxShadow: active ? `0 0 16px -2px ${layer.color}15` : "none",
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{
                        background: active ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.03)",
                      }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={layer.icon} />
                      </svg>
                    </div>
                    {layer.label}
                    {active && (
                      <div
                        className="absolute top-2 right-2 w-2 h-2 rounded-full animate-pulse"
                        style={{ backgroundColor: layer.color }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );

      case "tools":
        return (
          <div className="space-y-4">
            <div className="section-label">Operations</div>
            <div className="grid grid-cols-3 gap-3">
              {TOOL_BUTTONS.map((tool) => {
                const active = toolStates[tool.key];
                return (
                  <button
                    key={tool.key}
                    onClick={() => {
                      toolToggles[tool.key]();
                      closeSheet();
                    }}
                    className="mobile-tool-btn relative flex flex-col items-center gap-2 py-4 px-2 rounded-xl text-[11px] font-semibold"
                    style={{
                      background: active
                        ? `linear-gradient(180deg, var(--surface-4), var(--surface-3))`
                        : "var(--surface-2)",
                      border: active
                        ? `1px solid ${tool.color}30`
                        : "1px solid transparent",
                      color: active ? "#fff" : "var(--text-muted)",
                      boxShadow: active ? `0 0 16px -2px ${tool.color}15` : "none",
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{
                        background: active ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.03)",
                      }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tool.icon} />
                      </svg>
                    </div>
                    {tool.label}
                    {active && (
                      <div
                        className="absolute top-2 right-2 w-2 h-2 rounded-full animate-pulse"
                        style={{ backgroundColor: tool.color }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );

      case "menu":
        return (
          <div className="space-y-4">
            <div className="section-label">View Modes</div>
            <div className="grid grid-cols-4 gap-2">
              {VIEW_MODES.map((mode) => (
                <button
                  key={mode.key}
                  onClick={() => {
                    onViewModeChange(mode.key);
                    closeSheet();
                  }}
                  className="mobile-tool-btn relative flex flex-col items-center gap-1.5 py-3 rounded-xl text-[10px] font-semibold"
                  style={{
                    background: viewMode === mode.key ? "var(--surface-4)" : "var(--surface-2)",
                    color: viewMode === mode.key ? "var(--accent-primary)" : "var(--text-muted)",
                    border: viewMode === mode.key
                      ? "1px solid var(--border-accent)"
                      : "1px solid transparent",
                  }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mode.icon} />
                  </svg>
                  {mode.label}
                  {viewMode === mode.key && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ background: "var(--accent-primary)" }} />
                  )}
                </button>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="md:hidden">
      {/* ── Backdrop overlay ────────────────────────────── */}
      {activeSheet && (
        <div
          className="fixed inset-0 z-[1098] bg-black/40 animate-fade-in"
          onClick={closeSheet}
        />
      )}

      {/* ── Bottom Sheet Panel ─────────────────────────── */}
      <div
        ref={sheetRef}
        className={`fixed left-0 right-0 bottom-[calc(env(safe-area-inset-bottom)+60px)] z-[1099] rounded-t-2xl transition-transform duration-300 ${
          activeSheet ? "translate-y-0" : "translate-y-full pointer-events-none"
        }`}
        style={{
          background: "var(--surface-1)",
          borderTop: "1px solid var(--border-default)",
          maxHeight: "55vh",
          transitionTimingFunction: "var(--ease-out-expo)",
        }}
      >
        {/* Drag handle */}
        <div
          className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-10 h-1 rounded-full bg-slate-600" />
        </div>

        {/* Scrollable content */}
        <div className="px-4 pb-4 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent" style={{ maxHeight: "calc(55vh - 28px)" }}>
          {renderSheetContent()}
        </div>
      </div>

      {/* ── Bottom Tab Bar ─────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-[1100] flex items-center justify-around"
        style={{
          background: "var(--surface-1)",
          borderTop: "1px solid var(--border-default)",
          paddingBottom: "env(safe-area-inset-bottom)",
          height: "calc(60px + env(safe-area-inset-bottom))",
        }}
      >
        {TABS.map((tab) => {
          const isActive = tab.key === "map" ? !activeSheet : activeSheet === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabTap(tab.key)}
              className="flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[44px] py-1.5 transition-colors duration-150"
              style={{
                color: isActive ? "var(--accent-primary)" : "var(--text-muted)",
              }}
              aria-label={tab.label}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
              <span className="text-[10px] font-semibold leading-none">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
