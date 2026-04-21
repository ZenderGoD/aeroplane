"use client";

/**
 * MapLibre-GL based map — vector tiles, WebGL rendering.
 *
 * Why: Leaflet + raster tiles has inherent zoom choppiness.  MapLibre
 * renders vector tiles on the GPU, giving FR24-grade fluid zoom and
 * pan. We keep aircraft rendering as an HTML canvas overlay so
 * CanvasPlaneLayer's existing aircraft art (categories, military glow,
 * trails, etc.) works unchanged — we only swap the base map.
 *
 * This is opt-in via a feature flag so we can iterate without
 * breaking the Leaflet-based overlays (weather, METAR, runways, etc.)
 * that haven't been ported yet.
 */

import {
  useEffect,
  useRef,
  useMemo,
  useState,
  useCallback,
} from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FlightState } from "@/types/flight";
import type { Region } from "@/lib/regions";
import type { ViewMode } from "@/types/viewMode";
import type { FlightHistoryMap } from "@/lib/flightHistory";
import { useSharedFlightData } from "@/contexts/FlightDataContext";

interface Props {
  flights: FlightState[];
  selectedFlight: FlightState | null;
  onSelectFlight: (flight: FlightState | null) => void;
  region: Region;
  anomalyIcaos?: Set<string>;
  instabilityScores?: Map<string, number>;
  viewMode?: ViewMode;
  flightHistory?: FlightHistoryMap;
  hiddenCategories?: Set<number>;
}

// Free vector tile style — OpenFreeMap serves MapTiler-compatible
// dark vector tiles without an API key.  Fallback-friendly.
const DARK_STYLE_URL = "https://tiles.openfreemap.org/styles/dark";

const DEFAULT_CENTER: [number, number] = [82, 22]; // lon, lat — India
const DEFAULT_ZOOM = 4;

// Color palette — matches aircraft altitude coloring used in CanvasPlaneLayer
const CATEGORY_COLORS: Record<number, string> = {
  0: "#94a3b8", // unknown
  2: "#34d399", // light
  3: "#60a5fa", // small
  4: "#a78bfa", // large
  5: "#f59e0b", // high-vortex
  6: "#fb7185", // heavy
  7: "#ef4444", // high-perf
  8: "#fbbf24", // rotorcraft
};

const PLANE_SIZE = 10;
const SELECTED_SIZE = 14;
const CLICK_RADIUS = 18;

/**
 * Draw a single aircraft icon on a 2D canvas context.
 * Mirrors the logic in CanvasPlaneLayer but self-contained so this
 * component doesn't depend on Leaflet-bound code.
 */
function drawAircraft(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  heading: number,
  selected: boolean,
  category: number,
  size: number,
) {
  const rad = ((heading - 90) * Math.PI) / 180;
  const color = CATEGORY_COLORS[category] ?? CATEGORY_COLORS[0];

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rad);

  if (selected) {
    ctx.shadowColor = "#e2e8f0";
    ctx.shadowBlur = 12;
  }

  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(-size * 0.6, -size * 0.5);
  ctx.lineTo(-size * 0.3, 0);
  ctx.lineTo(-size * 0.6, size * 0.5);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();

  ctx.restore();
}

export default function MapContentMaplibre({
  flights,
  selectedFlight,
  onSelectFlight,
  region,
  hiddenCategories,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const { setBbox } = useSharedFlightData();

  // Stash latest flights/selection in refs so the render loop can
  // access them without needing to re-register.
  const flightsRef = useRef(flights);
  flightsRef.current = flights;
  const selectedRef = useRef(selectedFlight);
  selectedRef.current = selectedFlight;
  const hiddenRef = useRef(hiddenCategories);
  hiddenRef.current = hiddenCategories;

  // ── Initialize map ────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DARK_STYLE_URL,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: { compact: true },
      // Smoothness knobs — these are the reason we migrated.
      pitchWithRotate: false,
      dragRotate: false,
    });

    map.on("load", () => setMapReady(true));

    // Create the aircraft canvas overlay. It's positioned absolutely
    // over the map container and repainted on every map move/zoom.
    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "auto";
    canvas.style.zIndex = "5";
    containerRef.current.appendChild(canvas);
    canvasRef.current = canvas;

    const ratio = window.devicePixelRatio || 1;
    const resizeCanvas = () => {
      if (!containerRef.current || !canvas) return;
      const rect = containerRef.current.getBoundingClientRect();
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    mapRef.current = map;

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      canvas.remove();
      canvasRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── Viewport → FlightData bbox sync ───────────────────────────────
  // Every time the user pans/zooms, send the visible bbox (padded 20%)
  // to the FlightDataProvider. The API then tiles THAT viewport at 5×5
  // density — much denser than tiling all of India. Debounced 300ms so
  // mid-animation fetches don't spam the API.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const sendViewport = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const bounds = map.getBounds();
        const lamin = bounds.getSouth();
        const lamax = bounds.getNorth();
        const lomin = bounds.getWest();
        const lomax = bounds.getEast();
        // Pad 20% beyond the visible area so aircraft just over the
        // edge are pre-loaded — no pop-in when you pan slightly.
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

    sendViewport(); // fire immediately on mount

    map.on("moveend", sendViewport);
    map.on("zoomend", sendViewport);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      map.off("moveend", sendViewport);
      map.off("zoomend", sendViewport);
    };
  }, [mapReady, setBbox]);

  // ── Canvas render loop ────────────────────────────────────────────
  // Re-draws aircraft on every map move/zoom. MapLibre fires these
  // events continuously during animations, giving us a smooth follow.
  useEffect(() => {
    const map = mapRef.current;
    const canvas = canvasRef.current;
    if (!map || !canvas || !mapReady) return;

    const ratio = window.devicePixelRatio || 1;

    const redraw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);

      const currentFlights = flightsRef.current;
      const sel = selectedRef.current;
      const hidden = hiddenRef.current;
      const zoom = map.getZoom();
      const zoomScale = Math.max(0.6, Math.min(1.4, (zoom - 2) / 8));
      const planeSize = PLANE_SIZE * zoomScale;
      const selSize = SELECTED_SIZE * zoomScale;

      for (const f of currentFlights) {
        if (f.latitude === null || f.longitude === null) continue;
        const isSel = sel?.icao24 === f.icao24;
        if (!isSel && hidden?.has(f.category)) continue;

        const pt = map.project([f.longitude, f.latitude]);
        const effSize = isSel ? selSize : planeSize;
        drawAircraft(ctx, pt.x, pt.y, f.trueTrack ?? 0, isSel, f.category, effSize);
      }
    };

    // Initial draw
    redraw();

    // Re-draw on every map interaction — MapLibre emits "move" during
    // zoom animations so we get smooth plane tracking.
    map.on("move", redraw);
    map.on("zoom", redraw);

    return () => {
      map.off("move", redraw);
      map.off("zoom", redraw);
    };
  }, [mapReady]);

  // ── Re-draw when flights prop changes ─────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    // Nudge the map so the redraw handler fires
    map.triggerRepaint();
  }, [flights, selectedFlight, hiddenCategories, mapReady]);

  // ── Click handler (pick nearest aircraft within CLICK_RADIUS) ────
  useEffect(() => {
    const map = mapRef.current;
    const canvas = canvasRef.current;
    if (!map || !canvas) return;

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      let closest: FlightState | null = null;
      let closestDistSq = CLICK_RADIUS * CLICK_RADIUS;
      for (const f of flightsRef.current) {
        if (f.latitude === null || f.longitude === null) continue;
        const pt = map.project([f.longitude, f.latitude]);
        const dx = pt.x - mx;
        const dy = pt.y - my;
        const d = dx * dx + dy * dy;
        if (d < closestDistSq) {
          closestDistSq = d;
          closest = f;
        }
      }
      if (closest) {
        onSelectFlight(closest);
        e.stopPropagation();
      } else {
        onSelectFlight(null);
      }
    };

    canvas.addEventListener("click", handleClick);
    return () => canvas.removeEventListener("click", handleClick);
  }, [onSelectFlight]);

  // ── Fly to region when user changes it ───────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    map.flyTo({
      center: [region.center[1], region.center[0]], // [lat, lon] → [lon, lat]
      zoom: region.zoom,
      duration: 1500,
      essential: true,
    });
  }, [region, mapReady]);

  // ── Fly to selected flight when clicked from outside ─────────────
  const prevFlightIcaoRef = useRef<string | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !selectedFlight) {
      prevFlightIcaoRef.current = null;
      return;
    }
    if (selectedFlight.icao24 === prevFlightIcaoRef.current) return;
    prevFlightIcaoRef.current = selectedFlight.icao24;
    if (selectedFlight.latitude === null || selectedFlight.longitude === null) return;

    // Only fly if outside viewport
    const bounds = map.getBounds();
    const inside =
      selectedFlight.longitude >= bounds.getWest() &&
      selectedFlight.longitude <= bounds.getEast() &&
      selectedFlight.latitude >= bounds.getSouth() &&
      selectedFlight.latitude <= bounds.getNorth();
    if (!inside) {
      map.flyTo({
        center: [selectedFlight.longitude, selectedFlight.latitude],
        zoom: Math.max(map.getZoom(), 8),
        duration: 1200,
        essential: true,
      });
    }
  }, [selectedFlight, mapReady]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full relative"
      style={{ background: "#05060a" }}
    />
  );
}
