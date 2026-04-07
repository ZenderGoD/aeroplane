"use client";

import { useState } from "react";
import type { FlightState } from "@/types/flight";
import type { Anomaly } from "@/types/anomaly";

interface Props {
  anomalies: Anomaly[];
  onSelectFlight: (flight: FlightState | null) => void;
  flights: FlightState[];
  inline?: boolean;
}

const SEVERITY_COLORS = {
  critical: { bg: "bg-neutral-900/80", dot: "bg-slate-200", text: "text-slate-200", border: "border-slate-600" },
  warning: { bg: "bg-neutral-900/80", dot: "bg-slate-400", text: "text-slate-300", border: "border-slate-600" },
  info: { bg: "bg-neutral-900/80", dot: "bg-slate-400", text: "text-slate-300", border: "border-slate-700" },
};

export default function AnomalyAlert({ anomalies, onSelectFlight, flights, inline = false }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (anomalies.length === 0) return null;

  const criticalCount = anomalies.filter((a) => a.severity === "critical").length;
  const warningCount = anomalies.filter((a) => a.severity === "warning").length;

  const handleClickAnomaly = (icao24: string) => {
    const flight = flights.find((f) => f.icao24 === icao24);
    if (flight) onSelectFlight(flight);
  };

  return (
    <div className={inline ? "w-full" : "absolute bottom-6 right-4 z-[1000] max-w-sm"}>
      {/* Badge button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border backdrop-blur-md shadow-lg transition-all ${
          criticalCount > 0
            ? "bg-neutral-900/90 border-slate-500 animate-anomaly-pulse"
            : warningCount > 0
              ? "bg-neutral-900/90 border-slate-600"
              : "bg-gray-900/90 border-gray-700"
        }`}
      >
        <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
        <span className="text-white text-sm font-medium">
          {anomalies.length} Alert{anomalies.length !== 1 ? "s" : ""}
        </span>
        <svg
          className={`w-3 h-3 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>

      {/* Expanded panel */}
      {isExpanded && (
        <div className="mt-2 bg-gray-950/95 backdrop-blur-md border border-gray-800 rounded-lg shadow-2xl overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-800">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Detected Anomalies
            </h3>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {anomalies.slice(0, 15).map((a, i) => {
              const colors = SEVERITY_COLORS[a.severity];
              return (
                <button
                  key={`${a.icao24}-${a.type}-${i}`}
                  onClick={() => handleClickAnomaly(a.icao24)}
                  className={`w-full text-left px-3 py-2 border-b border-gray-800/50 hover:bg-gray-800/50 transition-colors flex items-start gap-2`}
                >
                  <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${colors.dot} ${a.severity === "critical" ? "animate-anomaly-pulse" : ""}`} />
                  <div className="min-w-0">
                    <div className={`text-sm font-medium ${colors.text}`}>
                      {a.callsign?.trim() || a.icao24.toUpperCase()}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{a.message}</div>
                  </div>
                </button>
              );
            })}
          </div>
          {anomalies.length > 15 && (
            <div className="px-3 py-1.5 text-xs text-gray-500 text-center border-t border-gray-800">
              +{anomalies.length - 15} more
            </div>
          )}
        </div>
      )}
    </div>
  );
}
