"use client";

import { useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCorridorHealth } from "@/hooks/useCorridorHealth";
import { useCorridorPredictability } from "@/hooks/useCorridorPredictability";
import { useSingleAirportPressure } from "@/hooks/useAirportPressure";
import { useEvents } from "@/hooks/useEvents";
import { CORRIDOR_MAP } from "@/lib/corridors";
import { isFlightInCorridor } from "@/lib/corridors";
import { haversineNm } from "@/lib/geo";
import type { FlightState } from "@/types/flight";
import type { CorridorHealth, CorridorPredictability } from "@/types/corridor";
import type { FlightEvent } from "@/types/events";

// ── Helpers ─────────────────────────────────────────────────────────────

function getStatusColor(status: string): string {
  switch (status) {
    case "disrupted": return "#e2e8f0";
    case "congested": return "#94a3b8";
    case "compressed": return "#94a3b8";
    default: return "#cbd5e1";
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "disrupted": return "Disrupted";
    case "congested": return "Congested";
    case "compressed": return "Compressed";
    default: return "Normal";
  }
}

function getPressureColor(score: number): string {
  if (score >= 80) return "#e2e8f0";
  if (score >= 60) return "#94a3b8";
  if (score >= 40) return "#94a3b8";
  if (score >= 20) return "#cbd5e1";
  return "#6b7280";
}

function getTrendColor(label: string): string {
  switch (label) {
    case "improving": return "#cbd5e1";
    case "degrading": return "#e2e8f0";
    default: return "#94a3b8";
  }
}

function getTrendIcon(label: string): string {
  switch (label) {
    case "improving": return "↑";
    case "degrading": return "↓";
    default: return "→";
  }
}

const SEVERITY_CONFIG: Record<string, { bg: string; border: string; text: string }> = {
  critical: { bg: "bg-slate-950/30", border: "border-slate-500/20", text: "text-slate-300" },
  warning: { bg: "bg-slate-950/20", border: "border-slate-500/20", text: "text-slate-300" },
  info: { bg: "bg-slate-950/20", border: "border-slate-500/20", text: "text-slate-300" },
};

// ── Component ───────────────────────────────────────────────────────────

interface CorridorDetailSheetProps {
  corridorId: string | null;
  onClose: () => void;
  allFlights: FlightState[];
  onSelectAirport?: (icao: string) => void;
  onSelectFlight?: (flight: FlightState | null) => void;
}

export default function CorridorDetailSheet({
  corridorId,
  onClose,
  allFlights,
  onSelectAirport,
  onSelectFlight,
}: CorridorDetailSheetProps) {
  const corridor = corridorId ? CORRIDOR_MAP.get(corridorId) ?? null : null;
  const { corridors: healthData } = useCorridorHealth();
  const { predictabilities } = useCorridorPredictability();
  const { events } = useEvents();

  const { pressure: originPressure } = useSingleAirportPressure(corridor?.originIcao ?? null);
  const { pressure: destPressure } = useSingleAirportPressure(corridor?.destinationIcao ?? null);

  const health = useMemo<CorridorHealth | null>(() => {
    if (!corridorId) return null;
    return healthData.find((h) => h.corridorId === corridorId) ?? null;
  }, [corridorId, healthData]);

  const pred = useMemo<CorridorPredictability | null>(() => {
    if (!corridorId) return null;
    return predictabilities.find((p) => p.corridorId === corridorId) ?? null;
  }, [corridorId, predictabilities]);

  const corridorFlights = useMemo(() => {
    if (!corridor) return [];
    return allFlights
      .filter((f) => {
        if (f.latitude === null || f.longitude === null || f.onGround) return false;
        return isFlightInCorridor(f.latitude, f.longitude, corridor);
      })
      .slice(0, 30);
  }, [corridor, allFlights]);

  const routeDistNm = useMemo(() => {
    if (!corridor) return 0;
    return haversineNm(corridor.originLat, corridor.originLon, corridor.destLat, corridor.destLon);
  }, [corridor]);

  const corridorEvents = useMemo<FlightEvent[]>(() => {
    if (!corridor) return [];
    return events
      .filter((e) => e.corridorId === corridorId || e.airportIcao === corridor.originIcao || e.airportIcao === corridor.destinationIcao)
      .slice(0, 10);
  }, [corridor, corridorId, events]);

  return (
    <Sheet open={!!corridorId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="!z-[1500] w-[420px] sm:max-w-[420px] backdrop-blur-xl p-0 flex flex-col"
        style={{ background: "var(--surface-1)", borderColor: "var(--border-default)" }}
      >
        <SheetHeader className="px-5 pt-5 pb-0">
          <SheetTitle className="flex items-center gap-2.5" style={{ color: "var(--text-primary)" }}>
            <div className="w-8 h-8 rounded-lg bg-slate-500/10 border border-slate-500/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            {corridor?.name ?? corridorId}
          </SheetTitle>
          <SheetDescription className="flex items-center gap-3" style={{ color: "var(--text-muted)" }}>
            <span className="font-mono text-xs border px-2 py-0.5 rounded-md" style={{ background: "var(--surface-3)", borderColor: "var(--border-subtle)" }}>
              {corridor?.originIcao} → {corridor?.destinationIcao}
            </span>
            <span className="text-[10px] tabular-nums">{Math.round(routeDistNm)} NM</span>
            <span className="text-[10px]">Buffer: {corridor?.bufferNm} NM</span>
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-5 pb-5">
          <div className="space-y-4 pt-4">
            {/* ── Health Gauge ────────────────────────── */}
            {health ? (
              <HealthSection health={health} pred={pred} />
            ) : (
              <div className="text-center text-xs py-4" style={{ color: "var(--text-muted)" }}>No health data available</div>
            )}

            <div className="divider-glow" />

            {/* ── Predictability ──────────────────────── */}
            {pred && <PredictabilitySection pred={pred} health={health} />}
            {pred && <div className="divider-glow" />}

            {/* ── Flights in Corridor ─────────────────── */}
            <Section title="Flights in Corridor" count={corridorFlights.length}>
              {corridorFlights.length === 0 ? (
                <EmptyState text="No flights in corridor" />
              ) : (
                <div className="space-y-1">
                  {corridorFlights.map((f) => {
                    const alt = f.baroAltitude ? Math.round(f.baroAltitude * 3.28084) : null;
                    const spd = f.velocity ? Math.round(f.velocity * 1.94384) : null;
                    return (
                      <button
                        key={f.icao24}
                        onClick={() => onSelectFlight?.(f)}
                        className="w-full flex items-center justify-between rounded-lg px-3 py-2 transition-all text-left group"
                        style={{ background: "var(--surface-2)" }}
                      >
                        <span className="text-xs font-mono transition-colors" style={{ color: "var(--text-secondary)" }}>
                          {f.callsign?.trim() || f.icao24}
                        </span>
                        <div className="flex items-center gap-3 text-[10px] tabular-nums" style={{ color: "var(--text-muted)" }}>
                          {alt !== null && <span>{alt.toLocaleString()} ft</span>}
                          {spd !== null && <span>{spd} kts</span>}
                          {f.trueTrack !== null && <span>{Math.round(f.trueTrack)}°</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </Section>

            <div className="divider-glow" />

            {/* ── Endpoint Airports ───────────────────── */}
            <Section title="Endpoint Airports" count={2}>
              <div className="space-y-2">
                <AirportMiniCard
                  icao={corridor?.originIcao ?? ""}
                  label="Origin"
                  pressureScore={originPressure?.pressureScore ?? null}
                  onClick={() => corridor && onSelectAirport?.(corridor.originIcao)}
                />
                <AirportMiniCard
                  icao={corridor?.destinationIcao ?? ""}
                  label="Destination"
                  pressureScore={destPressure?.pressureScore ?? null}
                  onClick={() => corridor && onSelectAirport?.(corridor.destinationIcao)}
                />
              </div>
            </Section>

            <div className="divider-glow" />

            {/* ── Events ──────────────────────────────── */}
            <Section title="Related Events" count={corridorEvents.length}>
              {corridorEvents.length === 0 ? (
                <EmptyState text="No related events" />
              ) : (
                <div className="space-y-2">
                  {corridorEvents.map((evt, i) => {
                    const sev = SEVERITY_CONFIG[evt.severity] ?? SEVERITY_CONFIG.info;
                    return (
                      <div key={i} className={`rounded-xl border px-3.5 py-2.5 ${sev.bg} ${sev.border} animate-slide-up`}>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold uppercase ${sev.text}`}>{evt.severity}</span>
                          {evt.airportIcao && (
                            <span className="text-[10px] font-mono border px-1.5 py-0.5 rounded-md" style={{ color: "var(--text-tertiary)", background: "var(--surface-3)", borderColor: "var(--border-subtle)" }}>
                              {evt.airportIcao}
                            </span>
                          )}
                        </div>
                        <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-secondary)" }}>{evt.message}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────

function HealthSection({ health, pred }: { health: CorridorHealth; pred: CorridorPredictability | null }) {
  const color = getStatusColor(health.status);
  const label = getStatusLabel(health.status);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        {/* Score ring with glow */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full" style={{ boxShadow: `0 0 24px ${color}20` }} />
          <svg viewBox="0 0 36 36" className="-rotate-90" style={{ width: 72, height: 72 }}>
            <circle cx="18" cy="18" r="15.9155" fill="none" stroke="rgba(30,41,59,0.6)" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="15.9155"
              fill="none" stroke={color} strokeWidth="3"
              strokeDasharray={`${health.healthScore} ${100 - health.healthScore}`}
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 6px ${color}50)` }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold tabular-nums" style={{ color }}>{health.healthScore}</span>
          </div>
        </div>
        <div>
          <div className="text-sm font-bold" style={{ color }}>{label}</div>
          <div className="text-[10px] tabular-nums" style={{ color: "var(--text-muted)" }}>
            Updated {new Date(health.updatedAt).toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: "Flights", value: String(health.flightCount) },
          { label: "Spacing", value: health.avgSpacingNm ? `${Math.round(health.avgSpacingNm)} NM` : "—" },
          { label: "Avg Alt", value: health.avgAltitude ? `${Math.round(health.avgAltitude * 3.28084).toLocaleString()} ft` : "—" },
          { label: "Anomalies", value: String(health.anomalyCount), highlight: health.anomalyCount > 0 },
        ].map((item) => (
          <div key={item.label} className="rounded-xl px-2 py-2 text-center" style={{ background: "var(--surface-2)" }}>
            <div className={`text-sm font-bold tabular-nums ${"highlight" in item && item.highlight ? "text-slate-400" : ""}`} style={!("highlight" in item && item.highlight) ? { color: "var(--text-primary)" } : undefined}>
              {item.value}
            </div>
            <div className="text-[8px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PredictabilitySection({ pred, health }: { pred: CorridorPredictability; health: CorridorHealth | null }) {
  const trendColor = getTrendColor(pred.trendLabel);

  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider mb-2.5" style={{ color: "var(--text-muted)" }}>
        Predictability
      </div>
      <div className="flex items-center gap-4 mb-3">
        <div className="text-2xl font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
          {pred.predictabilityScore}
          <span className="text-xs ml-1" style={{ color: "var(--text-muted)" }}>/100</span>
        </div>
        <div className="flex items-center gap-1 text-sm font-semibold" style={{ color: trendColor }}>
          {getTrendIcon(pred.trendLabel)} {pred.trendLabel}
        </div>
        <div className="text-[10px] tabular-nums" style={{ color: "var(--text-faint)" }}>
          σ {pred.healthStdDev} · {pred.sampleCount} samples
        </div>
      </div>

      {/* Sparkline */}
      {pred.recentScores.length > 2 && (
        <div className="rounded-xl p-3.5" style={{ background: "var(--surface-2)" }}>
          <SparklineSvg data={pred.recentScores} color={getStatusColor(health?.status ?? "normal")} height={40} />
        </div>
      )}
    </div>
  );
}

function SparklineSvg({ data, color, height = 40 }: { data: number[]; color: string; height?: number }) {
  const width = 280;
  const max = Math.max(...data, 100);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`).join(" ");
  const fillPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {/* Gradient fill under the line */}
      <defs>
        <linearGradient id={`sparkFill-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillPoints} fill={`url(#sparkFill-${color.replace('#','')})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" style={{ filter: `drop-shadow(0 0 4px ${color}40)` }} />
    </svg>
  );
}

function AirportMiniCard({ icao, label, pressureScore, onClick }: { icao: string; label: string; pressureScore: number | null; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between rounded-xl px-3.5 py-3 transition-all text-left group"
      style={{ background: "var(--surface-2)" }}
    >
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-slate-500/10 border border-slate-500/20 flex items-center justify-center">
          <span className="text-[9px] font-bold text-slate-400">{label === "Origin" ? "ORG" : "DST"}</span>
        </div>
        <div>
          <span className="text-xs font-mono transition-colors" style={{ color: "var(--text-primary)" }}>{icao}</span>
          <span className="text-[10px] ml-2" style={{ color: "var(--text-muted)" }}>{label}</span>
        </div>
      </div>
      {pressureScore !== null && (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getPressureColor(pressureScore), boxShadow: `0 0 6px ${getPressureColor(pressureScore)}40` }} />
          <span className="text-xs font-bold tabular-nums" style={{ color: getPressureColor(pressureScore) }}>
            {pressureScore}
          </span>
        </div>
      )}
    </button>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{title}</span>
        {count > 0 && (
          <span className="text-[10px] font-bold border px-2 py-0.5 rounded-full tabular-nums" style={{ color: "var(--text-muted)", background: "var(--surface-3)", borderColor: "var(--border-subtle)" }}>
            {count}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="text-center text-xs py-4" style={{ color: "var(--text-faint)" }}>{text}</div>;
}
