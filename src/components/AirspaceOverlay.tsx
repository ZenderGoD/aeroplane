"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import {
  AIRSPACES,
  getBorderStyle,
  getBorderColor,
  type Airspace,
} from "@/data/airspaces";

interface AirspaceOverlayProps {
  visible: boolean;
  types: Set<string>; // which types to show: "FIR", "TMA", "RESTRICTED", etc.
}

// ---------- Helpers ----------

/**
 * Compute the centroid of a polygon defined by [lat, lon] pairs.
 */
function polygonCentroid(coords: [number, number][]): [number, number] {
  let latSum = 0;
  let lonSum = 0;
  const n = coords.length;
  for (const [lat, lon] of coords) {
    latSum += lat;
    lonSum += lon;
  }
  return [latSum / n, lonSum / n];
}

/**
 * Format altitude value for display.
 */
function formatAltitude(alt: number | undefined): string {
  if (alt === undefined || alt === null) return "SFC";
  if (alt >= 18000) return `FL${Math.round(alt / 100)}`;
  return `${alt.toLocaleString()} ft`;
}

/**
 * Get a short type label for display.
 */
function typeLabel(type: Airspace["type"]): string {
  switch (type) {
    case "FIR":
      return "FIR";
    case "UIR":
      return "UIR";
    case "TMA":
      return "TMA";
    case "CTR":
      return "CTR";
    case "RESTRICTED":
      return "RESTRICTED";
    case "PROHIBITED":
      return "PROHIBITED";
    case "DANGER":
      return "DANGER";
    case "MOA":
      return "MOA";
    default:
      return type;
  }
}

/**
 * Build the HTML popup content for an airspace polygon click.
 */
function buildPopupHtml(airspace: Airspace): string {
  const borderColor = getBorderColor(airspace.type);
  const lower = formatAltitude(airspace.lowerAlt);
  const upper = airspace.upperAlt ? formatAltitude(airspace.upperAlt) : "UNL";

  let html = `<div style="font-family:system-ui,sans-serif;font-size:11px;line-height:1.6;min-width:180px">`;

  // Header
  html += `<div style="font-weight:700;font-size:13px;color:#f1f5f9;margin-bottom:2px">${airspace.name}</div>`;

  // Type badge
  html += `<div style="margin-bottom:8px">`;
  html += `<span style="
    display:inline-block;
    background:${borderColor}20;
    color:${borderColor};
    padding:1px 8px;
    border-radius:9px;
    font-size:9px;
    font-weight:600;
    text-transform:uppercase;
    letter-spacing:0.5px;
    border:1px solid ${borderColor}40;
  ">${typeLabel(airspace.type)}</span>`;
  html += `</div>`;

  // Info grid
  html += `<div style="display:grid;grid-template-columns:auto 1fr;gap:2px 10px;font-size:10px;color:#d1d5db">`;

  html += `<span style="color:#9ca3af">Country</span>`;
  html += `<span style="font-weight:500">${airspace.country}</span>`;

  if (airspace.icao) {
    html += `<span style="color:#9ca3af">ICAO</span>`;
    html += `<span style="font-weight:600;font-family:monospace;color:#cbd5e1">${airspace.icao}</span>`;
  }

  html += `<span style="color:#9ca3af">Lower</span>`;
  html += `<span style="font-weight:500">${lower}</span>`;

  html += `<span style="color:#9ca3af">Upper</span>`;
  html += `<span style="font-weight:500">${upper}</span>`;

  html += `</div>`;
  html += `</div>`;

  return html;
}

// ---------- Component ----------

export default function AirspaceOverlay({ visible, types }: AirspaceOverlayProps) {
  const map = useMap();
  const layerGroupRef = useRef<L.LayerGroup>(L.layerGroup());

  // Filter airspaces by selected types
  const filteredAirspaces = useMemo(() => {
    return AIRSPACES.filter((a) => types.has(a.type));
  }, [types]);

  const buildLayers = useCallback(() => {
    layerGroupRef.current.clearLayers();

    for (const airspace of filteredAirspaces) {
      const borderColor = getBorderColor(airspace.type);
      const dashArray = getBorderStyle(airspace.type);
      const isFIR = airspace.type === "FIR" || airspace.type === "UIR";

      // Convert [lat, lon] to Leaflet LatLng
      const latLngs: L.LatLngExpression[] = airspace.coordinates.map(
        ([lat, lon]) => [lat, lon] as L.LatLngTuple
      );

      // Create the polygon
      const polygon = L.polygon(latLngs, {
        color: borderColor,
        weight: isFIR ? 1.5 : 2,
        opacity: isFIR ? 0.6 : 0.8,
        dashArray: dashArray || undefined,
        fillColor: airspace.color,
        fillOpacity: parseFloat(airspace.color.match(/[\d.]+\)$/)?.[0] ?? "0.2"),
        className: "airspace-polygon",
        interactive: true,
      });

      // Click popup
      const popupHtml = buildPopupHtml(airspace);
      polygon.bindPopup(popupHtml, {
        className: "airspace-popup",
        maxWidth: 260,
        closeButton: true,
      });

      // Hover tooltip with name
      polygon.bindTooltip(
        `<span style="font-weight:600;font-size:11px">${airspace.name}</span>
         <span style="font-size:9px;color:#9ca3af;margin-left:4px">${typeLabel(airspace.type)}</span>`,
        {
          sticky: true,
          className: "airspace-tooltip",
          direction: "top",
          offset: [0, -8],
        }
      );

      layerGroupRef.current.addLayer(polygon);

      // Label marker at centroid (only visible at certain zoom levels depending on type)
      const center = polygonCentroid(airspace.coordinates);
      const minZoomForLabel = isFIR ? 4 : 8;

      const label = L.marker(center, {
        icon: L.divIcon({
          className: "airspace-label",
          html: `<div style="
            background: rgba(0,0,0,0.7);
            color: ${borderColor};
            padding: 1px 5px;
            border-radius: 3px;
            font-size: ${isFIR ? "10px" : "9px"};
            font-weight: 600;
            white-space: nowrap;
            border: 1px solid ${borderColor}30;
            pointer-events: none;
            font-family: system-ui, sans-serif;
            backdrop-filter: blur(4px);
          ">${airspace.name}<span style="opacity:0.6;margin-left:3px;font-size:8px">${typeLabel(airspace.type)}</span></div>`,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        }),
        interactive: false,
      });

      // Store the min zoom level on the marker for zoom-based filtering
      (label as unknown as { _minZoom: number })._minZoom = minZoomForLabel;
      layerGroupRef.current.addLayer(label);
    }
  }, [filteredAirspaces]);

  // Handle zoom-based label visibility
  const updateLabelVisibility = useCallback(() => {
    const currentZoom = map.getZoom();
    layerGroupRef.current.eachLayer((layer) => {
      const minZoom = (layer as unknown as { _minZoom?: number })._minZoom;
      if (minZoom !== undefined) {
        const el = (layer as L.Marker).getElement?.();
        if (el) {
          el.style.display = currentZoom >= minZoom ? "" : "none";
        }
      }
    });
  }, [map]);

  // Rebuild when data / types change
  useEffect(() => {
    if (visible && types.size > 0) {
      buildLayers();
      layerGroupRef.current.addTo(map);

      // Set up zoom listener for label visibility
      updateLabelVisibility();
      map.on("zoomend", updateLabelVisibility);
    } else {
      layerGroupRef.current.clearLayers();
      layerGroupRef.current.remove();
    }

    return () => {
      map.off("zoomend", updateLabelVisibility);
      layerGroupRef.current.clearLayers();
      layerGroupRef.current.remove();
    };
  }, [visible, types, map, buildLayers, updateLabelVisibility]);

  return null;
}
