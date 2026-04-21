"use client";

import { useRef, useEffect, useMemo, useState, useCallback } from "react";
import type GlobeType from "react-globe.gl";
import type { FlightState } from "@/types/flight";
import { getCategoryColor } from "./CanvasPlaneLayer";

// ---------- types ----------

interface GlobeViewProps {
  flights: FlightState[];
  selectedFlight: FlightState | null;
  onSelectFlight: (flight: FlightState | null) => void;
  anomalyIcaos?: Set<string>;
}

interface FlightPoint {
  lat: number;
  lng: number;
  altitude: number;
  color: string;
  size: number;
  flight: FlightState;
}

// ---------- constants ----------

/** How much to exaggerate altitudes for visual separation */
const ALTITUDE_SCALE = 8;

/** Click detection radius in degrees lat/lng */
const CLICK_RADIUS = 2;

// ---------- component ----------

export default function GlobeView({
  flights,
  selectedFlight,
  onSelectFlight,
  anomalyIcaos,
}: GlobeViewProps) {
  const globeRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1280, height: 800 });
  const [GlobeComponent, setGlobeComponent] = useState<typeof GlobeType | null>(null);
  const prevSelectedRef = useRef<string | null>(null);
  const flightsRef = useRef(flights);
  flightsRef.current = flights;

  // Dynamic import react-globe.gl
  useEffect(() => {
    import("react-globe.gl").then((mod) => {
      setGlobeComponent(() => mod.default);
    });
  }, []);

  // Window resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Globe styling on mount
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    globe.pointOfView({ lat: 20, lng: 0, altitude: 2.5 });
  }, [GlobeComponent]);

  // Fly to selected flight
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || !selectedFlight) return;
    if (selectedFlight.latitude === null || selectedFlight.longitude === null) return;

    if (prevSelectedRef.current === selectedFlight.icao24) return;
    prevSelectedRef.current = selectedFlight.icao24;

    const currentAlt = globe.pointOfView()?.altitude ?? 2.5;
    globe.pointOfView(
      {
        lat: selectedFlight.latitude,
        lng: selectedFlight.longitude,
        altitude: Math.min(currentAlt, 1.0),
      },
      1000
    );
  }, [selectedFlight]);

  // Prepare flight points — always rendered, no LOD switching
  const pointsData: FlightPoint[] = useMemo(() => {
    return flights
      .filter((f) => f.latitude !== null && f.longitude !== null)
      .map((f) => {
        const isSelected = selectedFlight?.icao24 === f.icao24;
        const isAnomaly = anomalyIcaos?.has(f.icao24) ?? false;
        return {
          lat: f.latitude!,
          lng: f.longitude!,
          altitude: f.baroAltitude
            ? Math.max((f.baroAltitude * 0.3048) / 6_371_000, 0.0005) * ALTITUDE_SCALE
            : 0.001,
          color: isSelected
            ? "var(--accent-primary)"
            : isAnomaly
              ? "var(--accent-primary)"
              : getCategoryColor(f.category),
          size: isSelected ? 0.6 : isAnomaly ? 0.35 : 0.2,
          flight: f,
        };
      });
  }, [flights, selectedFlight, anomalyIcaos]);

  // Click handler — since pointsMerge=true, onPointClick doesn't work.
  // Use onGlobeClick to find nearest flight manually.
  const handleGlobeClick = useCallback(
    (coords: { lat: number; lng: number }) => {
      if (!coords) return;

      const currentFlights = flightsRef.current;
      let closest: FlightState | null = null;
      let closestDist = CLICK_RADIUS * CLICK_RADIUS;

      for (const f of currentFlights) {
        if (f.latitude === null || f.longitude === null) continue;
        const dlat = f.latitude - coords.lat;
        const dlng = f.longitude - coords.lng;
        const dist = dlat * dlat + dlng * dlng;
        if (dist < closestDist) {
          closestDist = dist;
          closest = f;
        }
      }

      onSelectFlight(closest);
    },
    [onSelectFlight]
  );

  if (!GlobeComponent) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-400 text-sm">Loading 3D Globe...</span>
        </div>
      </div>
    );
  }

  const Globe = GlobeComponent;

  return (
    <div ref={containerRef} className="h-full w-full bg-gray-950">
      <Globe
        ref={globeRef}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        atmosphereColor="var(--text-tertiary)"
        atmosphereAltitude={0.15}
        showGraticules={true}
        width={dimensions.width}
        height={dimensions.height}
        // Flight points — merged for performance (1 draw call for all 10k+)
        pointsData={pointsData}
        pointLat="lat"
        pointLng="lng"
        pointAltitude="altitude"
        pointColor="color"
        pointRadius="size"
        pointsMerge={true}
        // Click handling via globe click + manual hit-test
        onGlobeClick={handleGlobeClick}
      />

      {/* Flight count badge */}
      <div className="absolute bottom-4 left-4 z-10 bg-gray-900/80 backdrop-blur border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-400 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-slate-400" />
        {pointsData.length.toLocaleString()} flights
      </div>
    </div>
  );
}
