"use client";

import { useEffect, useRef, useCallback } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { haversineNm } from "@/lib/geo";

interface MeasureToolProps {
  active: boolean;
  onDeactivate: () => void;
}

export default function MeasureTool({ active, onDeactivate }: MeasureToolProps) {
  const map = useMap();

  // Track all Leaflet layers so we can clean up
  const layerGroupRef = useRef<L.LayerGroup>(L.layerGroup());
  // Track click state: 0 = waiting for A, 1 = waiting for B, 2 = complete (next click resets)
  const clickStateRef = useRef<number>(0);
  const pointARef = useRef<L.LatLng | null>(null);

  /** Remove all measurement layers from the map */
  const clearLayers = useCallback(() => {
    layerGroupRef.current.clearLayers();
  }, []);

  /** Create a small cyan circle marker at the given position */
  const createPointMarker = useCallback(
    (latlng: L.LatLng): L.CircleMarker => {
      return L.circleMarker(latlng, {
        radius: 6,
        color: "#94a3b8",
        fillColor: "#94a3b8",
        fillOpacity: 0.8,
        weight: 2,
      });
    },
    []
  );

  /** Create the dashed line between two points */
  const createMeasureLine = useCallback(
    (a: L.LatLng, b: L.LatLng): L.Polyline => {
      return L.polyline([a, b], {
        color: "#94a3b8",
        weight: 2,
        dashArray: "8, 6",
        opacity: 0.9,
      });
    },
    []
  );

  /** Create a distance label at the midpoint */
  const createDistanceLabel = useCallback(
    (a: L.LatLng, b: L.LatLng, distanceNm: number): L.Marker => {
      const midLat = (a.lat + b.lat) / 2;
      const midLng = (a.lng + b.lng) / 2;

      const formattedDistance =
        distanceNm < 10
          ? distanceNm.toFixed(2)
          : distanceNm < 100
            ? distanceNm.toFixed(1)
            : Math.round(distanceNm).toString();

      const icon = L.divIcon({
        className: "measure-distance-label",
        html: `<div style="
          background: rgba(0, 0, 0, 0.8);
          color: #ffffff;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
          border: 1px solid rgba(148, 163, 184, 0.4);
          font-family: monospace;
          pointer-events: none;
        ">${formattedDistance} NM</div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      return L.marker([midLat, midLng], {
        icon,
        interactive: false,
      });
    },
    []
  );

  /** Handle map click for measurement */
  const handleClick = useCallback(
    (e: L.LeafletMouseEvent) => {
      const state = clickStateRef.current;

      if (state === 0) {
        // First click: set point A
        clearLayers();
        pointARef.current = e.latlng;
        const marker = createPointMarker(e.latlng);
        layerGroupRef.current.addLayer(marker);
        clickStateRef.current = 1;
      } else if (state === 1) {
        // Second click: set point B, draw line and label
        const pointA = pointARef.current!;
        const pointB = e.latlng;

        const markerB = createPointMarker(pointB);
        layerGroupRef.current.addLayer(markerB);

        const line = createMeasureLine(pointA, pointB);
        layerGroupRef.current.addLayer(line);

        const distance = haversineNm(
          pointA.lat,
          pointA.lng,
          pointB.lat,
          pointB.lng
        );

        const label = createDistanceLabel(pointA, pointB, distance);
        layerGroupRef.current.addLayer(label);

        clickStateRef.current = 2;
      } else {
        // Third click: reset and start new measurement from this point
        clearLayers();
        pointARef.current = e.latlng;
        const marker = createPointMarker(e.latlng);
        layerGroupRef.current.addLayer(marker);
        clickStateRef.current = 1;
      }
    },
    [clearLayers, createPointMarker, createMeasureLine, createDistanceLabel]
  );

  /** Handle Escape key to deactivate */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onDeactivate();
      }
    },
    [onDeactivate]
  );

  useEffect(() => {
    const container = map.getContainer();
    const group = layerGroupRef.current;

    if (active) {
      // Add the layer group to the map
      group.addTo(map);

      // Change cursor to crosshair
      container.style.cursor = "crosshair";

      // Listen for clicks on the map
      map.on("click", handleClick);

      // Listen for Escape key
      document.addEventListener("keydown", handleKeyDown);
    } else {
      // Deactivated: clean up everything
      clearLayers();
      group.remove();
      clickStateRef.current = 0;
      pointARef.current = null;
      container.style.cursor = "";
      map.off("click", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    }

    // Cleanup on unmount
    return () => {
      clearLayers();
      group.remove();
      clickStateRef.current = 0;
      pointARef.current = null;
      container.style.cursor = "";
      map.off("click", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [active, map, handleClick, handleKeyDown, clearLayers]);

  return null;
}
