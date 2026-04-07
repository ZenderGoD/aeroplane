"use client";

import { useEffect, useRef, useCallback } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import type { FlightState } from "@/types/flight";
import { greatCirclePoints, greatCircleDistance, progressAlongRoute } from "@/lib/greatCircle";
import { getAirportByIcao, estimateFlightAirports } from "@/lib/airports";
import type { Airport } from "@/types/airport";

interface RouteOverlayProps {
  flights: FlightState[];
  selectedFlight: FlightState | null;
  visible: boolean;
}

/** Try to resolve origin and destination airports for a flight */
function resolveRoute(
  flight: FlightState
): { origin: Airport; destination: Airport } | null {
  // Strategy 1: Parse route-like callsign patterns (e.g. callsign might hint at airline)
  // We rely primarily on airport estimation via heading/altitude heuristic
  const estimate = estimateFlightAirports(flight);

  if (
    flight.latitude === null ||
    flight.longitude === null ||
    !estimate.departure?.airport ||
    !estimate.nearest?.airport
  ) {
    return null;
  }

  // If the flight is on the ground, the nearest airport is likely origin or destination
  // but we cannot determine a route, so skip
  if (flight.onGround) return null;

  const origin = estimate.departure.airport;
  const dest = estimate.nearest.airport;

  // Skip if origin and destination are the same
  if (origin.icao === dest.icao) return null;

  // Skip very short routes (< 20 NM) as they are likely noise
  const dist = greatCircleDistance(origin.lat, origin.lon, dest.lat, dest.lon);
  if (dist < 20) return null;

  return { origin, destination: dest };
}

/** Get color based on altitude band */
function altitudeColor(altMeters: number | null): string {
  if (altMeters === null) return "#64748b";
  const altFt = altMeters * 3.28084;
  if (altFt < 10000) return "#cbd5e1"; // slate-300 - low
  if (altFt < 25000) return "#94a3b8"; // slate-400 - medium
  if (altFt < 35000) return "#94a3b8"; // slate-400 - high
  return "#94a3b8"; // slate-400 - very high
}

export default function RouteOverlay({
  flights,
  selectedFlight,
  visible,
}: RouteOverlayProps) {
  const map = useMap();
  const layerGroupRef = useRef<L.LayerGroup>(L.layerGroup());
  const selectedLayerRef = useRef<L.LayerGroup>(L.layerGroup());

  // Clean up layer groups on unmount
  useEffect(() => {
    const allGroup = layerGroupRef.current;
    const selGroup = selectedLayerRef.current;
    return () => {
      allGroup.clearLayers();
      allGroup.remove();
      selGroup.clearLayers();
      selGroup.remove();
    };
  }, []);

  /** Draw the selected flight's route with full detail */
  const drawSelectedRoute = useCallback(() => {
    const group = selectedLayerRef.current;
    group.clearLayers();

    if (!selectedFlight) return;

    const route = resolveRoute(selectedFlight);
    if (!route) return;

    const { origin, destination } = route;
    const numSegments = 20;
    const fullPoints = greatCirclePoints(
      origin.lat,
      origin.lon,
      destination.lat,
      destination.lon,
      numSegments
    );

    // Calculate progress along route
    let progress = 0;
    if (
      selectedFlight.latitude !== null &&
      selectedFlight.longitude !== null
    ) {
      progress = progressAlongRoute(
        origin.lat,
        origin.lon,
        destination.lat,
        destination.lon,
        selectedFlight.latitude,
        selectedFlight.longitude
      );
    }

    // Split into completed and remaining segments
    const splitIndex = Math.round(progress * numSegments);
    const completedPoints = fullPoints.slice(0, splitIndex + 1);
    const remainingPoints = fullPoints.slice(splitIndex);

    // Add current position to the split point for smooth join
    if (
      selectedFlight.latitude !== null &&
      selectedFlight.longitude !== null
    ) {
      completedPoints.push([
        selectedFlight.latitude,
        selectedFlight.longitude,
      ]);
      remainingPoints.unshift([
        selectedFlight.latitude,
        selectedFlight.longitude,
      ]);
    }

    // Draw completed portion (solid cyan line)
    if (completedPoints.length >= 2) {
      const completedLine = L.polyline(
        completedPoints as L.LatLngExpression[],
        {
          color: "#94a3b8",
          weight: 2,
          opacity: 0.7,
          dashArray: undefined,
          interactive: false,
        }
      );
      group.addLayer(completedLine);
    }

    // Draw remaining portion (dashed cyan line)
    if (remainingPoints.length >= 2) {
      const remainingLine = L.polyline(
        remainingPoints as L.LatLngExpression[],
        {
          color: "#94a3b8",
          weight: 2,
          opacity: 0.4,
          dashArray: "8, 6",
          interactive: false,
        }
      );
      group.addLayer(remainingLine);
    }

    // Origin airport marker
    const originMarker = L.circleMarker([origin.lat, origin.lon], {
      radius: 5,
      color: "#94a3b8",
      fillColor: "#1e293b",
      fillOpacity: 0.9,
      weight: 1.5,
      interactive: false,
    });
    originMarker.bindTooltip(
      `<div style="font-size:11px;font-weight:600;color:#94a3b8">${origin.icao ?? origin.iata ?? "?"}</div>
       <div style="font-size:10px;color:#94a3b8">${origin.name}</div>`,
      {
        permanent: false,
        direction: "top",
        className: "route-tooltip",
        offset: [0, -8],
      }
    );
    group.addLayer(originMarker);

    // Destination airport marker
    const destMarker = L.circleMarker([destination.lat, destination.lon], {
      radius: 5,
      color: "#94a3b8",
      fillColor: "#1e293b",
      fillOpacity: 0.9,
      weight: 1.5,
      interactive: false,
    });
    destMarker.bindTooltip(
      `<div style="font-size:11px;font-weight:600;color:#94a3b8">${destination.icao ?? destination.iata ?? "?"}</div>
       <div style="font-size:10px;color:#94a3b8">${destination.name}</div>`,
      {
        permanent: false,
        direction: "top",
        className: "route-tooltip",
        offset: [0, -8],
      }
    );
    group.addLayer(destMarker);

    // Distance label at midpoint
    const dist = greatCircleDistance(
      origin.lat,
      origin.lon,
      destination.lat,
      destination.lon
    );
    const midPoint = fullPoints[Math.floor(fullPoints.length / 2)];
    const distLabel = L.marker(midPoint as L.LatLngExpression, {
      icon: L.divIcon({
        className: "route-distance-label",
        html: `<div style="
          background: rgba(15,23,42,0.85);
          border: 1px solid rgba(148,163,184,0.3);
          border-radius: 4px;
          padding: 2px 6px;
          font-size: 10px;
          color: #94a3b8;
          white-space: nowrap;
          font-family: ui-monospace, monospace;
          backdrop-filter: blur(4px);
        ">${Math.round(dist)} NM</div>`,
        iconSize: [0, 0],
        iconAnchor: [30, 8],
      }),
      interactive: false,
    });
    group.addLayer(distLabel);

    group.addTo(map);
  }, [selectedFlight, map]);

  /** Draw faint route lines for all visible flights */
  const drawAllRoutes = useCallback(() => {
    const group = layerGroupRef.current;
    group.clearLayers();

    if (!visible) return;

    const bounds = map.getBounds();
    const visibleFlights = flights.filter(
      (f) =>
        f.latitude !== null &&
        f.longitude !== null &&
        !f.onGround &&
        bounds.contains([f.latitude!, f.longitude!])
    );

    // Limit the number of routes drawn for performance
    const maxRoutes = 80;
    const subset =
      visibleFlights.length > maxRoutes
        ? visibleFlights.slice(0, maxRoutes)
        : visibleFlights;

    for (const flight of subset) {
      // Skip the selected flight (drawn separately with more detail)
      if (selectedFlight && flight.icao24 === selectedFlight.icao24) continue;

      const route = resolveRoute(flight);
      if (!route) continue;

      const { origin, destination } = route;
      const points = greatCirclePoints(
        origin.lat,
        origin.lon,
        destination.lat,
        destination.lon,
        12
      );

      const color = altitudeColor(flight.baroAltitude);
      const line = L.polyline(points as L.LatLngExpression[], {
        color,
        weight: 1,
        opacity: 0.18,
        dashArray: "4, 4",
        interactive: false,
      });
      group.addLayer(line);
    }

    group.addTo(map);
  }, [flights, selectedFlight, visible, map]);

  // Redraw on map move/zoom
  useEffect(() => {
    const redraw = () => {
      drawAllRoutes();
      drawSelectedRoute();
    };

    // Initial draw
    redraw();

    map.on("moveend", redraw);
    map.on("zoomend", redraw);

    return () => {
      map.off("moveend", redraw);
      map.off("zoomend", redraw);
      layerGroupRef.current.clearLayers();
      layerGroupRef.current.remove();
      selectedLayerRef.current.clearLayers();
      selectedLayerRef.current.remove();
    };
  }, [map, drawAllRoutes, drawSelectedRoute]);

  // Always draw selected flight route (even if layer toggle is off)
  useEffect(() => {
    drawSelectedRoute();
  }, [drawSelectedRoute]);

  // Redraw all routes when visibility changes
  useEffect(() => {
    if (!visible) {
      layerGroupRef.current.clearLayers();
      layerGroupRef.current.remove();
    } else {
      drawAllRoutes();
    }
  }, [visible, drawAllRoutes]);

  return null;
}
