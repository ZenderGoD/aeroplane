"use client";

import { useEffect, useState } from "react";
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

const MapContentMaplibre = dynamic(() => import("./MapContentMaplibre"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-gray-900">
      <div className="text-white text-lg">Loading vector map...</div>
    </div>
  ),
});

/**
 * Feature flag: whether to use MapLibre-GL vector tiles for the main
 * tracker map. Controlled by localStorage key "aerointel.map_engine".
 * Values: "maplibre" (vector, smooth zoom) | "leaflet" (default).
 */
function useMapEngine(): "maplibre" | "leaflet" {
  const [engine, setEngine] = useState<"maplibre" | "leaflet">("leaflet");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("aerointel.map_engine");
      if (saved === "maplibre" || saved === "leaflet") setEngine(saved);
    } catch { /* ignore */ }
    const handler = (e: StorageEvent) => {
      if (e.key === "aerointel.map_engine" && (e.newValue === "maplibre" || e.newValue === "leaflet")) {
        setEngine(e.newValue);
      }
    };
    window.addEventListener("storage", handler);
    // Custom event for same-tab updates (storage event only fires for OTHER tabs)
    const customHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail === "maplibre" || detail === "leaflet") setEngine(detail);
    };
    window.addEventListener("map-engine-change", customHandler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("map-engine-change", customHandler);
    };
  }, []);
  return engine;
}

const GlobeView = dynamic(() => import("./GlobeView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-gray-950">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-400 text-sm">Loading 3D Globe...</span>
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
  routeLinesVisible?: boolean;
  onSelectCorridor?: (corridorId: string) => void;
}

export default function FlightMap(props: Props) {
  const engine = useMapEngine();

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

  if (engine === "maplibre") {
    // MapLibre base map — smooth vector-tile zoom. Overlays not ported
    // yet, so advanced features (weather, METAR, runways, routes, etc.)
    // remain available only in Leaflet mode for now.
    return (
      <MapContentMaplibre
        flights={props.flights}
        selectedFlight={props.selectedFlight}
        onSelectFlight={props.onSelectFlight}
        region={props.region}
        anomalyIcaos={props.anomalyIcaos}
        instabilityScores={props.instabilityScores}
        viewMode={props.viewMode}
        flightHistory={props.flightHistory}
        hiddenCategories={props.hiddenCategories}
      />
    );
  }

  return <MapContent {...props} />;
}
