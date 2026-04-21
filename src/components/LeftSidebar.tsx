"use client";

import { useState } from "react";
import { MAP_STYLES, getSavedMapStyleId, saveMapStyleId } from "@/lib/mapStyles";
import SearchBar from "@/components/SearchBar";
import type { SearchBarHandle } from "@/components/SearchBar";
import RegionSelector from "@/components/RegionSelector";
import FlightCounter from "@/components/FlightCounter";
import Legend from "@/components/Legend";
import AnomalyAlert from "@/components/AnomalyAlert";
import StatsPanel from "@/components/StatsPanel";
import IntelligencePanel from "@/components/IntelligencePanel";
import ThemeToggle from "@/components/ThemeToggle";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ViewMode } from "@/types/viewMode";
import type { FlightState } from "@/types/flight";
import type { Anomaly } from "@/types/anomaly";

interface LeftSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  // Search
  searchBarRef: React.RefObject<SearchBarHandle | null>;
  rawQuery: string;
  onRawQueryChange: (value: string) => void;
  isAISearching: boolean;
  isNaturalLanguage: boolean;
  // Region
  regionKey: string;
  onRegionChange: (key: string) => void;
  // Flight counter
  totalCount: number;
  filteredCount: number;
  isFiltered: boolean;
  isRefreshing: boolean;
  isRateLimited: boolean;
  lastUpdated: Date | null;
  // View mode
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  // Tools
  flights: FlightState[];
  measureActive: boolean;
  onMeasureToggle: () => void;
  replayActive: boolean;
  onReplayToggle: () => void;
  corridorsVisible: boolean;
  onCorridorsToggle: () => void;
  flightDistanceActive: boolean;
  onFlightDistanceToggle: () => void;
  // Anomalies
  anomalies: Anomaly[];
  onSelectFlight: (flight: FlightState | null) => void;
  allFlights: FlightState[];
  // Category filtering
  hiddenCategories?: Set<number>;
  onToggleCategory?: (category: number) => void;
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
  // Airport detail
  onSelectAirport?: (icao: string) => void;
  // Autocomplete airline selection
  onSelectAirline?: (icaoCode: string) => void;
}

const VIEW_MODES: { key: ViewMode; label: string; icon: string }[] = [
  {
    key: "normal",
    label: "Normal",
    icon: "M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z",
  },
  {
    key: "heatmap",
    label: "Heatmap",
    icon: "M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z",
  },
  {
    key: "trails",
    label: "Trails",
    icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
  },
  {
    key: "globe",
    label: "Globe",
    icon: "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9",
  },
  {
    key: "airport",
    label: "Airport",
    icon: "M12 19V5m0 0l-3 3m3-3l3 3M5 12a7 7 0 1014 0M3 12a9 9 0 1118 0 9 9 0 01-18 0z",
  },
  {
    key: "fids",
    label: "FIDS",
    icon: "M4 6h16M4 10h16M4 14h16M4 18h16",
  },
  {
    key: "fleet",
    label: "Fleet",
    icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  },
  {
    key: "aircraft",
    label: "Aircraft",
    icon: "M12 2L9.5 8.5 2 10.5v1.5l7.5 2L12 22l2.5-8 7.5-2v-1.5L14.5 8.5 12 2z",
  },
  {
    key: "stats",
    label: "Stats",
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  },
  {
    key: "comparison",
    label: "Compare",
    icon: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4",
  },
  {
    key: "alerts",
    label: "Alerts",
    icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
  },
  {
    key: "turbulence",
    label: "Turb.",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
  },
  {
    key: "embed",
    label: "Embed",
    icon: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4",
  },
  {
    key: "api",
    label: "API",
    icon: "M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  },
  {
    key: "exports",
    label: "Export",
    icon: "M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  },
];

const TOOL_BUTTONS = [
  { key: "measure", label: "Measure", color: "var(--accent-primary)", icon: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" },
  { key: "replay", label: "Replay", color: "var(--accent-primary)", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  { key: "corridors", label: "Corridors", color: "var(--accent-primary)", icon: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" },
  { key: "separation", label: "Separation", color: "var(--accent-primary)", icon: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" },
  { key: "weather", label: "Weather", color: "var(--accent-primary)", icon: "M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" },
] as const;

function MapStyleSection() {
  const [currentId, setCurrentId] = useState(getSavedMapStyleId);
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="section-label mb-2.5 w-full flex items-center justify-between cursor-pointer hover:opacity-80"
      >
        <span>Map Style</span>
        <svg
          className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        <div className="grid grid-cols-2 gap-1.5">
          {MAP_STYLES.map((ms) => {
            const active = currentId === ms.id;
            return (
              <button
                key={ms.id}
                onClick={() => {
                  setCurrentId(ms.id);
                  saveMapStyleId(ms.id);
                  window.location.reload();
                }}
                className="flex flex-col items-start gap-0.5 py-2 px-2.5 rounded-lg text-xs transition-all text-left"
                style={{
                  background: active
                    ? "linear-gradient(180deg, var(--surface-4), var(--surface-3))"
                    : "var(--surface-2)",
                  border: active
                    ? "1px solid rgba(255,255,255,0.2)"
                    : "1px solid transparent",
                  color: active ? "#fff" : "var(--text-muted)",
                }}
              >
                <span className="text-xs font-bold leading-tight">{ms.name}</span>
                <span className="opacity-50 leading-tight">{ms.preview}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function LeftSidebar({
  collapsed,
  onToggleCollapse,
  searchBarRef,
  rawQuery,
  onRawQueryChange,
  isAISearching,
  isNaturalLanguage,
  regionKey,
  onRegionChange,
  totalCount,
  filteredCount,
  isFiltered,
  isRefreshing,
  isRateLimited,
  lastUpdated,
  viewMode,
  onViewModeChange,
  flights,
  measureActive,
  onMeasureToggle,
  replayActive,
  onReplayToggle,
  corridorsVisible,
  onCorridorsToggle,
  flightDistanceActive,
  onFlightDistanceToggle,
  anomalies,
  onSelectFlight,
  allFlights,
  hiddenCategories,
  onToggleCategory,
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
  onSelectAirport,
  onSelectAirline,
}: LeftSidebarProps) {
  const [legendExpanded, setLegendExpanded] = useState(false);

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

  const toolTips: Record<string, string> = {
    measure: "Click two points to measure distance",
    replay: "Replay flight history timelapse",
    corridors: "Show air corridors with health + predictability",
    separation: "Click two aircraft to measure separation distance",
    weather: "Toggle weather radar overlay",
  };

  const DATA_LAYERS: { key: string; label: string; color: string; icon: string }[] = [
    { key: "metar", label: "METAR", color: "var(--accent-primary)", icon: "M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" },
    { key: "runways", label: "Runways", color: "var(--text-secondary)", icon: "M4 20h16M4 4l8 8 8-8" },
    { key: "density", label: "Density", color: "var(--accent-primary)", icon: "M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" },
    { key: "winds", label: "Winds", color: "var(--accent-primary)", icon: "M5 12h14M12 5l7 7-7 7" },
    { key: "terrain", label: "Terrain", color: "var(--accent-primary)", icon: "M4 20l4.5-9 3.5 4 4-8 4 13H4z" },
    { key: "pirep", label: "PIREPs", color: "var(--accent-primary)", icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" },
    { key: "routes", label: "Routes", color: "var(--accent-primary)", icon: "M3 17l4-4 4 4 4-8 5 6M3 3v18h18" },
  ];

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

  const dataLayerTips: Record<string, string> = {
    metar: "Real airport weather (METAR) reports",
    runways: "Airport runway layouts for 60+ airports",
    density: "Route density heatmap from flight data",
    winds: "Wind aloft vectors & jet stream from NOAA",
    terrain: "Terrain elevation & satellite imagery",
    pirep: "Real pilot reports (turbulence & icing)",
    routes: "Flight route lines (great circle arcs)",
  };

  return (
    <div className="hidden md:block">
      {/* Collapsed toggle button */}
      <button
        onClick={onToggleCollapse}
        className={`fixed top-4 left-0 z-[1001] rounded-r-xl px-2.5 py-3 border border-l-0 transition-all duration-300 ${
          collapsed
            ? "opacity-100 translate-x-0"
            : "opacity-0 -translate-x-full pointer-events-none"
        }`}
        style={{
          background: "var(--surface-2)",
          borderColor: "var(--border-default)",
          color: "var(--text-tertiary)",
        }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Sidebar panel */}
      <aside
        className={`fixed top-0 left-0 h-full w-[300px] z-[1000] flex flex-col transition-transform duration-300 ${
          collapsed ? "-translate-x-full" : "translate-x-0"
        }`}
        style={{
          background: "var(--surface-1)",
          borderRight: "1px solid var(--border-default)",
          transitionTimingFunction: "var(--ease-out-expo)",
        }}
      >
        {/* ── Brand Header ──────────────────────── */}
        <div className="px-4 py-4 shrink-0 relative">
          <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-slate-700/40 to-transparent" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-white/10 rounded-xl blur-lg" />
                <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center shadow-lg shadow-slate-500/20">
                  <svg className="w-4.5 h-4.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                  </svg>
                </div>
              </div>
              <div>
                <span className="text-[15px] font-bold tracking-wide bg-gradient-to-r from-slate-200 to-white bg-clip-text text-transparent">
                  AeroIntel
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="relative">
                    <div className="w-2 h-2 rounded-full bg-slate-300" />
                    <div className="absolute inset-0 w-2 h-2 rounded-full bg-slate-300 animate-ping opacity-40" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                    Live
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onToggleCollapse}
              className="p-2 rounded-lg transition-colors duration-150 hover:bg-white/[0.04]"
              style={{ color: "var(--text-muted)" }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Command Bar (pinned above scroll) ── */}
        <div className="px-4 pb-3 pt-2 space-y-2 shrink-0 relative">
          <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-slate-700/30 to-transparent" />
          <SearchBar
            ref={searchBarRef}
            value={rawQuery}
            onChange={onRawQueryChange}
            isAISearching={isAISearching}
            isNaturalLanguage={isNaturalLanguage}
            inline
            flights={allFlights}
            onSelectFlight={(f) => onSelectFlight(f)}
            onSelectAirport={onSelectAirport}
            onSelectAirline={onSelectAirline}
          />
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <RegionSelector
                value={regionKey}
                onChange={onRegionChange}
                inline
              />
            </div>
            <div className="shrink-0">
              <FlightCounter
                total={totalCount}
                filtered={filteredCount}
                isFiltered={isFiltered}
                isRefreshing={isRefreshing}
                isRateLimited={isRateLimited}
                lastUpdated={lastUpdated}
                inline
              />
            </div>
          </div>
        </div>

        {/* ── Scrollable content ────────────────── */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <div className="px-4 py-3 space-y-4">
            {/* ── View Mode ────────────────────── */}
            <div>
              <div className="section-label mb-2.5">View Mode</div>
              <div className="grid grid-cols-4 gap-0.5 p-1 rounded-xl" style={{ background: "var(--surface-2)" }}>
                {VIEW_MODES.map((mode) => (
                  <button
                    key={mode.key}
                    onClick={() => onViewModeChange(mode.key)}
                    className="relative flex flex-col items-center gap-1 py-2.5 rounded-lg text-xs font-medium transition-all duration-200"
                    style={{
                      background: viewMode === mode.key ? "var(--surface-4)" : "transparent",
                      color: viewMode === mode.key ? "var(--accent-primary)" : "var(--text-muted)",
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

            <div className="divider-accent" />

            {/* ── Operations ───────────────────── */}
            <div>
              <div className="section-label mb-2.5">Operations</div>
              <div className="grid grid-cols-2 gap-2">
                <StatsPanel flights={flights} />
                <IntelligencePanel onSelectAirport={onSelectAirport} />
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {TOOL_BUTTONS.map((tool) => {
                  const active = toolStates[tool.key];
                  return (
                    <Tooltip key={tool.key}>
                      <TooltipTrigger
                        render={
                          <button
                            onClick={toolToggles[tool.key]}
                            className="tool-card relative flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-xs font-semibold"
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
                          />
                        }
                      >
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{
                            background: active ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.03)",
                          }}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tool.icon} />
                          </svg>
                        </div>
                        {tool.label}
                        {active && (
                          <div
                            className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full animate-pulse"
                            style={{ backgroundColor: tool.color }}
                          />
                        )}
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{toolTips[tool.key]}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>

            <div className="divider-accent" />

            {/* ── Map Style ───────────────────────── */}
            <MapStyleSection />

            <div className="divider-accent" />

            {/* ── Data Layers ───────────────────── */}
            <div>
              <div className="section-label mb-2.5">Data Layers</div>
              <div className="grid grid-cols-3 gap-2">
                {DATA_LAYERS.map((layer) => {
                  const active = dataLayerStates[layer.key];
                  return (
                    <Tooltip key={layer.key}>
                      <TooltipTrigger
                        render={
                          <button
                            onClick={dataLayerToggles[layer.key]}
                            className="tool-card relative flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-xs font-semibold"
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
                          />
                        }
                      >
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{
                            background: active ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.03)",
                          }}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={layer.icon} />
                          </svg>
                        </div>
                        {layer.label}
                        {active && (
                          <div
                            className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full animate-pulse"
                            style={{ backgroundColor: layer.color }}
                          />
                        )}
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{dataLayerTips[layer.key]}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>

            <div className="divider-accent" />

            {/* ── Legend (collapsible) ──────────── */}
            <div>
              <button
                onClick={() => setLegendExpanded(!legendExpanded)}
                className="flex items-center justify-between w-full section-label py-1 hover:text-slate-300 transition-colors"
              >
                <span>Aircraft Types</span>
                <svg
                  className={`w-3 h-3 transition-transform duration-200 ${legendExpanded ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {legendExpanded && (
                <div className="mt-2 animate-slide-up">
                  <Legend inline hiddenCategories={hiddenCategories} onToggleCategory={onToggleCategory} />
                </div>
              )}
            </div>

            <div className="divider-accent" />

            {/* ── Anomaly Alerts ────────────────── */}
            <AnomalyAlert
              anomalies={anomalies}
              onSelectFlight={onSelectFlight}
              flights={allFlights}
              inline
            />
          </div>
        </div>

        {/* ── Bottom status bar ─────────────────── */}
        <div className="px-4 py-2.5 shrink-0 relative">
          <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-slate-700/30 to-transparent" />
          <div className="flex items-center justify-between text-xs" style={{ color: "var(--text-faint)" }}>
            <div className="flex items-center gap-2">
              <span className="font-medium">ADS-B Intelligence</span>
              <ThemeToggle />
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className={`w-2 h-2 rounded-full ${isRateLimited ? "bg-slate-500" : "bg-slate-300"}`} />
                {!isRateLimited && (
                  <div className="absolute inset-0 w-2 h-2 rounded-full bg-slate-300 animate-ping opacity-30" />
                )}
              </div>
              <span className="font-medium">{isRateLimited ? "Rate Limited" : "Connected"}</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
