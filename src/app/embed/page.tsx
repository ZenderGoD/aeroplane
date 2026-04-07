"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import type { FlightState } from "@/types/flight";
// Leaflet loaded dynamically to avoid SSR "window is not defined"
// eslint-disable-next-line @typescript-eslint/no-require-imports
const L: typeof import("leaflet") = typeof window !== "undefined" ? require("leaflet") : null;
if (typeof window !== "undefined") require("leaflet/dist/leaflet.css");

/* ------------------------------------------------------------------ */
/*  Altitude → colour (same palette the main tracker uses)            */
/* ------------------------------------------------------------------ */
function altitudeColor(altMeters: number | null): string {
  if (altMeters === null || altMeters <= 0) return "#cbd5e1"; // ground / unknown → slate
  const ft = altMeters * 3.28084;
  if (ft < 5_000) return "#cbd5e1";
  if (ft < 10_000) return "#94a3b8";
  if (ft < 20_000) return "#94a3b8";
  if (ft < 30_000) return "#94a3b8";
  if (ft < 40_000) return "#e2e8f0";
  return "#94a3b8";
}

/* ------------------------------------------------------------------ */
/*  Plane SVG icon (rotated by heading, coloured by altitude)         */
/* ------------------------------------------------------------------ */
function planeIconHtml(heading: number, color: string): string {
  return `<svg width="20" height="20" viewBox="0 0 24 24" style="transform:rotate(${heading}deg);filter:drop-shadow(0 0 3px ${color}80);" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L8 10H3L5 13H8L10 22H14L12 13H15L17 13H21L19 10H16L12 2Z" fill="${color}" stroke="rgba(0,0,0,0.4)" stroke-width="0.5"/>
  </svg>`;
}

/* ------------------------------------------------------------------ */
/*  Range-ring helper (draws concentric NM circles around a point)    */
/* ------------------------------------------------------------------ */
function drawRangeRings(
  L: typeof import("leaflet"),
  map: import("leaflet").Map,
  lat: number,
  lon: number,
  rings: number[] = [5, 10, 25, 50]
) {
  const group = L.layerGroup().addTo(map);
  for (const nm of rings) {
    const meters = nm * 1852;
    L.circle([lat, lon], {
      radius: meters,
      color: "rgba(148,163,184,0.25)",
      weight: 1,
      fill: false,
      dashArray: "4 6",
    }).addTo(group);

    // label
    const labelLat = lat + (nm * 1852) / 111_320;
    L.marker([labelLat, lon], {
      icon: L.divIcon({
        className: "",
        html: `<span style="color:rgba(148,163,184,0.5);font-size:9px;font-family:monospace;white-space:nowrap;">${nm} NM</span>`,
        iconSize: [40, 12],
        iconAnchor: [20, 6],
      }),
      interactive: false,
    }).addTo(group);
  }
  return group;
}

/* ================================================================== */
/*  Embed Map — inner component (reads search params)                 */
/* ================================================================== */
function EmbedMapInner() {
  const params = useSearchParams();
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<import("leaflet").LayerGroup | null>(null);
  const [flights, setFlights] = useState<FlightState[]>([]);
  const [count, setCount] = useState(0);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Parse params
  const lat = parseFloat(params.get("lat") ?? "28.5");
  const lon = parseFloat(params.get("lon") ?? "77.1");
  const zoom = parseInt(params.get("zoom") ?? "7", 10);
  const radius = parseInt(params.get("radius") ?? "100", 10);
  const theme = params.get("theme") ?? "dark";
  const airportIcao = params.get("airport");
  const trackCallsign = params.get("callsign");

  /* ---- Resolve airport center ----------------------------------- */
  const [center, setCenter] = useState<[number, number]>([lat, lon]);
  const [airportResolved, setAirportResolved] = useState(!airportIcao);

  useEffect(() => {
    if (!airportIcao) {
      setCenter([lat, lon]);
      setAirportResolved(true);
      return;
    }
    // Dynamically import airports to resolve ICAO
    import("@/lib/airports").then(({ getAirportByIcao }) => {
      const ap = getAirportByIcao(airportIcao);
      if (ap) {
        setCenter([ap.lat, ap.lon]);
      } else {
        setCenter([lat, lon]);
      }
      setAirportResolved(true);
    });
  }, [airportIcao, lat, lon]);

  /* ---- Fetch flights -------------------------------------------- */
  const fetchFlights = useCallback(async () => {
    try {
      // Build bbox from center + radius
      const radiusNm = Math.min(radius, 500);
      const dLat = (radiusNm * 1852) / 111_320;
      const dLon = dLat / Math.cos((center[0] * Math.PI) / 180);

      const qp = new URLSearchParams({
        lamin: (center[0] - dLat).toFixed(4),
        lomin: (center[1] - dLon).toFixed(4),
        lamax: (center[0] + dLat).toFixed(4),
        lomax: (center[1] + dLon).toFixed(4),
      });

      const res = await fetch(`/api/flights?${qp.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      const list: FlightState[] = data.flights ?? [];
      setFlights(list);
      setCount(list.length);
    } catch {
      // silent
    }
  }, [center, radius]);

  useEffect(() => {
    if (!airportResolved) return;
    fetchFlights();
    intervalRef.current = setInterval(fetchFlights, 10_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchFlights, airportResolved]);

  /* ---- Init Leaflet map ----------------------------------------- */
  useEffect(() => {
    if (!containerRef.current || !airportResolved || !L) return;
    if (mapRef.current) return; // already initialised

    leafletRef.current = L;

    const tileUrl =
      theme === "light"
        ? "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

    const map = L.map(containerRef.current, {
      center: center,
      zoom: zoom,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer(tileUrl, {
      maxZoom: 18,
      subdomains: "abcd",
    }).addTo(map);

    // Attribution (small)
    L.control.attribution({ position: "bottomleft", prefix: false }).addTo(map);

    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // Range rings if airport param given
    if (airportIcao) {
      drawRangeRings(L, map, center[0], center[1], [5, 10, 25, 50]);
      // Airport label
      L.marker(center, {
        icon: L.divIcon({
          className: "",
          html: `<div style="background:rgba(148,163,184,0.15);border:1px solid rgba(148,163,184,0.3);border-radius:6px;padding:2px 6px;font-size:10px;font-family:monospace;color:#94a3b8;white-space:nowrap;">${airportIcao.toUpperCase()}</div>`,
          iconSize: [60, 20],
          iconAnchor: [30, 10],
        }),
        interactive: false,
      }).addTo(map);
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [airportResolved]);

  /* ---- Update markers whenever flights change ------------------- */
  useEffect(() => {
    const L = leafletRef.current;
    const group = markersRef.current;
    if (!L || !group) return;

    group.clearLayers();

    let tracked: FlightState | null = null;

    for (const f of flights) {
      if (f.latitude === null || f.longitude === null) continue;

      const heading = f.trueTrack ?? 0;
      const color = altitudeColor(f.baroAltitude);
      const isTracked =
        trackCallsign &&
        f.callsign?.trim().toUpperCase() ===
          trackCallsign.trim().toUpperCase();

      const size = isTracked ? 28 : 20;
      const icon = L.divIcon({
        className: "",
        html: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" style="transform:rotate(${heading}deg);filter:drop-shadow(0 0 ${isTracked ? "6" : "3"}px ${color}${isTracked ? "cc" : "80"});" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L8 10H3L5 13H8L10 22H14L12 13H15L17 13H21L19 10H16L12 2Z" fill="${color}" stroke="${isTracked ? "#fff" : "rgba(0,0,0,0.4)"}" stroke-width="${isTracked ? "1" : "0.5"}"/>
        </svg>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([f.latitude, f.longitude], { icon });

      // Tooltip on click
      const altFt = f.baroAltitude
        ? Math.round(f.baroAltitude * 3.28084).toLocaleString()
        : "---";
      const spdKts = f.velocity
        ? Math.round(f.velocity * 1.944).toLocaleString()
        : "---";
      const cs = f.callsign?.trim() || f.icao24;

      marker.bindPopup(
        `<div style="font-family:'Geist Mono',monospace;font-size:11px;color:#e2e8f0;min-width:160px;padding:8px;">
          <div style="font-size:13px;font-weight:700;color:#94a3b8;margin-bottom:6px;">${cs}</div>
          <div style="display:grid;grid-template-columns:auto 1fr;gap:2px 8px;">
            <span style="color:#64748b;">ALT</span><span>${altFt} ft</span>
            <span style="color:#64748b;">SPD</span><span>${spdKts} kts</span>
            <span style="color:#64748b;">HDG</span><span>${Math.round(heading)}&deg;</span>
            ${f.squawk ? `<span style="color:#64748b;">SQK</span><span>${f.squawk}</span>` : ""}
          </div>
        </div>`,
        {
          className: "embed-popup",
          closeButton: false,
        }
      );

      marker.addTo(group);

      if (isTracked) tracked = f;
    }

    // Pan to tracked aircraft
    if (tracked && tracked.latitude !== null && tracked.longitude !== null) {
      mapRef.current?.panTo([tracked.latitude, tracked.longitude], {
        animate: true,
        duration: 0.5,
      });
    }
  }, [flights, trackCallsign]);

  /* ---- Render --------------------------------------------------- */
  const isDark = theme !== "light";

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: isDark ? "#06080d" : "#f8fafc",
        overflow: "hidden",
      }}
    >
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {/* Flight count badge */}
      <div
        style={{
          position: "absolute",
          top: 8,
          left: 8,
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: isDark ? "rgba(6,8,13,0.85)" : "rgba(255,255,255,0.9)",
          backdropFilter: "blur(12px)",
          border: `1px solid ${isDark ? "rgba(148,163,184,0.1)" : "rgba(0,0,0,0.1)"}`,
          borderRadius: 8,
          padding: "4px 10px",
          fontFamily: "'Geist Mono', monospace",
          fontSize: 11,
          color: isDark ? "#94a3b8" : "#475569",
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#94a3b8",
            boxShadow: "0 0 6px rgba(148,163,184,0.5)",
            animation: "embed-pulse 2s ease-in-out infinite",
          }}
        />
        <span style={{ fontWeight: 600, color: isDark ? "#f1f5f9" : "#0f172a" }}>
          {count}
        </span>
        aircraft
        {trackCallsign && (
          <span style={{ color: "#94a3b8", marginLeft: 4 }}>
            tracking {trackCallsign.toUpperCase()}
          </span>
        )}
      </div>

      {/* AeroIntel watermark */}
      <div
        style={{
          position: "absolute",
          bottom: 6,
          right: 8,
          zIndex: 1000,
          fontFamily: "'Geist Mono', monospace",
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: "0.05em",
          color: isDark ? "rgba(148,163,184,0.3)" : "rgba(0,0,0,0.2)",
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        AEROINTEL
      </div>

      {/* Inline styles for popup + pulse animation */}
      <style>{`
        @keyframes embed-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .embed-popup .leaflet-popup-content-wrapper {
          background: ${isDark ? "rgba(10,10,10,0.95)" : "rgba(255,255,255,0.95)"};
          backdrop-filter: blur(16px);
          border: 1px solid ${isDark ? "rgba(148,163,184,0.1)" : "rgba(0,0,0,0.1)"};
          border-radius: 10px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.3);
          padding: 0;
        }
        .embed-popup .leaflet-popup-content {
          margin: 0;
          color: ${isDark ? "#e2e8f0" : "#1e293b"};
        }
        .embed-popup .leaflet-popup-tip {
          background: ${isDark ? "rgba(10,10,10,0.95)" : "rgba(255,255,255,0.95)"};
          border: 1px solid ${isDark ? "rgba(148,163,184,0.1)" : "rgba(0,0,0,0.1)"};
        }
        .leaflet-div-icon { background: transparent !important; border: none !important; }
      `}</style>
    </div>
  );
}

/* ================================================================== */
/*  Page export (wrapped in Suspense for useSearchParams)             */
/* ================================================================== */
export default function EmbedPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            width: "100%",
            height: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#06080d",
            color: "#64748b",
            fontFamily: "monospace",
            fontSize: 12,
          }}
        >
          Loading AeroIntel...
        </div>
      }
    >
      <EmbedMapInner />
    </Suspense>
  );
}
