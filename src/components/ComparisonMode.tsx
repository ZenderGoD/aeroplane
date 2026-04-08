"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import type { FlightState } from "@/types/flight";
import {
  haversineNm,
  bearing,
  closingSpeedKts,
  formatDistance,
  mToFt,
  msToKts,
} from "@/lib/geo";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getMapStyle, getSavedMapStyleId } from "@/lib/mapStyles";

/* ── Constants ────────────────────────────────────────────────────── */

const MAX_AIRCRAFT = 4;
const POLL_INTERVAL = 30_000; // 30s — conservative to respect API limits
const HISTORY_WINDOW = 300; // keep 5 min of history points

const AIRCRAFT_COLORS = ["#cbd5e1", "#cbd5e1", "#94a3b8", "#e2e8f0"] as const;

/* ── Types ────────────────────────────────────────────────────────── */

interface HistoryPoint {
  t: number; // epoch seconds
  alt: number | null; // feet
  spd: number | null; // knots
}

interface TrackedAircraft {
  id: string; // search term used
  state: FlightState | null;
  history: HistoryPoint[];
  loading: boolean;
  error: string | null;
}

interface Props {
  onExitMode?: () => void;
}

/* ── Helpers ──────────────────────────────────────────────────────── */

function fmtAlt(m: number | null): string {
  if (m === null) return "--";
  return `${Math.round(mToFt(m)).toLocaleString()} ft`;
}

function fmtSpd(ms: number | null): string {
  if (ms === null) return "--";
  return `${Math.round(msToKts(ms))} kts`;
}

function fmtVr(ms: number | null): string {
  if (ms === null) return "--";
  const fpm = Math.round(ms * 196.85);
  return `${fpm > 0 ? "+" : ""}${fpm} fpm`;
}

function fmtHdg(deg: number | null): string {
  if (deg === null) return "--";
  return `${Math.round(deg)}\u00B0`;
}

function fmtPos(v: number | null): string {
  if (v === null) return "--";
  return v.toFixed(4);
}

function fmtNum(v: number | undefined | null, unit = ""): string {
  if (v === undefined || v === null) return "--";
  return `${v}${unit}`;
}

function fmtMach(v: number | undefined | null): string {
  if (v === undefined || v === null) return "--";
  return `M${v.toFixed(3)}`;
}

/* ── Component ────────────────────────────────────────────────────── */

export default function ComparisonMode({ onExitMode }: Props) {
  const [aircraft, setAircraft] = useState<TrackedAircraft[]>([]);
  const [searchText, setSearchText] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"table" | "charts" | "position" | "map">("table");
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<import("leaflet").Map | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const markersRef = useRef<import("leaflet").Marker[]>([]);
  const linesRef = useRef<import("leaflet").Polyline[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Fetch single aircraft ──────────────────────────────────────── */

  const fetchAircraft = useCallback(async (id: string): Promise<FlightState | null> => {
    try {
      const res = await fetch(`/api/aircraft/${encodeURIComponent(id)}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.aircraft ?? null;
    } catch {
      return null;
    }
  }, []);

  /* ── Add aircraft ───────────────────────────────────────────────── */

  const addAircraft = useCallback(async () => {
    const query = searchText.trim().toUpperCase();
    if (!query) return;
    if (aircraft.length >= MAX_AIRCRAFT) {
      setSearchError("Maximum 4 aircraft for comparison");
      return;
    }
    // Prevent duplicates
    if (aircraft.some((a) => a.id.toUpperCase() === query || a.state?.icao24 === query.toLowerCase() || a.state?.callsign?.trim().toUpperCase() === query)) {
      setSearchError("Aircraft already added");
      return;
    }

    setSearchError(null);
    const placeholder: TrackedAircraft = { id: query, state: null, history: [], loading: true, error: null };
    setAircraft((prev) => [...prev, placeholder]);
    setSearchText("");

    const state = await fetchAircraft(query);
    setAircraft((prev) =>
      prev.map((a) =>
        a.id === query
          ? {
              ...a,
              state,
              loading: false,
              error: state ? null : "Not found or not airborne",
              history: state
                ? [
                    {
                      t: Math.floor(Date.now() / 1000),
                      alt: state.baroAltitude != null ? mToFt(state.baroAltitude) : null,
                      spd: state.velocity != null ? msToKts(state.velocity) : null,
                    },
                  ]
                : [],
            }
          : a
      )
    );
  }, [searchText, aircraft, fetchAircraft]);

  /* ── Remove aircraft ────────────────────────────────────────────── */

  const removeAircraft = useCallback((id: string) => {
    setAircraft((prev) => prev.filter((a) => a.id !== id));
  }, []);

  /* ── Polling loop ───────────────────────────────────────────────── */

  useEffect(() => {
    if (aircraft.length === 0) return;

    const poll = async () => {
      const now = Math.floor(Date.now() / 1000);
      const cutoff = now - HISTORY_WINDOW;

      const updates = await Promise.all(
        aircraft.map(async (ac) => {
          if (!ac.state && !ac.loading) {
            // Retry failed lookups
            const state = await fetchAircraft(ac.id);
            return {
              ...ac,
              state,
              error: state ? null : ac.error,
              history: state
                ? [
                    ...ac.history,
                    {
                      t: now,
                      alt: state.baroAltitude != null ? mToFt(state.baroAltitude) : null,
                      spd: state.velocity != null ? msToKts(state.velocity) : null,
                    },
                  ].filter((h) => h.t > cutoff)
                : ac.history,
            };
          }
          if (!ac.state) return ac;

          const state = await fetchAircraft(ac.id);
          if (!state) return ac;

          return {
            ...ac,
            state,
            error: null,
            history: [
              ...ac.history,
              {
                t: now,
                alt: state.baroAltitude != null ? mToFt(state.baroAltitude) : null,
                spd: state.velocity != null ? msToKts(state.velocity) : null,
              },
            ].filter((h) => h.t > cutoff),
          };
        })
      );

      setAircraft(updates);
    };

    intervalRef.current = setInterval(poll, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aircraft.length, fetchAircraft]);

  /* ── Leaflet map ────────────────────────────────────────────────── */

  useEffect(() => {
    if (activeTab !== "map" || !mapRef.current) return;
    if (leafletMapRef.current) return; // already initialized

    leafletRef.current = L;

    const map = L.map(mapRef.current, {
      center: [30, 0],
      zoom: 3,
      zoomControl: true,
      attributionControl: true,
    });

    const ms = getMapStyle(getSavedMapStyleId());
    L.tileLayer(ms.url, {
      attribution: ms.attribution,
      maxZoom: ms.maxZoom,
      ...(ms.subdomains ? { subdomains: ms.subdomains } : {}),
    }).addTo(map);

    leafletMapRef.current = map;
  }, [activeTab]);

  // Update markers/lines when aircraft data changes
  useEffect(() => {
    if (!leafletMapRef.current || activeTab !== "map") return;
    const map = leafletMapRef.current;
    const L = leafletRef.current;
    if (!L) return;

    // Clear old
    markersRef.current.forEach((m) => m.remove());
    linesRef.current.forEach((l) => l.remove());
    markersRef.current = [];
    linesRef.current = [];

    const posAircraft = aircraft.filter(
      (a) => a.state?.latitude != null && a.state?.longitude != null
    );

    const bounds: [number, number][] = [];

    // Add markers
    posAircraft.forEach((ac, i) => {
      const lat = ac.state!.latitude!;
      const lon = ac.state!.longitude!;
      const color = AIRCRAFT_COLORS[i % AIRCRAFT_COLORS.length];
      const callsign = ac.state!.callsign?.trim() || ac.state!.icao24;
      const heading = ac.state!.trueTrack ?? 0;

      bounds.push([lat, lon]);

      const icon = L.divIcon({
        className: "leaflet-div-icon",
        html: `<div style="transform:rotate(${heading}deg);display:flex;align-items:center;justify-content:center;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="${color}" stroke="${color}" stroke-width="0.5">
            <path d="M12 2L8 10H3L6 14L4 22L12 18L20 22L18 14L21 10H16L12 2Z"/>
          </svg>
        </div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([lat, lon], { icon }).addTo(map);
      marker.bindPopup(
        `<div style="font-family:monospace;font-size:12px;color:var(--text-primary);background:var(--surface-1);padding:8px;border-radius:8px;">
          <div style="font-weight:700;color:${color}">${callsign}</div>
          <div>${fmtAlt(ac.state!.baroAltitude)} | ${fmtSpd(ac.state!.velocity)}</div>
        </div>`
      );
      markersRef.current.push(marker);
    });

    // Draw lines between all pairs
    for (let i = 0; i < posAircraft.length; i++) {
      for (let j = i + 1; j < posAircraft.length; j++) {
        const a = posAircraft[i].state!;
        const b = posAircraft[j].state!;
        const line = L.polyline(
          [
            [a.latitude!, a.longitude!],
            [b.latitude!, b.longitude!],
          ],
          {
            color: "rgba(148, 163, 184, 0.3)",
            weight: 1,
            dashArray: "6 4",
          }
        ).addTo(map);

        const dist = haversineNm(a.latitude!, a.longitude!, b.latitude!, b.longitude!);
        line.bindPopup(
          `<div style="font-family:monospace;font-size:11px;color:var(--text-secondary);background:var(--surface-1);padding:6px;border-radius:6px;">${formatDistance(dist)}</div>`
        );
        linesRef.current.push(line);
      }
    }

    // Fit bounds
    if (bounds.length >= 2) {
      map.fitBounds(L.latLngBounds(bounds.map(([la, lo]) => L.latLng(la, lo))), {
        padding: [40, 40],
        maxZoom: 10,
      });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 8);
    }
  }, [aircraft, activeTab]);

  // Cleanup map on unmount
  useEffect(() => {
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  /* ── Derived data ───────────────────────────────────────────────── */

  const validAircraft = useMemo(
    () => aircraft.filter((a) => a.state !== null),
    [aircraft]
  );

  /** Pairwise relative position data */
  const pairData = useMemo(() => {
    const pairs: {
      a: TrackedAircraft;
      b: TrackedAircraft;
      distNm: number;
      bearingAB: number;
      bearingBA: number;
      closingKts: number | null;
    }[] = [];

    for (let i = 0; i < validAircraft.length; i++) {
      for (let j = i + 1; j < validAircraft.length; j++) {
        const a = validAircraft[i];
        const b = validAircraft[j];
        const sa = a.state!;
        const sb = b.state!;

        if (sa.latitude == null || sa.longitude == null || sb.latitude == null || sb.longitude == null)
          continue;

        const dist = haversineNm(sa.latitude, sa.longitude, sb.latitude, sb.longitude);
        const brAB = bearing(sa.latitude, sa.longitude, sb.latitude, sb.longitude);
        const brBA = bearing(sb.latitude, sb.longitude, sa.latitude, sa.longitude);

        let closing: number | null = null;
        if (sa.trueTrack != null && sb.trueTrack != null && sa.velocity != null && sb.velocity != null) {
          closing = closingSpeedKts(
            sa.latitude, sa.longitude, sa.trueTrack, sa.velocity,
            sb.latitude, sb.longitude, sb.trueTrack, sb.velocity
          );
        }

        pairs.push({ a, b, distNm: dist, bearingAB: brAB, bearingBA: brBA, closingKts: closing });
      }
    }

    return pairs;
  }, [validAircraft]);

  /* ── Chart bounds ───────────────────────────────────────────────── */

  const chartData = useMemo(() => {
    if (validAircraft.length === 0) return null;

    let tMin = Infinity;
    let tMax = -Infinity;
    let altMin = Infinity;
    let altMax = -Infinity;
    let spdMin = Infinity;
    let spdMax = -Infinity;

    for (const ac of validAircraft) {
      for (const h of ac.history) {
        if (h.t < tMin) tMin = h.t;
        if (h.t > tMax) tMax = h.t;
        if (h.alt != null) {
          if (h.alt < altMin) altMin = h.alt;
          if (h.alt > altMax) altMax = h.alt;
        }
        if (h.spd != null) {
          if (h.spd < spdMin) spdMin = h.spd;
          if (h.spd > spdMax) spdMax = h.spd;
        }
      }
    }

    if (tMin === Infinity || tMax === tMin) {
      tMax = tMin + 60;
    }

    // Add padding
    const altRange = altMax - altMin || 1000;
    const spdRange = spdMax - spdMin || 50;
    altMin = Math.max(0, altMin - altRange * 0.1);
    altMax = altMax + altRange * 0.1;
    spdMin = Math.max(0, spdMin - spdRange * 0.1);
    spdMax = spdMax + spdRange * 0.1;

    if (!isFinite(altMin)) altMin = 0;
    if (!isFinite(altMax)) altMax = 40000;
    if (!isFinite(spdMin)) spdMin = 0;
    if (!isFinite(spdMax)) spdMax = 500;

    return { tMin, tMax, altMin, altMax, spdMin, spdMax };
  }, [validAircraft]);

  /* ── SVG Chart renderer ─────────────────────────────────────────── */

  const renderChart = useCallback(
    (type: "alt" | "spd") => {
      if (!chartData || validAircraft.length === 0) {
        return (
          <div className="flex items-center justify-center h-48 text-[var(--text-muted)] text-sm">
            No data to chart yet. Waiting for history points...
          </div>
        );
      }

      const W = 600;
      const H = 200;
      const PAD = { t: 20, r: 20, b: 30, l: 60 };
      const cw = W - PAD.l - PAD.r;
      const ch = H - PAD.t - PAD.b;

      const { tMin, tMax, altMin, altMax, spdMin, spdMax } = chartData;
      const yMin = type === "alt" ? altMin : spdMin;
      const yMax = type === "alt" ? altMax : spdMax;
      const yUnit = type === "alt" ? "ft" : "kts";
      const yRange = yMax - yMin || 1;
      const tRange = tMax - tMin || 1;

      const xScale = (t: number) => PAD.l + ((t - tMin) / tRange) * cw;
      const yScale = (v: number) => PAD.t + ch - ((v - yMin) / yRange) * ch;

      // Y-axis ticks
      const yTicks: number[] = [];
      const yStep = Math.pow(10, Math.floor(Math.log10(yRange))) || 1000;
      const niceStep = yRange / yStep > 8 ? yStep * 2 : yRange / yStep < 3 ? yStep / 2 : yStep;
      const start = Math.ceil(yMin / niceStep) * niceStep;
      for (let v = start; v <= yMax; v += niceStep) {
        yTicks.push(v);
      }

      // Time ticks
      const tTicks: number[] = [];
      const tStep = Math.max(30, Math.round(tRange / 5));
      for (let t = tMin; t <= tMax; t += tStep) {
        tTicks.push(t);
      }

      return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
          {/* Grid */}
          {yTicks.map((v) => (
            <g key={v}>
              <line
                x1={PAD.l}
                y1={yScale(v)}
                x2={W - PAD.r}
                y2={yScale(v)}
                stroke="rgba(148,163,184,0.08)"
                strokeWidth={0.5}
              />
              <text
                x={PAD.l - 6}
                y={yScale(v) + 3}
                textAnchor="end"
                fill="var(--text-muted)"
                fontSize={9}
                fontFamily="monospace"
              >
                {type === "alt" ? `${(v / 1000).toFixed(0)}k` : Math.round(v)}
              </text>
            </g>
          ))}

          {tTicks.map((t) => {
            const d = new Date(t * 1000);
            const label = `${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
            return (
              <g key={t}>
                <line
                  x1={xScale(t)}
                  y1={PAD.t}
                  x2={xScale(t)}
                  y2={H - PAD.b}
                  stroke="rgba(148,163,184,0.06)"
                  strokeWidth={0.5}
                />
                <text
                  x={xScale(t)}
                  y={H - PAD.b + 14}
                  textAnchor="middle"
                  fill="var(--text-muted)"
                  fontSize={8}
                  fontFamily="monospace"
                >
                  {label}
                </text>
              </g>
            );
          })}

          {/* Axis labels */}
          <text
            x={PAD.l - 6}
            y={PAD.t - 6}
            textAnchor="end"
            fill="var(--text-tertiary)"
            fontSize={8}
            fontFamily="monospace"
          >
            {yUnit}
          </text>

          {/* Lines per aircraft */}
          {validAircraft.map((ac, idx) => {
            const color = AIRCRAFT_COLORS[aircraft.indexOf(ac) % AIRCRAFT_COLORS.length];
            const points = ac.history
              .filter((h) => (type === "alt" ? h.alt : h.spd) != null)
              .map((h) => {
                const val = type === "alt" ? h.alt! : h.spd!;
                return `${xScale(h.t)},${yScale(val)}`;
              });

            if (points.length < 2) {
              // Single point — draw a dot
              if (points.length === 1) {
                const [cx, cy] = points[0].split(",").map(Number);
                return <circle key={ac.id} cx={cx} cy={cy} r={3} fill={color} opacity={0.8} />;
              }
              return null;
            }

            return (
              <g key={ac.id}>
                {/* Glow */}
                <polyline
                  points={points.join(" ")}
                  fill="none"
                  stroke={color}
                  strokeWidth={4}
                  opacity={0.15}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Line */}
                <polyline
                  points={points.join(" ")}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.5}
                  opacity={0.9}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Latest point dot */}
                {points.length > 0 && (() => {
                  const last = points[points.length - 1].split(",").map(Number);
                  return <circle cx={last[0]} cy={last[1]} r={2.5} fill={color} />;
                })()}
              </g>
            );
          })}

          {/* Axes */}
          <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={H - PAD.b} stroke="rgba(148,163,184,0.15)" strokeWidth={0.5} />
          <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} stroke="rgba(148,163,184,0.15)" strokeWidth={0.5} />
        </svg>
      );
    },
    [chartData, validAircraft, aircraft]
  );

  /* ── Render helpers ─────────────────────────────────────────────── */

  /** Render a table row with optional delta highlighting */
  const renderRow = (
    label: string,
    accessor: (s: FlightState) => string,
    rawAccessor?: (s: FlightState) => number | null | undefined,
  ) => {
    const values = validAircraft.map((ac) => accessor(ac.state!));
    const rawValues = rawAccessor ? validAircraft.map((ac) => rawAccessor(ac.state!)) : null;

    // Check if there's a meaningful spread
    let hasSpread = false;
    if (rawValues && rawValues.length >= 2) {
      const defined = rawValues.filter((v): v is number => v != null);
      if (defined.length >= 2) {
        const max = Math.max(...defined);
        const min = Math.min(...defined);
        hasSpread = (max - min) > 0;
      }
    }

    return (
      <tr key={label} className="border-b border-[var(--border-subtle)]">
        <td className="py-1.5 px-3 text-[11px] font-medium text-[var(--text-tertiary)] whitespace-nowrap">
          {label}
        </td>
        {aircraft.map((ac, idx) => {
          if (!ac.state) {
            return (
              <td key={ac.id} className="py-1.5 px-3 text-center text-[11px] text-[var(--text-faint)]">
                --
              </td>
            );
          }

          const val = accessor(ac.state);
          const raw = rawAccessor ? rawAccessor(ac.state) : null;
          const color = AIRCRAFT_COLORS[idx % AIRCRAFT_COLORS.length];

          // Compute delta from first valid aircraft
          let deltaStr = "";
          if (hasSpread && rawValues && raw != null) {
            const firstDefined = rawValues.find((v): v is number => v != null);
            if (firstDefined != null && raw !== firstDefined) {
              const d = raw - firstDefined;
              deltaStr = d > 0 ? `+${Math.round(d).toLocaleString()}` : Math.round(d).toLocaleString();
            }
          }

          return (
            <td key={ac.id} className="py-1.5 px-3 text-center">
              <span className="data-value text-[11px] text-[var(--text-primary)]">{val}</span>
              {deltaStr && (
                <span
                  className="ml-1.5 text-[9px] font-semibold"
                  style={{ color }}
                >
                  {deltaStr}
                </span>
              )}
            </td>
          );
        })}
      </tr>
    );
  };

  /* ── Chart legend ───────────────────────────────────────────────── */

  const chartLegend = (
    <div className="flex flex-wrap gap-3 mb-2">
      {aircraft.map((ac, idx) => {
        const color = AIRCRAFT_COLORS[idx % AIRCRAFT_COLORS.length];
        const label = ac.state?.callsign?.trim() || ac.state?.icao24 || ac.id;
        return (
          <div key={ac.id} className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded-full" style={{ background: color }} />
            <span className="text-[10px] font-mono font-medium" style={{ color }}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );

  /* ── Render ─────────────────────────────────────────────────────── */

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--surface-0)" }}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: "var(--border-default)", background: "var(--surface-1)" }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 3h5v5" /><path d="M8 3H3v5" /><path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872l-3.656-3.656" /><path d="m15 9 6-6" />
            </svg>
            <span className="panel-title">Multi-Aircraft Comparison</span>
          </div>
          <span className="text-[10px] font-mono text-[var(--text-faint)]">
            {aircraft.length}/{MAX_AIRCRAFT}
          </span>
        </div>

        {onExitMode && (
          <button
            onClick={onExitMode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all"
            style={{
              color: "var(--text-secondary)",
              background: "var(--surface-2)",
              border: "1px solid var(--border-default)",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
            Exit
          </button>
        )}
      </div>

      {/* ── Search bar ──────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 border-b"
        style={{ borderColor: "var(--border-subtle)", background: "var(--surface-1)" }}
      >
        <div className="relative flex-1">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2"
            width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="var(--text-muted)" strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={searchText}
            onChange={(e) => { setSearchText(e.target.value); setSearchError(null); }}
            onKeyDown={(e) => e.key === "Enter" && addAircraft()}
            placeholder="Callsign, ICAO24 hex, or registration..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg text-[12px] font-mono outline-none transition-colors"
            style={{
              background: "var(--surface-2)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-default)",
            }}
          />
        </div>
        <button
          onClick={addAircraft}
          disabled={!searchText.trim() || aircraft.length >= MAX_AIRCRAFT}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all disabled:opacity-40"
          style={{
            background: "var(--accent-primary-dim)",
            color: "var(--accent-primary)",
            border: "1px solid rgba(56,189,248,0.2)",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add Aircraft
        </button>
      </div>

      {searchError && (
        <div className="px-4 py-1.5 text-[11px] font-medium" style={{ color: "var(--status-warning)" }}>
          {searchError}
        </div>
      )}

      {/* ── Aircraft chips ──────────────────────────────────────────── */}
      {aircraft.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 py-2 border-b" style={{ borderColor: "var(--border-subtle)" }}>
          {aircraft.map((ac, idx) => {
            const color = AIRCRAFT_COLORS[idx % AIRCRAFT_COLORS.length];
            const label = ac.state?.callsign?.trim() || ac.state?.icao24 || ac.id;
            return (
              <div
                key={ac.id}
                className="flex items-center gap-2 px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium transition-all"
                style={{
                  background: `${color}12`,
                  border: `1px solid ${color}30`,
                  color,
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                {ac.loading ? (
                  <span className="animate-pulse">Searching...</span>
                ) : ac.error ? (
                  <span className="opacity-60">{ac.id} (not found)</span>
                ) : (
                  label
                )}
                {ac.state?.typeCode && (
                  <span className="text-[9px] opacity-60">{ac.state.typeCode}</span>
                )}
                <button
                  onClick={() => removeAircraft(ac.id)}
                  className="ml-0.5 opacity-50 hover:opacity-100 transition-opacity"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Tab navigation ──────────────────────────────────────────── */}
      {aircraft.length > 0 && (
        <div
          className="flex gap-0 px-4 border-b"
          style={{ borderColor: "var(--border-subtle)", background: "var(--surface-1)" }}
        >
          {(
            [
              { key: "table", label: "Data Table" },
              { key: "charts", label: "Charts" },
              { key: "position", label: "Relative Position" },
              { key: "map", label: "Map" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="px-3 py-2 text-[11px] font-semibold transition-all relative"
              style={{
                color: activeTab === tab.key ? "var(--accent-primary)" : "var(--text-muted)",
              }}
            >
              {tab.label}
              {activeTab === tab.key && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
                  style={{ background: "var(--accent-primary)" }}
                />
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── Content area ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto scrollbar-thin">
        {aircraft.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "var(--accent-primary-dim)" }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="1.5">
                <path d="M16 3h5v5" /><path d="M8 3H3v5" />
                <path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872l-3.656-3.656" />
                <path d="m15 9 6-6" />
              </svg>
            </div>
            <div>
              <p className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
                Compare up to 4 aircraft side-by-side
              </p>
              <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
                Search by callsign, ICAO24 hex code, or registration to begin.
              </p>
            </div>
          </div>
        ) : activeTab === "table" ? (
          /* ── Comparison Table ──────────────────────────────────────── */
          <div className="p-4">
            <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid var(--border-default)" }}>
              <table className="w-full text-left" style={{ background: "var(--surface-1)" }}>
                <thead>
                  <tr style={{ background: "var(--surface-2)" }}>
                    <th className="py-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      Parameter
                    </th>
                    {aircraft.map((ac, idx) => {
                      const color = AIRCRAFT_COLORS[idx % AIRCRAFT_COLORS.length];
                      const label = ac.state?.callsign?.trim() || ac.state?.icao24 || ac.id;
                      return (
                        <th
                          key={ac.id}
                          className="py-2 px-3 text-center text-[10px] font-semibold uppercase tracking-wider"
                          style={{ color }}
                        >
                          {label}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {/* Identity */}
                  <tr className="border-b border-[var(--border-subtle)]">
                    <td
                      colSpan={aircraft.length + 1}
                      className="py-1.5 px-3 text-[9px] font-bold uppercase tracking-[0.1em]"
                      style={{ color: "var(--text-faint)", background: "var(--surface-0)" }}
                    >
                      Identity
                    </td>
                  </tr>
                  {renderRow("Callsign", (s) => s.callsign?.trim() || "--")}
                  {renderRow("Registration", (s) => s.registration || "--")}
                  {renderRow("Type", (s) => s.typeCode || "--")}
                  {renderRow("ICAO24", (s) => s.icao24)}
                  {renderRow("Squawk", (s) => s.squawk || "--")}

                  {/* Position & Motion */}
                  <tr className="border-b border-[var(--border-subtle)]">
                    <td
                      colSpan={aircraft.length + 1}
                      className="py-1.5 px-3 text-[9px] font-bold uppercase tracking-[0.1em]"
                      style={{ color: "var(--text-faint)", background: "var(--surface-0)" }}
                    >
                      Position & Motion
                    </td>
                  </tr>
                  {renderRow(
                    "Baro Altitude",
                    (s) => fmtAlt(s.baroAltitude),
                    (s) => (s.baroAltitude != null ? mToFt(s.baroAltitude) : null)
                  )}
                  {renderRow(
                    "Geo Altitude",
                    (s) => fmtAlt(s.geoAltitude),
                    (s) => (s.geoAltitude != null ? mToFt(s.geoAltitude) : null)
                  )}
                  {renderRow(
                    "Ground Speed",
                    (s) => fmtSpd(s.velocity),
                    (s) => (s.velocity != null ? msToKts(s.velocity) : null)
                  )}
                  {renderRow(
                    "Heading",
                    (s) => fmtHdg(s.trueTrack),
                    (s) => s.trueTrack
                  )}
                  {renderRow(
                    "Vertical Rate",
                    (s) => fmtVr(s.verticalRate),
                    (s) => (s.verticalRate != null ? s.verticalRate * 196.85 : null)
                  )}
                  {renderRow("Latitude", (s) => fmtPos(s.latitude))}
                  {renderRow("Longitude", (s) => fmtPos(s.longitude))}

                  {/* Speed Variants */}
                  <tr className="border-b border-[var(--border-subtle)]">
                    <td
                      colSpan={aircraft.length + 1}
                      className="py-1.5 px-3 text-[9px] font-bold uppercase tracking-[0.1em]"
                      style={{ color: "var(--text-faint)", background: "var(--surface-0)" }}
                    >
                      Speed Variants
                    </td>
                  </tr>
                  {renderRow("IAS", (s) => fmtNum(s.ias, " kts"), (s) => s.ias)}
                  {renderRow("TAS", (s) => fmtNum(s.tas, " kts"), (s) => s.tas)}
                  {renderRow("Mach", (s) => fmtMach(s.mach), (s) => s.mach)}

                  {/* Weather */}
                  <tr className="border-b border-[var(--border-subtle)]">
                    <td
                      colSpan={aircraft.length + 1}
                      className="py-1.5 px-3 text-[9px] font-bold uppercase tracking-[0.1em]"
                      style={{ color: "var(--text-faint)", background: "var(--surface-0)" }}
                    >
                      Weather (Derived)
                    </td>
                  </tr>
                  {renderRow("Wind Speed", (s) => fmtNum(s.windSpeed, " kts"), (s) => s.windSpeed)}
                  {renderRow("Wind Direction", (s) => fmtNum(s.windDirection, "\u00B0"), (s) => s.windDirection)}

                  {/* Data Quality */}
                  <tr className="border-b border-[var(--border-subtle)]">
                    <td
                      colSpan={aircraft.length + 1}
                      className="py-1.5 px-3 text-[9px] font-bold uppercase tracking-[0.1em]"
                      style={{ color: "var(--text-faint)", background: "var(--surface-0)" }}
                    >
                      Data Quality
                    </td>
                  </tr>
                  {renderRow("NIC", (s) => fmtNum(s.nic), (s) => s.nic)}
                  {renderRow("NACp", (s) => fmtNum(s.nacP), (s) => s.nacP)}
                  {renderRow("SIL", (s) => fmtNum(s.sil), (s) => s.sil)}
                  {renderRow("Source", (s) => s.dataSource || "--")}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === "charts" ? (
          /* ── Charts ─────────────────────────────────────────────────── */
          <div className="p-4 space-y-6">
            {chartLegend}

            {/* Altitude chart */}
            <div
              className="rounded-xl p-3"
              style={{ background: "var(--surface-1)", border: "1px solid var(--border-default)" }}
            >
              <div className="section-label mb-2">Altitude Profile</div>
              {renderChart("alt")}
            </div>

            {/* Speed chart */}
            <div
              className="rounded-xl p-3"
              style={{ background: "var(--surface-1)", border: "1px solid var(--border-default)" }}
            >
              <div className="section-label mb-2">Speed Profile</div>
              {renderChart("spd")}
            </div>
          </div>
        ) : activeTab === "position" ? (
          /* ── Relative Position ───────────────────────────────────────── */
          <div className="p-4 space-y-3">
            {pairData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-[var(--text-muted)] text-[12px]">
                Need at least 2 aircraft with valid positions
              </div>
            ) : (
              pairData.map((pair, idx) => {
                const aLabel = pair.a.state!.callsign?.trim() || pair.a.state!.icao24;
                const bLabel = pair.b.state!.callsign?.trim() || pair.b.state!.icao24;
                const aColor = AIRCRAFT_COLORS[aircraft.indexOf(pair.a) % AIRCRAFT_COLORS.length];
                const bColor = AIRCRAFT_COLORS[aircraft.indexOf(pair.b) % AIRCRAFT_COLORS.length];

                const isConverging = pair.closingKts != null && pair.closingKts > 0;

                return (
                  <div
                    key={idx}
                    className="rounded-xl p-4"
                    style={{
                      background: "var(--surface-1)",
                      border: `1px solid ${isConverging ? "rgba(148,163,184,0.2)" : "var(--border-default)"}`,
                    }}
                  >
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-mono text-[12px] font-bold" style={{ color: aColor }}>
                        {aLabel}
                      </span>
                      <svg width="16" height="8" viewBox="0 0 16 8" fill="none">
                        <path d="M0 4h14M10 0l4 4-4 4" stroke="var(--text-muted)" strokeWidth="1.5" />
                      </svg>
                      <span className="font-mono text-[12px] font-bold" style={{ color: bColor }}>
                        {bLabel}
                      </span>
                    </div>

                    {/* Data grid */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                      <div>
                        <div className="data-label">Distance</div>
                        <div className="data-value text-[14px] font-bold text-[var(--text-primary)]">
                          {formatDistance(pair.distNm)}
                        </div>
                      </div>
                      <div>
                        <div className="data-label">Closing Speed</div>
                        <div
                          className="data-value text-[14px] font-bold"
                          style={{
                            color: pair.closingKts == null
                              ? "var(--text-muted)"
                              : pair.closingKts > 0
                                ? "var(--status-caution)"
                                : "var(--status-nominal)",
                          }}
                        >
                          {pair.closingKts == null
                            ? "--"
                            : pair.closingKts > 0
                              ? `${Math.round(pair.closingKts)} kts (closing)`
                              : `${Math.abs(Math.round(pair.closingKts))} kts (separating)`}
                        </div>
                      </div>
                      <div>
                        <div className="data-label">
                          Bearing {aLabel} → {bLabel}
                        </div>
                        <div className="data-value text-[13px] text-[var(--text-primary)]">
                          {Math.round(pair.bearingAB)}&deg;
                        </div>
                      </div>
                      <div>
                        <div className="data-label">
                          Bearing {bLabel} → {aLabel}
                        </div>
                        <div className="data-value text-[13px] text-[var(--text-primary)]">
                          {Math.round(pair.bearingBA)}&deg;
                        </div>
                      </div>

                      {/* Vertical separation */}
                      {(() => {
                        const altA = pair.a.state!.baroAltitude;
                        const altB = pair.b.state!.baroAltitude;
                        if (altA == null || altB == null) return null;
                        const sepFt = Math.abs(mToFt(altA) - mToFt(altB));
                        return (
                          <div className="col-span-2">
                            <div className="data-label">Vertical Separation</div>
                            <div className="data-value text-[13px] text-[var(--text-primary)]">
                              {Math.round(sepFt).toLocaleString()} ft
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {isConverging && (
                      <div
                        className="mt-2 flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold"
                        style={{
                          background: "rgba(148,163,184,0.08)",
                          color: "var(--status-caution)",
                          border: "1px solid rgba(148,163,184,0.15)",
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 9v4M12 17h.01" />
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        </svg>
                        Aircraft converging at {Math.round(pair.closingKts!)} kts
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : activeTab === "map" ? (
          /* ── Map View ───────────────────────────────────────────────── */
          <div className="p-4 h-full min-h-[400px]">
            <div
              ref={mapRef}
              className="w-full rounded-xl overflow-hidden"
              style={{
                height: "calc(100% - 8px)",
                minHeight: 380,
                border: "1px solid var(--border-default)",
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
