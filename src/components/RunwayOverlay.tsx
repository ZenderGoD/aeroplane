"use client";

import { useEffect, useRef, useCallback } from "react";
import { useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { AIRPORTS_WITH_RUNWAYS } from "@/data/runways";
import type { RunwayData, RunwayInfo } from "@/data/runways";

interface RunwayOverlayProps {
  visible: boolean;
}

/**
 * Returns line weight for runway based on current zoom level.
 * Runways scale from thin at low zoom to thick at high zoom.
 */
function getRunwayWeight(zoom: number): number {
  if (zoom >= 15) return 10;
  if (zoom >= 14) return 8;
  if (zoom >= 13) return 6;
  if (zoom >= 12) return 5;
  if (zoom >= 11) return 4;
  return 3;
}

/**
 * Returns the center-line weight (yellow dashed line on top of runway).
 */
function getCenterLineWeight(zoom: number): number {
  return Math.max(1, Math.floor(getRunwayWeight(zoom) / 3));
}

/**
 * Returns font size for runway end labels based on zoom.
 */
function getLabelFontSize(zoom: number): number {
  if (zoom >= 15) return 13;
  if (zoom >= 13) return 11;
  return 10;
}

/**
 * Build the popup HTML content for an airport and its runways.
 */
function buildPopupContent(airport: RunwayData): string {
  const runwayRows = airport.runways
    .map((rwy) => {
      const status = rwy.closed
        ? '<span style="color:#e2e8f0;font-weight:600">CLOSED</span>'
        : '<span style="color:#cbd5e1;font-weight:600">ACTIVE</span>';
      return `
        <tr style="border-bottom:1px solid #334155">
          <td style="padding:4px 8px;font-family:monospace;font-weight:700;color:#e2e8f0">${rwy.id}</td>
          <td style="padding:4px 8px;color:#94a3b8">${rwy.length_ft.toLocaleString()} ft</td>
          <td style="padding:4px 8px;color:#94a3b8">${rwy.width_ft} ft</td>
          <td style="padding:4px 8px;color:#94a3b8">${rwy.surface}</td>
          <td style="padding:4px 8px">${status}</td>
        </tr>`;
    })
    .join("");

  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;min-width:320px">
      <div style="padding:8px 12px;background:#1c1c1c;border-bottom:2px solid #94a3b8;border-radius:6px 6px 0 0">
        <div style="font-size:16px;font-weight:700;color:#f1f5f9">${airport.airportIcao}</div>
        <div style="font-size:12px;color:#94a3b8;margin-top:2px">${airport.airportName}</div>
      </div>
      <div style="padding:4px 0;background:#0f0f0f;border-radius:0 0 6px 6px">
        <table style="width:100%;border-collapse:collapse;font-size:11px">
          <thead>
            <tr style="border-bottom:1px solid #475569">
              <th style="padding:4px 8px;text-align:left;color:#64748b;font-weight:600">Runway</th>
              <th style="padding:4px 8px;text-align:left;color:#64748b;font-weight:600">Length</th>
              <th style="padding:4px 8px;text-align:left;color:#64748b;font-weight:600">Width</th>
              <th style="padding:4px 8px;text-align:left;color:#64748b;font-weight:600">Surface</th>
              <th style="padding:4px 8px;text-align:left;color:#64748b;font-weight:600">Status</th>
            </tr>
          </thead>
          <tbody>${runwayRows}</tbody>
        </table>
        <div style="padding:6px 8px;font-size:10px;color:#475569;text-align:right">
          ${airport.runways.length} runway${airport.runways.length > 1 ? "s" : ""}
          &bull; ${airport.lat.toFixed(4)}, ${airport.lon.toFixed(4)}
        </div>
      </div>
    </div>`;
}

/**
 * Create a DivIcon for runway end labels (e.g. "09L", "27R")
 */
function createRunwayLabel(
  ident: string,
  heading: number,
  zoom: number
): L.DivIcon {
  const fontSize = getLabelFontSize(zoom);
  // Rotate text to align with runway heading
  // The label should be perpendicular-ish for readability at the threshold
  const rotation = heading > 180 ? heading - 180 : heading;

  return L.divIcon({
    className: "", // remove default leaflet-div-icon styling
    html: `<div style="
      font-family:'SF Mono',SFMono-Regular,Consolas,'Liberation Mono',Menlo,monospace;
      font-size:${fontSize}px;
      font-weight:700;
      color:#f1f5f9;
      background:rgba(10,10,10,0.88);
      padding:2px 5px;
      border-radius:3px;
      border:1px solid rgba(100,116,139,0.5);
      white-space:nowrap;
      transform:translate(-50%,-50%);
      pointer-events:none;
      text-shadow:0 1px 2px rgba(0,0,0,0.5);
      line-height:1.2;
    ">${ident}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

/**
 * Create the ICAO code label shown at airport center at zoom >= 8
 */
function createIcaoLabel(icao: string, zoom: number): L.DivIcon {
  const fontSize = zoom >= 12 ? 14 : zoom >= 10 ? 12 : 11;
  return L.divIcon({
    className: "",
    html: `<div style="
      font-family:'SF Mono',SFMono-Regular,Consolas,'Liberation Mono',Menlo,monospace;
      font-size:${fontSize}px;
      font-weight:700;
      color:#94a3b8;
      background:rgba(10,10,10,0.82);
      padding:3px 7px;
      border-radius:4px;
      border:1px solid rgba(148,163,184,0.4);
      white-space:nowrap;
      transform:translate(-50%,-50%);
      cursor:pointer;
      text-shadow:0 0 6px rgba(148,163,184,0.4);
      line-height:1.2;
    ">${icao}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

/**
 * Check if an airport is within the current map bounds (with some padding).
 */
function isInBounds(airport: RunwayData, bounds: L.LatLngBounds): boolean {
  return bounds.contains(L.latLng(airport.lat, airport.lon));
}

export default function RunwayOverlay({ visible }: RunwayOverlayProps) {
  const map = useMap();
  const layerGroupRef = useRef<L.LayerGroup>(L.layerGroup());

  const buildLayers = useCallback(() => {
    layerGroupRef.current.clearLayers();

    if (!visible) return;

    const zoom = map.getZoom();
    const bounds = map.getBounds().pad(0.15); // 15% padding

    // Filter airports within current map bounds
    const visibleAirports = AIRPORTS_WITH_RUNWAYS.filter((airport) =>
      isInBounds(airport, bounds)
    );

    for (const airport of visibleAirports) {
      // Show ICAO label at zoom >= 8
      if (zoom >= 8) {
        const icaoMarker = L.marker([airport.lat, airport.lon], {
          icon: createIcaoLabel(airport.airportIcao, zoom),
          interactive: true,
          zIndexOffset: 500,
        });

        // Popup on click
        icaoMarker.bindPopup(buildPopupContent(airport), {
          className: "runway-popup",
          maxWidth: 420,
          minWidth: 320,
          closeButton: true,
          autoPan: true,
        });

        layerGroupRef.current.addLayer(icaoMarker);
      }

      // Show runways only at zoom >= 10
      if (zoom < 10) continue;

      const weight = getRunwayWeight(zoom);
      const centerWeight = getCenterLineWeight(zoom);

      for (const runway of airport.runways) {
        const leLatLng: L.LatLngExpression = [runway.le.lat, runway.le.lon];
        const heLatLng: L.LatLngExpression = [runway.he.lat, runway.he.lon];

        // Main runway surface
        const runwayColor = runway.closed ? "#64748b" : "#cbd5e1";
        const runwayLine = L.polyline([leLatLng, heLatLng], {
          color: runwayColor,
          weight,
          opacity: 0.85,
          lineCap: "butt",
          lineJoin: "miter",
          interactive: true,
        });

        // Bind popup to runway line as well
        runwayLine.bindPopup(buildPopupContent(airport), {
          className: "runway-popup",
          maxWidth: 420,
          minWidth: 320,
          closeButton: true,
        });

        layerGroupRef.current.addLayer(runwayLine);

        // Center line (yellow dashed)
        const centerLine = L.polyline([leLatLng, heLatLng], {
          color: "#94a3b8",
          weight: centerWeight,
          opacity: 0.7,
          dashArray: "6, 8",
          lineCap: "butt",
          interactive: false,
        });
        layerGroupRef.current.addLayer(centerLine);

        // Runway threshold markers (short perpendicular white lines at each end)
        if (zoom >= 13) {
          const thresholdWeight = Math.max(2, weight - 2);
          // Small circle at each end to mark the threshold
          const leCircle = L.circleMarker(leLatLng, {
            radius: Math.max(2, weight / 2),
            color: "#ffffff",
            fillColor: "#ffffff",
            fillOpacity: 0.6,
            weight: 1,
            interactive: false,
          });
          const heCircle = L.circleMarker(heLatLng, {
            radius: Math.max(2, weight / 2),
            color: "#ffffff",
            fillColor: "#ffffff",
            fillOpacity: 0.6,
            weight: 1,
            interactive: false,
          });
          layerGroupRef.current.addLayer(leCircle);
          layerGroupRef.current.addLayer(heCircle);
        }

        // Runway end labels
        if (zoom >= 12) {
          const leLabel = L.marker(leLatLng, {
            icon: createRunwayLabel(runway.le.ident, runway.heading, zoom),
            interactive: false,
            zIndexOffset: 600,
          });
          const heLabel = L.marker(heLatLng, {
            icon: createRunwayLabel(
              runway.he.ident,
              (runway.heading + 180) % 360,
              zoom
            ),
            interactive: false,
            zIndexOffset: 600,
          });
          layerGroupRef.current.addLayer(leLabel);
          layerGroupRef.current.addLayer(heLabel);
        }
      }
    }
  }, [map, visible]);

  // Rebuild layers on zoom, move, or visibility change
  useMapEvents({
    zoomend: buildLayers,
    moveend: buildLayers,
  });

  useEffect(() => {
    buildLayers();
  }, [buildLayers]);

  // Add/remove layer group from map
  useEffect(() => {
    const lg = layerGroupRef.current;
    if (visible) {
      lg.addTo(map);
    } else {
      lg.remove();
    }
    return () => {
      lg.remove();
    };
  }, [map, visible]);

  // Inject dark-themed popup styles
  useEffect(() => {
    const styleId = "runway-overlay-styles";
    if (document.getElementById(styleId)) return;

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .runway-popup .leaflet-popup-content-wrapper {
        background: #0f0f0f;
        color: #e2e8f0;
        border-radius: 8px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(148,163,184,0.2);
        padding: 0;
        overflow: hidden;
      }
      .runway-popup .leaflet-popup-content {
        margin: 0;
        line-height: 1.4;
      }
      .runway-popup .leaflet-popup-tip {
        background: #0f0f0f;
        box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      }
      .runway-popup .leaflet-popup-close-button {
        color: #94a3b8;
        font-size: 18px;
        padding: 6px 8px;
        z-index: 10;
      }
      .runway-popup .leaflet-popup-close-button:hover {
        color: #f1f5f9;
      }
    `;
    document.head.appendChild(style);

    return () => {
      const existing = document.getElementById(styleId);
      if (existing) existing.remove();
    };
  }, []);

  return null;
}
