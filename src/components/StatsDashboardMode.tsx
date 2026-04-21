"use client";

import { useState, useEffect, useMemo } from "react";
import type { FlightState } from "@/types/flight";
import { useSharedFlightData } from "@/contexts/FlightDataContext";

// ── Helpers ─────────────────────────────────────────────────────────────────

const mToFt = (m: number) => m * 3.28084;
const msToKts = (ms: number) => ms * 1.94384;

function fmt(n: number): string {
  return n.toLocaleString();
}

function pct(value: number, total: number): string {
  if (total === 0) return "0.0";
  return ((value / total) * 100).toFixed(1);
}

function barPct(value: number, max: number): number {
  if (max === 0) return 0;
  return Math.min((value / max) * 100, 100);
}

// ── Altitude bin colors (monochrome slate scale) ─────────────────

const ALT_BIN_COLORS = [
  "var(--text-secondary)", // 0-5k   green
  "var(--text-secondary)", // 5-10k  light green
  "var(--text-tertiary)", // 10-15k yellow
  "var(--text-tertiary)", // 15-20k amber
  "var(--text-secondary)", // 20-25k cyan
  "var(--text-secondary)", // 25-30k light blue
  "var(--text-tertiary)", // 30-35k indigo
  "var(--text-tertiary)", // 35-40k purple
  "var(--text-tertiary)", // 40k+   violet
];

const SPD_BIN_COLORS = [
  "var(--text-secondary)", // 0-100
  "var(--text-secondary)", // 100-200
  "var(--text-tertiary)", // 200-300
  "var(--text-tertiary)", // 300-400
  "var(--text-secondary)", // 400-500
  "var(--text-tertiary)", // 500+
];

const TYPE_COLORS = [
  "var(--text-secondary)", "var(--text-secondary)", "var(--text-tertiary)", "var(--text-tertiary)", "var(--text-secondary)",
  "var(--text-tertiary)", "var(--text-tertiary)", "var(--text-secondary)", "var(--accent-primary)", "var(--text-tertiary)",
  "var(--text-secondary)", "var(--text-tertiary)", "var(--text-tertiary)", "var(--text-secondary)", "var(--accent-primary)",
];

// ── Types ───────────────────────────────────────────────────────────────────

interface Props {
  onExitMode?: () => void;
}

interface DashboardStats {
  totalActive: number;
  onGround: number;
  onGroundPct: string;
  avgAltFt: number;
  avgSpdKts: number;
  altBins: number[];
  spdBins: number[];
  typeCounts: { type: string; count: number }[];
  positionSources: { source: string; count: number }[];
  avgNic: number;
  avgNacp: number;
  avgSil: number;
  militaryCount: number;
  quadrants: { label: string; count: number }[];
  highestAlt: { callsign: string; alt: number; icao: string }[];
  fastest: { callsign: string; speed: number; icao: string }[];
  topPrefixes: { prefix: string; count: number }[];
}

// ── Compute stats from flight data ──────────────────────────────────────────

function computeStats(flights: FlightState[]): DashboardStats {
  const total = flights.length;
  const groundFlights = flights.filter((f) => f.onGround);
  const airborne = flights.filter((f) => !f.onGround);

  // Average altitude
  const alts = airborne
    .filter((f) => f.baroAltitude != null)
    .map((f) => mToFt(f.baroAltitude!));
  const avgAltFt = alts.length > 0 ? alts.reduce((s, v) => s + v, 0) / alts.length : 0;

  // Average speed
  const spds = airborne
    .filter((f) => f.velocity != null)
    .map((f) => msToKts(f.velocity!));
  const avgSpdKts = spds.length > 0 ? spds.reduce((s, v) => s + v, 0) / spds.length : 0;

  // Altitude bins: 0-5k, 5-10k, 10-15k, 15-20k, 20-25k, 25-30k, 30-35k, 35-40k, 40k+
  const altBins = new Array(9).fill(0);
  for (const ft of alts) {
    if (ft < 5000) altBins[0]++;
    else if (ft < 10000) altBins[1]++;
    else if (ft < 15000) altBins[2]++;
    else if (ft < 20000) altBins[3]++;
    else if (ft < 25000) altBins[4]++;
    else if (ft < 30000) altBins[5]++;
    else if (ft < 35000) altBins[6]++;
    else if (ft < 40000) altBins[7]++;
    else altBins[8]++;
  }

  // Speed bins: 0-100, 100-200, 200-300, 300-400, 400-500, 500+
  const spdBins = new Array(6).fill(0);
  for (const kts of spds) {
    if (kts < 100) spdBins[0]++;
    else if (kts < 200) spdBins[1]++;
    else if (kts < 300) spdBins[2]++;
    else if (kts < 400) spdBins[3]++;
    else if (kts < 500) spdBins[4]++;
    else spdBins[5]++;
  }

  // Aircraft type breakdown (top 15)
  const typeMap = new Map<string, number>();
  for (const f of flights) {
    const tc = f.typeCode?.trim();
    if (tc) typeMap.set(tc, (typeMap.get(tc) ?? 0) + 1);
  }
  const typeCounts = [...typeMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([type, count]) => ({ type, count }));

  // Position source breakdown
  const srcMap = new Map<string, number>();
  for (const f of flights) {
    const src = f.positionSource?.trim() || "Unknown";
    srcMap.set(src, (srcMap.get(src) ?? 0) + 1);
  }
  const positionSources = [...srcMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([source, count]) => ({ source, count }));

  // Average NIC, NACp, SIL
  const nicVals = flights.filter((f) => f.nic != null).map((f) => f.nic!);
  const nacpVals = flights.filter((f) => f.nacP != null).map((f) => f.nacP!);
  const silVals = flights.filter((f) => f.sil != null).map((f) => f.sil!);
  const avgNic = nicVals.length > 0 ? nicVals.reduce((s, v) => s + v, 0) / nicVals.length : 0;
  const avgNacp = nacpVals.length > 0 ? nacpVals.reduce((s, v) => s + v, 0) / nacpVals.length : 0;
  const avgSil = silVals.length > 0 ? silVals.reduce((s, v) => s + v, 0) / silVals.length : 0;

  // Military count (dbFlags bit 0 = military)
  const militaryCount = flights.filter((f) => f.dbFlags != null && (f.dbFlags & 1) !== 0).length;

  // Geographic quadrants
  const quadrants = { NE: 0, NW: 0, SE: 0, SW: 0 };
  for (const f of flights) {
    if (f.latitude == null || f.longitude == null) continue;
    if (f.latitude >= 0) {
      if (f.longitude >= 0) quadrants.NE++;
      else quadrants.NW++;
    } else {
      if (f.longitude >= 0) quadrants.SE++;
      else quadrants.SW++;
    }
  }
  const quadrantList = Object.entries(quadrants)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  // Highest altitude (top 5)
  const highestAlt = [...flights]
    .filter((f) => f.baroAltitude != null && !f.onGround)
    .sort((a, b) => (b.baroAltitude ?? 0) - (a.baroAltitude ?? 0))
    .slice(0, 5)
    .map((f) => ({
      callsign: f.callsign?.trim() || f.icao24,
      alt: Math.round(mToFt(f.baroAltitude!)),
      icao: f.icao24,
    }));

  // Fastest (top 5)
  const fastest = [...flights]
    .filter((f) => f.velocity != null && !f.onGround)
    .sort((a, b) => (b.velocity ?? 0) - (a.velocity ?? 0))
    .slice(0, 5)
    .map((f) => ({
      callsign: f.callsign?.trim() || f.icao24,
      speed: Math.round(msToKts(f.velocity!)),
      icao: f.icao24,
    }));

  // Most common callsign prefixes (top 10 airlines)
  const prefixMap = new Map<string, number>();
  for (const f of flights) {
    if (!f.callsign) continue;
    const prefix = f.callsign.trim().substring(0, 3).toUpperCase();
    if (prefix.length < 2) continue;
    prefixMap.set(prefix, (prefixMap.get(prefix) ?? 0) + 1);
  }
  const topPrefixes = [...prefixMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([prefix, count]) => ({ prefix, count }));

  return {
    totalActive: total,
    onGround: groundFlights.length,
    onGroundPct: pct(groundFlights.length, total),
    avgAltFt,
    avgSpdKts,
    altBins,
    spdBins,
    typeCounts,
    positionSources,
    avgNic,
    avgNacp,
    avgSil,
    militaryCount,
    quadrants: quadrantList,
    highestAlt,
    fastest,
    topPrefixes,
  };
}

// ── Sub-components ──────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  trend,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: "up" | "down" | "flat";
  color: string;
}) {
  return (
    <div
      className="glass-card rounded-xl p-4 transition-all duration-300 hover:scale-[1.02]"
      style={{ borderColor: `${color}20` }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="section-label" style={{ color: "var(--text-muted)", fontSize: "0.625rem" }}>
          {label}
        </span>
        {trend && trend !== "flat" && (
          <span
            className="text-xs font-bold"
            style={{ color: trend === "up" ? "var(--status-nominal)" : "var(--status-critical)" }}
          >
            {trend === "up" ? "\u25B2" : "\u25BC"}
          </span>
        )}
      </div>
      <div
        className="data-readout animate-count"
        style={{ color, fontSize: "1.5rem", lineHeight: 1.1 }}
      >
        {value}
      </div>
      {sub && (
        <span className="text-xs mt-1 block" style={{ color: "var(--text-faint)" }}>
          {sub}
        </span>
      )}
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3">
      <h3 className="panel-title flex items-center gap-2">
        <span
          className="inline-block w-1 h-3.5 rounded-full"
          style={{ background: "var(--accent-primary)" }}
        />
        {title}
      </h3>
      {subtitle && (
        <p className="text-xs mt-0.5 ml-3" style={{ color: "var(--text-faint)" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

function HBar({
  label,
  value,
  maxValue,
  total,
  color,
  index,
  animated,
}: {
  label: string;
  value: number;
  maxValue: number;
  total: number;
  color: string;
  index: number;
  animated: boolean;
}) {
  const width = barPct(value, maxValue);
  return (
    <div className="flex items-center gap-2 group" style={{ animationDelay: `${index * 30}ms` }}>
      <span
        className="w-20 shrink-0 text-xs text-right truncate font-medium"
        style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono, monospace)" }}
      >
        {label}
      </span>
      <div className="relative flex-1 h-5 rounded overflow-hidden" style={{ background: "var(--surface-3)" }}>
        <div
          className="absolute inset-y-0 left-0 rounded"
          style={{
            width: animated ? `${width}%` : "0%",
            backgroundColor: color,
            opacity: 0.8,
            transition: "width 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
            transitionDelay: `${index * 50}ms`,
          }}
        />
        <div
          className="absolute inset-y-0 left-0 rounded"
          style={{
            width: animated ? `${width}%` : "0%",
            background: `linear-gradient(90deg, transparent, ${color}30)`,
            transition: "width 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
            transitionDelay: `${index * 50}ms`,
          }}
        />
      </div>
      <span
        className="w-10 shrink-0 text-xs text-right font-bold tabular-nums"
        style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono, monospace)" }}
      >
        {fmt(value)}
      </span>
      <span
        className="w-12 shrink-0 text-xs text-right tabular-nums"
        style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono, monospace)" }}
      >
        {pct(value, total)}%
      </span>
    </div>
  );
}

function QualityIndicator({ label, value, max }: { label: string; value: number; max: number }) {
  const ratio = max > 0 ? value / max : 0;
  const color =
    ratio >= 0.7 ? "var(--status-nominal)" : ratio >= 0.4 ? "var(--status-caution)" : "var(--status-critical)";
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
        {label}
      </span>
      <div className="flex items-center gap-2">
        <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-3)" }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${ratio * 100}%`, backgroundColor: color }}
          />
        </div>
        <span
          className="text-xs font-bold tabular-nums w-8 text-right"
          style={{ color, fontFamily: "var(--font-mono, monospace)" }}
        >
          {value.toFixed(1)}
        </span>
      </div>
    </div>
  );
}

function RankRow({
  rank,
  label,
  value,
  unit,
  color,
}: {
  rank: number;
  label: string;
  value: string;
  unit: string;
  color: string;
}) {
  return (
    <div
      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors hover:bg-white/[0.02]"
      style={{ borderBottom: "1px solid var(--border-subtle)" }}
    >
      <span
        className="w-5 h-5 flex items-center justify-center rounded text-xs font-bold"
        style={{ background: `${color}15`, color }}
      >
        {rank}
      </span>
      <span className="flex-1 text-xs truncate font-medium" style={{ color: "var(--text-secondary)" }}>
        {label}
      </span>
      <span
        className="text-xs font-bold tabular-nums"
        style={{ color, fontFamily: "var(--font-mono, monospace)" }}
      >
        {value}
      </span>
      <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>
        {unit}
      </span>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function StatsDashboardMode({ onExitMode }: Props) {
  const { flights, isLoading, lastUpdated, error: sharedError } = useSharedFlightData();
  const [refreshInterval, setRefreshInterval] = useState(10);
  const [prevTotal, setPrevTotal] = useState<number | null>(null);
  const [animated, setAnimated] = useState(false);

  // Trigger animation whenever flights data changes
  useEffect(() => {
    if (flights.length > 0) {
      setPrevTotal((prev) => (prev === null ? flights.length : prev));
      setAnimated(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimated(true));
      });
    }
  }, [flights]);

  // Compute stats
  const stats = useMemo(() => {
    if (flights.length === 0) return null;
    return computeStats(flights);
  }, [flights]);

  // Trend direction: compare current total to the previous snapshot
  const trend: "up" | "down" | "flat" = useMemo(() => {
    if (prevTotal === null || stats === null) return "flat";
    if (stats.totalActive > prevTotal) return "up";
    if (stats.totalActive < prevTotal) return "down";
    return "flat";
  }, [prevTotal, stats]);

  // After computing trend, update prevTotal to current for next comparison
  useEffect(() => {
    if (stats) {
      setPrevTotal(stats.totalActive);
    }
  }, [stats]);

  // Altitude bin labels
  const altBinLabels = ["0-5k", "5-10k", "10-15k", "15-20k", "20-25k", "25-30k", "30-35k", "35-40k", "40k+"];
  const spdBinLabels = ["0-100", "100-200", "200-300", "300-400", "400-500", "500+"];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-[1500] flex flex-col overflow-hidden animate-fade-in"
      style={{ background: "var(--surface-0)" }}
    >
      {/* Header bar */}
      <header
        className="flex items-center justify-between px-5 py-3 shrink-0"
        style={{
          background: "var(--surface-1)",
          borderBottom: "1px solid var(--border-default)",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" style={{ color: "var(--accent-primary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h1 className="panel-title text-sm">Statistics Dashboard</h1>
          </div>
          {lastUpdated && (
            <span className="text-xs tabular-nums" style={{ color: "var(--text-faint)" }}>
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          {/* Live indicator */}
          <div className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full animate-anomaly-pulse"
              style={{ background: "var(--status-nominal)" }}
            />
            <span className="text-xs font-medium" style={{ color: "var(--status-nominal)" }}>
              LIVE
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Refresh interval selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Refresh:</span>
            {[5, 10, 30, 60].map((sec) => (
              <button
                key={sec}
                onClick={() => setRefreshInterval(sec)}
                className="px-2 py-0.5 rounded text-xs font-medium transition-all"
                style={{
                  background: refreshInterval === sec ? "var(--accent-primary-dim)" : "transparent",
                  color: refreshInterval === sec ? "var(--accent-primary)" : "var(--text-muted)",
                  border: `1px solid ${refreshInterval === sec ? "var(--border-accent)" : "transparent"}`,
                }}
              >
                {sec}s
              </button>
            ))}
          </div>

          {/* Exit button */}
          {onExitMode && (
            <button
              onClick={onExitMode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-white/[0.05]"
              style={{ color: "var(--text-tertiary)", border: "1px solid var(--border-default)" }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Exit
            </button>
          )}
        </div>
      </header>

      {/* Loading / Error */}
      {isLoading && !stats && (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: "var(--accent-primary)", borderTopColor: "transparent" }}
            />
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>
              Loading flight data...
            </span>
          </div>
        </div>
      )}

      {sharedError && !stats && (
        <div className="flex-1 flex items-center justify-center">
          <div className="glass-card rounded-xl p-6 max-w-sm text-center">
            <span className="text-sm" style={{ color: "var(--status-critical)" }}>{sharedError.message}</span>
          </div>
        </div>
      )}

      {/* Main grid */}
      {stats && (
        <div className="flex-1 overflow-y-auto scrollbar-thin p-5">
          <div className="max-w-[1600px] mx-auto space-y-5">
            {/* ── KPI Cards Row ─────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard
                label="TOTAL ACTIVE FLIGHTS"
                value={fmt(stats.totalActive)}
                trend={trend}
                color="var(--accent-primary)"
              />
              <KpiCard
                label="AIRCRAFT ON GROUND"
                value={fmt(stats.onGround)}
                sub={`${stats.onGroundPct}% of total`}
                color="var(--status-caution)"
              />
              <KpiCard
                label="AVG ALTITUDE"
                value={`${fmt(Math.round(stats.avgAltFt))} ft`}
                color="var(--text-secondary)"
              />
              <KpiCard
                label="AVG SPEED"
                value={`${fmt(Math.round(stats.avgSpdKts))} kts`}
                color="var(--status-nominal)"
              />
            </div>

            {/* ── Charts Row ────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Altitude Distribution */}
              <div
                className="glass-card rounded-xl p-4"
                style={{ borderColor: "var(--border-default)" }}
              >
                <SectionHeader
                  title="Altitude Distribution"
                  subtitle="Airborne aircraft grouped by barometric altitude (ft)"
                />
                <div className="space-y-1.5">
                  {altBinLabels.map((label, i) => (
                    <HBar
                      key={label}
                      label={label}
                      value={stats.altBins[i]}
                      maxValue={Math.max(...stats.altBins, 1)}
                      total={stats.altBins.reduce((s, v) => s + v, 0)}
                      color={ALT_BIN_COLORS[i]}
                      index={i}
                      animated={animated}
                    />
                  ))}
                </div>
                {/* Stacked bar summary */}
                <div className="mt-3 flex h-2.5 rounded-full overflow-hidden" style={{ background: "var(--surface-3)" }}>
                  {stats.altBins.map((count, i) => {
                    const totalAlt = stats.altBins.reduce((s, v) => s + v, 0);
                    const w = totalAlt > 0 ? (count / totalAlt) * 100 : 0;
                    return (
                      <div
                        key={i}
                        style={{
                          width: `${w}%`,
                          backgroundColor: ALT_BIN_COLORS[i],
                          opacity: 0.8,
                          transition: "width 0.7s ease-out",
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Aircraft Type Breakdown */}
              <div
                className="glass-card rounded-xl p-4"
                style={{ borderColor: "var(--border-default)" }}
              >
                <SectionHeader
                  title="Aircraft Type Breakdown"
                  subtitle="Top 15 most common aircraft type codes"
                />
                <div className="space-y-1.5">
                  {stats.typeCounts.map((tc, i) => (
                    <HBar
                      key={tc.type}
                      label={tc.type}
                      value={tc.count}
                      maxValue={Math.max(...stats.typeCounts.map((t) => t.count), 1)}
                      total={stats.totalActive}
                      color={TYPE_COLORS[i % TYPE_COLORS.length]}
                      index={i}
                      animated={animated}
                    />
                  ))}
                  {stats.typeCounts.length === 0 && (
                    <span className="text-xs" style={{ color: "var(--text-faint)" }}>
                      No type code data available
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ── Speed + Data Quality Row ──────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Speed Distribution */}
              <div
                className="glass-card rounded-xl p-4"
                style={{ borderColor: "var(--border-default)" }}
              >
                <SectionHeader
                  title="Speed Distribution"
                  subtitle="Airborne aircraft grouped by ground speed (kts)"
                />
                <div className="space-y-1.5">
                  {spdBinLabels.map((label, i) => (
                    <HBar
                      key={label}
                      label={label}
                      value={stats.spdBins[i]}
                      maxValue={Math.max(...stats.spdBins, 1)}
                      total={stats.spdBins.reduce((s, v) => s + v, 0)}
                      color={SPD_BIN_COLORS[i]}
                      index={i}
                      animated={animated}
                    />
                  ))}
                </div>
                {/* Stacked bar summary */}
                <div className="mt-3 flex h-2.5 rounded-full overflow-hidden" style={{ background: "var(--surface-3)" }}>
                  {stats.spdBins.map((count, i) => {
                    const totalSpd = stats.spdBins.reduce((s, v) => s + v, 0);
                    const w = totalSpd > 0 ? (count / totalSpd) * 100 : 0;
                    return (
                      <div
                        key={i}
                        style={{
                          width: `${w}%`,
                          backgroundColor: SPD_BIN_COLORS[i],
                          opacity: 0.8,
                          transition: "width 0.7s ease-out",
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Data Quality Panel */}
              <div
                className="glass-card rounded-xl p-4"
                style={{ borderColor: "var(--border-default)" }}
              >
                <SectionHeader
                  title="Data Quality"
                  subtitle="Position source breakdown and navigation integrity scores"
                />

                {/* Source breakdown */}
                <div className="mb-4">
                  <span className="section-label text-xs block mb-2" style={{ color: "var(--text-muted)" }}>
                    POSITION SOURCES
                  </span>
                  <div className="space-y-1.5">
                    {stats.positionSources.map((src, i) => {
                      const srcColor =
                        src.source.toLowerCase().includes("adsb") || src.source.toLowerCase().includes("ads-b")
                          ? "var(--text-secondary)"
                          : src.source.toLowerCase().includes("mlat")
                          ? "var(--text-tertiary)"
                          : "var(--text-secondary)";
                      return (
                        <div key={src.source} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ background: srcColor }}
                            />
                            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                              {src.source}
                            </span>
                          </div>
                          <span
                            className="text-xs font-bold tabular-nums"
                            style={{ color: srcColor, fontFamily: "var(--font-mono, monospace)" }}
                          >
                            {fmt(src.count)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Navigation integrity */}
                <div className="mb-4">
                  <span className="section-label text-xs block mb-2" style={{ color: "var(--text-muted)" }}>
                    NAVIGATION INTEGRITY
                  </span>
                  <div className="space-y-2">
                    <QualityIndicator label="Avg NIC" value={stats.avgNic} max={11} />
                    <QualityIndicator label="Avg NACp" value={stats.avgNacp} max={11} />
                    <QualityIndicator label="Avg SIL" value={stats.avgSil} max={3} />
                  </div>
                </div>

                {/* Military count */}
                <div
                  className="flex items-center justify-between rounded-lg px-3 py-2"
                  style={{ background: "var(--surface-3)", border: "1px solid var(--border-subtle)" }}
                >
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    Military Aircraft
                  </span>
                  <span
                    className="text-xs font-bold tabular-nums"
                    style={{ color: "var(--status-warning)", fontFamily: "var(--font-mono, monospace)" }}
                  >
                    {fmt(stats.militaryCount)}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Geographic Heatmap Stats ──────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Busiest Quadrants */}
              <div
                className="glass-card rounded-xl p-4"
                style={{ borderColor: "var(--border-default)" }}
              >
                <SectionHeader title="Hemisphere Traffic" />
                <div className="space-y-1.5">
                  {stats.quadrants.map((q) => {
                    const qColor =
                      q.label === "NE" ? "var(--text-secondary)" : q.label === "NW" ? "var(--text-secondary)" : q.label === "SE" ? "var(--text-tertiary)" : "var(--text-tertiary)";
                    return (
                      <div key={q.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-6 text-center text-xs font-bold rounded py-0.5"
                            style={{ background: `${qColor}15`, color: qColor }}
                          >
                            {q.label}
                          </span>
                          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                            Hemisphere
                          </span>
                        </div>
                        <span
                          className="text-xs font-bold tabular-nums"
                          style={{ color: qColor, fontFamily: "var(--font-mono, monospace)" }}
                        >
                          {fmt(q.count)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Highest Altitude */}
              <div
                className="glass-card rounded-xl p-4"
                style={{ borderColor: "var(--border-default)" }}
              >
                <SectionHeader title="Highest Altitude" />
                <div className="space-y-0.5">
                  {stats.highestAlt.map((f, i) => (
                    <RankRow
                      key={f.icao}
                      rank={i + 1}
                      label={f.callsign}
                      value={fmt(f.alt)}
                      unit="ft"
                      color="var(--text-secondary)"
                    />
                  ))}
                  {stats.highestAlt.length === 0 && (
                    <span className="text-xs" style={{ color: "var(--text-faint)" }}>No data</span>
                  )}
                </div>
              </div>

              {/* Fastest Aircraft */}
              <div
                className="glass-card rounded-xl p-4"
                style={{ borderColor: "var(--border-default)" }}
              >
                <SectionHeader title="Fastest Aircraft" />
                <div className="space-y-0.5">
                  {stats.fastest.map((f, i) => (
                    <RankRow
                      key={f.icao}
                      rank={i + 1}
                      label={f.callsign}
                      value={fmt(f.speed)}
                      unit="kts"
                      color="var(--status-nominal)"
                    />
                  ))}
                  {stats.fastest.length === 0 && (
                    <span className="text-xs" style={{ color: "var(--text-faint)" }}>No data</span>
                  )}
                </div>
              </div>

              {/* Top Airline Prefixes */}
              <div
                className="glass-card rounded-xl p-4"
                style={{ borderColor: "var(--border-default)" }}
              >
                <SectionHeader title="Top Airlines" subtitle="By callsign prefix" />
                <div className="space-y-0.5">
                  {stats.topPrefixes.map((p, i) => (
                    <RankRow
                      key={p.prefix}
                      rank={i + 1}
                      label={p.prefix}
                      value={fmt(p.count)}
                      unit="flights"
                      color="var(--text-tertiary)"
                    />
                  ))}
                  {stats.topPrefixes.length === 0 && (
                    <span className="text-xs" style={{ color: "var(--text-faint)" }}>No data</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
