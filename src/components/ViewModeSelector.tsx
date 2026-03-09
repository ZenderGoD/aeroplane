"use client";

import type { ViewMode } from "@/types/viewMode";
import type { FlightState } from "@/types/flight";
import StatsPanel from "@/components/StatsPanel";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Props {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  flights: FlightState[];
  onMeasureToggle?: () => void;
  measureActive?: boolean;
  onReplayToggle?: () => void;
  replayActive?: boolean;
}

const MODES: { key: ViewMode; label: string; icon: string }[] = [
  { key: "normal", label: "Normal", icon: "M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" },
  { key: "heatmap", label: "Heatmap", icon: "M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" },
  { key: "trails", label: "Trails", icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" },
  { key: "globe", label: "Globe", icon: "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" },
];

export default function ViewModeSelector({
  value,
  onChange,
  flights,
  onMeasureToggle,
  measureActive = false,
  onReplayToggle,
  replayActive = false,
}: Props) {
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

      <div className="w-px bg-gray-700" />

      {/* Stats Panel */}
      <StatsPanel flights={flights} />

      {/* Measure Tool */}
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              onClick={onMeasureToggle}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all ${
                measureActive
                  ? "bg-cyan-600 text-white"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
              }`}
            />
          }
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <span className="hidden sm:inline">Measure</span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Click two points to measure distance</p>
        </TooltipContent>
      </Tooltip>

      {/* Replay */}
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              onClick={onReplayToggle}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all ${
                replayActive
                  ? "bg-purple-600 text-white"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
              }`}
            />
          }
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="hidden sm:inline">Replay</span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Replay flight history timelapse</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
