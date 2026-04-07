"use client";

import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AirportPressureScore } from "@/types/pressure";

interface Props {
  airports: AirportPressureScore[];
}

type BoardView = "arrivals" | "departures";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  "On Approach": { bg: "bg-gray-800/30", text: "text-gray-300" },
  "Holding": { bg: "bg-gray-800/30", text: "text-gray-400" },
  "Go Around": { bg: "bg-gray-800/30", text: "text-gray-300" },
  "On Ground": { bg: "bg-gray-800/50", text: "text-gray-400" },
  "Departing": { bg: "bg-gray-800/30", text: "text-gray-300" },
  "Climbing": { bg: "bg-gray-800/30", text: "text-gray-300" },
};

function getPressureIndicator(score: number): { color: string; label: string } {
  if (score >= 80) return { color: "text-gray-200", label: "Critical" };
  if (score >= 60) return { color: "text-gray-300", label: "High" };
  if (score >= 40) return { color: "text-gray-300", label: "Moderate" };
  if (score >= 20) return { color: "text-gray-400", label: "Normal" };
  return { color: "text-gray-400", label: "Low" };
}

export default function FlightBoardTab({ airports }: Props) {
  const [view, setView] = useState<BoardView>("arrivals");
  const [selectedAirport, setSelectedAirport] = useState<string | null>(null);

  // Sort airports by pressure score (highest first)
  const sorted = [...airports].sort((a, b) => b.pressureScore - a.pressureScore);

  // Filter to selected airport or show all
  const displayed = selectedAirport
    ? sorted.filter((a) => a.airportIcao === selectedAirport)
    : sorted;

  return (
    <ScrollArea className="h-[calc(100vh-200px)]">
      <div className="space-y-3 pb-6 pr-2">
        {/* View toggle */}
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-900 rounded-lg overflow-hidden border border-gray-800 flex-1">
            <button
              onClick={() => setView("arrivals")}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium transition-all ${
                view === "arrivals"
                  ? "bg-gray-600 text-white"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
              }`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              Arrivals
            </button>
            <button
              onClick={() => setView("departures")}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium transition-all ${
                view === "departures"
                  ? "bg-gray-600 text-white"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
              }`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              Departures
            </button>
          </div>
          {selectedAirport && (
            <button
              onClick={() => setSelectedAirport(null)}
              className="text-[10px] text-gray-500 hover:text-gray-300 px-2 py-1"
            >
              All
            </button>
          )}
        </div>

        {/* Airport boards */}
        {displayed.map((airport) => {
          const pressure = getPressureIndicator(airport.pressureScore);
          const isArrivals = view === "arrivals";
          const count = isArrivals
            ? airport.components.inboundCount
            : airport.components.outboundCount;

          return (
            <div
              key={airport.airportIcao}
              className="rounded-lg border border-gray-800 bg-gray-900/50 overflow-hidden"
            >
              {/* Airport header */}
              <button
                onClick={() =>
                  setSelectedAirport(
                    selectedAirport === airport.airportIcao ? null : airport.airportIcao
                  )
                }
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold font-mono text-gray-100">
                    {airport.airportIcao}
                  </span>
                  <span className="text-[10px] text-gray-500 truncate max-w-[160px]">
                    {airport.airportName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold ${pressure.color}`}>
                    {pressure.label}
                  </span>
                  <span className="text-xs font-mono text-gray-300 bg-gray-800 px-1.5 py-0.5 rounded">
                    {count}
                  </span>
                </div>
              </button>

              {/* Flight board rows */}
              <div className="border-t border-gray-800/50">
                {/* Board header */}
                <div className="flex items-center px-3 py-1 text-[9px] font-semibold text-gray-600 uppercase tracking-wider bg-gray-900/80">
                  <span className="w-[60px]">Status</span>
                  <span className="flex-1">Type</span>
                  <span className="w-[50px] text-right">Count</span>
                </div>

                {isArrivals ? (
                  <>
                    {airport.components.inboundCount > 0 && (
                      <BoardRow
                        status="On Approach"
                        count={Math.max(0, airport.components.inboundCount - airport.components.holdingCount)}
                        total={airport.components.inboundCount}
                      />
                    )}
                    {airport.components.holdingCount > 0 && (
                      <BoardRow
                        status="Holding"
                        count={airport.components.holdingCount}
                        total={airport.components.inboundCount}
                      />
                    )}
                    {airport.components.goAroundCount > 0 && (
                      <BoardRow
                        status="Go Around"
                        count={airport.components.goAroundCount}
                        total={airport.components.inboundCount}
                      />
                    )}
                    {airport.components.groundCount > 0 && (
                      <BoardRow
                        status="On Ground"
                        count={airport.components.groundCount}
                        total={airport.components.groundCount + airport.components.inboundCount}
                      />
                    )}
                    {airport.components.inboundCount === 0 && airport.components.groundCount === 0 && (
                      <div className="px-3 py-2 text-[10px] text-gray-600 text-center">
                        No inbound traffic
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {airport.components.outboundCount > 0 && (
                      <BoardRow
                        status="Departing"
                        count={airport.components.outboundCount}
                        total={airport.components.outboundCount}
                      />
                    )}
                    {airport.components.groundCount > 0 && (
                      <BoardRow
                        status="On Ground"
                        count={airport.components.groundCount}
                        total={airport.components.groundCount + airport.components.outboundCount}
                      />
                    )}
                    {airport.components.outboundCount === 0 && airport.components.groundCount === 0 && (
                      <div className="px-3 py-2 text-[10px] text-gray-600 text-center">
                        No outbound traffic
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Summary bar */}
              <div className="flex items-center gap-3 px-3 py-1.5 bg-gray-950/50 border-t border-gray-800/30 text-[9px] text-gray-500">
                <span>Score: <strong className={pressure.color}>{Math.round(airport.pressureScore)}</strong></span>
                <span>IN: {airport.components.inboundCount}</span>
                <span>OUT: {airport.components.outboundCount}</span>
                <span>GND: {airport.components.groundCount}</span>
                {airport.components.holdingCount > 0 && (
                  <span className="text-gray-400">HLD: {airport.components.holdingCount}</span>
                )}
                {airport.components.goAroundCount > 0 && (
                  <span className="text-gray-300">G/A: {airport.components.goAroundCount}</span>
                )}
              </div>
            </div>
          );
        })}

        {displayed.length === 0 && (
          <div className="text-center py-8">
            <p className="text-xs text-gray-500">No airport data available</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

function BoardRow({
  status,
  count,
  total,
}: {
  status: string;
  count: number;
  total: number;
}) {
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS["On Ground"];
  const pct = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="flex items-center px-3 py-1.5 hover:bg-gray-800/30 transition-colors">
      <span className={`w-[60px] text-[10px] font-medium px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`}>
        {status}
      </span>
      <div className="flex-1 mx-2">
        <div className="h-1 rounded-full bg-gray-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${colors.bg.replace("/30", "/60").replace("/50", "/80")}`}
            style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: "#6b7280" }}
          />
        </div>
      </div>
      <span className="w-[50px] text-right text-xs font-mono text-gray-300">
        {count}
      </span>
    </div>
  );
}
