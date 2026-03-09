"use client";

import { useState } from "react";
import SearchBar from "@/components/SearchBar";
import type { SearchBarHandle } from "@/components/SearchBar";
import RegionSelector from "@/components/RegionSelector";
import FlightCounter from "@/components/FlightCounter";
import Legend from "@/components/Legend";
import AnomalyAlert from "@/components/AnomalyAlert";
import StatsPanel from "@/components/StatsPanel";
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
  // Anomalies
  anomalies: Anomaly[];
  onSelectFlight: (flight: FlightState | null) => void;
  allFlights: FlightState[];
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
];

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
  anomalies,
  onSelectFlight,
  allFlights,
}: LeftSidebarProps) {
  const [legendExpanded, setLegendExpanded] = useState(false);

  return (
    <>
      {/* Collapsed toggle button */}
      <button
        onClick={onToggleCollapse}
        className={`fixed top-4 left-0 z-[1001] bg-gray-900/90 backdrop-blur border border-gray-700 border-l-0 rounded-r-lg px-1.5 py-3 text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-all duration-300 ${
          collapsed
            ? "opacity-100 translate-x-0"
            : "opacity-0 -translate-x-full pointer-events-none"
        }`}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>

      {/* Sidebar panel */}
      <aside
        className={`fixed top-0 left-0 h-full w-[280px] z-[1000] bg-gray-950/95 backdrop-blur-md border-r border-gray-800 transition-transform duration-300 ease-in-out flex flex-col ${
          collapsed ? "-translate-x-full" : "translate-x-0"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-blue-400"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
            </svg>
            <span className="text-sm font-semibold text-gray-100">
              Flight Tracker
            </span>
          </div>
          <button
            onClick={onToggleCollapse}
            className="p-1 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <ScrollArea className="flex-1">
          <div className="px-3 py-3 space-y-3">
            {/* Search + Region */}
            <div className="space-y-2">
              <SearchBar
                ref={searchBarRef}
                value={rawQuery}
                onChange={onRawQueryChange}
                isAISearching={isAISearching}
                isNaturalLanguage={isNaturalLanguage}
                inline
              />
              <RegionSelector
                value={regionKey}
                onChange={onRegionChange}
                inline
              />
            </div>

            {/* Flight Counter */}
            <FlightCounter
              total={totalCount}
              filtered={filteredCount}
              isFiltered={isFiltered}
              isRefreshing={isRefreshing}
              isRateLimited={isRateLimited}
              lastUpdated={lastUpdated}
              inline
            />

            <Separator className="bg-gray-800" />

            {/* View Mode */}
            <div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                View Mode
              </div>
              <div className="flex bg-gray-900 rounded-lg overflow-hidden border border-gray-800">
                {VIEW_MODES.map((mode) => (
                  <button
                    key={mode.key}
                    onClick={() => onViewModeChange(mode.key)}
                    className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-medium transition-all ${
                      viewMode === mode.key
                        ? "bg-blue-600 text-white"
                        : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
                    }`}
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d={mode.icon}
                      />
                    </svg>
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            <Separator className="bg-gray-800" />

            {/* Tools */}
            <div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Tools
              </div>
              <div className="flex items-center gap-1">
                <StatsPanel flights={flights} />

                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        onClick={onMeasureToggle}
                        className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                          measureActive
                            ? "bg-cyan-600 text-white"
                            : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
                        }`}
                      />
                    }
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                      />
                    </svg>
                    Measure
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Click two points to measure distance</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        onClick={onReplayToggle}
                        className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                          replayActive
                            ? "bg-purple-600 text-white"
                            : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
                        }`}
                      />
                    }
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Replay
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Replay flight history timelapse</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            <Separator className="bg-gray-800" />

            {/* Legend (collapsible) */}
            <div>
              <button
                onClick={() => setLegendExpanded(!legendExpanded)}
                className="flex items-center justify-between w-full text-[10px] font-semibold text-gray-500 uppercase tracking-wider py-1"
              >
                <span>Aircraft Type</span>
                <svg
                  className={`w-3 h-3 transition-transform ${legendExpanded ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {legendExpanded && (
                <div className="mt-1">
                  <Legend inline />
                </div>
              )}
            </div>

            <Separator className="bg-gray-800" />

            {/* Anomaly Alerts */}
            <AnomalyAlert
              anomalies={anomalies}
              onSelectFlight={onSelectFlight}
              flights={allFlights}
              inline
            />
          </div>
        </ScrollArea>
      </aside>
    </>
  );
}
