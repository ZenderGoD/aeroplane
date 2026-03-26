"use client";

import { useState, useMemo } from "react";
import { useEvents } from "@/hooks/useEvents";
import { useAirportPressure } from "@/hooks/useAirportPressure";
import { useCorridorHealth } from "@/hooks/useCorridorHealth";
import { useCorridorPredictability } from "@/hooks/useCorridorPredictability";
import { useTurnarounds } from "@/hooks/useTurnarounds";
import type { TurnaroundRow } from "@/hooks/useTurnarounds";
import { useBaselines } from "@/hooks/useBaselines";
import { useWorkerStatus } from "@/hooks/useWorkerStatus";
import type { FlightEvent, EventSeverity } from "@/types/events";
import type { AirportPressureScore } from "@/types/pressure";
import type { CorridorHealth, CorridorPredictability } from "@/types/corridor";
import type { AirportBaseline } from "@/types/baseline";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import SituationBriefing from "./SituationBriefing";
import RiskAssessmentTab from "./RiskAssessmentTab";
import AirportIntelCard from "./AirportIntelCard";
import FlightBoardTab from "./FlightBoardTab";

// ── helpers ──────────────────────────────────────────────────────────────

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

const SEVERITY_CONFIG: Record<
  EventSeverity,
  { bg: string; border: string; text: string; dot: string; label: string }
> = {
  critical: {
    bg: "bg-red-950/60",
    border: "border-red-800/60",
    text: "text-red-300",
    dot: "bg-red-500",
    label: "CRITICAL",
  },
  warning: {
    bg: "bg-amber-950/40",
    border: "border-amber-800/50",
    text: "text-amber-300",
    dot: "bg-amber-500",
    label: "WARNING",
  },
  info: {
    bg: "bg-blue-950/40",
    border: "border-blue-800/40",
    text: "text-blue-300",
    dot: "bg-blue-500",
    label: "INFO",
  },
};

const EVENT_ICONS: Record<string, string> = {
  holding_surge:
    "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
  go_around_cluster:
    "M5 10l7-7m0 0l7 7m-7-7v18",
  ground_stop_mass:
    "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636",
  traffic_surge:
    "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
  diversion_cluster:
    "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4",
  approach_instability:
    "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z",
  corridor_congestion:
    "M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12",
  departure_delay_wave:
    "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
};

function getPressureColor(score: number): string {
  if (score >= 80) return "#ef4444"; // red
  if (score >= 60) return "#f97316"; // orange
  if (score >= 40) return "#eab308"; // yellow
  if (score >= 20) return "#22c55e"; // green
  return "#6b7280"; // gray
}

function getPressureLabel(score: number): string {
  if (score >= 80) return "Critical";
  if (score >= 60) return "High";
  if (score >= 40) return "Moderate";
  if (score >= 20) return "Normal";
  return "Low";
}

function getCorridorStatusColor(status: string): string {
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

// ── Event Card ───────────────────────────────────────────────────────────

function EventCard({ event }: { event: FlightEvent }) {
  const severity = SEVERITY_CONFIG[event.severity];
  const iconPath = EVENT_ICONS[event.eventType] ?? EVENT_ICONS.approach_instability;

  return (
    <div
      className={`rounded-lg border ${severity.bg} ${severity.border} px-3 py-2.5 space-y-1.5`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <svg
            className={`w-3.5 h-3.5 shrink-0 ${severity.text}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={iconPath}
            />
          </svg>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider ${severity.text}`}
          >
            {severity.label}
          </span>
          {event.airportIcao && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ color: "var(--text-tertiary)", background: "var(--surface-3)" }}>
              {event.airportIcao}
            </span>
          )}
        </div>
        <span className="text-[10px] shrink-0 tabular-nums" style={{ color: "var(--text-muted)" }}>
          {timeAgo(event.detectedAt)}
        </span>
      </div>
      <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{event.message}</p>
      {event.affectedFlights.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {event.affectedFlights.slice(0, 5).map((f) => (
            <span
              key={f}
              className="text-[9px] font-mono px-1.5 py-0.5 rounded"
              style={{ color: "var(--text-tertiary)", background: "var(--surface-3)" }}
            >
              {f}
            </span>
          ))}
          {event.affectedFlights.length > 5 && (
            <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>
              +{event.affectedFlights.length - 5} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Pressure Card ────────────────────────────────────────────────────────

function PressureCard({ airport, baseline, events, turnarounds, corridors, onClick }: {
  airport: AirportPressureScore;
  baseline?: AirportBaseline | null;
  events?: FlightEvent[];
  turnarounds?: { activeCount: number; recentCount: number; avgTurnaroundMinutes: number | null; longestActiveMinutes: number | null };
  corridors?: Array<{ name: string; healthScore: number; status: string; trend: string }>;
  onClick?: () => void;
}) {
  const color = getPressureColor(airport.pressureScore);
  const label = getPressureLabel(airport.pressureScore);

  return (
    <div
      className={`rounded-lg border px-3 py-2.5 ${onClick ? "cursor-pointer transition-colors" : ""}`}
      style={{ borderColor: "var(--border-default)", background: "var(--surface-2)" }}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold" style={{ color: "var(--text-primary)" }}>
            {airport.airportIcao}
          </span>
          <span className="text-[10px] truncate max-w-[140px]" style={{ color: "var(--text-muted)" }}>
            {airport.airportName}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="text-xs font-bold tabular-nums"
            style={{ color }}
          >
            {Math.round(airport.pressureScore)}
          </span>
          <span
            className="text-[9px] font-medium px-1.5 py-0.5 rounded-full"
            style={{
              color,
              backgroundColor: `${color}20`,
            }}
          >
            {label}
          </span>
        </div>
      </div>

      {/* Pressure bar */}
      <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: "var(--surface-3)" }}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${Math.min(airport.pressureScore, 100)}%`,
            backgroundColor: color,
          }}
        />
      </div>

      {/* Component breakdown */}
      <div className="grid grid-cols-5 gap-1">
        {[
          { label: "IN", value: airport.components.inboundCount, color: "text-blue-400" },
          { label: "OUT", value: airport.components.outboundCount, color: "text-emerald-400" },
          { label: "GND", value: airport.components.groundCount, color: "text-gray-400" },
          { label: "HLD", value: airport.components.holdingCount, color: "text-amber-400" },
          { label: "G/A", value: airport.components.goAroundCount, color: "text-red-400" },
        ].map((c) => (
          <div key={c.label} className="text-center">
            <div className={`text-[10px] font-bold tabular-nums ${c.color}`}>
              {c.value}
            </div>
            <div className="text-[8px] uppercase" style={{ color: "var(--text-faint)" }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* AI Airport Intelligence */}
      <AirportIntelCard
        airportIcao={airport.airportIcao}
        airportName={airport.airportName}
        pressure={airport}
        baseline={baseline ?? null}
        weather={null}
        events={events ?? []}
        turnarounds={turnarounds ?? { activeCount: 0, recentCount: 0, avgTurnaroundMinutes: null, longestActiveMinutes: null }}
        corridors={corridors ?? []}
      />
    </div>
  );
}

// ── Corridor Card ────────────────────────────────────────────────────────

function getPredictabilityColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#eab308";
  if (score >= 40) return "#f97316";
  return "#ef4444";
}

function getTrendConfig(label: string): { arrow: string; color: string } {
  switch (label) {
    case "improving":
      return { arrow: "\u2191", color: "#22c55e" };
    case "degrading":
      return { arrow: "\u2193", color: "#ef4444" };
    default:
      return { arrow: "\u2192", color: "#94a3b8" };
  }
}

/** Mini SVG sparkline from an array of values */
function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 100);
  const w = 60;
  const h = 14;
  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * w},${h - (v / max) * h}`)
    .join(" ");

  return (
    <svg width={w} height={h} className="inline-block ml-1">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CorridorCard({
  corridor,
  predictability,
}: {
  corridor: CorridorHealth;
  predictability?: CorridorPredictability;
}) {
  const statusColor = getCorridorStatusColor(corridor.status);

  return (
    <div className="rounded-lg border px-3 py-2.5" style={{ borderColor: "var(--border-default)", background: "var(--surface-2)" }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <svg
            className="w-3.5 h-3.5 shrink-0"
            style={{ color: "var(--text-tertiary)" }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
          </svg>
          <span className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>
            {corridor.corridorName}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="text-xs font-bold tabular-nums"
            style={{ color: statusColor }}
          >
            {Math.round(corridor.healthScore)}
          </span>
          <span
            className="text-[9px] font-medium px-1.5 py-0.5 rounded-full capitalize"
            style={{
              color: statusColor,
              backgroundColor: `${statusColor}20`,
            }}
          >
            {corridor.status}
          </span>
        </div>
      </div>

      {/* Health bar */}
      <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: "var(--surface-3)" }}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${Math.min(corridor.healthScore, 100)}%`,
            backgroundColor: statusColor,
          }}
        />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-1">
        {[
          { label: "Flights", value: corridor.flightCount, color: "text-blue-400" },
          {
            label: "Avg Alt",
            value: corridor.avgAltitude
              ? `${Math.round(corridor.avgAltitude * 3.28084 / 1000)}k`
              : "—",
            color: "text-cyan-400",
          },
          {
            label: "Spacing",
            value: corridor.avgSpacingNm
              ? `${Math.round(corridor.avgSpacingNm)}nm`
              : "—",
            color: "text-purple-400",
          },
          {
            label: "Anomaly",
            value: corridor.anomalyCount,
            color: corridor.anomalyCount > 0 ? "text-red-400" : "text-gray-500",
          },
        ].map((s) => (
          <div key={s.label} className="text-center">
            <div className={`text-[10px] font-bold tabular-nums ${s.color}`}>
              {s.value}
            </div>
            <div className="text-[8px] uppercase" style={{ color: "var(--text-faint)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Predictability section */}
      {predictability && (
        <div className="mt-2 pt-2 border-t" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] uppercase" style={{ color: "var(--text-muted)" }}>Predictability</span>
              <span
                className="text-[10px] font-bold tabular-nums"
                style={{ color: getPredictabilityColor(predictability.predictabilityScore) }}
              >
                {predictability.predictabilityScore}
              </span>
              <span
                className="text-[9px] font-semibold"
                style={{ color: getTrendConfig(predictability.trendLabel).color }}
              >
                {getTrendConfig(predictability.trendLabel).arrow}
              </span>
              <span
                className="text-[8px] capitalize"
                style={{ color: getTrendConfig(predictability.trendLabel).color }}
              >
                {predictability.trendLabel}
              </span>
            </div>
            <Sparkline
              values={predictability.recentScores}
              color={statusColor}
            />
          </div>
          <div className="flex items-center gap-3 mt-1 text-[9px]" style={{ color: "var(--text-muted)" }}>
            <span>Avg: {predictability.avgHealthScore}</span>
            <span>StdDev: {predictability.healthStdDev}</span>
            <span>{predictability.sampleCount} samples</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Turnaround Card ─────────────────────────────────────────────────────

function getTurnaroundColor(minutes: number | null): string {
  if (minutes === null) return "#f59e0b"; // amber for active
  if (minutes < 30) return "#22c55e";
  if (minutes < 60) return "#eab308";
  if (minutes < 120) return "#f97316";
  return "#ef4444";
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function TurnaroundCard({ record, isActive }: { record: TurnaroundRow; isActive: boolean }) {
  const elapsed = isActive
    ? Date.now() - new Date(record.arrival_time).getTime()
    : null;
  const color = getTurnaroundColor(record.turnaround_minutes ?? (elapsed ? elapsed / 60_000 : null));

  return (
    <div
      className="rounded-lg border px-3 py-2.5"
      style={{ background: "var(--surface-2)", borderColor: `${color}40` }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-mono font-bold" style={{ color: "var(--text-primary)" }}>
            {record.callsign || record.icao24}
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ color: "var(--text-tertiary)", background: "var(--surface-3)" }}>
            {record.airport_icao}
          </span>
          {record.airline_icao && (
            <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>{record.airline_icao}</span>
          )}
        </div>
        <span
          className="text-[9px] font-medium px-1.5 py-0.5 rounded-full"
          style={{ color, backgroundColor: `${color}20` }}
        >
          {isActive ? "On Ground" : "Departed"}
        </span>
      </div>

      <div className="flex items-center gap-3 text-[10px]">
        <div>
          <span style={{ color: "var(--text-muted)" }}>Arrived: </span>
          <span className="tabular-nums" style={{ color: "var(--text-secondary)" }}>{formatTime(record.arrival_time)}</span>
        </div>
        {record.departure_time && (
          <div>
            <span style={{ color: "var(--text-muted)" }}>Departed: </span>
            <span className="tabular-nums" style={{ color: "var(--text-secondary)" }}>{formatTime(record.departure_time)}</span>
          </div>
        )}
        <div className="ml-auto">
          {isActive && elapsed !== null ? (
            <span className="font-bold tabular-nums" style={{ color }}>
              {formatDuration(elapsed)} on ground
            </span>
          ) : record.turnaround_minutes !== null ? (
            <span className="font-bold tabular-nums" style={{ color }}>
              {record.turnaround_minutes}m turnaround
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ── Baseline Card ───────────────────────────────────────────────────────

function getDeviationColor(current: number, avg: number, stddev: number): string {
  if (stddev <= 0) return "#6b7280";
  const sigma = Math.abs(current - avg) / stddev;
  if (sigma > 2) return "#ef4444";
  if (sigma > 1) return "#eab308";
  return "#22c55e";
}

function getDeviationLabel(current: number, avg: number, stddev: number): string {
  if (stddev <= 0 || avg <= 0) return "—";
  const pct = ((current - avg) / avg) * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${Math.round(pct)}%`;
}

function BaselineCard({
  baseline,
  currentPressure,
}: {
  baseline: AirportBaseline;
  currentPressure?: AirportPressureScore;
}) {
  const currentIn = currentPressure?.components.inboundCount ?? 0;
  const currentOut = currentPressure?.components.outboundCount ?? 0;
  const arrColor = getDeviationColor(currentIn, baseline.avgArrivals, baseline.stddevArrivals);
  const depColor = getDeviationColor(currentOut, baseline.avgDepartures, baseline.stddevDepartures);

  return (
    <div className="rounded-lg border px-3 py-2.5" style={{ borderColor: "var(--border-default)", background: "var(--surface-2)" }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono font-bold" style={{ color: "var(--text-primary)" }}>
          {baseline.airportIcao}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>
            {baseline.sampleCount} samples
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Arrivals */}
        <div className="rounded-md px-2.5 py-2" style={{ background: "var(--surface-3)" }}>
          <div className="text-[8px] uppercase mb-1" style={{ color: "var(--text-muted)" }}>Arrivals</div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
              {currentIn}
            </span>
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              / {baseline.avgArrivals.toFixed(1)} avg
            </span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <span
              className="text-[10px] font-bold tabular-nums"
              style={{ color: arrColor }}
            >
              {getDeviationLabel(currentIn, baseline.avgArrivals, baseline.stddevArrivals)}
            </span>
            <span className="text-[9px]" style={{ color: "var(--text-faint)" }}>
              (σ {baseline.stddevArrivals.toFixed(1)})
            </span>
          </div>
        </div>

        {/* Departures */}
        <div className="rounded-md px-2.5 py-2" style={{ background: "var(--surface-3)" }}>
          <div className="text-[8px] uppercase mb-1" style={{ color: "var(--text-muted)" }}>Departures</div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
              {currentOut}
            </span>
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              / {baseline.avgDepartures.toFixed(1)} avg
            </span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <span
              className="text-[10px] font-bold tabular-nums"
              style={{ color: depColor }}
            >
              {getDeviationLabel(currentOut, baseline.avgDepartures, baseline.stddevDepartures)}
            </span>
            <span className="text-[9px]" style={{ color: "var(--text-faint)" }}>
              (σ {baseline.stddevDepartures.toFixed(1)})
            </span>
          </div>
        </div>
      </div>

      {/* Pressure comparison */}
      {currentPressure && baseline.avgPressureScore > 0 && (
        <div className="mt-2 pt-2 border-t flex items-center gap-2 text-[10px]" style={{ borderColor: "var(--border-subtle)" }}>
          <span style={{ color: "var(--text-muted)" }}>Pressure:</span>
          <span
            className="font-bold tabular-nums"
            style={{ color: getPressureColor(currentPressure.pressureScore) }}
          >
            {Math.round(currentPressure.pressureScore)}
          </span>
          <span style={{ color: "var(--text-faint)" }}>
            vs {baseline.avgPressureScore.toFixed(0)} avg
          </span>
        </div>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────

interface IntelligencePanelProps {
  flightStats?: { total: number; airborne: number; onGround: number; anomalyCount: number };
  riskyFlights?: Array<{
    callsign: string;
    icao24: string;
    instabilityScore: number;
    factors: string;
    anomalies: string[];
    altitude: number | null;
    speed: number | null;
  }>;
  onSelectAirport?: (icao: string) => void;
}

export default function IntelligencePanel({ flightStats, riskyFlights, onSelectAirport }: IntelligencePanelProps = {}) {
  const [open, setOpen] = useState(false);
  const { events, connected } = useEvents();
  const { pressureScores } = useAirportPressure();
  const { corridors } = useCorridorHealth();
  const { predictabilities } = useCorridorPredictability();
  const { active: activeTurnarounds, recent: recentTurnarounds } = useTurnarounds();
  const { baselines } = useBaselines();
  const { workerActive } = useWorkerStatus();

  // Build pressure lookup map for baseline tab
  const pressureMap = useMemo(() => {
    const m = new Map<string, AirportPressureScore>();
    for (const p of pressureScores) m.set(p.airportIcao, p);
    return m;
  }, [pressureScores]);

  // Sort baselines by deviation severity (most deviated first)
  const sortedBaselines = useMemo(() => {
    return [...baselines]
      .filter((b) => b.sampleCount > 0)
      .sort((a, b) => {
        const pressA = pressureMap.get(a.airportIcao);
        const pressB = pressureMap.get(b.airportIcao);
        const devA = pressA
          ? Math.abs(pressA.components.inboundCount - a.avgArrivals) / Math.max(a.stddevArrivals, 0.1) +
            Math.abs(pressA.components.outboundCount - a.avgDepartures) / Math.max(a.stddevDepartures, 0.1)
          : 0;
        const devB = pressB
          ? Math.abs(pressB.components.inboundCount - b.avgArrivals) / Math.max(b.stddevArrivals, 0.1) +
            Math.abs(pressB.components.outboundCount - b.avgDepartures) / Math.max(b.stddevDepartures, 0.1)
          : 0;
        return devB - devA;
      });
  }, [baselines, pressureMap]);

  // Turnaround stats
  const avgTurnaround = useMemo(() => {
    const departed = recentTurnarounds.filter((r) => r.turnaround_minutes !== null);
    if (departed.length === 0) return null;
    const sum = departed.reduce((s, r) => s + (r.turnaround_minutes ?? 0), 0);
    return Math.round(sum / departed.length);
  }, [recentTurnarounds]);

  // Build predictability lookup map
  const predMap = useMemo(() => {
    const m = new Map<string, CorridorPredictability>();
    for (const p of predictabilities) m.set(p.corridorId, p);
    return m;
  }, [predictabilities]);

  // Sort pressure by score descending
  const sortedPressure = useMemo(
    () => [...pressureScores].sort((a, b) => b.pressureScore - a.pressureScore),
    [pressureScores]
  );

  // Sort corridors by health score ascending (worst first)
  const sortedCorridors = useMemo(
    () => [...corridors].sort((a, b) => a.healthScore - b.healthScore),
    [corridors]
  );

  // Event counts by severity
  const eventCounts = useMemo(() => {
    const counts = { critical: 0, warning: 0, info: 0 };
    for (const e of events) {
      counts[e.severity]++;
    }
    return counts;
  }, [events]);

  // Total active alerts for badge
  const alertCount = eventCounts.critical + eventCounts.warning;

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all relative ${
          open
            ? "bg-emerald-600 text-white"
            : "hover:bg-gray-800/50"
        }`}
        style={!open ? { color: "var(--text-tertiary)" } : undefined}
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
        Intel
        {/* Worker status dot */}
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            workerActive ? "bg-emerald-400 animate-pulse" : "bg-gray-600"
          }`}
        />
        {/* Alert badge */}
        {alertCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-1">
            {alertCount}
          </span>
        )}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="!z-[2000] w-[440px] sm:max-w-[440px] p-0 flex flex-col"
          style={{ background: "var(--surface-1)", borderColor: "var(--border-default)" }}
          showCloseButton={true}
        >
          <SheetHeader className="px-5 pt-5 pb-0">
            <SheetTitle className="flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <svg
                className="w-5 h-5 text-emerald-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              Aviation Intelligence
              <span
                className={`ml-auto flex items-center gap-1.5 text-[10px] font-normal ${
                  workerActive ? "text-emerald-400" : "text-gray-500"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    workerActive ? "bg-emerald-400 animate-pulse" : "bg-gray-600"
                  }`}
                />
                {workerActive ? "Live" : "Offline"}
              </span>
            </SheetTitle>
            <SheetDescription style={{ color: "var(--text-muted)" }}>
              Real-time event detection, airport pressure & corridor health
            </SheetDescription>
          </SheetHeader>

          {/* AI Situation Briefing */}
          <SituationBriefing
            events={events}
            pressure={sortedPressure}
            corridors={corridors}
            predictability={predictabilities}
            baselines={baselines}
            turnarounds={{
              activeCount: activeTurnarounds.length,
              recentCount: recentTurnarounds.length,
              avgMinutes: avgTurnaround,
            }}
            flightStats={flightStats ?? { total: 0, airborne: 0, onGround: 0, anomalyCount: 0 }}
          />

          <Tabs
            defaultValue="events"
            className="flex-1 flex flex-col min-h-0 px-5 pt-3"
          >
            <TabsList className="border w-full" style={{ background: "var(--surface-2)", borderColor: "var(--border-default)" }}>
              <TabsTrigger
                value="events"
                className="flex-1"
                style={{ color: "var(--text-tertiary)" }}
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                Events
                {alertCount > 0 && (
                  <span className="ml-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500/80 text-white text-[9px] font-bold px-1">
                    {alertCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="pressure"
                className="flex-1"
                style={{ color: "var(--text-tertiary)" }}
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
                Pressure
                {sortedPressure.length > 0 && (
                  <span className="ml-1 text-[9px]" style={{ color: "var(--text-muted)" }}>
                    {sortedPressure.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="corridors"
                className="flex-1"
                style={{ color: "var(--text-tertiary)" }}
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                  />
                </svg>
                Corridors
                {sortedCorridors.length > 0 && (
                  <span className="ml-1 text-[9px]" style={{ color: "var(--text-muted)" }}>
                    {sortedCorridors.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="turnaround"
                className="flex-1"
                style={{ color: "var(--text-tertiary)" }}
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Gate
                {activeTurnarounds.length > 0 && (
                  <span className="ml-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-amber-500/80 text-white text-[9px] font-bold px-1">
                    {activeTurnarounds.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="baseline"
                className="flex-1"
                style={{ color: "var(--text-tertiary)" }}
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                Baseline
                {sortedBaselines.length > 0 && (
                  <span className="ml-1 text-[9px]" style={{ color: "var(--text-muted)" }}>
                    {sortedBaselines.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="risk"
                className="flex-1"
                style={{ color: "var(--text-tertiary)" }}
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                Risk
              </TabsTrigger>
              <TabsTrigger
                value="flights"
                className="flex-1"
                style={{ color: "var(--text-tertiary)" }}
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
                Board
              </TabsTrigger>
            </TabsList>

            {/* ── Events Tab ──────────────────────────────────────────── */}
            <TabsContent value="events" className="flex-1 min-h-0 mt-3">
              <ScrollArea className="h-[calc(100vh-200px)]">
                <div className="space-y-3 pb-6 pr-2">
                  {/* Summary bar */}
                  <div className="flex items-center gap-3 text-[10px]">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      <span style={{ color: "var(--text-tertiary)" }}>
                        {eventCounts.critical} critical
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span style={{ color: "var(--text-tertiary)" }}>
                        {eventCounts.warning} warning
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      <span style={{ color: "var(--text-tertiary)" }}>
                        {eventCounts.info} info
                      </span>
                    </div>
                    <div className="ml-auto flex items-center gap-1">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          connected ? "bg-emerald-400" : "bg-gray-600"
                        }`}
                      />
                      <span style={{ color: "var(--text-muted)" }}>
                        {connected ? "SSE connected" : "disconnected"}
                      </span>
                    </div>
                  </div>

                  {events.length === 0 ? (
                    <div className="text-center py-12">
                      <svg
                        className="w-8 h-8 text-gray-700 mx-auto mb-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                      <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                        No events detected yet
                      </p>
                      <p className="text-[10px] mt-1" style={{ color: "var(--text-faint)" }}>
                        {workerActive
                          ? "Worker is running — events will appear as they're detected"
                          : "Start the worker with: npm run worker:dev"}
                      </p>
                    </div>
                  ) : (
                    events.map((event, i) => (
                      <EventCard key={event.id ?? i} event={event} />
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* ── Pressure Tab ────────────────────────────────────────── */}
            <TabsContent value="pressure" className="flex-1 min-h-0 mt-3">
              <ScrollArea className="h-[calc(100vh-200px)]">
                <div className="space-y-3 pb-6 pr-2">
                  {/* Summary */}
                  {sortedPressure.length > 0 && (
                    <div className="flex items-center gap-2 text-[10px]" style={{ color: "var(--text-muted)" }}>
                      <span>
                        Tracking {sortedPressure.length} airports
                      </span>
                      <span className="ml-auto">
                        Sorted by pressure score
                      </span>
                    </div>
                  )}

                  {/* Top pressure overview bar */}
                  {sortedPressure.length > 0 && (
                    <div className="flex h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-3)" }}>
                      {sortedPressure.slice(0, 10).map((a) => (
                        <div
                          key={a.airportIcao}
                          className="transition-all duration-700 ease-out"
                          style={{
                            flex: Math.max(a.pressureScore, 5),
                            backgroundColor: getPressureColor(a.pressureScore),
                            opacity: 0.8,
                          }}
                          title={`${a.airportIcao}: ${Math.round(a.pressureScore)}`}
                        />
                      ))}
                    </div>
                  )}

                  {sortedPressure.length === 0 ? (
                    <div className="text-center py-12">
                      <svg
                        className="w-8 h-8 text-gray-700 mx-auto mb-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                        />
                      </svg>
                      <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                        No pressure data yet
                      </p>
                      <p className="text-[10px] mt-1" style={{ color: "var(--text-faint)" }}>
                        {workerActive
                          ? "Calculating pressure scores..."
                          : "Start the worker to see airport pressure"}
                      </p>
                    </div>
                  ) : (
                    sortedPressure.map((airport) => {
                      const bl = baselines.find(b => b.airportIcao === airport.airportIcao);
                      const airportEvents = events.filter(e => e.airportIcao === airport.airportIcao);
                      const airportTurnaroundsActive = activeTurnarounds.filter(t => t.airport_icao === airport.airportIcao);
                      const airportTurnaroundsRecent = recentTurnarounds.filter(t => t.airport_icao === airport.airportIcao);
                      const avgMins = airportTurnaroundsRecent.length > 0
                        ? airportTurnaroundsRecent.reduce((s, t) => s + (t.turnaround_minutes ?? 0), 0) / airportTurnaroundsRecent.length
                        : null;
                      const longestMins = airportTurnaroundsActive.length > 0
                        ? Math.max(...airportTurnaroundsActive.map(t => {
                            const arrTime = t.arrival_time ? new Date(t.arrival_time).getTime() : Date.now();
                            return (Date.now() - arrTime) / 60000;
                          }))
                        : null;
                      return (
                        <PressureCard
                          key={airport.airportIcao}
                          airport={airport}
                          baseline={bl}
                          events={airportEvents}
                          turnarounds={{
                            activeCount: airportTurnaroundsActive.length,
                            recentCount: airportTurnaroundsRecent.length,
                            avgTurnaroundMinutes: avgMins,
                            longestActiveMinutes: longestMins,
                          }}
                          onClick={() => {
                            onSelectAirport?.(airport.airportIcao);
                            setOpen(false);
                          }}
                        />
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* ── Corridors Tab ───────────────────────────────────────── */}
            <TabsContent value="corridors" className="flex-1 min-h-0 mt-3">
              <ScrollArea className="h-[calc(100vh-200px)]">
                <div className="space-y-3 pb-6 pr-2">
                  {/* Summary */}
                  {sortedCorridors.length > 0 && (
                    <div className="flex items-center gap-2 text-[10px]" style={{ color: "var(--text-muted)" }}>
                      <span>
                        Monitoring {sortedCorridors.length} corridors
                      </span>
                      <span className="ml-auto">
                        Sorted by health (worst first)
                      </span>
                    </div>
                  )}

                  {/* Status summary */}
                  {sortedCorridors.length > 0 && (
                    <div className="flex items-center gap-3 text-[10px]">
                      {(
                        [
                          ["normal", "#22c55e"],
                          ["compressed", "#eab308"],
                          ["congested", "#f97316"],
                          ["disrupted", "#ef4444"],
                        ] as const
                      ).map(([status, color]) => {
                        const count = sortedCorridors.filter(
                          (c) => c.status === status
                        ).length;
                        if (count === 0) return null;
                        return (
                          <div
                            key={status}
                            className="flex items-center gap-1"
                          >
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                            <span style={{ color: "var(--text-tertiary)" }}>
                              {count} {status}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {sortedCorridors.length === 0 ? (
                    <div className="text-center py-12">
                      <svg
                        className="w-8 h-8 text-gray-700 mx-auto mb-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                        />
                      </svg>
                      <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                        No corridor data yet
                      </p>
                      <p className="text-[10px] mt-1" style={{ color: "var(--text-faint)" }}>
                        {workerActive
                          ? "Analyzing corridor health..."
                          : "Start the worker to see corridor health"}
                      </p>
                    </div>
                  ) : (
                    sortedCorridors.map((corridor) => (
                      <CorridorCard
                        key={corridor.corridorId}
                        corridor={corridor}
                        predictability={predMap.get(corridor.corridorId)}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            {/* ── Turnaround Tab ─────────────────────────────────────── */}
            <TabsContent value="turnaround" className="flex-1 min-h-0 mt-3">
              <ScrollArea className="h-[calc(100vh-200px)]">
                <div className="space-y-3 pb-6 pr-2">
                  {/* Summary */}
                  {(activeTurnarounds.length > 0 || recentTurnarounds.length > 0) && (
                    <div className="flex items-center gap-3 text-[10px]" style={{ color: "var(--text-muted)" }}>
                      <span>{activeTurnarounds.length} on ground</span>
                      <span>{recentTurnarounds.length} recent</span>
                      {avgTurnaround !== null && (
                        <span className="ml-auto">
                          Avg: {avgTurnaround}m
                        </span>
                      )}
                    </div>
                  )}

                  {activeTurnarounds.length === 0 && recentTurnarounds.length === 0 ? (
                    <div className="text-center py-12">
                      <svg
                        className="w-8 h-8 text-gray-700 mx-auto mb-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                        No turnaround data yet
                      </p>
                      <p className="text-[10px] mt-1" style={{ color: "var(--text-faint)" }}>
                        {workerActive
                          ? "Monitoring airports for turnarounds..."
                          : "Start the worker to track turnarounds"}
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Active on ground */}
                      {activeTurnarounds.length > 0 && (
                        <>
                          <div className="text-[10px] text-amber-400 font-medium uppercase tracking-wider">
                            Currently On Ground
                          </div>
                          {activeTurnarounds.map((r, i) => (
                            <TurnaroundCard
                              key={`active-${r.icao24}-${i}`}
                              record={r}
                              isActive={true}
                            />
                          ))}
                        </>
                      )}

                      {/* Recent departed */}
                      {recentTurnarounds.length > 0 && (
                        <>
                          {activeTurnarounds.length > 0 && (
                            <Separator style={{ background: "var(--border-subtle)" }} />
                          )}
                          <div className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                            Recent Turnarounds
                          </div>
                          {recentTurnarounds.slice(0, 20).map((r, i) => (
                            <TurnaroundCard
                              key={`recent-${r.icao24}-${i}`}
                              record={r}
                              isActive={false}
                            />
                          ))}
                        </>
                      )}
                    </>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* ── Baseline Tab ──────────────────────────────────────── */}
            <TabsContent value="baseline" className="flex-1 min-h-0 mt-3">
              <ScrollArea className="h-[calc(100vh-200px)]">
                <div className="space-y-3 pb-6 pr-2">
                  {/* Summary */}
                  {sortedBaselines.length > 0 && (
                    <div className="flex items-center gap-3 text-[10px]" style={{ color: "var(--text-muted)" }}>
                      {(() => {
                        let above = 0, below = 0, normal = 0;
                        for (const b of sortedBaselines) {
                          const p = pressureMap.get(b.airportIcao);
                          if (!p) { normal++; continue; }
                          const arrDev = b.stddevArrivals > 0
                            ? (p.components.inboundCount - b.avgArrivals) / b.stddevArrivals
                            : 0;
                          const depDev = b.stddevDepartures > 0
                            ? (p.components.outboundCount - b.avgDepartures) / b.stddevDepartures
                            : 0;
                          const maxDev = Math.max(arrDev, depDev);
                          const minDev = Math.min(arrDev, depDev);
                          if (maxDev > 1) above++;
                          else if (minDev < -1) below++;
                          else normal++;
                        }
                        return (
                          <>
                            {above > 0 && (
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-red-500" />
                                {above} above normal
                              </span>
                            )}
                            {below > 0 && (
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-blue-500" />
                                {below} below normal
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-green-500" />
                              {normal} normal
                            </span>
                          </>
                        );
                      })()}
                      <span className="ml-auto">
                        Hour {new Date().getUTCDay() * 24 + new Date().getUTCHours()} of week
                      </span>
                    </div>
                  )}

                  {sortedBaselines.length === 0 ? (
                    <div className="text-center py-12">
                      <svg
                        className="w-8 h-8 text-gray-700 mx-auto mb-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                      <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                        No baseline data yet
                      </p>
                      <p className="text-[10px] mt-1" style={{ color: "var(--text-faint)" }}>
                        {workerActive
                          ? "Building baseline statistics..."
                          : "Start the worker to build hourly baselines"}
                      </p>
                    </div>
                  ) : (
                    sortedBaselines.map((baseline) => (
                      <BaselineCard
                        key={baseline.airportIcao}
                        baseline={baseline}
                        currentPressure={pressureMap.get(baseline.airportIcao)}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* ── Risk Assessment Tab ──────────────────────────────────── */}
            <TabsContent value="risk" className="flex-1 min-h-0 mt-3">
              <RiskAssessmentTab
                riskyFlights={riskyFlights ?? []}
                airports={sortedPressure.filter(a => a.pressureScore > 30).map(a => ({
                  icao: a.airportIcao,
                  name: a.airportName,
                  pressureScore: a.pressureScore,
                  baselineDeviation: (() => {
                    const b = baselines.find(bl => bl.airportIcao === a.airportIcao);
                    if (!b || b.stddevArrivals <= 0) return null;
                    return (a.components.inboundCount - b.avgArrivals) / b.stddevArrivals;
                  })(),
                  holdingCount: a.components.holdingCount,
                  goAroundCount: a.components.goAroundCount,
                  activeEventCount: events.filter(e => e.airportIcao === a.airportIcao).length,
                }))}
                corridors={corridors.map(c => {
                  const pred = predMap.get(c.corridorId);
                  return {
                    name: c.corridorName,
                    health: c.healthScore,
                    status: c.status,
                    trend: pred?.trend ?? 0,
                    trendLabel: pred?.trendLabel ?? "stable",
                    flights: c.flightCount,
                  };
                })}
              />
            </TabsContent>

            {/* ── Flights Board Tab ──────────────────────────────────── */}
            <TabsContent value="flights" className="flex-1 min-h-0 mt-3">
              <FlightBoardTab airports={pressureScores} />
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </>
  );
}
