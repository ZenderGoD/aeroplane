"use client";

import type { FlightState } from "@/types/flight";
import {
  metersToFeet,
  msToKnots,
  msToFpm,
  formatCallsign,
} from "@/lib/mapUtils";
import { getAirlineName } from "@/lib/airlines";

export default function FlightPopup({ flight }: { flight: FlightState }) {
  const airline = getAirlineName(flight.callsign);
  return (
    <div className="p-3 min-w-[200px] text-sm">
      <div className="font-bold text-base text-slate-400">
        {formatCallsign(flight.callsign)}
      </div>
      {airline && (
        <div className="text-xs text-gray-500 mb-2">{airline}</div>
      )}
      <div className="space-y-1 text-gray-700">
        <Row label="Country" value={flight.originCountry} />
        <Row
          label="Altitude"
          value={
            flight.baroAltitude !== null
              ? `${metersToFeet(flight.baroAltitude).toLocaleString()} ft`
              : flight.onGround
                ? "On Ground"
                : "N/A"
          }
        />
        <Row
          label="Speed"
          value={
            flight.velocity !== null
              ? `${msToKnots(flight.velocity)} kts`
              : "N/A"
          }
        />
        <Row
          label="Heading"
          value={
            flight.trueTrack !== null
              ? `${Math.round(flight.trueTrack)}°`
              : "N/A"
          }
        />
        <Row
          label="V/S"
          value={
            flight.verticalRate !== null
              ? `${msToFpm(flight.verticalRate) >= 0 ? "+" : ""}${msToFpm(flight.verticalRate)} fpm`
              : "N/A"
          }
        />
        <Row label="ICAO24" value={flight.icao24} />
        {flight.squawk && <Row label="Squawk" value={flight.squawk} />}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
