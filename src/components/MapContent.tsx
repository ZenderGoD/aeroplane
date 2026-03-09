"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { DEFAULT_CENTER, DEFAULT_ZOOM } from "@/lib/mapUtils";
import CanvasPlaneLayer from "./CanvasPlaneLayer";
import MeasureTool from "./MeasureTool";
import type { FlightState } from "@/types/flight";
import type { Region } from "@/lib/regions";
import type { ViewMode } from "@/types/viewMode";
import type { FlightHistoryMap } from "@/lib/flightHistory";
import type { FlightAirportEstimate } from "@/types/airport";

interface Props {
  flights: FlightState[];
  selectedFlight: FlightState | null;
  onSelectFlight: (flight: FlightState | null) => void;
  region: Region;
  anomalyIcaos?: Set<string>;
  viewMode?: ViewMode;
  flightHistory?: FlightHistoryMap;
  airportEstimate?: FlightAirportEstimate | null;
  measureActive?: boolean;
  onMeasureDeactivate?: () => void;
}

function FlyToRegion({ region }: { region: Region }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(region.center, region.zoom, { duration: 1.5 });
  }, [map, region]);
  return null;
}

/** Fly the map to a selected flight's position (e.g. when clicked from the alerts panel) */
function FlyToFlight({ flight }: { flight: FlightState | null }) {
  const map = useMap();
  const prevIcaoRef = useRef<string | null>(null);

  useEffect(() => {
    if (!flight || flight.latitude === null || flight.longitude === null) {
      prevIcaoRef.current = null;
      return;
    }

    // Only fly if this is a NEW selection (different icao24), not a data refresh
    if (flight.icao24 === prevIcaoRef.current) return;
    prevIcaoRef.current = flight.icao24;

    // Check if the flight is already visible in the current viewport
    const bounds = map.getBounds();
    const isVisible = bounds.contains([flight.latitude, flight.longitude]);

    if (!isVisible) {
      const targetZoom = Math.max(map.getZoom(), 8);
      map.flyTo([flight.latitude, flight.longitude], targetZoom, {
        duration: 1.2,
      });
    }
  }, [flight, map]);

  return null;
}

export default function MapContent({
  flights,
  selectedFlight,
  onSelectFlight,
  region,
  anomalyIcaos,
  viewMode,
  flightHistory,
  airportEstimate,
  measureActive = false,
  onMeasureDeactivate,
}: Props) {
  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      className="h-full w-full"
      zoomControl={true}
      preferCanvas={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <FlyToRegion region={region} />
      <FlyToFlight flight={selectedFlight} />
      <CanvasPlaneLayer
        flights={flights}
        selectedFlight={selectedFlight}
        onSelectFlight={onSelectFlight}
        anomalyIcaos={anomalyIcaos}
        viewMode={viewMode}
        flightHistory={flightHistory}
        airportEstimate={airportEstimate}
      />
      <MeasureTool
        active={measureActive}
        onDeactivate={onMeasureDeactivate ?? (() => {})}
      />
    </MapContainer>
  );
}
