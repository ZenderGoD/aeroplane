"use client";

import { useState } from "react";

const flightData = [
  { callsign: "UAL2843", info: "FL380 \u00b7 487 kts \u00b7 B789" },
  { callsign: "DAL1523", info: "Climbing FL290 \u00b7 412 kts" },
  { callsign: "SQK7700", info: "EMERGENCY near KATL", emergency: true },
  { callsign: "BAW175", info: "FL410 \u00b7 501 kts \u00b7 A388" },
  { callsign: "AAL982", info: "Descending FL180 \u00b7 KJFK" },
  { callsign: "QFA8", info: "FL400 \u00b7 493 kts \u00b7 A359" },
  { callsign: "DLH456", info: "FL370 \u00b7 478 kts \u00b7 A346" },
  { callsign: "AFR66", info: "FL390 \u00b7 489 kts \u00b7 B77W" },
  { callsign: "EZY34N", info: "FL360 \u00b7 445 kts \u00b7 A320" },
  { callsign: "SWA2217", info: "FL340 \u00b7 438 kts \u00b7 B738" },
  { callsign: "UAE521", info: "FL430 \u00b7 512 kts \u00b7 A388" },
  { callsign: "SIA321", info: "FL410 \u00b7 498 kts \u00b7 B78X" },
  { callsign: "CPA888", info: "FL390 \u00b7 491 kts \u00b7 A359" },
  { callsign: "JAL7", info: "FL380 \u00b7 485 kts \u00b7 B773" },
  { callsign: "THY5", info: "FL370 \u00b7 472 kts \u00b7 B789" },
  { callsign: "RYR9843", info: "FL380 \u00b7 451 kts \u00b7 B738" },
  { callsign: "ETH503", info: "FL420 \u00b7 505 kts \u00b7 B78X" },
  { callsign: "ACA855", info: "Climbing FL310 \u00b7 389 kts" },
  { callsign: "BLOCKED", info: "Military \u00b7 FL250 \u00b7 Restricted", military: true },
  { callsign: "N172SP", info: "4500 ft \u00b7 112 kts \u00b7 C172" },
];

export default function DataTicker() {
  const [paused, setPaused] = useState(false);

  // Duplicate items for seamless loop
  const items = [...flightData, ...flightData];

  return (
    <div
      className="relative w-full overflow-hidden border-y border-[var(--border-subtle)] bg-[rgba(6,8,13,0.9)] backdrop-blur-sm"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[var(--surface-0)] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[var(--surface-0)] to-transparent z-10 pointer-events-none" />

      <div
        className="flex items-center gap-8 py-3 px-4 whitespace-nowrap"
        style={{
          animation: `ticker-scroll 60s linear infinite`,
          animationPlayState: paused ? "paused" : "running",
          width: "max-content",
        }}
      >
        {items.map((flight, i) => (
          <span key={`${flight.callsign}-${i}`} className="inline-flex items-center gap-2 text-xs font-mono">
            {flight.emergency && (
              <span className="w-1.5 h-1.5 rounded-full bg-slate-200 animate-pulse flex-shrink-0" />
            )}
            {flight.military && (
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0" />
            )}
            <span
              className={`font-semibold ${
                flight.emergency
                  ? "text-slate-200"
                  : flight.military
                  ? "text-slate-400"
                  : "text-[var(--accent-primary)]"
              }`}
            >
              {flight.callsign}
            </span>
            <span className="text-[var(--text-muted)]">{flight.info}</span>
            <span className="text-[var(--border-default)] mx-2">|</span>
          </span>
        ))}
      </div>
    </div>
  );
}
