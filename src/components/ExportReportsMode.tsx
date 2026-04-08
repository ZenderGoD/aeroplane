"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import type { FlightState } from "@/types/flight";

// ── Helpers ─────────────────────────────────────────────────────────────

const mToFt = (m: number) => m * 3.28084;
const msToKts = (ms: number) => ms * 1.94384;

function formatDateTime() {
  const now = new Date();
  const date = now.toISOString().split("T")[0];
  const time = now.toTimeString().split(" ")[0];
  return { date, time, iso: now.toISOString(), timestamp: now.getTime() };
}

function triggerDownload(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getCallsignPrefix(callsign: string | null): string {
  if (!callsign) return "";
  return callsign.trim().substring(0, 3).toUpperCase();
}

// ── SVG Icons ───────────────────────────────────────────────────────────

function IconCSV() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M9 4v16M15 4v16M4 4h16a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z" />
    </svg>
  );
}

function IconJSON() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
    </svg>
  );
}

function IconFilter() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
    </svg>
  );
}

function IconReport() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function IconCompare() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  );
}

function IconSchedule() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconDownload() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12M12 16.5V3" />
    </svg>
  );
}

function IconBack() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function IconRefresh() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

// ── Progress Bar ────────────────────────────────────────────────────────

function ProgressBar({ progress, label }: { progress: number; label: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{label}</span>
        <span className="text-xs font-mono tabular-nums" style={{ color: "var(--text-muted)" }}>{Math.round(progress)}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-3)" }}>
        <div
          className="h-full rounded-full transition-all duration-300 ease-out"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg, #cbd5e1, #cbd5e1)",
          }}
        />
      </div>
    </div>
  );
}

// ── Interfaces ──────────────────────────────────────────────────────────

interface FilterState {
  altMin: string;
  altMax: string;
  speedMin: string;
  speedMax: string;
  onGroundOnly: boolean;
  airborneOnly: boolean;
  militaryOnly: boolean;
  callsignPrefix: string;
}

interface Snapshot {
  flights: FlightState[];
  timestamp: number;
  label: string;
}

interface Props {
  onExitMode?: () => void;
}

// ── Main Component ──────────────────────────────────────────────────────

export default function ExportReportsMode({ onExitMode }: Props) {
  // Flight data state
  const [flights, setFlights] = useState<FlightState[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<string | null>(null);

  // Export progress
  const [exportProgress, setExportProgress] = useState<{ active: boolean; progress: number; label: string }>({
    active: false,
    progress: 0,
    label: "",
  });
  const [exportDone, setExportDone] = useState<string | null>(null);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    altMin: "",
    altMax: "",
    speedMin: "",
    speedMax: "",
    onGroundOnly: false,
    airborneOnly: false,
    militaryOnly: false,
    callsignPrefix: "",
  });

  // Comparison state
  const [storedSnapshot, setStoredSnapshot] = useState<Snapshot | null>(null);

  // Schedule state (UI only)
  const [scheduleFreq, setScheduleFreq] = useState("15");
  const [scheduleFormat, setScheduleFormat] = useState("csv");
  const [scheduleActive, setScheduleActive] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  // ── Fetch flights ───────────────────────────────────────────────────

  const fetchFlights = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const res = await fetch("/api/flights?lat=20&lon=78&radius=25000", {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const flightArray: FlightState[] = Array.isArray(data) ? data : data.flights ?? data.states ?? [];
      setFlights(flightArray);
      setLoaded(true);
      setLastFetchTime(new Date().toLocaleTimeString());
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      console.error("Failed to fetch flights:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Filtered flights ────────────────────────────────────────────────

  const filteredFlights = useMemo(() => {
    let result = flights;

    if (filters.altMin) {
      const min = parseFloat(filters.altMin);
      if (!isNaN(min)) result = result.filter((f) => f.baroAltitude != null && mToFt(f.baroAltitude) >= min);
    }
    if (filters.altMax) {
      const max = parseFloat(filters.altMax);
      if (!isNaN(max)) result = result.filter((f) => f.baroAltitude != null && mToFt(f.baroAltitude) <= max);
    }
    if (filters.speedMin) {
      const min = parseFloat(filters.speedMin);
      if (!isNaN(min)) result = result.filter((f) => f.velocity != null && msToKts(f.velocity) >= min);
    }
    if (filters.speedMax) {
      const max = parseFloat(filters.speedMax);
      if (!isNaN(max)) result = result.filter((f) => f.velocity != null && msToKts(f.velocity) <= max);
    }
    if (filters.onGroundOnly) {
      result = result.filter((f) => f.onGround);
    }
    if (filters.airborneOnly) {
      result = result.filter((f) => !f.onGround);
    }
    if (filters.militaryOnly) {
      result = result.filter((f) => (f.dbFlags ?? 0) & 1);
    }
    if (filters.callsignPrefix.trim()) {
      const prefix = filters.callsignPrefix.trim().toUpperCase();
      result = result.filter((f) => f.callsign && f.callsign.trim().toUpperCase().startsWith(prefix));
    }

    return result;
  }, [flights, filters]);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.altMin !== "" ||
      filters.altMax !== "" ||
      filters.speedMin !== "" ||
      filters.speedMax !== "" ||
      filters.onGroundOnly ||
      filters.airborneOnly ||
      filters.militaryOnly ||
      filters.callsignPrefix.trim() !== ""
    );
  }, [filters]);

  // ── Export simulation (fake progress for UX) ────────────────────────

  const simulateExport = useCallback(
    async (label: string, callback: () => void) => {
      setExportDone(null);
      setExportProgress({ active: true, progress: 0, label });
      const steps = [10, 30, 55, 75, 90, 100];
      for (const step of steps) {
        await new Promise((r) => setTimeout(r, 120));
        setExportProgress((p) => ({ ...p, progress: step }));
      }
      callback();
      setExportProgress({ active: false, progress: 100, label: "" });
      setExportDone(label);
      setTimeout(() => setExportDone(null), 3000);
    },
    []
  );

  // ── CSV Export ──────────────────────────────────────────────────────

  const exportCSV = useCallback(
    (data: FlightState[], filenamePrefix: string) => {
      simulateExport("Generating CSV...", () => {
        const headers = [
          "callsign",
          "icao24",
          "registration",
          "typeCode",
          "lat",
          "lon",
          "altitude_ft",
          "speed_kts",
          "heading",
          "verticalRate",
          "squawk",
          "onGround",
          "dataSource",
          "timestamp",
        ];

        const rows = data.map((f) => {
          const altFt = f.baroAltitude != null ? Math.round(mToFt(f.baroAltitude)) : "";
          const spdKts = f.velocity != null ? Math.round(msToKts(f.velocity)) : "";
          return [
            f.callsign?.trim() ?? "",
            f.icao24,
            f.registration ?? "",
            f.typeCode ?? "",
            f.latitude ?? "",
            f.longitude ?? "",
            altFt,
            spdKts,
            f.trueTrack != null ? Math.round(f.trueTrack) : "",
            f.verticalRate ?? "",
            f.squawk ?? "",
            f.onGround,
            f.dataSource ?? "",
            f.timePosition ?? "",
          ]
            .map((v) => {
              const s = String(v);
              return s.includes(",") || s.includes('"') || s.includes("\n")
                ? `"${s.replace(/"/g, '""')}"`
                : s;
            })
            .join(",");
        });

        const csv = [headers.join(","), ...rows].join("\n");
        const { date, time } = formatDateTime();
        triggerDownload(csv, `${filenamePrefix}_${date}_${time.replace(/:/g, "")}.csv`, "text/csv;charset=utf-8");
      });
    },
    [simulateExport]
  );

  // ── JSON Export ─────────────────────────────────────────────────────

  const exportJSON = useCallback(
    (data: FlightState[], filenamePrefix: string) => {
      simulateExport("Generating JSON...", () => {
        const json = JSON.stringify(data, null, 2);
        const { date, time } = formatDateTime();
        triggerDownload(json, `${filenamePrefix}_${date}_${time.replace(/:/g, "")}.json`, "application/json");
      });
    },
    [simulateExport]
  );

  // ── HTML Report ─────────────────────────────────────────────────────

  const generateHTMLReport = useCallback(
    (data: FlightState[]) => {
      simulateExport("Generating HTML Report...", () => {
        const { date, time } = formatDateTime();
        const total = data.length;
        const airborne = data.filter((f) => !f.onGround).length;
        const ground = total - airborne;

        const altitudes = data.filter((f) => !f.onGround && f.baroAltitude != null).map((f) => mToFt(f.baroAltitude!));
        const speeds = data.filter((f) => !f.onGround && f.velocity != null).map((f) => msToKts(f.velocity!));
        const avgAlt = altitudes.length > 0 ? Math.round(altitudes.reduce((a, b) => a + b, 0) / altitudes.length) : 0;
        const avgSpd = speeds.length > 0 ? Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length) : 0;

        // Type breakdown
        const typeCounts = new Map<string, number>();
        for (const f of data) {
          const t = f.typeCode || "Unknown";
          typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
        }
        const types = [...typeCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);

        // Altitude distribution
        const altBuckets = [0, 0, 0, 0, 0];
        for (const alt of altitudes) {
          if (alt < 10000) altBuckets[0]++;
          else if (alt < 20000) altBuckets[1]++;
          else if (alt < 30000) altBuckets[2]++;
          else if (alt < 40000) altBuckets[3]++;
          else altBuckets[4]++;
        }
        const altLabels = ["0 - 10,000 ft", "10,000 - 20,000 ft", "20,000 - 30,000 ft", "30,000 - 40,000 ft", "40,000+ ft"];

        // Top airlines
        const airlineCounts = new Map<string, number>();
        for (const f of data) {
          const prefix = getCallsignPrefix(f.callsign);
          if (prefix.length >= 2) airlineCounts.set(prefix, (airlineCounts.get(prefix) ?? 0) + 1);
        }
        const topAirlines = [...airlineCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);

        // Data quality
        const withCallsign = data.filter((f) => f.callsign && f.callsign.trim()).length;
        const withPosition = data.filter((f) => f.latitude != null && f.longitude != null).length;
        const withAltitude = data.filter((f) => f.baroAltitude != null).length;
        const withSpeed = data.filter((f) => f.velocity != null).length;
        const withSquawk = data.filter((f) => f.squawk).length;
        const withReg = data.filter((f) => f.registration).length;

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AeroIntel Flight Report - ${date} ${time}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #06080d;
    color: #f1f5f9;
    padding: 40px;
    line-height: 1.6;
  }
  .container { max-width: 900px; margin: 0 auto; }
  .header {
    text-align: center;
    padding: 40px 0 30px;
    border-bottom: 1px solid rgba(148,163,184,0.10);
    margin-bottom: 40px;
  }
  .header h1 {
    font-size: 28px;
    font-weight: 700;
    background: linear-gradient(135deg, #cbd5e1, #cbd5e1);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 8px;
  }
  .header .subtitle { color: #94a3b8; font-size: 14px; }
  .header .brand {
    display: inline-block;
    margin-bottom: 12px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #cbd5e1;
    padding: 4px 12px;
    border: 1px solid rgba(203,213,225,0.2);
    border-radius: 6px;
    background: rgba(203,213,225,0.06);
  }
  .section {
    background: #0a0a0a;
    border: 1px solid rgba(148,163,184,0.10);
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 24px;
  }
  .section h2 {
    font-size: 16px;
    font-weight: 600;
    color: #f1f5f9;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .section h2::before {
    content: '';
    display: inline-block;
    width: 3px;
    height: 16px;
    background: #cbd5e1;
    border-radius: 2px;
  }
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 16px;
  }
  .stat-card {
    background: #141414;
    border: 1px solid rgba(148,163,184,0.08);
    border-radius: 10px;
    padding: 16px;
    text-align: center;
  }
  .stat-card .value {
    font-size: 28px;
    font-weight: 700;
    color: #cbd5e1;
    font-variant-numeric: tabular-nums;
  }
  .stat-card .label {
    font-size: 12px;
    color: #94a3b8;
    margin-top: 4px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  table th {
    text-align: left;
    padding: 10px 12px;
    border-bottom: 1px solid rgba(148,163,184,0.15);
    color: #94a3b8;
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  table td {
    padding: 8px 12px;
    border-bottom: 1px solid rgba(148,163,184,0.06);
    color: #cbd5e1;
    font-variant-numeric: tabular-nums;
  }
  table tr:hover td { background: rgba(203,213,225,0.03); }
  .bar-container {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 6px 0;
  }
  .bar-label {
    width: 160px;
    font-size: 12px;
    color: #94a3b8;
    text-align: right;
    flex-shrink: 0;
  }
  .bar-track {
    flex: 1;
    height: 20px;
    background: #141414;
    border-radius: 4px;
    overflow: hidden;
  }
  .bar-fill {
    height: 100%;
    border-radius: 4px;
    background: linear-gradient(90deg, #cbd5e1, #cbd5e1);
    transition: width 0.3s;
  }
  .bar-value {
    width: 50px;
    font-size: 12px;
    color: #cbd5e1;
    font-variant-numeric: tabular-nums;
    text-align: right;
  }
  .quality-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid rgba(148,163,184,0.06);
  }
  .quality-label { font-size: 13px; color: #94a3b8; }
  .quality-value { font-size: 13px; font-weight: 600; color: #cbd5e1; font-variant-numeric: tabular-nums; }
  .footer {
    text-align: center;
    padding: 30px 0 20px;
    border-top: 1px solid rgba(148,163,184,0.10);
    margin-top: 40px;
    color: #64748b;
    font-size: 12px;
  }
  .footer .brand-footer { color: #cbd5e1; font-weight: 600; }
  @media print {
    body { background: #fff; color: #1a1a1a; padding: 20px; }
    .section { border-color: #ddd; background: #fafafa; }
    .stat-card { background: #f0f0f0; border-color: #ddd; }
    .stat-card .value { color: #0369a1; }
  }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="brand">AeroIntel</div>
    <h1>AeroIntel Flight Report &mdash; ${date} ${time}</h1>
    <div class="subtitle">Generated at ${new Date().toUTCString()}</div>
  </div>

  <div class="section">
    <h2>Summary</h2>
    <div class="summary-grid">
      <div class="stat-card">
        <div class="value">${total.toLocaleString()}</div>
        <div class="label">Total Flights</div>
      </div>
      <div class="stat-card">
        <div class="value">${airborne.toLocaleString()}</div>
        <div class="label">Airborne</div>
      </div>
      <div class="stat-card">
        <div class="value">${ground.toLocaleString()}</div>
        <div class="label">On Ground</div>
      </div>
      <div class="stat-card">
        <div class="value">${avgAlt.toLocaleString()} ft</div>
        <div class="label">Avg Altitude</div>
      </div>
      <div class="stat-card">
        <div class="value">${avgSpd} kts</div>
        <div class="label">Avg Speed</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Aircraft Type Breakdown</h2>
    <table>
      <thead><tr><th>Type Code</th><th>Count</th><th>Percentage</th></tr></thead>
      <tbody>
        ${types.map(([type, count]) => `<tr><td>${type}</td><td>${count}</td><td>${total > 0 ? ((count / total) * 100).toFixed(1) : 0}%</td></tr>`).join("")}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Altitude Distribution</h2>
    ${altBuckets
      .map(
        (count, i) => `
    <div class="bar-container">
      <div class="bar-label">${altLabels[i]}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${altitudes.length > 0 ? ((count / altitudes.length) * 100).toFixed(1) : 0}%"></div></div>
      <div class="bar-value">${count}</div>
    </div>`
      )
      .join("")}
  </div>

  <div class="section">
    <h2>Top Airlines by Callsign Prefix</h2>
    <table>
      <thead><tr><th>Prefix</th><th>Flights</th><th>Share</th></tr></thead>
      <tbody>
        ${topAirlines.map(([prefix, count]) => `<tr><td>${prefix}</td><td>${count}</td><td>${total > 0 ? ((count / total) * 100).toFixed(1) : 0}%</td></tr>`).join("")}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Data Quality Summary</h2>
    <div class="quality-row"><span class="quality-label">Flights with callsign</span><span class="quality-value">${withCallsign} / ${total} (${total > 0 ? ((withCallsign / total) * 100).toFixed(1) : 0}%)</span></div>
    <div class="quality-row"><span class="quality-label">Flights with position</span><span class="quality-value">${withPosition} / ${total} (${total > 0 ? ((withPosition / total) * 100).toFixed(1) : 0}%)</span></div>
    <div class="quality-row"><span class="quality-label">Flights with altitude</span><span class="quality-value">${withAltitude} / ${total} (${total > 0 ? ((withAltitude / total) * 100).toFixed(1) : 0}%)</span></div>
    <div class="quality-row"><span class="quality-label">Flights with speed</span><span class="quality-value">${withSpeed} / ${total} (${total > 0 ? ((withSpeed / total) * 100).toFixed(1) : 0}%)</span></div>
    <div class="quality-row"><span class="quality-label">Flights with squawk</span><span class="quality-value">${withSquawk} / ${total} (${total > 0 ? ((withSquawk / total) * 100).toFixed(1) : 0}%)</span></div>
    <div class="quality-row"><span class="quality-label">Flights with registration</span><span class="quality-value">${withReg} / ${total} (${total > 0 ? ((withReg / total) * 100).toFixed(1) : 0}%)</span></div>
  </div>

  <div class="footer">
    <span class="brand-footer">AeroIntel</span> &bull; Aviation Intelligence Platform<br/>
    Report generated on ${date} at ${time} UTC
  </div>
</div>
</body>
</html>`;

        triggerDownload(html, `AeroIntel_Report_${date}_${time.replace(/:/g, "")}.html`, "text/html;charset=utf-8");
      });
    },
    [simulateExport]
  );

  // ── Comparison Logic ────────────────────────────────────────────────

  const storeCurrentSnapshot = useCallback(() => {
    setStoredSnapshot({
      flights: [...flights],
      timestamp: Date.now(),
      label: new Date().toLocaleTimeString(),
    });
  }, [flights]);

  const comparisonData = useMemo(() => {
    if (!storedSnapshot || flights.length === 0) return null;

    const currentMap = new Map(flights.map((f) => [f.icao24, f]));
    const previousMap = new Map(storedSnapshot.flights.map((f) => [f.icao24, f]));

    const newFlights: FlightState[] = [];
    const departedFlights: FlightState[] = [];
    const altitudeChanges: { icao24: string; callsign: string; oldAlt: number; newAlt: number; delta: number }[] = [];
    const speedChanges: { icao24: string; callsign: string; oldSpd: number; newSpd: number; delta: number }[] = [];

    for (const [id, flight] of currentMap) {
      if (!previousMap.has(id)) {
        newFlights.push(flight);
      } else {
        const prev = previousMap.get(id)!;
        if (flight.baroAltitude != null && prev.baroAltitude != null) {
          const delta = mToFt(flight.baroAltitude) - mToFt(prev.baroAltitude);
          if (Math.abs(delta) > 500) {
            altitudeChanges.push({
              icao24: id,
              callsign: flight.callsign?.trim() || id,
              oldAlt: Math.round(mToFt(prev.baroAltitude)),
              newAlt: Math.round(mToFt(flight.baroAltitude)),
              delta: Math.round(delta),
            });
          }
        }
        if (flight.velocity != null && prev.velocity != null) {
          const delta = msToKts(flight.velocity) - msToKts(prev.velocity);
          if (Math.abs(delta) > 20) {
            speedChanges.push({
              icao24: id,
              callsign: flight.callsign?.trim() || id,
              oldSpd: Math.round(msToKts(prev.velocity)),
              newSpd: Math.round(msToKts(flight.velocity)),
              delta: Math.round(delta),
            });
          }
        }
      }
    }

    for (const [id, flight] of previousMap) {
      if (!currentMap.has(id)) {
        departedFlights.push(flight);
      }
    }

    altitudeChanges.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    speedChanges.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    return { newFlights, departedFlights, altitudeChanges: altitudeChanges.slice(0, 15), speedChanges: speedChanges.slice(0, 15) };
  }, [flights, storedSnapshot]);

  // ── Render helpers ──────────────────────────────────────────────────

  const cardClass = "rounded-xl p-5 transition-all duration-200";
  const cardStyle: React.CSSProperties = {
    background: "var(--surface-1)",
    border: "1px solid var(--border-default)",
  };

  const btnPrimary =
    "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";
  const btnPrimaryStyle: React.CSSProperties = {
    background: "linear-gradient(135deg, #cbd5e1, #94a3b8)",
    color: "#020617",
  };

  const btnSecondary =
    "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer";
  const btnSecondaryStyle: React.CSSProperties = {
    background: "var(--surface-3)",
    color: "var(--text-secondary)",
    border: "1px solid var(--border-default)",
  };

  const inputClass =
    "w-full rounded-lg px-3 py-2 text-xs font-mono outline-none transition-colors duration-150";
  const inputStyle: React.CSSProperties = {
    background: "var(--surface-2)",
    border: "1px solid var(--border-default)",
    color: "var(--text-primary)",
  };

  // ── Main Render ─────────────────────────────────────────────────────

  return (
    <div
      className="absolute inset-0 z-[1000] flex flex-col overflow-hidden animate-fade-in"
      style={{ background: "var(--surface-0)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 shrink-0"
        style={{
          background: "var(--surface-1)",
          borderBottom: "1px solid var(--border-default)",
        }}
      >
        <div className="flex items-center gap-3">
          {onExitMode && (
            <button
              onClick={onExitMode}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors duration-150 cursor-pointer"
              style={{ background: "var(--surface-3)", color: "var(--text-secondary)" }}
            >
              <IconBack />
            </button>
          )}
          <div>
            <h1 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              Export &amp; Reports
            </h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Data export, filtered downloads, and report generation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {lastFetchTime && (
            <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
              Last fetch: {lastFetchTime}
            </span>
          )}
          <button
            onClick={fetchFlights}
            disabled={loading}
            className={btnPrimary}
            style={btnPrimaryStyle}
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <IconRefresh />
            )}
            {loaded ? "Refresh Data" : "Fetch Flights"}
          </button>
        </div>
      </div>

      {/* Progress overlay */}
      {exportProgress.active && (
        <div className="px-6 py-3 shrink-0" style={{ background: "var(--surface-1)", borderBottom: "1px solid var(--border-subtle)" }}>
          <ProgressBar progress={exportProgress.progress} label={exportProgress.label} />
        </div>
      )}

      {/* Success toast */}
      {exportDone && (
        <div
          className="mx-6 mt-3 px-4 py-2.5 rounded-lg flex items-center gap-2 animate-slide-up shrink-0"
          style={{
            background: "rgba(148, 163, 184, 0.08)",
            border: "1px solid rgba(148, 163, 184, 0.2)",
          }}
        >
          <span style={{ color: "#cbd5e1" }}>
            <IconCheck />
          </span>
          <span className="text-xs font-medium" style={{ color: "#cbd5e1" }}>
            {exportDone} &mdash; File downloaded successfully
          </span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
        {!loaded ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border-default)" }}
            >
              <svg className="w-8 h-8" style={{ color: "var(--text-muted)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12M12 16.5V3" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                No flight data loaded
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                Click &ldquo;Fetch Flights&rdquo; to load current airspace snapshot
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5 max-w-[1400px] mx-auto">
            {/* ── Card 1: Snapshot CSV Export ──────────────────────── */}
            <div className={cardClass} style={cardStyle}>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "rgba(203,213,225,0.1)", color: "#cbd5e1" }}
                >
                  <IconCSV />
                </div>
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    CSV Export
                  </h3>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Spreadsheet-ready tabular format
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div
                  className="rounded-lg px-3 py-2 flex items-center justify-between"
                  style={{ background: "var(--surface-2)" }}
                >
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    Flights in snapshot
                  </span>
                  <span className="text-xs font-bold font-mono tabular-nums" style={{ color: "var(--accent-primary)" }}>
                    {flights.length.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  14 columns: callsign, icao24, registration, typeCode, lat, lon, altitude_ft, speed_kts, heading, verticalRate, squawk, onGround, dataSource, timestamp
                </p>
                <button
                  onClick={() => exportCSV(flights, "aerointel_snapshot")}
                  disabled={exportProgress.active}
                  className={btnPrimary + " w-full justify-center"}
                  style={btnPrimaryStyle}
                >
                  <IconDownload />
                  Download CSV
                </button>
              </div>
            </div>

            {/* ── Card 2: Snapshot JSON Export ─────────────────────── */}
            <div className={cardClass} style={cardStyle}>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "rgba(148,163,184,0.1)", color: "#94a3b8" }}
                >
                  <IconJSON />
                </div>
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    JSON Export
                  </h3>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Full FlightState array for developers
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div
                  className="rounded-lg px-3 py-2 flex items-center justify-between"
                  style={{ background: "var(--surface-2)" }}
                >
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    Total objects
                  </span>
                  <span className="text-xs font-bold font-mono tabular-nums" style={{ color: "#94a3b8" }}>
                    {flights.length.toLocaleString()}
                  </span>
                </div>
                <div
                  className="rounded-lg px-3 py-2 font-mono text-xs leading-relaxed max-h-[60px] overflow-hidden"
                  style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
                >
                  {`[{ "icao24": "${flights[0]?.icao24 ?? "..."}", "callsign": "${flights[0]?.callsign?.trim() ?? "..."}", ... }]`}
                </div>
                <button
                  onClick={() => exportJSON(flights, "aerointel_snapshot")}
                  disabled={exportProgress.active}
                  className={btnPrimary + " w-full justify-center"}
                  style={{ ...btnPrimaryStyle, background: "linear-gradient(135deg, #94a3b8, #94a3b8)" }}
                >
                  <IconDownload />
                  Download JSON
                </button>
              </div>
            </div>

            {/* ── Card 3: Filtered Export ──────────────────────────── */}
            <div className={cardClass + " lg:col-span-2 xl:col-span-1"} style={cardStyle}>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "rgba(148,163,184,0.1)", color: "#94a3b8" }}
                >
                  <IconFilter />
                </div>
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    Filtered Export
                  </h3>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Apply filters then export matching set
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {/* Filter inputs */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>
                      Alt Min (ft)
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={filters.altMin}
                      onChange={(e) => setFilters((f) => ({ ...f, altMin: e.target.value }))}
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>
                      Alt Max (ft)
                    </label>
                    <input
                      type="number"
                      placeholder="50000"
                      value={filters.altMax}
                      onChange={(e) => setFilters((f) => ({ ...f, altMax: e.target.value }))}
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>
                      Speed Min (kts)
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={filters.speedMin}
                      onChange={(e) => setFilters((f) => ({ ...f, speedMin: e.target.value }))}
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>
                      Speed Max (kts)
                    </label>
                    <input
                      type="number"
                      placeholder="600"
                      value={filters.speedMax}
                      onChange={(e) => setFilters((f) => ({ ...f, speedMax: e.target.value }))}
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>
                    Callsign Prefix
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. AIC, BAW, DLH"
                    value={filters.callsignPrefix}
                    onChange={(e) => setFilters((f) => ({ ...f, callsignPrefix: e.target.value }))}
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    { key: "airborneOnly" as const, label: "Airborne Only" },
                    { key: "onGroundOnly" as const, label: "On Ground Only" },
                    { key: "militaryOnly" as const, label: "Military Only" },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() =>
                        setFilters((f) => ({
                          ...f,
                          [opt.key]: !f[opt.key],
                          ...(opt.key === "airborneOnly" && !f.airborneOnly ? { onGroundOnly: false } : {}),
                          ...(opt.key === "onGroundOnly" && !f.onGroundOnly ? { airborneOnly: false } : {}),
                        }))
                      }
                      className="px-2.5 py-1 rounded-md text-xs font-semibold transition-colors duration-150 cursor-pointer"
                      style={{
                        background: filters[opt.key] ? "rgba(148,163,184,0.15)" : "var(--surface-2)",
                        color: filters[opt.key] ? "#94a3b8" : "var(--text-muted)",
                        border: `1px solid ${filters[opt.key] ? "rgba(148,163,184,0.3)" : "var(--border-default)"}`,
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Preview count */}
                <div
                  className="rounded-lg px-3 py-2 flex items-center justify-between"
                  style={{ background: "var(--surface-2)" }}
                >
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    Matching flights
                  </span>
                  <span
                    className="text-xs font-bold font-mono tabular-nums"
                    style={{ color: hasActiveFilters ? "#94a3b8" : "var(--text-secondary)" }}
                  >
                    {filteredFlights.length.toLocaleString()} / {flights.length.toLocaleString()}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => exportCSV(filteredFlights, "aerointel_filtered")}
                    disabled={exportProgress.active || filteredFlights.length === 0}
                    className={btnPrimary + " flex-1 justify-center"}
                    style={{ ...btnPrimaryStyle, background: "linear-gradient(135deg, #94a3b8, #94a3b8)", fontSize: "11px" }}
                  >
                    <IconDownload />
                    CSV
                  </button>
                  <button
                    onClick={() => exportJSON(filteredFlights, "aerointel_filtered")}
                    disabled={exportProgress.active || filteredFlights.length === 0}
                    className={btnPrimary + " flex-1 justify-center"}
                    style={{ ...btnPrimaryStyle, background: "linear-gradient(135deg, #94a3b8, #94a3b8)", fontSize: "11px" }}
                  >
                    <IconDownload />
                    JSON
                  </button>
                </div>

                {hasActiveFilters && (
                  <button
                    onClick={() =>
                      setFilters({
                        altMin: "",
                        altMax: "",
                        speedMin: "",
                        speedMax: "",
                        onGroundOnly: false,
                        airborneOnly: false,
                        militaryOnly: false,
                        callsignPrefix: "",
                      })
                    }
                    className="text-xs font-medium cursor-pointer underline"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            </div>

            {/* ── Card 4: HTML Report ─────────────────────────────── */}
            <div className={cardClass} style={cardStyle}>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "rgba(203,213,225,0.1)", color: "#cbd5e1" }}
                >
                  <IconReport />
                </div>
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    HTML Report
                  </h3>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Self-contained styled report file
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  Generates a standalone HTML document with dark theme styling, summary statistics, aircraft type breakdown, altitude distribution, top airlines, and data quality metrics. Print-ready.
                </p>
                <div className="space-y-1">
                  {["Summary & totals", "Aircraft type table", "Altitude distribution bars", "Top airlines table", "Data quality audit"].map(
                    (item) => (
                      <div key={item} className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full" style={{ background: "#cbd5e1" }} />
                        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                          {item}
                        </span>
                      </div>
                    )
                  )}
                </div>
                <button
                  onClick={() => generateHTMLReport(flights)}
                  disabled={exportProgress.active}
                  className={btnPrimary + " w-full justify-center"}
                  style={{ ...btnPrimaryStyle, background: "linear-gradient(135deg, #cbd5e1, #cbd5e1)" }}
                >
                  <IconDownload />
                  Generate Report
                </button>
              </div>
            </div>

            {/* ── Card 5: Comparison Report ───────────────────────── */}
            <div className={cardClass + " xl:col-span-2"} style={cardStyle}>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "rgba(148,163,184,0.1)", color: "#94a3b8" }}
                >
                  <IconCompare />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    Comparison Report
                  </h3>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Compare current snapshot against a stored baseline
                  </p>
                </div>
                <button
                  onClick={storeCurrentSnapshot}
                  className={btnSecondary}
                  style={btnSecondaryStyle}
                >
                  {storedSnapshot ? "Update" : "Store"} Snapshot
                </button>
              </div>

              {storedSnapshot && (
                <div
                  className="rounded-lg px-3 py-2 mb-3 flex items-center justify-between"
                  style={{ background: "var(--surface-2)" }}
                >
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    Stored snapshot
                  </span>
                  <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
                    {storedSnapshot.label} &mdash; {storedSnapshot.flights.length.toLocaleString()} flights
                  </span>
                </div>
              )}

              {!storedSnapshot ? (
                <div
                  className="rounded-lg px-4 py-6 text-center"
                  style={{ background: "var(--surface-2)", border: "1px dashed var(--border-default)" }}
                >
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Store a snapshot first, then refresh data to see changes
                  </p>
                </div>
              ) : !comparisonData ? (
                <div
                  className="rounded-lg px-4 py-6 text-center"
                  style={{ background: "var(--surface-2)", border: "1px dashed var(--border-default)" }}
                >
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Click &ldquo;Refresh Data&rdquo; to fetch a new snapshot for comparison
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                  {/* New flights */}
                  <div className="rounded-lg p-3" style={{ background: "var(--surface-2)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#cbd5e1" }}>
                        New Flights
                      </span>
                      <span className="text-lg font-bold font-mono tabular-nums" style={{ color: "#cbd5e1" }}>
                        +{comparisonData.newFlights.length}
                      </span>
                    </div>
                    <div className="space-y-0.5 max-h-[100px] overflow-y-auto scrollbar-thin">
                      {comparisonData.newFlights.slice(0, 8).map((f) => (
                        <div key={f.icao24} className="text-xs font-mono truncate" style={{ color: "var(--text-muted)" }}>
                          {f.callsign?.trim() || f.icao24}
                        </div>
                      ))}
                      {comparisonData.newFlights.length > 8 && (
                        <div className="text-xs" style={{ color: "var(--text-faint)" }}>
                          +{comparisonData.newFlights.length - 8} more
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Departed flights */}
                  <div className="rounded-lg p-3" style={{ background: "var(--surface-2)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#e2e8f0" }}>
                        Departed
                      </span>
                      <span className="text-lg font-bold font-mono tabular-nums" style={{ color: "#e2e8f0" }}>
                        -{comparisonData.departedFlights.length}
                      </span>
                    </div>
                    <div className="space-y-0.5 max-h-[100px] overflow-y-auto scrollbar-thin">
                      {comparisonData.departedFlights.slice(0, 8).map((f) => (
                        <div key={f.icao24} className="text-xs font-mono truncate" style={{ color: "var(--text-muted)" }}>
                          {f.callsign?.trim() || f.icao24}
                        </div>
                      ))}
                      {comparisonData.departedFlights.length > 8 && (
                        <div className="text-xs" style={{ color: "var(--text-faint)" }}>
                          +{comparisonData.departedFlights.length - 8} more
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Altitude changes */}
                  <div className="rounded-lg p-3" style={{ background: "var(--surface-2)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#cbd5e1" }}>
                        Alt Changes
                      </span>
                      <span className="text-lg font-bold font-mono tabular-nums" style={{ color: "#cbd5e1" }}>
                        {comparisonData.altitudeChanges.length}
                      </span>
                    </div>
                    <div className="space-y-0.5 max-h-[100px] overflow-y-auto scrollbar-thin">
                      {comparisonData.altitudeChanges.slice(0, 6).map((c) => (
                        <div key={c.icao24} className="text-xs font-mono flex justify-between gap-1" style={{ color: "var(--text-muted)" }}>
                          <span className="truncate">{c.callsign}</span>
                          <span style={{ color: c.delta > 0 ? "#cbd5e1" : "#e2e8f0" }}>
                            {c.delta > 0 ? "+" : ""}
                            {c.delta.toLocaleString()} ft
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Speed changes */}
                  <div className="rounded-lg p-3" style={{ background: "var(--surface-2)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#94a3b8" }}>
                        Speed Changes
                      </span>
                      <span className="text-lg font-bold font-mono tabular-nums" style={{ color: "#94a3b8" }}>
                        {comparisonData.speedChanges.length}
                      </span>
                    </div>
                    <div className="space-y-0.5 max-h-[100px] overflow-y-auto scrollbar-thin">
                      {comparisonData.speedChanges.slice(0, 6).map((c) => (
                        <div key={c.icao24} className="text-xs font-mono flex justify-between gap-1" style={{ color: "var(--text-muted)" }}>
                          <span className="truncate">{c.callsign}</span>
                          <span style={{ color: c.delta > 0 ? "#cbd5e1" : "#e2e8f0" }}>
                            {c.delta > 0 ? "+" : ""}
                            {c.delta} kts
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Card 6: Schedule (UI placeholder) ───────────────── */}
            <div className={cardClass} style={cardStyle}>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "rgba(226,232,240,0.1)", color: "#e2e8f0" }}
                >
                  <IconSchedule />
                </div>
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    Scheduled Export
                  </h3>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Auto-export at regular intervals
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>
                    Frequency
                  </label>
                  <select
                    value={scheduleFreq}
                    onChange={(e) => setScheduleFreq(e.target.value)}
                    className={inputClass + " cursor-pointer"}
                    style={inputStyle}
                  >
                    <option value="5">Every 5 minutes</option>
                    <option value="10">Every 10 minutes</option>
                    <option value="15">Every 15 minutes</option>
                    <option value="30">Every 30 minutes</option>
                    <option value="60">Every hour</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-muted)" }}>
                    Format
                  </label>
                  <select
                    value={scheduleFormat}
                    onChange={(e) => setScheduleFormat(e.target.value)}
                    className={inputClass + " cursor-pointer"}
                    style={inputStyle}
                  >
                    <option value="csv">CSV</option>
                    <option value="json">JSON</option>
                    <option value="html">HTML Report</option>
                  </select>
                </div>

                <button
                  onClick={() => setScheduleActive(!scheduleActive)}
                  className={btnPrimary + " w-full justify-center"}
                  style={{
                    ...btnPrimaryStyle,
                    background: scheduleActive
                      ? "linear-gradient(135deg, #e2e8f0, #e2e8f0)"
                      : "linear-gradient(135deg, #e2e8f0, #e2e8f0)",
                  }}
                >
                  <IconSchedule />
                  {scheduleActive ? "Stop Schedule" : "Start Schedule"}
                </button>

                {scheduleActive && (
                  <div
                    className="rounded-lg px-3 py-2 flex items-center gap-2"
                    style={{ background: "rgba(226,232,240,0.06)", border: "1px solid rgba(226,232,240,0.15)" }}
                  >
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#e2e8f0" }} />
                    <span className="text-xs" style={{ color: "#e2e8f0" }}>
                      Scheduled: {scheduleFormat.toUpperCase()} every {scheduleFreq} min
                    </span>
                  </div>
                )}

                <p className="text-[11px] italic" style={{ color: "var(--text-faint)" }}>
                  UI placeholder -- scheduling not yet implemented server-side
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
