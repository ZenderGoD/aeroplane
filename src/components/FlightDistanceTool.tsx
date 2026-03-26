"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import type { FlightState } from "@/types/flight";
import {
  haversineNm,
  closingSpeedKts,
  verticalSeparationFt,
  timeToClosestApproachMin,
  bearing,
  msToKts,
  mToFt,
} from "@/lib/geo";

interface FlightDistanceToolProps {
  active: boolean;
  flights: FlightState[];
  onDeactivate: () => void;
  onSelectFlight: (flight: FlightState | null) => void;
}

const CLICK_RADIUS = 15; // pixels

/** Find nearest flight to a screen point */
function findNearestFlight(
  map: L.Map,
  clickPt: L.Point,
  flights: FlightState[]
): FlightState | null {
  let closest: FlightState | null = null;
  let closestDist = CLICK_RADIUS * CLICK_RADIUS;

  for (const f of flights) {
    if (f.latitude === null || f.longitude === null) continue;
    const pt = map.latLngToContainerPoint([f.latitude, f.longitude]);
    const dx = pt.x - clickPt.x;
    const dy = pt.y - clickPt.y;
    const dist = dx * dx + dy * dy;
    if (dist < closestDist) {
      closestDist = dist;
      closest = f;
    }
  }
  return closest;
}

interface FlightPair {
  a: FlightState;
  b: FlightState;
  distNm: number;
  bearingDeg: number;
  vertSepFt: number | null;
  closingKts: number;
  tcaMin: number | null;
}

function computeFlightPair(a: FlightState, b: FlightState): FlightPair | null {
  if (a.latitude === null || a.longitude === null) return null;
  if (b.latitude === null || b.longitude === null) return null;

  const distNm = haversineNm(a.latitude, a.longitude, b.latitude, b.longitude);
  const bearingDeg = bearing(a.latitude, a.longitude, b.latitude, b.longitude);
  const vertSepFt = verticalSeparationFt(a.baroAltitude, b.baroAltitude);

  let closingKts = 0;
  if (
    a.trueTrack !== null && a.velocity !== null &&
    b.trueTrack !== null && b.velocity !== null
  ) {
    closingKts = closingSpeedKts(
      a.latitude, a.longitude, a.trueTrack, a.velocity,
      b.latitude, b.longitude, b.trueTrack, b.velocity
    );
  }

  const tcaMin = timeToClosestApproachMin(distNm, closingKts);

  return { a, b, distNm, bearingDeg, vertSepFt, closingKts, tcaMin };
}

export default function FlightDistanceTool({
  active,
  flights,
  onDeactivate,
  onSelectFlight,
}: FlightDistanceToolProps) {
  const map = useMap();
  const layerGroupRef = useRef<L.LayerGroup>(L.layerGroup());
  const flightsRef = useRef(flights);
  flightsRef.current = flights;

  const [flightA, setFlightA] = useState<FlightState | null>(null);
  const [pair, setPair] = useState<FlightPair | null>(null);

  const clearLayers = useCallback(() => {
    layerGroupRef.current.clearLayers();
  }, []);

  /** Draw a ring around a selected flight */
  const drawSelectionRing = useCallback(
    (flight: FlightState, color: string) => {
      if (flight.latitude === null || flight.longitude === null) return;
      const ring = L.circleMarker([flight.latitude, flight.longitude], {
        radius: 18,
        color,
        weight: 2,
        fillColor: color,
        fillOpacity: 0.15,
        dashArray: "4, 4",
      });
      layerGroupRef.current.addLayer(ring);

      // Label
      const label = flight.callsign?.trim() || flight.icao24;
      const marker = L.marker([flight.latitude, flight.longitude], {
        icon: L.divIcon({
          className: "flight-dist-label",
          html: `<div style="
            background: rgba(0,0,0,0.85);
            color: ${color};
            padding: 1px 5px;
            border-radius: 3px;
            font-size: 10px;
            font-weight: 700;
            font-family: monospace;
            white-space: nowrap;
            border: 1px solid ${color}50;
            pointer-events: none;
            transform: translateY(-24px);
          ">${label}</div>`,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        }),
        interactive: false,
      });
      layerGroupRef.current.addLayer(marker);
    },
    []
  );

  /** Draw the distance line + info panel between two flights */
  const drawDistanceLine = useCallback(
    (pairData: FlightPair) => {
      const { a, b, distNm, bearingDeg, vertSepFt, closingKts, tcaMin } = pairData;
      if (a.latitude === null || a.longitude === null) return;
      if (b.latitude === null || b.longitude === null) return;

      // Dashed line
      const line = L.polyline(
        [[a.latitude, a.longitude], [b.latitude, b.longitude]],
        {
          color: "#f59e0b",
          weight: 2,
          dashArray: "8, 6",
          opacity: 0.9,
        }
      );
      layerGroupRef.current.addLayer(line);

      // Midpoint info panel
      const midLat = (a.latitude + b.latitude) / 2;
      const midLon = (a.longitude + b.longitude) / 2;

      const formattedDist = distNm < 10 ? distNm.toFixed(2) : distNm < 100 ? distNm.toFixed(1) : Math.round(distNm).toString();
      const formattedBearing = `${Math.round(bearingDeg)}°`;
      const formattedVertSep = vertSepFt !== null ? `${Math.round(vertSepFt).toLocaleString()} ft` : "N/A";

      const isClosing = closingKts > 0;
      const closingLabel = isClosing
        ? `Closing ${Math.round(closingKts)} kts`
        : closingKts < 0
          ? `Separating ${Math.round(Math.abs(closingKts))} kts`
          : "Parallel";
      const closingColor = isClosing ? "#ef4444" : closingKts < 0 ? "#22c55e" : "#94a3b8";

      const tcaLabel = tcaMin !== null ? `${tcaMin.toFixed(1)} min` : "—";

      // Separation alert
      let separationAlert = "";
      if (distNm < 5 && (vertSepFt === null || vertSepFt < 1000)) {
        separationAlert = `<div style="background:#ef444430;border:1px solid #ef4444;color:#fca5a5;padding:2px 6px;border-radius:3px;font-size:9px;font-weight:700;margin-top:4px;text-align:center">&#9888; SEPARATION ALERT</div>`;
      } else if (distNm < 10 && (vertSepFt === null || vertSepFt < 1000)) {
        separationAlert = `<div style="background:#f9731630;border:1px solid #f97316;color:#fdba74;padding:2px 6px;border-radius:3px;font-size:9px;font-weight:600;margin-top:4px;text-align:center">&#9651; PROXIMITY WARNING</div>`;
      }

      // Speed info
      const speedA = a.velocity !== null ? `${Math.round(msToKts(a.velocity))} kts` : "—";
      const speedB = b.velocity !== null ? `${Math.round(msToKts(b.velocity))} kts` : "—";
      const altA = a.baroAltitude !== null ? `${Math.round(mToFt(a.baroAltitude)).toLocaleString()} ft` : "GND";
      const altB = b.baroAltitude !== null ? `${Math.round(mToFt(b.baroAltitude)).toLocaleString()} ft` : "GND";

      const callA = a.callsign?.trim() || a.icao24;
      const callB = b.callsign?.trim() || b.icao24;

      const icon = L.divIcon({
        className: "flight-distance-panel",
        html: `<div style="
          background: rgba(0,0,0,0.92);
          color: #ffffff;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 11px;
          font-family: system-ui, sans-serif;
          white-space: nowrap;
          border: 1px solid rgba(245,158,11,0.4);
          pointer-events: none;
          min-width: 180px;
        ">
          <div style="font-size:18px;font-weight:800;color:#f59e0b;text-align:center;margin-bottom:6px">
            ${formattedDist} NM
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px 12px;font-size:10px;color:#d1d5db">
            <span style="color:#94a3b8">Bearing</span><span style="text-align:right;font-weight:600">${formattedBearing}</span>
            <span style="color:#94a3b8">Vert Sep</span><span style="text-align:right;font-weight:600">${formattedVertSep}</span>
            <span style="color:#94a3b8">Rate</span><span style="text-align:right;font-weight:600;color:${closingColor}">${closingLabel}</span>
            ${tcaMin !== null ? `<span style="color:#94a3b8">Time CPA</span><span style="text-align:right;font-weight:600">${tcaLabel}</span>` : ""}
          </div>
          <div style="border-top:1px solid #374151;margin-top:6px;padding-top:6px;display:grid;grid-template-columns:1fr 1fr;gap:2px 8px;font-size:9px">
            <div style="color:#60a5fa;font-weight:700">${callA}</div>
            <div style="color:#a78bfa;font-weight:700;text-align:right">${callB}</div>
            <div style="color:#9ca3af">${altA} / ${speedA}</div>
            <div style="color:#9ca3af;text-align:right">${altB} / ${speedB}</div>
          </div>
          ${separationAlert}
        </div>`,
        iconSize: [0, 0],
        iconAnchor: [90, 0],
      });

      const infoMarker = L.marker([midLat, midLon], {
        icon,
        interactive: false,
      });
      layerGroupRef.current.addLayer(infoMarker);
    },
    []
  );

  /** Handle map click — find nearest flight */
  const handleClick = useCallback(
    (e: L.LeafletMouseEvent) => {
      const clickPt = map.latLngToContainerPoint(e.latlng);
      const flight = findNearestFlight(map, clickPt, flightsRef.current);

      if (!flight) return; // Clicked empty space, ignore

      if (!flightA) {
        // First flight selected
        clearLayers();
        setFlightA(flight);
        setPair(null);
        onSelectFlight(flight);
        drawSelectionRing(flight, "#60a5fa");
      } else {
        // Second flight selected
        if (flight.icao24 === flightA.icao24) return; // same flight

        const pairData = computeFlightPair(flightA, flight);
        if (pairData) {
          clearLayers();
          drawSelectionRing(flightA, "#60a5fa");
          drawSelectionRing(flight, "#a78bfa");
          drawDistanceLine(pairData);
          setPair(pairData);
        }
      }
    },
    [map, flightA, clearLayers, drawSelectionRing, drawDistanceLine, onSelectFlight]
  );

  /** Handle Escape key */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onDeactivate();
      }
    },
    [onDeactivate]
  );

  // Auto-update the distance line when flight positions change
  useEffect(() => {
    if (!pair || !active) return;

    const updatedA = flights.find((f) => f.icao24 === pair.a.icao24);
    const updatedB = flights.find((f) => f.icao24 === pair.b.icao24);

    if (updatedA && updatedB) {
      const newPair = computeFlightPair(updatedA, updatedB);
      if (newPair) {
        clearLayers();
        drawSelectionRing(updatedA, "#60a5fa");
        drawSelectionRing(updatedB, "#a78bfa");
        drawDistanceLine(newPair);
        setPair(newPair);
      }
    }
  }, [flights, pair, active, clearLayers, drawSelectionRing, drawDistanceLine]);

  useEffect(() => {
    const container = map.getContainer();
    const group = layerGroupRef.current;

    if (active) {
      group.addTo(map);
      container.style.cursor = "crosshair";
      map.on("click", handleClick);
      document.addEventListener("keydown", handleKeyDown);
    } else {
      clearLayers();
      group.remove();
      setFlightA(null);
      setPair(null);
      container.style.cursor = "";
      map.off("click", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    }

    return () => {
      clearLayers();
      group.remove();
      container.style.cursor = "";
      map.off("click", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [active, map, handleClick, handleKeyDown, clearLayers]);

  return null;
}
