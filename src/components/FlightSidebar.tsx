"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import Image from "next/image";
import type { FlightState } from "@/types/flight";
import type { Anomaly } from "@/types/anomaly";
import {
  metersToFeet,
  msToKnots,
  msToFpm,
  formatCallsign,
} from "@/lib/mapUtils";
import { getAirlineName } from "@/lib/airlines";
import { useAircraftMeta } from "@/hooks/useAircraftMeta";
import { useFlightNarration } from "@/hooks/useFlightNarration";
import { useNearestAirport } from "@/hooks/useNearestAirport";
import { useWeather } from "@/hooks/useWeather";
import { useAircraftPhoto } from "@/hooks/useAircraftPhoto";
import { getCategoryColor, getCategoryLabel } from "./CanvasPlaneLayer";
import { estimateEmissions, formatCO2 } from "@/lib/emissions";
import { haversineNm } from "@/lib/geo";
import AnomalyBadge from "./AnomalyBadge";
import AIInsights from "./AIInsights";
import AnomalyRootCause from "./AnomalyRootCause";
import FlightChart from "./FlightChart";
import type { InstabilityResult } from "@/lib/instabilityScore";
import { getInstabilityColor, getInstabilityLabel } from "@/lib/instabilityScore";
import type { FlightHistoryEntry } from "@/types/flight";
import { checkGPSIntegrity } from "@/lib/gpsIntegrity";
import type { GPSIntegrityResult, GPSIssue } from "@/lib/gpsIntegrity";

interface Props {
  flight: FlightState | null;
  onClose: () => void;
  anomalies?: Anomaly[];
  instability?: InstabilityResult | null;
  onOpen3D?: () => void;
  flightHistory?: FlightHistoryEntry[];
}

const FLIGHT_CAT_COLORS: Record<string, string> = {
  VFR: "#cbd5e1",
  MVFR: "#94a3b8",
  IFR: "#e2e8f0",
  LIFR: "#94a3b8",
};

export default function FlightSidebar({ flight, onClose, anomalies = [], instability, onOpen3D, flightHistory }: Props) {
  /* ── Mobile drag-to-dismiss ─────────────────────────── */
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const dragCurrentY = useRef(0);
  const isDragging = useRef(false);

  const handleDragStart = useCallback((e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    dragCurrentY.current = e.touches[0].clientY;
    isDragging.current = true;
  }, []);

  const handleDragMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    dragCurrentY.current = e.touches[0].clientY;
    const delta = dragCurrentY.current - dragStartY.current;
    if (delta > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${delta}px)`;
    }
  }, []);

  const handleDragEnd = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const delta = dragCurrentY.current - dragStartY.current;
    if (sheetRef.current) {
      sheetRef.current.style.transform = "";
    }
    if (delta > 80) {
      onClose();
    }
  }, [onClose]);

  const { meta, isLoading: metaLoading } = useAircraftMeta(
    flight?.icao24 ?? null
  );
  const airlineName = flight ? getAirlineName(flight.callsign) : null;

  const airportEstimate = useNearestAirport(flight);
  const nearestIcao = airportEstimate.nearest?.airport?.icao ?? null;
  const { weather, isLoading: weatherLoading } = useWeather(nearestIcao);
  const { photo, isLoading: photoLoading } = useAircraftPhoto(
    flight?.icao24 ?? null,
    meta?.registration ?? null
  );

  const {
    narration,
    isLoading: narrationLoading,
    error: narrationError,
    generate: generateNarration,
    remainingToday,
    dailyLimit,
  } = useFlightNarration(flight, meta, airportEstimate, weather);

  const gpsIntegrity = useMemo<GPSIntegrityResult | null>(() => {
    if (!flight || !flightHistory || flightHistory.length < 3) return null;
    return checkGPSIntegrity(flight, flightHistory);
  }, [flight, flightHistory]);

  return (
    <div
      ref={sheetRef}
      className={`fixed z-[1000] shadow-2xl shadow-black/30 transform transition-transform duration-300
        md:right-0 md:top-0 md:h-full md:w-[340px]
        max-md:bottom-[calc(env(safe-area-inset-bottom)+60px)] max-md:left-0 max-md:right-0 max-md:max-h-[60vh] max-md:w-full max-md:rounded-t-2xl
        ${flight
          ? "md:translate-x-0 max-md:translate-y-0"
          : "md:translate-x-full max-md:translate-y-full"
        }`}
      style={{
        background: "var(--surface-1)",
        borderLeft: "1px solid var(--border-default)",
        transitionTimingFunction: "var(--ease-out-expo)",
      }}
    >
      {flight && (
        <div className="h-full flex flex-col">
          {/* ── Mobile drag handle ─────────────── */}
          <div
            className="md:hidden flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing touch-none"
            onTouchStart={handleDragStart}
            onTouchMove={handleDragMove}
            onTouchEnd={handleDragEnd}
          >
            <div className="w-10 h-1 rounded-full bg-slate-600" />
          </div>
          {/* ── Header ────────────────────────── */}
          <div className="relative text-white px-5 py-4 shrink-0 overflow-hidden">
            <div className="absolute bottom-0 left-5 right-5 h-px bg-gradient-to-r from-transparent via-slate-700/40 to-transparent" />
            {/* Category color gradient background */}
            <div
              className="absolute inset-0 opacity-40"
              style={{
                background: `linear-gradient(135deg, ${getCategoryColor(flight.category)}20, transparent 50%)`,
              }}
            />
            <div className="relative flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="text-xl font-bold tracking-wider">
                    {formatCallsign(flight.callsign)}
                  </div>
                  <span
                    className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border"
                    style={{
                      backgroundColor: getCategoryColor(flight.category) + "15",
                      color: getCategoryColor(flight.category),
                      borderColor: getCategoryColor(flight.category) + "30",
                    }}
                  >
                    {getCategoryLabel(flight.category)}
                  </span>
                </div>
                {airlineName && (
                  <div className="text-slate-300 text-sm font-medium">{airlineName}</div>
                )}
                <div className="text-slate-500 text-xs">
                  {flight.originCountry}
                </div>
                {/* Registration / TypeCode / Position Source badges */}
                {(flight.registration || flight.typeCode || flight.positionSource) && (
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {flight.registration && (
                      <span
                        className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold"
                        style={{
                          color: "var(--text-secondary)",
                          border: "1px solid var(--border-default)",
                          background: "var(--surface-2)",
                        }}
                      >
                        {flight.registration}
                      </span>
                    )}
                    {flight.typeCode && (
                      <span
                        className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold"
                        style={{
                          color: "var(--text-secondary)",
                          border: "1px solid var(--border-default)",
                          background: "var(--surface-2)",
                        }}
                      >
                        {flight.typeCode}
                      </span>
                    )}
                    {flight.positionSource && (
                      <span
                        className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase"
                        style={{
                          color: flight.positionSource === "adsb_icao" ? "#cbd5e1"
                            : flight.positionSource === "mlat" ? "#94a3b8"
                            : "#9ca3af",
                          border: `1px solid ${
                            flight.positionSource === "adsb_icao" ? "#cbd5e130"
                              : flight.positionSource === "mlat" ? "#94a3b830"
                              : "#9ca3af30"
                          }`,
                          background: flight.positionSource === "adsb_icao" ? "#cbd5e110"
                            : flight.positionSource === "mlat" ? "#94a3b810"
                            : "#9ca3af10",
                        }}
                      >
                        {flight.positionSource === "adsb_icao" ? "ADS-B"
                          : flight.positionSource === "mlat" ? "MLAT"
                          : flight.positionSource.toUpperCase()}
                      </span>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <AnomalyBadge anomalies={anomalies} />
                  {instability && instability.score > 10 && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border"
                      style={{
                        backgroundColor: getInstabilityColor(instability.score) + "15",
                        color: getInstabilityColor(instability.score),
                        borderColor: getInstabilityColor(instability.score) + "30",
                      }}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      {instability.score} {getInstabilityLabel(instability.score)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {onOpen3D && (
                  <button
                    onClick={onOpen3D}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-500/10 hover:bg-slate-500/20 text-slate-300 hover:text-slate-200 rounded-lg transition-all text-xs font-semibold border border-slate-500/20"
                    title="Open 3D View"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    3D
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-slate-800/50 rounded-lg transition-all text-slate-500 hover:text-slate-300"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* ── Details ───────────────────────── */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-thin">
            {/* Aircraft Photo */}
            <PhotoSection photo={photo} isLoading={photoLoading} />

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-2">
              <StatMini
                icon="↕"
                label="Altitude"
                value={flight.baroAltitude !== null ? `${metersToFeet(flight.baroAltitude).toLocaleString()}` : "N/A"}
                unit="ft"
              />
              <StatMini
                icon="→"
                label="Speed"
                value={flight.velocity !== null ? `${msToKnots(flight.velocity)}` : "N/A"}
                unit="kts"
              />
              <StatMini
                icon="↗"
                label="Heading"
                value={flight.trueTrack !== null ? `${Math.round(flight.trueTrack)}` : "N/A"}
                unit="°"
              />
            </div>

            {/* Speed & Performance Card */}
            {(flight.ias != null || flight.tas != null || flight.mach != null) && (
              <GlassSection title="Speed & Performance">
                <div className="grid grid-cols-2 gap-2">
                  {flight.ias != null && (
                    <div
                      className="rounded-lg px-3 py-2"
                      style={{ background: "var(--surface-3)", border: "1px solid var(--border-subtle)" }}
                    >
                      <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>
                        IAS
                      </div>
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3 h-3 shrink-0" style={{ color: "var(--text-muted)" }} fill="currentColor" viewBox="0 0 24 24">
                          <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                        </svg>
                        <span className="text-sm font-medium tabular-nums" style={{ color: "var(--text-primary)" }}>
                          {Math.round(flight.ias)}
                          <span className="text-[10px] ml-0.5" style={{ color: "var(--text-muted)" }}>kts</span>
                        </span>
                      </div>
                    </div>
                  )}
                  {flight.tas != null && (
                    <div
                      className="rounded-lg px-3 py-2"
                      style={{ background: "var(--surface-3)", border: "1px solid var(--border-subtle)" }}
                    >
                      <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>
                        TAS
                      </div>
                      <span className="text-sm font-medium tabular-nums" style={{ color: "var(--text-primary)" }}>
                        {Math.round(flight.tas)}
                        <span className="text-[10px] ml-0.5" style={{ color: "var(--text-muted)" }}>kts</span>
                      </span>
                    </div>
                  )}
                  {flight.mach != null && (
                    <div
                      className="rounded-lg px-3 py-2"
                      style={{ background: "var(--surface-3)", border: "1px solid var(--border-subtle)" }}
                    >
                      <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>
                        Mach
                      </div>
                      <span className="text-sm font-medium tabular-nums" style={{ color: "var(--text-primary)" }}>
                        {flight.mach.toFixed(3)}
                      </span>
                    </div>
                  )}
                  {flight.roll != null && (
                    <div
                      className="rounded-lg px-3 py-2"
                      style={{ background: "var(--surface-3)", border: "1px solid var(--border-subtle)" }}
                    >
                      <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>
                        Roll
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium tabular-nums" style={{ color: "var(--text-primary)" }}>
                          {flight.roll.toFixed(1)}&deg;
                        </span>
                        <div
                          className="w-5 h-0.5 rounded-full"
                          style={{
                            background: "var(--text-secondary)",
                            transform: `rotate(${flight.roll}deg)`,
                            transformOrigin: "center",
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </GlassSection>
            )}

            {/* Atmospheric Conditions Card */}
            {(flight.windSpeed != null || flight.oat != null) && (
              <GlassSection title="Atmospheric Conditions">
                <div className="space-y-2.5">
                  {flight.windSpeed != null && (
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: "var(--surface-3)", border: "1px solid var(--border-subtle)" }}
                      >
                        <svg
                          className="w-4 h-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#94a3b8"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{
                            transform: `rotate(${(flight.windDirection ?? 0) + 180}deg)`,
                            transition: "transform 0.3s ease",
                          }}
                        >
                          <line x1="12" y1="19" x2="12" y2="5" />
                          <polyline points="5 12 12 5 19 12" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                          Wind
                        </div>
                        <div className="text-xs font-medium tabular-nums" style={{ color: "var(--text-secondary)" }}>
                          {Math.round(flight.windSpeed)} kts from {flight.windDirection != null ? `${Math.round(flight.windDirection)}\u00b0` : "---"}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-3">
                    {flight.oat != null && (
                      <div className="flex-1">
                        <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>
                          OAT
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>&#x1f321;&#xfe0e;</span>
                          <span className="text-sm font-medium tabular-nums" style={{ color: "var(--text-primary)" }}>
                            {flight.oat}&deg;C
                          </span>
                        </div>
                      </div>
                    )}
                    {flight.tat != null && (
                      <div className="flex-1">
                        <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>
                          TAT
                        </div>
                        <span className="text-sm font-medium tabular-nums" style={{ color: "var(--text-primary)" }}>
                          {flight.tat}&deg;C
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </GlassSection>
            )}

            {/* Nav Modes Badge Strip */}
            {flight.navModes && flight.navModes.length > 0 && (
              <GlassSection title="Nav Modes">
                <div className="flex flex-wrap gap-1.5">
                  {flight.navModes.map((mode) => {
                    const modeColors: Record<string, string> = {
                      autopilot: "#cbd5e1",
                      vnav: "#94a3b8",
                      lnav: "#94a3b8",
                      althold: "#cbd5e1",
                      approach: "#94a3b8",
                      tcas: "#e2e8f0",
                    };
                    const modeLabels: Record<string, string> = {
                      autopilot: "AP",
                      vnav: "VNAV",
                      lnav: "LNAV",
                      althold: "ALT",
                      approach: "APP",
                      tcas: "TCAS",
                    };
                    const color = modeColors[mode.toLowerCase()] ?? "#9ca3af";
                    const label = modeLabels[mode.toLowerCase()] ?? mode.toUpperCase();
                    return (
                      <span
                        key={mode}
                        className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider"
                        style={{
                          color,
                          background: color + "15",
                          border: `1px solid ${color}30`,
                        }}
                      >
                        {label}
                      </span>
                    );
                  })}
                </div>
              </GlassSection>
            )}

            {/* GPS Integrity Indicator */}
            <GPSIntegrityIndicator result={gpsIntegrity} />

            {/* AI Insights */}
            <AIInsights
              narration={narration}
              isLoading={narrationLoading}
              error={narrationError}
              onGenerate={generateNarration}
              remainingToday={remainingToday}
              dailyLimit={dailyLimit}
            />

            {/* Instability Factors */}
            {instability && instability.score > 10 && instability.factors.length > 0 && (
              <GlassSection title={`Stability Analysis — ${instability.score}/100`} accentColor={getInstabilityColor(instability.score)}>
                <div className="space-y-2">
                  {instability.factors.map((f) => (
                    <div key={f.name}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs text-slate-300">{f.name}</span>
                        <span
                          className="text-[10px] font-bold tabular-nums"
                          style={{ color: getInstabilityColor(f.value) }}
                        >
                          {f.value}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-800/80 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${Math.min(f.value, 100)}%`,
                            background: `linear-gradient(90deg, ${getInstabilityColor(f.value)}80, ${getInstabilityColor(f.value)})`,
                          }}
                        />
                      </div>
                      <div className="text-[9px] text-slate-600 mt-0.5">{f.detail}</div>
                    </div>
                  ))}
                </div>
              </GlassSection>
            )}

            {/* Why Is My Flight Late? */}
            <DelayExplainer
              flight={flight}
              airport={airportEstimate}
              weather={weather}
              anomalies={anomalies}
              instability={instability}
            />

            {/* AI Anomaly Root Cause Analysis */}
            {anomalies.length > 0 && (
              <AnomalyRootCause
                flight={flight}
                anomalies={anomalies}
                instability={instability ?? null}
                nearbyAnomalies={[]}
                airport={airportEstimate.nearest?.airport?.icao ? {
                  icao: airportEstimate.nearest.airport.icao,
                  name: airportEstimate.nearest.airport.name,
                  pressure: null,
                  weather: weather,
                  activeEvents: [],
                } : null}
                corridor={null}
              />
            )}

            {/* Route Estimation */}
            <RouteSection
              nearest={airportEstimate.nearest}
              departure={airportEstimate.departure}
            />

            {/* Emissions Estimate */}
            <EmissionsSection
              flight={flight}
              departure={airportEstimate.departure}
              nearest={airportEstimate.nearest}
            />

            {/* Weather */}
            <WeatherSection
              weather={weather}
              isLoading={weatherLoading}
              stationIcao={nearestIcao}
            />

            <GlassSection title="Aircraft">
              {metaLoading ? (
                <div className="text-xs text-slate-500 animate-pulse">
                  Loading aircraft data...
                </div>
              ) : meta ? (
                <div className="space-y-1.5">
                  {meta.type && <Detail label="Type" value={meta.type} />}
                  {meta.typeCode && <Detail label="ICAO Type" value={meta.typeCode} />}
                  {meta.registration && <Detail label="Registration" value={meta.registration} />}
                  {meta.owner && <Detail label="Operator" value={meta.owner} />}
                </div>
              ) : (
                <div className="text-xs text-slate-600">No aircraft data available</div>
              )}
            </GlassSection>

            <GlassSection title="Position">
              <div className="space-y-1.5">
                <Detail
                  label="Status"
                  value={flight.onGround ? "On Ground" : "In Flight"}
                  highlight={!flight.onGround}
                />
                <Detail
                  label="Altitude"
                  value={
                    flight.baroAltitude !== null
                      ? `${metersToFeet(flight.baroAltitude).toLocaleString()} ft`
                      : "N/A"
                  }
                />
                <Detail label="Latitude" value={flight.latitude?.toFixed(4) ?? "N/A"} />
                <Detail label="Longitude" value={flight.longitude?.toFixed(4) ?? "N/A"} />
              </div>
            </GlassSection>

            {/* Altitude & Speed Chart */}
            {flightHistory && flightHistory.length >= 2 && (
              <FlightChart history={flightHistory} />
            )}

            <GlassSection title="Movement">
              <div className="space-y-1.5">
                <Detail
                  label="Ground Speed"
                  value={flight.velocity !== null ? `${msToKnots(flight.velocity)} kts` : "N/A"}
                />
                <Detail
                  label="Heading"
                  value={flight.trueTrack !== null ? `${Math.round(flight.trueTrack)}°` : "N/A"}
                />
                <Detail
                  label="Vertical Rate"
                  value={
                    flight.verticalRate !== null
                      ? `${msToFpm(flight.verticalRate) >= 0 ? "+" : ""}${msToFpm(flight.verticalRate)} fpm`
                      : "N/A"
                  }
                />
              </div>
            </GlassSection>

            <GlassSection title="Identification">
              <div className="space-y-1.5">
                <Detail label="ICAO24" value={flight.icao24.toUpperCase()} />
                {flight.squawk && <Detail label="Squawk" value={flight.squawk} />}
              </div>
            </GlassSection>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── GPS Integrity Indicator ─────────────────────────── */
function GPSIntegrityIndicator({ result }: { result: GPSIntegrityResult | null }) {
  if (!result) return null;

  const { score, severity, issues } = result;

  // Colour scheme per severity
  const config =
    severity === "compromised"
      ? { color: "#e2e8f0", bg: "#e2e8f015", border: "#e2e8f030", label: "GPS Compromised", icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" }
      : severity === "degraded"
        ? { color: "#94a3b8", bg: "#94a3b815", border: "#94a3b830", label: "GPS Degraded", icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" }
        : { color: "#cbd5e1", bg: "#cbd5e115", border: "#cbd5e130", label: "GPS OK", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" };

  // Always show a compact badge; expand when there are issues
  return (
    <div
      className="rounded-xl px-4 py-3 space-y-2"
      style={{ background: config.bg, border: `1px solid ${config.border}` }}
    >
      <div className="flex items-center gap-2">
        <svg
          className="w-4 h-4 shrink-0"
          fill="none"
          stroke={config.color}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={config.icon} />
        </svg>
        <span
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: config.color }}
        >
          {config.label}
        </span>
        <span
          className="ml-auto text-[10px] font-bold tabular-nums"
          style={{ color: config.color }}
        >
          {score}/100
        </span>
      </div>

      {issues.length > 0 && (
        <ul className="space-y-1 pl-6">
          {issues.map((issue, idx) => (
            <li
              key={idx}
              className="text-[10px] leading-snug list-disc"
              style={{ color: "var(--text-secondary)" }}
            >
              {issue.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── Stat Mini Card ──────────────────────────────────── */
function StatMini({ icon, label, value, unit }: { icon: string; label: string; value: string; unit: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl px-3 py-3 text-center" style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)" }}>
      <div className="absolute top-0 left-3 right-3 h-px bg-gradient-to-r from-transparent via-slate-500/25 to-transparent" />
      <div className="data-label uppercase tracking-wider mb-1">{label}</div>
      <div className="data-readout">
        {value}<span className="text-[11px] ml-1" style={{ color: "var(--text-muted)" }}>{unit}</span>
      </div>
    </div>
  );
}

/* ── Delay Explainer ──────────────────────────────────── */
function DelayExplainer({
  flight,
  airport,
  weather,
  anomalies,
  instability,
}: {
  flight: FlightState;
  airport: { nearest: unknown; departure: unknown } | null;
  weather: unknown;
  anomalies: Anomaly[];
  instability?: InstabilityResult | null;
}) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/delay-explainer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flight, airport, weather, anomalies, instability }),
      });
      if (!res.ok) throw new Error("Failed to analyze");
      const data = await res.json();
      setExplanation(data.explanation);
    } catch {
      setError("Could not generate analysis");
    } finally {
      setIsLoading(false);
    }
  }, [flight, airport, weather, anomalies, instability]);

  if (explanation) {
    return (
      <div className="rounded-xl border border-slate-500/20 bg-slate-950/20 px-4 py-3 animate-slide-up">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-slate-500/10 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
              Flight Analysis
            </span>
          </div>
          <button
            onClick={() => setExplanation(null)}
            className="text-[9px] text-slate-500 hover:text-slate-300 transition-colors"
          >
            Clear
          </button>
        </div>
        <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
          {explanation}
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={analyze}
      disabled={isLoading}
      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-500/20 bg-slate-950/10 hover:bg-slate-950/30 text-slate-300 hover:text-slate-200 transition-all text-xs font-semibold disabled:opacity-50 group"
    >
      {isLoading ? (
        <>
          <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
          Analyzing flight...
        </>
      ) : error ? (
        <span className="text-slate-200">{error} — tap to retry</span>
      ) : (
        <>
          <svg className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Why is this flight behaving this way?
        </>
      )}
    </button>
  );
}

/* ── Photo Section ──────────────────────────────────── */
function PhotoSection({
  photo,
  isLoading,
}: {
  photo: { url: string; thumbnailUrl: string; photographer: string | null; source: string; link: string | null } | null;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="w-full h-36 rounded-xl skeleton flex items-center justify-center">
        <svg className="w-8 h-8 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <circle cx="12" cy="13" r="3" strokeWidth={1.5} />
        </svg>
      </div>
    );
  }
  if (!photo) return null;

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-700/30 group">
      <Image
        src={photo.thumbnailUrl || photo.url}
        alt="Aircraft photo"
        width={340}
        height={200}
        className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-500"
        unoptimized
      />
      {photo.photographer && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 py-2">
          <span className="text-[10px] text-slate-300">
            {photo.link ? (
              <a href={photo.link} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                {photo.photographer} &middot; {photo.source}
              </a>
            ) : (
              <>{photo.photographer} &middot; {photo.source}</>
            )}
          </span>
        </div>
      )}
    </div>
  );
}

/* ── Route Section ──────────────────────────────────── */
function RouteSection({
  nearest,
  departure,
}: {
  nearest: { airport: { name: string; icao: string | null; city: string; country: string }; distanceNm: number } | null;
  departure: { airport: { name: string; icao: string | null; city: string; country: string }; distanceNm: number } | null;
}) {
  if (!nearest) return null;

  return (
    <GlassSection title="Route">
      <div className="space-y-2">
        {departure && (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-slate-500/10 border border-slate-500/20 flex items-center justify-center">
              <span className="text-slate-300 text-[10px] font-bold">DEP</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-slate-200 truncate text-xs font-medium">
                {departure.airport.name}
                {departure.airport.icao && (
                  <span className="text-slate-500 ml-1 font-mono">({departure.airport.icao})</span>
                )}
              </div>
              <div className="text-slate-500 text-[10px]">
                {departure.airport.city}, {departure.airport.country}
              </div>
            </div>
          </div>
        )}

        {departure && nearest && (
          <div className="flex items-center gap-2 px-4">
            <div className="flex-1 border-t border-dashed border-slate-700/60" />
            <svg className="w-3 h-3 text-slate-500/50" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
            </svg>
            <div className="flex-1 border-t border-dashed border-slate-700/60" />
          </div>
        )}

        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-slate-500/10 border border-slate-500/20 flex items-center justify-center">
            <span className="text-slate-400 text-[10px] font-bold">NR</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-slate-200 truncate text-xs font-medium">
              {nearest.airport.name}
              {nearest.airport.icao && (
                <span className="text-slate-500 ml-1 font-mono">({nearest.airport.icao})</span>
              )}
            </div>
            <div className="text-slate-500 text-[10px]">
              {nearest.airport.city}, {nearest.airport.country} &middot; {nearest.distanceNm.toFixed(1)} nm away
            </div>
          </div>
        </div>
      </div>
    </GlassSection>
  );
}

/* ── Weather Section ──────────────────────────────────── */
function WeatherSection({
  weather,
  isLoading,
  stationIcao,
}: {
  weather: {
    flightCategory: string;
    temperature: number | null;
    windDirection: number | null;
    windSpeed: number | null;
    windGust: number | null;
    visibility: number | null;
    conditions: string[];
    ceiling: number | null;
    humidity: number | null;
    station: string;
  } | null;
  isLoading: boolean;
  stationIcao: string | null;
}) {
  if (!stationIcao) return null;

  if (isLoading) {
    return (
      <GlassSection title="Weather">
        <div className="text-xs text-slate-500 animate-pulse">Loading weather data...</div>
      </GlassSection>
    );
  }

  if (!weather) return null;

  const catColor = FLIGHT_CAT_COLORS[weather.flightCategory] ?? "#9ca3af";

  return (
    <GlassSection title={`Weather \u2014 ${weather.station}`}>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span
            className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold border"
            style={{
              backgroundColor: catColor + "15",
              color: catColor,
              borderColor: catColor + "30",
            }}
          >
            {weather.flightCategory}
          </span>
          {weather.conditions.length > 0 && weather.conditions[0] !== "Clear" && (
            <span className="text-xs text-slate-400">{weather.conditions.join(", ")}</span>
          )}
        </div>
        {weather.temperature !== null && <Detail label="Temperature" value={`${weather.temperature}\u00b0C`} />}
        {weather.windSpeed !== null && (
          <Detail
            label="Wind"
            value={`${weather.windDirection ?? "VRB"}\u00b0 @ ${weather.windSpeed} kts${weather.windGust ? ` (G${weather.windGust})` : ""}`}
          />
        )}
        {weather.visibility !== null && <Detail label="Visibility" value={`${weather.visibility} SM`} />}
        {weather.ceiling !== null && <Detail label="Ceiling" value={`${weather.ceiling.toLocaleString()} ft`} />}
        {weather.humidity !== null && <Detail label="Humidity" value={`${Math.round(weather.humidity)}%`} />}
      </div>
    </GlassSection>
  );
}

/* ── Emissions Section ──────────────────────────────── */
function EmissionsSection({
  flight,
  departure,
  nearest,
}: {
  flight: FlightState;
  departure: { airport: { name: string; icao: string | null; city: string; country: string; lat?: number; lon?: number }; distanceNm: number } | null;
  nearest: { airport: { name: string; icao: string | null; city: string; country: string; lat?: number; lon?: number }; distanceNm: number } | null;
}) {
  // Calculate distance: use departure-to-nearest if both available, otherwise fall back to departure or nearest distance
  let distanceNm = 0;

  if (departure && nearest && departure.airport.icao !== nearest.airport.icao) {
    // If we have lat/lon on airports, compute great circle distance between them
    const depAirport = departure.airport as { lat?: number; lon?: number };
    const nrAirport = nearest.airport as { lat?: number; lon?: number };
    if (depAirport.lat != null && depAirport.lon != null && nrAirport.lat != null && nrAirport.lon != null) {
      distanceNm = haversineNm(depAirport.lat, depAirport.lon, nrAirport.lat, nrAirport.lon);
    } else {
      // Approximate: sum of departure distance (from current pos) and nearest distance
      distanceNm = departure.distanceNm + nearest.distanceNm;
    }
  } else if (departure) {
    distanceNm = departure.distanceNm * 2; // rough round-trip proxy if no distinct destination
  } else if (nearest) {
    distanceNm = nearest.distanceNm;
  }

  if (distanceNm < 1) return null;

  const emissions = estimateEmissions(flight.category, distanceNm, flight.typeCode);
  const treesNeeded = Math.ceil(emissions.co2Kg / 22);
  const isTypeMatched = !!emissions.typeName;

  const confidenceColor =
    emissions.confidence === "high"
      ? "var(--status-nominal)"
      : emissions.confidence === "medium"
      ? "var(--status-caution)"
      : "var(--status-critical)";

  return (
    <GlassSection title="Emissions Estimate">
      <div className="space-y-3">
        {/* Main CO2 readout */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: "rgba(148, 163, 184, 0.1)",
                border: "1px solid rgba(148, 163, 184, 0.2)",
              }}
            >
              <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <div>
              <div className="data-readout text-base">{formatCO2(emissions.co2Kg)}</div>
              {emissions.typeName ? (
                <div className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
                  {emissions.typeName}
                </div>
              ) : (
                <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  CO2 total
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: confidenceColor }}
                title={`${emissions.confidence} confidence`}
              />
              <span className="text-[10px] capitalize" style={{ color: "var(--text-muted)" }}>
                {emissions.confidence}
              </span>
            </div>
            {isTypeMatched && (
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
                style={{
                  background: "rgba(148, 163, 184, 0.1)",
                  color: "var(--text-secondary)",
                  border: "1px solid rgba(148, 163, 184, 0.2)",
                }}
              >
                Type-matched
              </span>
            )}
          </div>
        </div>

        {/* Detail rows */}
        <div className="space-y-1.5">
          <Detail label="Fuel burn" value={formatCO2(emissions.fuelBurnKg)} />
          <Detail label="CO2 / passenger" value={formatCO2(emissions.co2PerPaxKg)} />
          <Detail label="Distance" value={`${Math.round(emissions.distanceNm)} NM`} />
        </div>

        {/* Tree offset equivalence */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px]"
          style={{
            background: "rgba(148, 163, 184, 0.06)",
            border: "1px solid rgba(148, 163, 184, 0.12)",
            color: "var(--text-tertiary)",
          }}
        >
          <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z" />
          </svg>
          <span>
            {treesNeeded.toLocaleString()} tree{treesNeeded !== 1 ? "s" : ""} needed to offset (per year)
          </span>
        </div>
      </div>
    </GlassSection>
  );
}

/* ── Shared UI Components ────────────────────────────── */
function GlassSection({
  title,
  children,
  accentColor,
}: {
  title: string;
  children: React.ReactNode;
  accentColor?: string;
}) {
  return (
    <div className="relative rounded-xl px-4 py-3.5 overflow-hidden" style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)" }}>
      <div className="absolute top-0 left-3 right-3 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      <h3
        className="section-label mb-3"
        style={{ color: accentColor ?? "var(--text-muted)" }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function Detail({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="data-label">{label}</span>
      <span className={`font-medium text-sm tabular-nums ${highlight ? "text-slate-300" : ""}`} style={{ color: highlight ? undefined : "var(--text-secondary)" }}>
        {value}
      </span>
    </div>
  );
}
