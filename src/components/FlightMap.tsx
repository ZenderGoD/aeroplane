"use client";

import dynamic from "next/dynamic";
import type { FlightState } from "@/types/flight";
import type { Region } from "@/lib/regions";
import type { ViewMode } from "@/types/viewMode";
import type { FlightHistoryMap } from "@/lib/flightHistory";

const MapContent = dynamic(() => import("./MapContent"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-gray-900">
      <div className="text-white text-lg">Loading map...</div>
    </div>
  ),
});

interface Props {
  flights: FlightState[];
  selectedFlight: FlightState | null;
  onSelectFlight: (flight: FlightState | null) => void;
  region: Region;
  anomalyIcaos?: Set<string>;
  viewMode?: ViewMode;
  flightHistory?: FlightHistoryMap;
}

export default function FlightMap(props: Props) {
  return <MapContent {...props} />;
}
