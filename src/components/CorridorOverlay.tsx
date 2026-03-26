"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { CORRIDORS } from "@/lib/corridors";
import { useCorridorHealth } from "@/hooks/useCorridorHealth";
import { useCorridorPredictability } from "@/hooks/useCorridorPredictability";
import { greatCircleArc } from "@/lib/geo";
import type { CorridorHealth, CorridorPredictability } from "@/types/corridor";

interface CorridorOverlayProps {
  visible: boolean;
  onSelectCorridor?: (corridorId: string) => void;
}

// Color coding by corridor health status
function getStatusColor(status: string): string {
  switch (status) {
    case "disrupted":
      return "#ef4444";
    case "congested":
      return "#f97316";
    case "compressed":
      return "#eab308";
    default:
      return "#22c55e";
  }
}

function getStatusOpacity(status: string): number {
  switch (status) {
    case "disrupted":
      return 0.9;
    case "congested":
      return 0.8;
    case "compressed":
      return 0.7;
    default:
      return 0.5;
  }
}

function getPredictabilityEmoji(score: number): string {
  if (score >= 80) return "&#9679;"; // solid circle (very predictable)
  if (score >= 60) return "&#9675;"; // open circle
  if (score >= 40) return "&#9651;"; // triangle
  return "&#9888;";                  // warning
}

function getTrendArrow(label: string): string {
  switch (label) {
    case "improving":
      return "&#8593;"; // up arrow
    case "degrading":
      return "&#8595;"; // down arrow
    default:
      return "&#8594;"; // right arrow (stable)
  }
}

function getTrendColor(label: string): string {
  switch (label) {
    case "improving":
      return "#22c55e";
    case "degrading":
      return "#ef4444";
    default:
      return "#94a3b8";
  }
}

export default function CorridorOverlay({ visible, onSelectCorridor }: CorridorOverlayProps) {
  const map = useMap();
  const layerGroupRef = useRef<L.LayerGroup>(L.layerGroup());
  const { corridors: healthData } = useCorridorHealth();
  const { predictabilities } = useCorridorPredictability();

  // Build lookup maps
  const healthMap = useMemo(() => {
    const m = new Map<string, CorridorHealth>();
    for (const h of healthData) m.set(h.corridorId, h);
    return m;
  }, [healthData]);

  const predMap = useMemo(() => {
    const m = new Map<string, CorridorPredictability>();
    for (const p of predictabilities) m.set(p.corridorId, p);
    return m;
  }, [predictabilities]);

  const buildLayers = useCallback(() => {
    layerGroupRef.current.clearLayers();

    for (const corridor of CORRIDORS) {
      const health = healthMap.get(corridor.id);
      const pred = predMap.get(corridor.id);

      const status = health?.status ?? "normal";
      const color = getStatusColor(status);
      const opacity = getStatusOpacity(status);

      // Generate great circle arc points
      const arcPoints = greatCircleArc(
        corridor.originLat,
        corridor.originLon,
        corridor.destLat,
        corridor.destLon,
        40
      );

      const latLngs: L.LatLngExpression[] = arcPoints.map(([lat, lon]) => [lat, lon]);

      // Main corridor line
      const line = L.polyline(latLngs, {
        color,
        weight: health ? Math.min(5, 2 + (health.flightCount / 5)) : 2,
        opacity,
        dashArray: health?.flightCount === 0 ? "8, 8" : undefined,
        smoothFactor: 1,
        className: onSelectCorridor ? "cursor-pointer" : undefined,
      });

      if (onSelectCorridor) {
        line.on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          onSelectCorridor(corridor.id);
        });
      }

      layerGroupRef.current.addLayer(line);

      // Buffer zone (semi-transparent wider line)
      const bufferLine = L.polyline(latLngs, {
        color,
        weight: Math.min(20, corridor.bufferNm / 3),
        opacity: 0.08,
        smoothFactor: 1,
        interactive: false,
      });
      layerGroupRef.current.addLayer(bufferLine);

      // Airport endpoint markers
      const originMarker = L.circleMarker(
        [corridor.originLat, corridor.originLon],
        {
          radius: 5,
          color,
          fillColor: color,
          fillOpacity: 0.8,
          weight: 2,
        }
      );
      layerGroupRef.current.addLayer(originMarker);

      const destMarker = L.circleMarker(
        [corridor.destLat, corridor.destLon],
        {
          radius: 5,
          color,
          fillColor: color,
          fillOpacity: 0.8,
          weight: 2,
        }
      );
      layerGroupRef.current.addLayer(destMarker);

      // Tooltip with corridor info
      const tooltipContent = buildTooltip(corridor.name, corridor.id, health, pred);
      line.bindTooltip(tooltipContent, {
        sticky: true,
        className: "corridor-tooltip",
        direction: "top",
        offset: [0, -10],
      });

      // Midpoint label (show corridor name at zoom >= 6)
      const midIdx = Math.floor(arcPoints.length / 2);
      const [midLat, midLon] = arcPoints[midIdx];
      const label = L.marker([midLat, midLon], {
        icon: L.divIcon({
          className: "corridor-label",
          html: `<div style="
            background: rgba(0,0,0,0.75);
            color: ${color};
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 10px;
            font-weight: 600;
            white-space: nowrap;
            border: 1px solid ${color}40;
            pointer-events: none;
            font-family: system-ui, sans-serif;
          ">${corridor.originIcao} &#8596; ${corridor.destinationIcao}${
            health ? ` <span style="color:${color}">${health.healthScore}</span>` : ""
          }${
            pred ? ` <span style="color:${getTrendColor(pred.trendLabel)};font-size:9px">${getTrendArrow(pred.trendLabel)}</span>` : ""
          }</div>`,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        }),
        interactive: false,
      });
      layerGroupRef.current.addLayer(label);
    }
  }, [healthMap, predMap, onSelectCorridor]);

  // Rebuild when data changes
  useEffect(() => {
    if (visible) {
      buildLayers();
      layerGroupRef.current.addTo(map);
    } else {
      layerGroupRef.current.clearLayers();
      layerGroupRef.current.remove();
    }

    return () => {
      layerGroupRef.current.clearLayers();
      layerGroupRef.current.remove();
    };
  }, [visible, map, buildLayers]);

  return null;
}

function buildTooltip(
  name: string,
  id: string,
  health: CorridorHealth | undefined,
  pred: CorridorPredictability | undefined
): string {
  let html = `<div style="font-family:system-ui;font-size:11px;line-height:1.5">`;
  html += `<div style="font-weight:700;font-size:12px;margin-bottom:4px">${name}</div>`;
  html += `<div style="color:#9ca3af;font-size:9px;margin-bottom:6px">${id}</div>`;

  if (health) {
    const color = getStatusColor(health.status);
    html += `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">`;
    html += `<span style="color:${color};font-weight:700">${health.healthScore}</span>`;
    html += `<span style="background:${color}20;color:${color};padding:1px 6px;border-radius:9px;font-size:9px;text-transform:uppercase">${health.status}</span>`;
    html += `</div>`;

    html += `<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:2px 12px;font-size:10px;color:#d1d5db">`;
    html += `<span>Flights: <b>${health.flightCount}</b></span>`;
    html += `<span>Spacing: <b>${health.avgSpacingNm ? `${Math.round(health.avgSpacingNm)} NM` : "—"}</b></span>`;
    html += `<span>Avg Alt: <b>${health.avgAltitude ? `${Math.round(health.avgAltitude * 3.28084)} ft` : "—"}</b></span>`;
    html += `<span>Anomalies: <b style="color:${health.anomalyCount > 0 ? "#ef4444" : "#6b7280"}">${health.anomalyCount}</b></span>`;
    html += `</div>`;
  } else {
    html += `<div style="color:#6b7280;font-size:10px">No health data yet</div>`;
  }

  if (pred) {
    html += `<div style="border-top:1px solid #374151;margin-top:6px;padding-top:6px">`;
    html += `<div style="font-size:10px;color:#9ca3af;margin-bottom:3px">Predictability</div>`;
    html += `<div style="display:flex;align-items:center;gap:6px">`;
    html += `<span style="font-weight:700;font-size:13px">${pred.predictabilityScore}</span>`;
    html += `<span style="font-size:10px;color:${getTrendColor(pred.trendLabel)}">${getTrendArrow(pred.trendLabel)} ${pred.trendLabel}</span>`;
    html += `</div>`;
    html += `<div style="font-size:9px;color:#6b7280;margin-top:2px">${pred.sampleCount} samples, stddev ${pred.healthStdDev}</div>`;

    // Mini sparkline
    if (pred.recentScores.length > 2) {
      const max = Math.max(...pred.recentScores, 100);
      const w = 80;
      const h = 16;
      const points = pred.recentScores
        .map((s, i) => `${(i / (pred.recentScores.length - 1)) * w},${h - (s / max) * h}`)
        .join(" ");
      html += `<svg width="${w}" height="${h}" style="margin-top:4px">`;
      html += `<polyline points="${points}" fill="none" stroke="${getStatusColor(health?.status ?? "normal")}" stroke-width="1.5"/>`;
      html += `</svg>`;
    }

    html += `</div>`;
  }

  html += `</div>`;
  return html;
}
