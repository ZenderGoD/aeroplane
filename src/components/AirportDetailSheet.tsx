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
import { useSingleAirportPressure } from "@/hooks/useAirportPressure";
import { useBaselines } from "@/hooks/useBaselines";
import { useEvents } from "@/hooks/useEvents";
import { useTurnarounds } from "@/hooks/useTurnarounds";
import { useCorridorHealth } from "@/hooks/useCorridorHealth";
import { getAirportByIcao } from "@/lib/airports";
import { CORRIDORS } from "@/lib/corridors";
import { haversineNm } from "@/lib/geo";
import { getFrequenciesByIcao } from "@/data/atcFrequencies";
import { getApproachesByIcao } from "@/data/approaches";
import type { FlightState } from "@/types/flight";
import type { FlightEvent } from "@/types/events";
import type { AirportBaseline } from "@/types/baseline";

// ── Helpers ─────────────────────────────────────────────────────────────

function getPressureColor(score: number): string {
  if (score >= 80) return "#e2e8f0";
  if (score >= 60) return "#94a3b8";
  if (score >= 40) return "#94a3b8";
  if (score >= 20) return "#cbd5e1";
  return "#6b7280";
}

function getPressureLabel(score: number): string {
  if (score >= 80) return "Critical";
  if (score >= 60) return "High";
  if (score >= 40) return "Moderate";
  if (score >= 20) return "Normal";
  return "Low";
}

function getStatusColor(status: string): string {
  switch (status) {
    case "disrupted": return "#e2e8f0";
    case "congested": return "#94a3b8";
    case "compressed": return "#94a3b8";
    default: return "#cbd5e1";
  }
}

const SEVERITY_CONFIG: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  critical: { bg: "bg-neutral-950/30", border: "border-slate-500/20", text: "text-slate-300", icon: "text-slate-400" },
  warning: { bg: "bg-neutral-950/20", border: "border-slate-500/20", text: "text-slate-300", icon: "text-slate-400" },
  info: { bg: "bg-neutral-950/20", border: "border-slate-500/20", text: "text-slate-300", icon: "text-slate-400" },
};

// ── Component ───────────────────────────────────────────────────────────

interface AirportDetailSheetProps {
  airportIcao: string | null;
  onClose: () => void;
  allFlights: FlightState[];
  onSelectCorridor?: (corridorId: string) => void;
}

export default function AirportDetailSheet({
  airportIcao,
  onClose,
  allFlights,
  onSelectCorridor,
}: AirportDetailSheetProps) {
  const airport = airportIcao ? getAirportByIcao(airportIcao) : null;
  const { pressure } = useSingleAirportPressure(airportIcao);
  const { baselines } = useBaselines();
  const { events } = useEvents();
  const { active: turnaroundsActive } = useTurnarounds();
  const { corridors: corridorHealthData } = useCorridorHealth();

  const currentBaseline = useMemo<AirportBaseline | null>(() => {
    if (!airportIcao || !baselines.length) return null;
    const now = new Date();
    const hourOfWeek = now.getUTCDay() * 24 + now.getUTCHours();
    return baselines.find((b) => b.airportIcao === airportIcao && b.hourOfWeek === hourOfWeek) ?? null;
  }, [airportIcao, baselines]);

  const airportEvents = useMemo<FlightEvent[]>(() => {
    if (!airportIcao) return [];
    return events.filter((e) => e.airportIcao === airportIcao).slice(0, 10);
  }, [airportIcao, events]);

  const airportTurnarounds = useMemo(() => {
    if (!airportIcao) return [];
    return turnaroundsActive.filter((t) => t.airport_icao === airportIcao);
  }, [airportIcao, turnaroundsActive]);

  const connectedCorridors = useMemo(() => {
    if (!airportIcao) return [];
    return CORRIDORS.filter((c) => c.originIcao === airportIcao || c.destinationIcao === airportIcao);
  }, [airportIcao]);

  const corridorHealthMap = useMemo(() => {
    const m = new Map<string, (typeof corridorHealthData)[0]>();
    if (Array.isArray(corridorHealthData)) {
      for (const h of corridorHealthData) m.set(h.corridorId, h);
    }
    return m;
  }, [corridorHealthData]);

  const freqData = useMemo(() => {
    if (!airportIcao) return null;
    return getFrequenciesByIcao(airportIcao);
  }, [airportIcao]);

  const approachData = useMemo(() => {
    if (!airportIcao) return null;
    return getApproachesByIcao(airportIcao);
  }, [airportIcao]);

  const nearbyFlights = useMemo(() => {
    if (!airport) return [];
    return allFlights
      .filter((f) => {
        if (f.latitude === null || f.longitude === null) return false;
        return haversineNm(f.latitude, f.longitude, airport.lat, airport.lon) < 30;
      })
      .slice(0, 20);
  }, [airport, allFlights]);

  return (
    <Sheet open={!!airportIcao} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="!z-[1500] w-[420px] sm:max-w-[420px] backdrop-blur-xl p-0 flex flex-col"
        style={{ background: "var(--surface-1)", borderColor: "var(--border-default)" }}
      >
        <SheetHeader className="px-5 pt-5 pb-0">
          <SheetTitle className="flex items-center gap-2.5" style={{ color: "var(--text-primary)" }}>
            <div className="w-8 h-8 rounded-lg bg-slate-500/10 border border-slate-500/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            {airport?.name ?? airportIcao}
          </SheetTitle>
          <SheetDescription className="flex items-center gap-3" style={{ color: "var(--text-muted)" }}>
            <span className="font-mono text-xs border px-2 py-0.5 rounded-md" style={{ background: "var(--surface-3)", borderColor: "var(--border-subtle)" }}>
              {airportIcao}
            </span>
            {airport && (
              <>
                <span>{airport.city}, {airport.country}</span>
                <span className="text-xs tabular-nums" style={{ color: "var(--text-faint)" }}>
                  {airport.lat.toFixed(3)}°, {airport.lon.toFixed(3)}°
                </span>
              </>
            )}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-5 pb-5">
          <div className="space-y-4 pt-4">
            {/* ── Pressure Gauge ──────────────────────── */}
            {pressure ? (
              <PressureSection pressure={pressure} baseline={currentBaseline} />
            ) : (
              <div className="text-center text-xs py-4" style={{ color: "var(--text-muted)" }}>No pressure data available</div>
            )}

            <div className="divider-glow" />

            {/* ── Active Events ───────────────────────── */}
            <Section title="Active Events" count={airportEvents.length}>
              {airportEvents.length === 0 ? (
                <EmptyState text="No active events" />
              ) : (
                <div className="space-y-2">
                  {airportEvents.map((evt, i) => {
                    const sev = SEVERITY_CONFIG[evt.severity] ?? SEVERITY_CONFIG.info;
                    return (
                      <div key={i} className={`rounded-xl border px-3.5 py-2.5 ${sev.bg} ${sev.border} animate-slide-up`}>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold uppercase ${sev.text}`}>{evt.severity}</span>
                          <span className="text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>
                            {new Date(evt.detectedAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-secondary)" }}>{evt.message}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>

            <div className="divider-glow" />

            {/* ── ATC Frequencies ─────────────────────── */}
            {freqData && (
              <>
                <Section title="ATC Frequencies" count={freqData.frequencies.length}>
                  <div className="space-y-1">
                    {freqData.frequencies.map((f, i) => {
                      const typeColors: Record<string, string> = {
                        ATIS: "#94a3b8", GND: "#cbd5e1", TWR: "#94a3b8",
                        DEP: "#94a3b8", APP: "#94a3b8", CTR: "#e2e8f0", UNICOM: "#94a3b8",
                      };
                      const color = typeColors[f.type] || "#94a3b8";
                      return (
                        <div key={`${f.type}-${i}`} className="flex items-center justify-between rounded-lg px-3 py-1.5" style={{ background: "var(--surface-2)" }}>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${color}18`, border: `1px solid ${color}30`, color }}>{f.type}</span>
                            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{f.name}</span>
                          </div>
                          <span className="font-mono text-xs font-bold tabular-nums" style={{ color }}>{f.frequency}</span>
                        </div>
                      );
                    })}
                  </div>
                </Section>
                <div className="divider-glow" />
              </>
            )}

            {/* ── Approach Procedures ─────────────────── */}
            {approachData && (
              <>
                <Section title="Approaches" count={approachData.approaches.length}>
                  <div className="space-y-1">
                    {approachData.approaches.map((app) => {
                      const typeColors: Record<string, string> = {
                        ILS: "#cbd5e1", RNAV: "#94a3b8", VOR: "#94a3b8",
                        NDB: "#94a3b8", VISUAL: "#94a3b8", LOC: "#94a3b8",
                      };
                      const color = typeColors[app.type] || "#94a3b8";
                      return (
                        <div key={app.name} className="rounded-lg px-3 py-2" style={{ background: "var(--surface-2)" }}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${color}18`, border: `1px solid ${color}30`, color }}>{app.type}</span>
                              <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{app.name}</span>
                            </div>
                            <span className="text-xs font-mono tabular-nums" style={{ color: "var(--text-muted)" }}>{app.course.toString().padStart(3, "0")}{"\u00B0"}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>
                            <span>DH {app.minimums.dh}ft</span>
                            <span>VIS {app.minimums.visibility}SM</span>
                            {app.glideslope !== undefined && <span>GS {app.glideslope.toFixed(1)}{"\u00B0"}</span>}
                            {app.frequency && <span className="font-mono" style={{ color }}>{app.frequency}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Section>
                <div className="divider-glow" />
              </>
            )}

            {/* ── Turnarounds ─────────────────────────── */}
            <Section title="Aircraft on Ground" count={airportTurnarounds.length}>
              {airportTurnarounds.length === 0 ? (
                <EmptyState text="No aircraft on ground" />
              ) : (
                <div className="space-y-1.5">
                  {airportTurnarounds.map((t) => {
                    const elapsed = Math.round((Date.now() - new Date(t.arrival_time).getTime()) / 60000);
                    const timeColor = elapsed > 120 ? "text-slate-400" : elapsed > 60 ? "text-slate-400" : elapsed > 30 ? "text-slate-400" : "text-slate-400";
                    return (
                      <div key={t.icao24} className="flex items-center justify-between rounded-xl px-3.5 py-2.5 transition-all" style={{ background: "var(--surface-2)" }}>
                        <div>
                          <span className="text-xs font-mono" style={{ color: "var(--text-primary)" }}>{t.callsign || t.icao24}</span>
                          {t.airline_icao && <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>{t.airline_icao}</span>}
                        </div>
                        <span className={`text-xs font-bold tabular-nums ${timeColor}`}>
                          {elapsed}m
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>

            <div className="divider-glow" />

            {/* ── Connected Corridors ─────────────────── */}
            <Section title="Connected Corridors" count={connectedCorridors.length}>
              {connectedCorridors.length === 0 ? (
                <EmptyState text="No corridors connected" />
              ) : (
                <div className="space-y-1.5">
                  {connectedCorridors.map((c) => {
                    const health = corridorHealthMap.get(c.id);
                    const other = c.originIcao === airportIcao ? c.destinationIcao : c.originIcao;
                    return (
                      <button
                        key={c.id}
                        onClick={() => onSelectCorridor?.(c.id)}
                        className="w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 transition-all text-left group"
                        style={{ background: "var(--surface-2)" }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs transition-colors" style={{ color: "var(--text-secondary)" }}>{c.name}</span>
                          <span className="text-xs font-mono" style={{ color: "var(--text-faint)" }}>→ {other}</span>
                        </div>
                        {health && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold tabular-nums" style={{ color: getStatusColor(health.status) }}>
                              {health.healthScore}
                            </span>
                            <span
                              className="text-[11px] uppercase px-2 py-0.5 rounded-full font-bold"
                              style={{
                                color: getStatusColor(health.status),
                                background: getStatusColor(health.status) + "15",
                                border: `1px solid ${getStatusColor(health.status)}30`,
                              }}
                            >
                              {health.status}
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </Section>

            <div className="divider-glow" />

            {/* ── Nearby Flights ──────────────────────── */}
            <Section title="Nearby Flights" count={nearbyFlights.length}>
              {nearbyFlights.length === 0 ? (
                <EmptyState text="No flights within 30 NM" />
              ) : (
                <div className="space-y-1">
                  {nearbyFlights.map((f) => {
                    const dist = airport ? haversineNm(f.latitude!, f.longitude!, airport.lat, airport.lon) : 0;
                    const alt = f.baroAltitude ? Math.round(f.baroAltitude * 3.28084) : null;
                    return (
                      <div key={f.icao24} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: "var(--surface-2)" }}>
                        <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>{f.callsign?.trim() || f.icao24}</span>
                        <div className="flex items-center gap-3 text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>
                          {alt !== null && <span>{alt.toLocaleString()} ft</span>}
                          <span>{dist.toFixed(1)} NM</span>
                          <span className={f.onGround ? "text-slate-400 font-bold" : "text-slate-400 font-bold"}>
                            {f.onGround ? "GND" : "AIR"}
                          </span>
                        </div>
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

function PressureSection({
  pressure,
  baseline,
}: {
  pressure: NonNullable<ReturnType<typeof useSingleAirportPressure>["pressure"]>;
  baseline: AirportBaseline | null;
}) {
  const score = pressure.pressureScore;
  const color = getPressureColor(score);
  const label = getPressureLabel(score);
  const c = pressure.components;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        {/* Score ring with glow */}
        <div className="relative w-18 h-18">
          <div className="absolute inset-0 rounded-full" style={{ boxShadow: `0 0 24px ${color}20` }} />
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90" style={{ width: 72, height: 72 }}>
            <circle cx="18" cy="18" r="15.9155" fill="none" stroke="rgba(28,28,28,0.6)" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="15.9155"
              fill="none" stroke={color} strokeWidth="3"
              strokeDasharray={`${score} ${100 - score}`}
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 6px ${color}50)` }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold tabular-nums" style={{ color }}>{score}</span>
          </div>
        </div>
        <div>
          <div className="text-sm font-bold" style={{ color }}>{label} Pressure</div>
          <div className="text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>
            Updated {new Date(pressure.updatedAt).toLocaleTimeString()}
          </div>
          {pressure.baselineDeviation !== null && (
            <div className={`text-xs font-semibold mt-0.5 ${
              pressure.baselineDeviation > 20 ? "text-slate-400" : pressure.baselineDeviation > 0 ? "text-slate-400" : "text-slate-400"
            }`}>
              {pressure.baselineDeviation > 0 ? "+" : ""}{Math.round(pressure.baselineDeviation)}% vs baseline
            </div>
          )}
        </div>
      </div>

      {/* Component breakdown */}
      <div className="grid grid-cols-5 gap-1.5">
        {[
          { label: "Inbound", value: c.inboundCount, icon: "↓" },
          { label: "Outbound", value: c.outboundCount, icon: "↑" },
          { label: "Ground", value: c.groundCount, icon: "⬤" },
          { label: "Holding", value: c.holdingCount, icon: "↻" },
          { label: "Go-Around", value: c.goAroundCount, icon: "⤴" },
        ].map((item) => (
          <div key={item.label} className="rounded-xl px-2 py-2 text-center" style={{ background: "var(--surface-2)" }}>
            <div className="text-xs" style={{ color: "var(--text-faint)" }}>{item.icon}</div>
            <div className="text-sm font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>{item.value}</div>
            <div className="text-[8px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Baseline comparison */}
      {baseline && baseline.sampleCount > 3 && (
        <div className="rounded-xl p-3.5" style={{ background: "var(--surface-2)" }}>
          <div className="text-xs font-bold uppercase tracking-wider mb-2.5" style={{ color: "var(--text-muted)" }}>
            Baseline Comparison
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <BaselineBar label="Arrivals" current={c.inboundCount} avg={baseline.avgArrivals} stddev={baseline.stddevArrivals} />
            <BaselineBar label="Departures" current={c.outboundCount} avg={baseline.avgDepartures} stddev={baseline.stddevDepartures} />
          </div>
        </div>
      )}
    </div>
  );
}

function BaselineBar({ label, current, avg, stddev }: { label: string; current: number; avg: number; stddev: number }) {
  const deviation = avg > 0 ? ((current - avg) / avg) * 100 : 0;
  const isAboveNormal = current > avg + stddev;
  const isBelowNormal = current < avg - stddev;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span style={{ color: "var(--text-tertiary)" }}>{label}</span>
        <span className={`font-bold tabular-nums ${isAboveNormal ? "text-slate-400" : isBelowNormal ? "text-slate-400" : "text-slate-400"}`}>
          {current}
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
        <span>avg {avg.toFixed(1)}</span>
        <span>({deviation > 0 ? "+" : ""}{deviation.toFixed(0)}%)</span>
      </div>
    </div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{title}</span>
        {count > 0 && (
          <span className="text-xs font-bold border px-2 py-0.5 rounded-full tabular-nums" style={{ color: "var(--text-muted)", background: "var(--surface-3)", borderColor: "var(--border-subtle)" }}>
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
