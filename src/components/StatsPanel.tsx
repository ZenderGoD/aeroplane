"use client";

import { useState, useMemo } from "react";
import type { FlightState } from "@/types/flight";
import { getAirlineName } from "@/lib/airlines";
import { getCategoryColor, getCategoryLabel } from "@/components/CanvasPlaneLayer";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// ── helpers ────────────────────────────────────────────────────────────

/** metres -> feet */
const mToFt = (m: number) => m * 3.28084;

/** m/s -> knots */
const msToKts = (ms: number) => ms * 1.94384;

function pct(value: number, max: number) {
  if (max === 0) return 0;
  return Math.min((value / max) * 100, 100);
}

function formatNumber(n: number) {
  return n.toLocaleString();
}

// ── bar-chart building blocks ──────────────────────────────────────────

interface BarItem {
  label: string;
  value: number;
  color: string;
}

function HorizontalBar({
  item,
  maxValue,
  index,
}: {
  item: BarItem;
  maxValue: number;
  index: number;
}) {
  const width = pct(item.value, maxValue);
  return (
    <div
      className="group flex items-center gap-2"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <span className="w-24 shrink-0 truncate text-xs text-right" style={{ color: "var(--text-tertiary)" }}>
        {item.label}
      </span>
      <div className="relative flex-1 h-5 rounded overflow-hidden" style={{ background: "var(--surface-3)" }}>
        <div
          className="absolute inset-y-0 left-0 rounded transition-all duration-700 ease-out"
          style={{
            width: `${width}%`,
            backgroundColor: item.color,
            opacity: 0.85,
          }}
        />
        <div
          className="absolute inset-y-0 left-0 rounded transition-all duration-700 ease-out"
          style={{
            width: `${width}%`,
            background: `linear-gradient(90deg, ${item.color}00, ${item.color}40)`,
          }}
        />
      </div>
      <span className="w-12 shrink-0 text-xs tabular-nums text-right font-medium" style={{ color: "var(--text-secondary)" }}>
        {formatNumber(item.value)}
      </span>
    </div>
  );
}

function BarChart({ title, items }: { title: string; items: BarItem[] }) {
  const maxValue = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
        {title}
      </h4>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <HorizontalBar key={item.label} item={item} maxValue={maxValue} index={i} />
        ))}
      </div>
    </div>
  );
}

// ── stat card ──────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon,
  color = "text-slate-300",
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color?: string;
}) {
  return (
    <Card className="ring-0" style={{ background: "var(--surface-2)", borderColor: "var(--border-default)" }}>
      <CardContent className="flex items-center gap-3 py-3 px-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${color}`}
          style={{ background: "var(--surface-3)" }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold leading-tight tabular-nums" style={{ color: "var(--text-primary)" }}>
            {typeof value === "number" ? formatNumber(value) : value}
          </p>
          <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{label}</p>
          {sub && (
            <p className="text-xs truncate" style={{ color: "var(--text-faint)" }}>{sub}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── icons (inline SVGs) ────────────────────────────────────────────────

const PlaneIcon = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 19l-7-7 3-3 4 4V3h0l4 10 3-3-7 7z"
    />
  </svg>
);

const AltitudeIcon = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M7 16V4m0 0L3 8m4-4l4 4m6 8V4m0 0l-4 4m4-4l4 4"
    />
  </svg>
);

const SpeedIcon = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13 10V3L4 14h7v7l9-11h-7z"
    />
  </svg>
);

const GlobeIcon = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

// Bar-chart icon for the trigger button
const BarChartIcon = (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
    />
  </svg>
);

// ── main component ─────────────────────────────────────────────────────

interface Props {
  flights: FlightState[];
}

export default function StatsPanel({ flights }: Props) {
  const [open, setOpen] = useState(false);

  // ── compute all statistics ──────────────────────────────────────────
  const stats = useMemo(() => {
    if (!flights) return null;
    const total = flights.length;
    const inAir = flights.filter((f) => !f.onGround).length;
    const onGround = total - inAir;

    // Airlines (first 3 chars of callsign)
    const airlineCounts = new Map<string, number>();
    for (const f of flights) {
      if (!f.callsign) continue;
      const code = f.callsign.trim().substring(0, 3).toUpperCase();
      if (code.length < 2) continue;
      airlineCounts.set(code, (airlineCounts.get(code) ?? 0) + 1);
    }
    const topAirlines = [...airlineCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([code, count]) => ({
        code,
        name: getAirlineName(code) ?? code,
        count,
      }));

    // Origin countries
    const countryCounts = new Map<string, number>();
    for (const f of flights) {
      const country = f.originCountry || "Unknown";
      countryCounts.set(country, (countryCounts.get(country) ?? 0) + 1);
    }
    const topCountries = [...countryCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Category distribution
    const categoryCounts = new Map<number, number>();
    for (const f of flights) {
      const cat = f.category;
      categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
    }
    const categoryDist = [...categoryCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => ({
        category: cat,
        label: getCategoryLabel(cat),
        color: getCategoryColor(cat),
        count,
      }));

    // Avg altitude & speed (only airborne flights with valid data)
    const altitudes = flights
      .filter((f) => !f.onGround && f.baroAltitude != null)
      .map((f) => f.baroAltitude!);
    const speeds = flights
      .filter((f) => !f.onGround && f.velocity != null)
      .map((f) => f.velocity!);

    const avgAltFt =
      altitudes.length > 0
        ? mToFt(altitudes.reduce((s, v) => s + v, 0) / altitudes.length)
        : 0;
    const avgSpdKts =
      speeds.length > 0
        ? msToKts(speeds.reduce((s, v) => s + v, 0) / speeds.length)
        : 0;

    // ── histogram data ────────────────────────────────────────────────
    const altBuckets = [0, 0, 0, 0, 0]; // 0-10k, 10-20k, 20-30k, 30-40k, 40-50k+
    for (const alt of altitudes) {
      const ft = mToFt(alt);
      if (ft < 10000) altBuckets[0]++;
      else if (ft < 20000) altBuckets[1]++;
      else if (ft < 30000) altBuckets[2]++;
      else if (ft < 40000) altBuckets[3]++;
      else altBuckets[4]++;
    }

    const spdBuckets = [0, 0, 0]; // 0-200, 200-400, 400-600+ kts
    for (const spd of speeds) {
      const kts = msToKts(spd);
      if (kts < 200) spdBuckets[0]++;
      else if (kts < 400) spdBuckets[1]++;
      else spdBuckets[2]++;
    }

    return {
      total,
      inAir,
      onGround,
      topAirlines,
      topCountries,
      categoryDist,
      avgAltFt,
      avgSpdKts,
      altBuckets,
      spdBuckets,
    };
  }, [flights]);

  // ── colour palettes for charts ──────────────────────────────────────

  const COUNTRY_COLORS = [
    "var(--text-secondary)", "var(--text-tertiary)", "var(--accent-primary)", "var(--text-tertiary)",
    "var(--text-secondary)", "var(--accent-primary)", "var(--text-tertiary)", "var(--accent-primary)",
    "var(--text-secondary)", "var(--text-tertiary)",
  ];

  const AIRLINE_COLORS = [
    "var(--text-secondary)", "var(--text-tertiary)", "var(--text-tertiary)", "var(--text-tertiary)",
    "var(--text-secondary)", "var(--accent-primary)", "var(--text-tertiary)", "var(--accent-primary)",
    "var(--text-secondary)", "var(--text-tertiary)",
  ];

  const ALT_COLORS = ["var(--text-secondary)", "var(--text-tertiary)", "var(--text-secondary)", "var(--text-tertiary)", "var(--accent-primary)"];
  const SPD_COLORS = ["var(--text-tertiary)", "var(--text-secondary)", "var(--accent-primary)"];

  // ── render ──────────────────────────────────────────────────────────

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all ${
          open
            ? "bg-slate-600 text-white"
            : "hover:bg-gray-800/50"
        }`}
        style={!open ? { color: "var(--text-tertiary)" } : undefined}
      >
        {BarChartIcon}
        Stats
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="left"
        className="!z-[2000] w-[420px] sm:max-w-[420px] p-0 flex flex-col"
        style={{ background: "var(--surface-1)", borderColor: "var(--border-default)" }}
        showCloseButton={true}
      >
        <SheetHeader className="px-5 pt-5 pb-0">
          <SheetTitle className="flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <svg
              className="w-5 h-5 text-slate-400"
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
            Live Statistics
          </SheetTitle>
          <SheetDescription className="" style={{ color: "var(--text-muted)" }}>
            Real-time flight data analysis
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0 px-5 pt-3">
          <TabsList className="border w-full" style={{ background: "var(--surface-2)", borderColor: "var(--border-default)" }}>
            <TabsTrigger
              value="overview"
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
                  d="M4 6h16M4 10h16M4 14h16M4 18h16"
                />
              </svg>
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="charts"
              className="flex-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              {BarChartIcon}
              Charts
            </TabsTrigger>
          </TabsList>

          {/* ── Overview Tab ──────────────────────────────────────────── */}
          <TabsContent value="overview" className="flex-1 min-h-0 mt-3">
            <ScrollArea className="h-[calc(100vh-180px)]">
              {!stats ? <div className="text-zinc-500 text-sm p-4">Loading stats...</div> : <div className="space-y-5 pb-6 pr-2">
                {/* Summary cards */}
                <div className="grid grid-cols-2 gap-2.5">
                  <StatCard
                    label="Total Flights"
                    value={stats.total}
                    icon={PlaneIcon}
                    color="text-slate-300"
                  />
                  <StatCard
                    label="In Air"
                    value={stats.inAir}
                    sub={`${stats.total > 0 ? ((stats.inAir / stats.total) * 100).toFixed(1) : 0}%`}
                    icon={
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 10l7-7m0 0l7 7m-7-7v18"
                        />
                      </svg>
                    }
                    color="text-slate-300"
                  />
                  <StatCard
                    label="On Ground"
                    value={stats.onGround}
                    sub={`${stats.total > 0 ? ((stats.onGround / stats.total) * 100).toFixed(1) : 0}%`}
                    icon={
                      <svg
                        className="w-4 h-4"
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
                    }
                    color="text-slate-400"
                  />
                  <StatCard
                    label="Countries"
                    value={stats.topCountries.length}
                    sub="origins tracked"
                    icon={GlobeIcon}
                    color="text-slate-400"
                  />
                </div>

                {/* Avg altitude & speed */}
                <div className="grid grid-cols-2 gap-2.5">
                  <StatCard
                    label="Avg Altitude"
                    value={`${Math.round(stats.avgAltFt).toLocaleString()} ft`}
                    icon={AltitudeIcon}
                    color="text-slate-300"
                  />
                  <StatCard
                    label="Avg Speed"
                    value={`${Math.round(stats.avgSpdKts)} kts`}
                    icon={SpeedIcon}
                    color="text-slate-400"
                  />
                </div>

                <Separator style={{ background: "var(--border-default)" }} />

                {/* Top airlines */}
                <BarChart
                  title="Top Airlines"
                  items={stats.topAirlines.map((a, i) => ({
                    label: a.name,
                    value: a.count,
                    color: AIRLINE_COLORS[i % AIRLINE_COLORS.length],
                  }))}
                />

                <Separator style={{ background: "var(--border-default)" }} />

                {/* Top countries */}
                <BarChart
                  title="Top Origin Countries"
                  items={stats.topCountries.map(([country, count], i) => ({
                    label: country,
                    value: count,
                    color: COUNTRY_COLORS[i % COUNTRY_COLORS.length],
                  }))}
                />

                <Separator style={{ background: "var(--border-default)" }} />

                {/* Category distribution */}
                <BarChart
                  title="Aircraft Category"
                  items={stats.categoryDist.map((c) => ({
                    label: c.label,
                    value: c.count,
                    color: c.color,
                  }))}
                />
              </div>}
            </ScrollArea>
          </TabsContent>

          {/* ── Charts Tab ───────────────────────────────────────────── */}
          <TabsContent value="charts" className="flex-1 min-h-0 mt-3">
            <ScrollArea className="h-[calc(100vh-180px)]">
              {!stats ? <div className="text-zinc-500 text-sm p-4">Loading stats...</div> : <div className="space-y-6 pb-6 pr-2">
                {/* Altitude histogram */}
                <div className="space-y-3">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                      Altitude Distribution
                    </h4>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-faint)" }}>
                      Airborne aircraft grouped by barometric altitude
                    </p>
                  </div>
                  <BarChart
                    title=""
                    items={[
                      {
                        label: "0 - 10k ft",
                        value: stats.altBuckets[0],
                        color: ALT_COLORS[0],
                      },
                      {
                        label: "10k - 20k ft",
                        value: stats.altBuckets[1],
                        color: ALT_COLORS[1],
                      },
                      {
                        label: "20k - 30k ft",
                        value: stats.altBuckets[2],
                        color: ALT_COLORS[2],
                      },
                      {
                        label: "30k - 40k ft",
                        value: stats.altBuckets[3],
                        color: ALT_COLORS[3],
                      },
                      {
                        label: "40k+ ft",
                        value: stats.altBuckets[4],
                        color: ALT_COLORS[4],
                      },
                    ]}
                  />

                  {/* Visual altitude breakdown summary */}
                  <div className="flex h-3 rounded-full overflow-hidden" style={{ background: "var(--surface-3)" }}>
                    {stats.altBuckets.map((count, i) => {
                      const totalAlt = stats.altBuckets.reduce(
                        (s, v) => s + v,
                        0
                      );
                      const w = totalAlt > 0 ? (count / totalAlt) * 100 : 0;
                      return (
                        <div
                          key={i}
                          className="transition-all duration-700 ease-out"
                          style={{
                            width: `${w}%`,
                            backgroundColor: ALT_COLORS[i],
                            opacity: 0.8,
                          }}
                          title={`${["0-10k", "10-20k", "20-30k", "30-40k", "40k+"][i]} ft: ${count}`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-xs" style={{ color: "var(--text-faint)" }}>
                    <span>0 ft</span>
                    <span>50,000+ ft</span>
                  </div>
                </div>

                <Separator style={{ background: "var(--border-default)" }} />

                {/* Speed histogram */}
                <div className="space-y-3">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                      Speed Distribution
                    </h4>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-faint)" }}>
                      Airborne aircraft grouped by ground speed
                    </p>
                  </div>
                  <BarChart
                    title=""
                    items={[
                      {
                        label: "0 - 200 kts",
                        value: stats.spdBuckets[0],
                        color: SPD_COLORS[0],
                      },
                      {
                        label: "200 - 400 kts",
                        value: stats.spdBuckets[1],
                        color: SPD_COLORS[1],
                      },
                      {
                        label: "400+ kts",
                        value: stats.spdBuckets[2],
                        color: SPD_COLORS[2],
                      },
                    ]}
                  />

                  {/* Visual speed breakdown */}
                  <div className="flex h-3 rounded-full overflow-hidden" style={{ background: "var(--surface-3)" }}>
                    {stats.spdBuckets.map((count, i) => {
                      const totalSpd = stats.spdBuckets.reduce(
                        (s, v) => s + v,
                        0
                      );
                      const w = totalSpd > 0 ? (count / totalSpd) * 100 : 0;
                      return (
                        <div
                          key={i}
                          className="transition-all duration-700 ease-out"
                          style={{
                            width: `${w}%`,
                            backgroundColor: SPD_COLORS[i],
                            opacity: 0.8,
                          }}
                          title={`${["0-200", "200-400", "400+"][i]} kts: ${count}`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-xs" style={{ color: "var(--text-faint)" }}>
                    <span>0 kts</span>
                    <span>600+ kts</span>
                  </div>
                </div>

                <Separator style={{ background: "var(--border-default)" }} />

                {/* Quick insights */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                    Quick Insights
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex items-center justify-between rounded-lg border px-3 py-2.5" style={{ background: "var(--surface-2)", borderColor: "var(--border-default)" }}>
                      <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                        High-altitude flights (30k+ ft)
                      </span>
                      <span className="text-xs font-bold text-slate-300 tabular-nums">
                        {formatNumber(
                          stats.altBuckets[3] + stats.altBuckets[4]
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border px-3 py-2.5" style={{ background: "var(--surface-2)", borderColor: "var(--border-default)" }}>
                      <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                        High-speed flights (400+ kts)
                      </span>
                      <span className="text-xs font-bold text-slate-400 tabular-nums">
                        {formatNumber(stats.spdBuckets[2])}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border px-3 py-2.5" style={{ background: "var(--surface-2)", borderColor: "var(--border-default)" }}>
                      <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                        Unique airlines detected
                      </span>
                      <span className="text-xs font-bold text-slate-400 tabular-nums">
                        {formatNumber(stats.topAirlines.length > 0 ? stats.topAirlines.length : 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border px-3 py-2.5" style={{ background: "var(--surface-2)", borderColor: "var(--border-default)" }}>
                      <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                        Ground-to-air ratio
                      </span>
                      <span className="text-xs font-bold text-slate-300 tabular-nums">
                        {stats.inAir > 0
                          ? `1 : ${(stats.inAir / Math.max(stats.onGround, 1)).toFixed(1)}`
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
      </Sheet>
    </>
  );
}
