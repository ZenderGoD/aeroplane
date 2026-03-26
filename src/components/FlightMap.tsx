"use client";

import dynamic from "next/dynamic";
import type { FlightState } from "@/types/flight";
import type { Region } from "@/lib/regions";
import type { ViewMode } from "@/types/viewMode";
import type { FlightHistoryMap } from "@/lib/flightHistory";
import type { FlightAirportEstimate } from "@/types/airport";

const MapContent = dynamic(() => import("./MapContent"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-gray-900">
      <div className="text-white text-lg">Loading map...</div>
    </div>
  ),
});

const GlobeView = dynamic(() => import("./GlobeView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-gray-950">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-gray-400 text-sm">Loading 3D Globe...</span>
      </div>
    </div>
  ),
});

interface Props {
  flights: FlightState[];
  selectedFlight: FlightState | null;
  onSelectFlight: (flight: FlightState | null) => void;
  region: Region;
  anomalyIcaos?: Set<string>;
  instabilityScores?: Map<string, number>;
  viewMode?: ViewMode;
  flightHistory?: FlightHistoryMap;
  airportEstimate?: FlightAirportEstimate | null;
  measureActive?: boolean;
  onMeasureDeactivate?: () => void;
  corridorsVisible?: boolean;
  flightDistanceActive?: boolean;
  onFlightDistanceDeactivate?: () => void;
  hiddenCategories?: Set<number>;
  weatherVisible?: boolean;
  metarVisible?: boolean;
  runwaysVisible?: boolean;
  routeDensityVisible?: boolean;
  windAloftVisible?: boolean;
  terrainVisible?: boolean;
  pirepVisible?: boolean;
  onSelectCorridor?: (corridorId: string) => void;
}

export default function FlightMap(props: Props) {
  if (props.viewMode === "globe") {
    return (
      <GlobeView
        flights={props.flights}
        selectedFlight={props.selectedFlight}
        onSelectFlight={props.onSelectFlight}
        anomalyIcaos={props.anomalyIcaos}
      />
    );
  }
  return <MapContent {...props} />;
}
