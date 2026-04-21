"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { DEFAULT_CENTER, DEFAULT_ZOOM } from "@/lib/mapUtils";
import { useTheme } from "@/contexts/ThemeContext";
import { useMapStyle } from "@/hooks/useMapStyle";
import { useSharedFlightData } from "@/contexts/FlightDataContext";
import CanvasPlaneLayer from "./CanvasPlaneLayer";
import MeasureTool from "./MeasureTool";
import CorridorOverlay from "./CorridorOverlay";
import FlightDistanceTool from "./FlightDistanceTool";
import WeatherLayer from "./WeatherLayer";
import MetarOverlay from "./MetarOverlay";
import RunwayOverlay from "./RunwayOverlay";
import RouteDensityOverlay from "./RouteDensityOverlay";
import WindAloftOverlay from "./WindAloftOverlay";
import TerrainOverlay from "./TerrainOverlay";
import PirepOverlay from "./PirepOverlay";
import RouteOverlay from "./RouteOverlay";
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

function FlyToRegion({ region }: { region: Region }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(region.center, region.zoom, { duration: 1.5 });
  }, [map, region]);
  return null;
}

/**
 * Push the current map viewport (padded 20%) to the FlightDataProvider
 * on every pan/zoom.  This way the /api/flights tile grid covers just
 * what the user is looking at, giving much denser coverage when zoomed in.
 * Debounced 300ms so mid-animation moves don't spam the API.
 */
function ViewportBboxSync() {
  const map = useMap();
  const { setBbox } = useSharedFlightData();

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const sendViewport = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const bounds = map.getBounds();
        const lamin = bounds.getSouth();
        const lamax = bounds.getNorth();
        const lomin = bounds.getWest();
        const lomax = bounds.getEast();
        const latPad = (lamax - lamin) * 0.2;
        const lonPad = (lomax - lomin) * 0.2;
        setBbox({
          lamin: lamin - latPad,
          lamax: lamax + latPad,
          lomin: lomin - lonPad,
          lomax: lomax + lonPad,
        });
      }, 300);
    };

    sendViewport();
    map.on("moveend", sendViewport);
    map.on("zoomend", sendViewport);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      map.off("moveend", sendViewport);
      map.off("zoomend", sendViewport);
    };
  }, [map, setBbox]);

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
  instabilityScores,
  viewMode,
  flightHistory,
  airportEstimate,
  measureActive = false,
  onMeasureDeactivate,
  corridorsVisible = false,
  flightDistanceActive = false,
  onFlightDistanceDeactivate,
  hiddenCategories,
  weatherVisible = false,
  metarVisible = false,
  runwaysVisible = false,
  routeDensityVisible = false,
  windAloftVisible = false,
  terrainVisible = false,
  pirepVisible = false,
  routeLinesVisible = false,
  onSelectCorridor,
}: Props) {
  const { style } = useMapStyle();

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      className="h-full w-full"
      zoomControl={true}
      preferCanvas={true}
      // Zoom smoothness — sane defaults, no zoomSnap:0 (breaks zoom).
      zoomSnap={1}
      zoomDelta={1}
      wheelPxPerZoomLevel={100}
      zoomAnimation={true}
      fadeAnimation={true}
      markerZoomAnimation={true}
      inertia={true}
      worldCopyJump={true}
    >
      <TileLayer
        key={style.id}
        attribution={style.attribution}
        url={style.url}
        maxZoom={style.maxZoom}
        // Keep offscreen tiles in memory so panning back is instant.
        // updateWhenZooming:false prevents tile re-fetch mid-animation.
        keepBuffer={4}
        updateWhenZooming={false}
        updateWhenIdle={true}
        crossOrigin={true}
        {...(style.subdomains ? { subdomains: style.subdomains } : {})}
      />
      <ViewportBboxSync />
      <FlyToRegion region={region} />
      <FlyToFlight flight={selectedFlight} />
      <WeatherLayer visible={weatherVisible} />
      <MetarOverlay visible={metarVisible} />
      <RunwayOverlay visible={runwaysVisible} />
      <RouteDensityOverlay visible={routeDensityVisible} flights={flights} flightHistory={flightHistory ?? new Map()} />
      <WindAloftOverlay visible={windAloftVisible} />
      <TerrainOverlay visible={terrainVisible} />
      <PirepOverlay visible={pirepVisible} />
      <RouteOverlay flights={flights} selectedFlight={selectedFlight} visible={routeLinesVisible} />
      <CorridorOverlay visible={corridorsVisible} onSelectCorridor={onSelectCorridor} />
      <CanvasPlaneLayer
        flights={flights}
        selectedFlight={selectedFlight}
        onSelectFlight={onSelectFlight}
        anomalyIcaos={anomalyIcaos}
        instabilityScores={instabilityScores}
        viewMode={viewMode}
        flightHistory={flightHistory}
        airportEstimate={airportEstimate}
        hiddenCategories={hiddenCategories}
      />
      <MeasureTool
        active={measureActive}
        onDeactivate={onMeasureDeactivate ?? (() => {})}
      />
      <FlightDistanceTool
        active={flightDistanceActive}
        flights={flights}
        onDeactivate={onFlightDistanceDeactivate ?? (() => {})}
        onSelectFlight={onSelectFlight}
      />
    </MapContainer>
  );
}
