"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { FlightState } from "@/types/flight";
import { haversineNm } from "@/lib/geo";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AlertType =
  | "aircraft_spotted"
  | "airspace_entry"
  | "altitude_alert"
  | "squawk_alert"
  | "military_activity"
  | "ground_stop";

type Severity = "critical" | "warning" | "info";

interface AlertConditions {
  // aircraft_spotted
  registration?: string;
  callsign?: string;
  hex?: string;
  // airspace_entry / military_activity / ground_stop
  lat?: number;
  lon?: number;
  radiusNm?: number;
  // altitude_alert
  altitudeFt?: number;
  altitudeOp?: "above" | "below";
  // squawk_alert
  squawkCodes?: string[];
  // ground_stop
  groundCountThreshold?: number;
}

interface AlertRule {
  id: string;
  name: string;
  type: AlertType;
  conditions: AlertConditions;
  enabled: boolean;
  createdAt: number;
  lastTriggered: number | null;
  triggerCount: number;
}

interface AlertLogEntry {
  id: string;
  alertId: string;
  alertName: string;
  timestamp: number;
  severity: Severity;
  aircraftIcao: string;
  aircraftCallsign: string | null;
  aircraftRegistration?: string;
  details: string;
}

interface Props {
  onExitMode?: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY_ALERTS = "aerointel_custom_alerts";
const STORAGE_KEY_LOG = "aerointel_alert_log";
const POLL_INTERVAL = 10_000;
const DEDUP_WINDOW_MS = 5 * 60 * 1000;
const MAX_LOG_ENTRIES = 200;

const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  aircraft_spotted: "Aircraft Spotted",
  airspace_entry: "Airspace Entry",
  altitude_alert: "Altitude Alert",
  squawk_alert: "Squawk Alert",
  military_activity: "Military Activity",
  ground_stop: "Ground Stop",
};

const ALERT_TYPE_ICONS: Record<AlertType, string> = {
  aircraft_spotted: "\u2708",
  airspace_entry: "\u25CE",
  altitude_alert: "\u2195",
  squawk_alert: "\u26A0",
  military_activity: "\u2B50",
  ground_stop: "\u23F8",
};

const SEVERITY_COLORS: Record<Severity, { bg: string; text: string; border: string; dot: string }> = {
  critical: {
    bg: "rgba(226,232,240,0.08)",
    text: "#e2e8f0",
    border: "rgba(226,232,240,0.25)",
    dot: "#e2e8f0",
  },
  warning: {
    bg: "rgba(148,163,184,0.08)",
    text: "#94a3b8",
    border: "rgba(148,163,184,0.25)",
    dot: "#94a3b8",
  },
  info: {
    bg: "rgba(56,189,248,0.08)",
    text: "#cbd5e1",
    border: "rgba(56,189,248,0.25)",
    dot: "#cbd5e1",
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // quota exceeded — silently fail
  }
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function getSeverityForAlert(alert: AlertRule): Severity {
  if (alert.type === "squawk_alert") return "critical";
  if (alert.type === "military_activity") return "warning";
  return "info";
}

/** Play a short beep via AudioContext oscillator */
function playAlertBeep(severity: Severity): void {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const freqMap: Record<Severity, number> = { critical: 880, warning: 660, info: 520 };
    osc.frequency.value = freqMap[severity];
    osc.type = "sine";
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
    setTimeout(() => ctx.close(), 500);
  } catch {
    // AudioContext not available
  }
}

/** Request browser notification permission */
async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

function sendNotification(title: string, body: string): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/favicon.ico" });
  } catch {
    // Notification API unavailable
  }
}

// ---------------------------------------------------------------------------
// Alert Evaluation
// ---------------------------------------------------------------------------

function evaluateAlert(
  alert: AlertRule,
  flights: FlightState[],
  dedupMap: Map<string, number>
): { triggered: boolean; matches: FlightState[]; details: string } {
  if (!alert.enabled) return { triggered: false, matches: [], details: "" };

  const matches: FlightState[] = [];
  const now = Date.now();

  switch (alert.type) {
    case "aircraft_spotted": {
      const { registration, callsign, hex } = alert.conditions;
      for (const f of flights) {
        const matchReg = registration && f.registration?.toLowerCase() === registration.toLowerCase();
        const matchCall = callsign && f.callsign?.trim().toLowerCase() === callsign.toLowerCase();
        const matchHex = hex && f.icao24.toLowerCase() === hex.toLowerCase();
        if (matchReg || matchCall || matchHex) {
          const key = `${alert.id}:${f.icao24}`;
          const last = dedupMap.get(key);
          if (!last || now - last > DEDUP_WINDOW_MS) {
            matches.push(f);
          }
        }
      }
      const details = matches.length > 0
        ? `Spotted: ${matches.map((f) => f.callsign?.trim() || f.registration || f.icao24).join(", ")}`
        : "";
      return { triggered: matches.length > 0, matches, details };
    }

    case "airspace_entry": {
      const { lat, lon, radiusNm } = alert.conditions;
      if (lat == null || lon == null || !radiusNm) return { triggered: false, matches: [], details: "" };
      for (const f of flights) {
        if (f.latitude == null || f.longitude == null) continue;
        const dist = haversineNm(lat, lon, f.latitude, f.longitude);
        if (dist <= radiusNm) {
          const key = `${alert.id}:${f.icao24}`;
          const last = dedupMap.get(key);
          if (!last || now - last > DEDUP_WINDOW_MS) {
            matches.push(f);
          }
        }
      }
      const details = matches.length > 0
        ? `${matches.length} aircraft entered airspace (${radiusNm}NM radius)`
        : "";
      return { triggered: matches.length > 0, matches, details };
    }

    case "altitude_alert": {
      const { altitudeFt, altitudeOp } = alert.conditions;
      if (altitudeFt == null || !altitudeOp) return { triggered: false, matches: [], details: "" };
      for (const f of flights) {
        if (f.baroAltitude == null || f.onGround) continue;
        const ftAlt = f.baroAltitude * 3.28084;
        const match = altitudeOp === "above" ? ftAlt > altitudeFt : ftAlt < altitudeFt;
        if (match) {
          const key = `${alert.id}:${f.icao24}`;
          const last = dedupMap.get(key);
          if (!last || now - last > DEDUP_WINDOW_MS) {
            matches.push(f);
          }
        }
      }
      const details = matches.length > 0
        ? `${matches.length} aircraft ${altitudeOp} ${altitudeFt}ft`
        : "";
      return { triggered: matches.length > 0, matches, details };
    }

    case "squawk_alert": {
      const { squawkCodes } = alert.conditions;
      if (!squawkCodes?.length) return { triggered: false, matches: [], details: "" };
      for (const f of flights) {
        if (f.squawk && squawkCodes.includes(f.squawk)) {
          const key = `${alert.id}:${f.icao24}`;
          const last = dedupMap.get(key);
          if (!last || now - last > DEDUP_WINDOW_MS) {
            matches.push(f);
          }
        }
      }
      const squawkLabels: Record<string, string> = { "7500": "HIJACK", "7600": "COMMS FAIL", "7700": "EMERGENCY" };
      const details = matches.length > 0
        ? matches.map((f) => `${f.callsign?.trim() || f.icao24} SQK ${f.squawk} ${squawkLabels[f.squawk!] || ""}`).join("; ")
        : "";
      return { triggered: matches.length > 0, matches, details };
    }

    case "military_activity": {
      const { lat, lon, radiusNm } = alert.conditions;
      for (const f of flights) {
        if (!f.dbFlags || !(f.dbFlags & 1)) continue;
        if (lat != null && lon != null && radiusNm) {
          if (f.latitude == null || f.longitude == null) continue;
          const dist = haversineNm(lat, lon, f.latitude, f.longitude);
          if (dist > radiusNm) continue;
        }
        const key = `${alert.id}:${f.icao24}`;
        const last = dedupMap.get(key);
        if (!last || now - last > DEDUP_WINDOW_MS) {
          matches.push(f);
        }
      }
      const details = matches.length > 0
        ? `${matches.length} military aircraft detected`
        : "";
      return { triggered: matches.length > 0, matches, details };
    }

    case "ground_stop": {
      const { lat, lon, radiusNm, groundCountThreshold } = alert.conditions;
      if (lat == null || lon == null || !radiusNm || !groundCountThreshold)
        return { triggered: false, matches: [], details: "" };
      const grounded: FlightState[] = [];
      for (const f of flights) {
        if (!f.onGround || f.latitude == null || f.longitude == null) continue;
        const dist = haversineNm(lat, lon, f.latitude, f.longitude);
        if (dist <= radiusNm) grounded.push(f);
      }
      if (grounded.length >= groundCountThreshold) {
        const key = `${alert.id}:ground_stop`;
        const last = dedupMap.get(key);
        if (!last || now - last > DEDUP_WINDOW_MS) {
          return {
            triggered: true,
            matches: grounded,
            details: `${grounded.length} aircraft on ground (threshold: ${groundCountThreshold})`,
          };
        }
      }
      return { triggered: false, matches: [], details: "" };
    }
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Toggle({
  checked,
  onChange,
  size = "md",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  size?: "sm" | "md";
}) {
  const w = size === "sm" ? "w-8" : "w-10";
  const h = size === "sm" ? "h-4" : "h-5";
  const dot = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  const translate = size === "sm" ? "translate-x-4" : "translate-x-5";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`${w} ${h} relative inline-flex shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${
        checked ? "bg-[var(--accent-primary)]" : "bg-[var(--surface-4)]"
      }`}
    >
      <span
        className={`${dot} inline-block rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? translate : "translate-x-0.5"
        } mt-0.5`}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

type Tab = "alerts" | "log" | "create";

export default function AlertSystemMode({ onExitMode }: Props) {
  const [tab, setTab] = useState<Tab>("alerts");
  const [alerts, setAlerts] = useState<AlertRule[]>(() => loadFromStorage(STORAGE_KEY_ALERTS, []));
  const [logEntries, setLogEntries] = useState<AlertLogEntry[]>(() => loadFromStorage(STORAGE_KEY_LOG, []));
  const [isPolling, setIsPolling] = useState(true);
  const dedupMapRef = useRef<Map<string, number>>(new Map());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [newAlertFlash, setNewAlertFlash] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<AlertType>("aircraft_spotted");
  const [formRegistration, setFormRegistration] = useState("");
  const [formCallsign, setFormCallsign] = useState("");
  const [formHex, setFormHex] = useState("");
  const [formLat, setFormLat] = useState("");
  const [formLon, setFormLon] = useState("");
  const [formRadius, setFormRadius] = useState("50");
  const [formAltitude, setFormAltitude] = useState("");
  const [formAltitudeOp, setFormAltitudeOp] = useState<"above" | "below">("below");
  const [formSquawkCodes, setFormSquawkCodes] = useState<string[]>(["7500", "7600", "7700"]);
  const [formGroundThreshold, setFormGroundThreshold] = useState("10");

  // Persist alerts
  useEffect(() => {
    saveToStorage(STORAGE_KEY_ALERTS, alerts);
  }, [alerts]);

  // Persist log
  useEffect(() => {
    saveToStorage(STORAGE_KEY_LOG, logEntries);
  }, [logEntries]);

  // Poll and evaluate
  const evaluateAlerts = useCallback(async () => {
    if (alerts.filter((a) => a.enabled).length === 0) return;
    try {
      const res = await fetch("/api/flights?lat=20&lon=78&radius=25000");
      if (!res.ok) return;
      const data = await res.json();
      const flights: FlightState[] = data.states || data.flights || [];
      if (flights.length === 0) return;

      const now = Date.now();
      const newLogs: AlertLogEntry[] = [];

      for (const alert of alerts) {
        const result = evaluateAlert(alert, flights, dedupMapRef.current);
        if (result.triggered && result.matches.length > 0) {
          const severity = getSeverityForAlert(alert);

          // Update dedup map
          for (const m of result.matches) {
            const key = alert.type === "ground_stop" ? `${alert.id}:ground_stop` : `${alert.id}:${m.icao24}`;
            dedupMapRef.current.set(key, now);
          }

          // Create log entries
          for (const m of result.matches) {
            newLogs.push({
              id: generateId(),
              alertId: alert.id,
              alertName: alert.name,
              timestamp: now,
              severity,
              aircraftIcao: m.icao24,
              aircraftCallsign: m.callsign?.trim() || null,
              aircraftRegistration: m.registration,
              details: result.details,
            });
          }

          // Update alert trigger metadata
          setAlerts((prev) =>
            prev.map((a) =>
              a.id === alert.id
                ? { ...a, lastTriggered: now, triggerCount: a.triggerCount + result.matches.length }
                : a
            )
          );

          // Notifications
          playAlertBeep(severity);
          sendNotification(
            `AeroIntel: ${alert.name}`,
            result.details
          );

          // Flash indicator
          setNewAlertFlash(true);
          setTimeout(() => setNewAlertFlash(false), 2000);
        }
      }

      if (newLogs.length > 0) {
        setLogEntries((prev) => [...newLogs, ...prev].slice(0, MAX_LOG_ENTRIES));
      }
    } catch {
      // fetch failed — skip this cycle
    }
  }, [alerts]);

  useEffect(() => {
    if (isPolling) {
      evaluateAlerts();
      pollRef.current = setInterval(evaluateAlerts, POLL_INTERVAL);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isPolling, evaluateAlerts]);

  // ---------------------------------------------------------------------------
  // Alert CRUD
  // ---------------------------------------------------------------------------

  const resetForm = useCallback(() => {
    setFormName("");
    setFormType("aircraft_spotted");
    setFormRegistration("");
    setFormCallsign("");
    setFormHex("");
    setFormLat("");
    setFormLon("");
    setFormRadius("50");
    setFormAltitude("");
    setFormAltitudeOp("below");
    setFormSquawkCodes(["7500", "7600", "7700"]);
    setFormGroundThreshold("10");
  }, []);

  const createAlert = useCallback(() => {
    if (!formName.trim()) return;

    const conditions: AlertConditions = {};

    switch (formType) {
      case "aircraft_spotted":
        if (formRegistration) conditions.registration = formRegistration.trim();
        if (formCallsign) conditions.callsign = formCallsign.trim();
        if (formHex) conditions.hex = formHex.trim();
        if (!conditions.registration && !conditions.callsign && !conditions.hex) return;
        break;
      case "airspace_entry":
      case "military_activity":
        if (formLat && formLon) {
          conditions.lat = parseFloat(formLat);
          conditions.lon = parseFloat(formLon);
          conditions.radiusNm = parseFloat(formRadius) || 50;
        }
        break;
      case "altitude_alert":
        conditions.altitudeFt = parseFloat(formAltitude) || 1000;
        conditions.altitudeOp = formAltitudeOp;
        break;
      case "squawk_alert":
        conditions.squawkCodes = formSquawkCodes.filter(Boolean);
        if (conditions.squawkCodes.length === 0) return;
        break;
      case "ground_stop":
        if (!formLat || !formLon) return;
        conditions.lat = parseFloat(formLat);
        conditions.lon = parseFloat(formLon);
        conditions.radiusNm = parseFloat(formRadius) || 5;
        conditions.groundCountThreshold = parseInt(formGroundThreshold) || 10;
        break;
    }

    const newAlert: AlertRule = {
      id: generateId(),
      name: formName.trim(),
      type: formType,
      conditions,
      enabled: true,
      createdAt: Date.now(),
      lastTriggered: null,
      triggerCount: 0,
    };

    requestNotificationPermission();
    setAlerts((prev) => [newAlert, ...prev]);
    resetForm();
    setTab("alerts");
  }, [formName, formType, formRegistration, formCallsign, formHex, formLat, formLon, formRadius, formAltitude, formAltitudeOp, formSquawkCodes, formGroundThreshold, resetForm]);

  const deleteAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const toggleAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)));
  }, []);

  const clearLog = useCallback(() => {
    setLogEntries([]);
  }, []);

  // ---------------------------------------------------------------------------
  // Templates
  // ---------------------------------------------------------------------------

  const createFromTemplate = useCallback((template: "emergency" | "military" | "low_altitude") => {
    let alert: AlertRule;
    const id = generateId();
    const now = Date.now();

    switch (template) {
      case "emergency":
        alert = {
          id,
          name: "Emergency Squawks",
          type: "squawk_alert",
          conditions: { squawkCodes: ["7500", "7600", "7700"] },
          enabled: true,
          createdAt: now,
          lastTriggered: null,
          triggerCount: 0,
        };
        break;
      case "military":
        alert = {
          id,
          name: "Military Activity",
          type: "military_activity",
          conditions: {},
          enabled: true,
          createdAt: now,
          lastTriggered: null,
          triggerCount: 0,
        };
        break;
      case "low_altitude":
        alert = {
          id,
          name: "Low Altitude Alert",
          type: "altitude_alert",
          conditions: { altitudeFt: 1000, altitudeOp: "below" as const },
          enabled: true,
          createdAt: now,
          lastTriggered: null,
          triggerCount: 0,
        };
        break;
    }

    requestNotificationPermission();
    setAlerts((prev) => [alert, ...prev]);
  }, []);

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------

  const stats = useMemo(() => {
    const active = alerts.filter((a) => a.enabled).length;
    const triggered = alerts.filter((a) => a.triggerCount > 0).length;
    const totalTriggers = alerts.reduce((sum, a) => sum + a.triggerCount, 0);
    return { total: alerts.length, active, triggered, totalTriggers };
  }, [alerts]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const inputClass =
    "w-full rounded-lg px-3 py-2 text-sm bg-[var(--surface-1)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)]/30 transition-colors";

  const selectClass =
    "w-full rounded-lg px-3 py-2 text-sm bg-[var(--surface-1)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)]/30 transition-colors appearance-none cursor-pointer";

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "var(--surface-0)" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{
          background: "var(--surface-1)",
          borderBottom: "1px solid var(--border-default)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg"
            style={{ background: "rgba(226,232,240,0.12)" }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 1.5L1.5 14h13L8 1.5z"
                stroke="#e2e8f0"
                strokeWidth="1.5"
                strokeLinejoin="round"
                fill="none"
              />
              <path d="M8 6v3.5" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="8" cy="11.5" r="0.75" fill="#e2e8f0" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Alert System
            </h2>
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              {stats.active} active / {stats.totalTriggers} triggers
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Polling indicator */}
          <button
            onClick={() => setIsPolling(!isPolling)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all"
            style={{
              background: isPolling ? "rgba(203,213,225,0.1)" : "rgba(226,232,240,0.1)",
              color: isPolling ? "var(--status-nominal)" : "var(--status-critical)",
              border: `1px solid ${isPolling ? "rgba(203,213,225,0.2)" : "rgba(226,232,240,0.2)"}`,
            }}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${isPolling ? "animate-pulse" : ""}`}
              style={{ background: isPolling ? "var(--status-nominal)" : "var(--status-critical)" }}
            />
            {isPolling ? "LIVE" : "PAUSED"}
          </button>
          {onExitMode && (
            <button
              onClick={onExitMode}
              className="p-1.5 rounded-md transition-colors hover:bg-[var(--surface-3)]"
              style={{ color: "var(--text-muted)" }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div
        className="flex shrink-0 px-2 pt-2 gap-1"
        style={{ background: "var(--surface-1)", borderBottom: "1px solid var(--border-subtle)" }}
      >
        {(["alerts", "log", "create"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="relative px-3 py-2 text-[11px] font-semibold uppercase tracking-wider rounded-t-md transition-colors"
            style={{
              color: tab === t ? "var(--text-primary)" : "var(--text-muted)",
              background: tab === t ? "var(--surface-0)" : "transparent",
              borderBottom: tab === t ? "2px solid var(--accent-primary)" : "2px solid transparent",
            }}
          >
            {t === "alerts" ? "Alerts" : t === "log" ? "Log" : "Create"}
            {t === "alerts" && stats.active > 0 && (
              <span
                className="ml-1.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold"
                style={{ background: "var(--accent-primary)", color: "var(--surface-0)" }}
              >
                {stats.active}
              </span>
            )}
            {t === "log" && newAlertFlash && (
              <span
                className="absolute top-1 right-1 w-2 h-2 rounded-full animate-ping"
                style={{ background: "var(--status-critical)" }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* ============================================================ */}
        {/* ALERTS TAB */}
        {/* ============================================================ */}
        {tab === "alerts" && (
          <div className="p-3 space-y-3">
            {/* Quick templates */}
            <div
              className="rounded-xl p-3"
              style={{
                background: "linear-gradient(135deg, var(--surface-2), var(--surface-1))",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <p className="section-label mb-2">Quick Templates</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: "emergency" as const, label: "Emergency\nSquawks", icon: "\u26A0", color: "#e2e8f0" },
                  { key: "military" as const, label: "Military\nActivity", icon: "\u2B50", color: "#94a3b8" },
                  { key: "low_altitude" as const, label: "Low\nAltitude", icon: "\u2195", color: "#cbd5e1" },
                ].map((tmpl) => (
                  <button
                    key={tmpl.key}
                    onClick={() => createFromTemplate(tmpl.key)}
                    className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg text-center transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      background: `${tmpl.color}10`,
                      border: `1px solid ${tmpl.color}25`,
                    }}
                  >
                    <span className="text-lg">{tmpl.icon}</span>
                    <span className="text-[10px] font-medium leading-tight whitespace-pre-line" style={{ color: tmpl.color }}>
                      {tmpl.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Total", value: stats.total, color: "var(--text-primary)" },
                { label: "Active", value: stats.active, color: "var(--status-nominal)" },
                { label: "Triggered", value: stats.triggered, color: "var(--status-caution)" },
                { label: "Fires", value: stats.totalTriggers, color: "var(--accent-primary)" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-lg p-2 text-center"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)" }}
                >
                  <p className="data-value text-base font-bold" style={{ color: s.color }}>
                    {s.value}
                  </p>
                  <p className="text-[9px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                    {s.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Alert list */}
            {alerts.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-12 rounded-xl"
                style={{ background: "var(--surface-1)", border: "1px solid var(--border-subtle)" }}
              >
                <div className="text-3xl mb-3 opacity-30">{"\u26A0"}</div>
                <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
                  No alerts configured
                </p>
                <p className="text-[11px] mt-1" style={{ color: "var(--text-faint)" }}>
                  Use templates above or create custom alerts
                </p>
                <button
                  onClick={() => setTab("create")}
                  className="mt-4 px-4 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:scale-105"
                  style={{ background: "var(--accent-primary)", color: "var(--surface-0)" }}
                >
                  Create Alert
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {alerts.map((alert) => {
                  const severity = getSeverityForAlert(alert);
                  const sc = SEVERITY_COLORS[severity];
                  return (
                    <div
                      key={alert.id}
                      className="rounded-xl p-3 transition-all"
                      style={{
                        background: alert.enabled ? sc.bg : "var(--surface-1)",
                        border: `1px solid ${alert.enabled ? sc.border : "var(--border-subtle)"}`,
                        opacity: alert.enabled ? 1 : 0.6,
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm shrink-0">{ALERT_TYPE_ICONS[alert.type]}</span>
                          <div className="min-w-0">
                            <p
                              className="text-[13px] font-semibold truncate"
                              style={{ color: alert.enabled ? sc.text : "var(--text-muted)" }}
                            >
                              {alert.name}
                            </p>
                            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                              {ALERT_TYPE_LABELS[alert.type]}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Toggle checked={alert.enabled} onChange={() => toggleAlert(alert.id)} size="sm" />
                          <button
                            onClick={() => deleteAlert(alert.id)}
                            className="p-1 rounded transition-colors hover:bg-[rgba(226,232,240,0.15)]"
                            style={{ color: "var(--text-muted)" }}
                          >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M2.5 3h7M4.5 3V2a1 1 0 011-1h1a1 1 0 011 1v1M5 5.5v3M7 5.5v3M3 3l.5 6.5a1 1 0 001 1h3a1 1 0 001-1L9 3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Metadata row */}
                      <div className="flex items-center gap-3 mt-2 text-[10px]" style={{ color: "var(--text-faint)" }}>
                        {alert.triggerCount > 0 && (
                          <span className="data-value" style={{ color: sc.text }}>
                            {alert.triggerCount} fires
                          </span>
                        )}
                        {alert.lastTriggered && (
                          <span>Last: {timeAgo(alert.lastTriggered)}</span>
                        )}
                        <span>Created {formatDate(alert.createdAt)}</span>
                      </div>

                      {/* Conditions summary */}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {alert.conditions.registration && (
                          <ConditionBadge label={`REG: ${alert.conditions.registration}`} />
                        )}
                        {alert.conditions.callsign && (
                          <ConditionBadge label={`CS: ${alert.conditions.callsign}`} />
                        )}
                        {alert.conditions.hex && (
                          <ConditionBadge label={`HEX: ${alert.conditions.hex}`} />
                        )}
                        {alert.conditions.lat != null && (
                          <ConditionBadge label={`${alert.conditions.lat.toFixed(2)}, ${alert.conditions.lon?.toFixed(2)} / ${alert.conditions.radiusNm}NM`} />
                        )}
                        {alert.conditions.altitudeFt != null && (
                          <ConditionBadge label={`${alert.conditions.altitudeOp === "above" ? ">" : "<"} ${alert.conditions.altitudeFt}ft`} />
                        )}
                        {alert.conditions.squawkCodes && (
                          <ConditionBadge label={`SQK: ${alert.conditions.squawkCodes.join(", ")}`} />
                        )}
                        {alert.conditions.groundCountThreshold != null && (
                          <ConditionBadge label={`Ground >= ${alert.conditions.groundCountThreshold}`} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* LOG TAB */}
        {/* ============================================================ */}
        {tab === "log" && (
          <div className="p-3 space-y-2">
            {/* Log header */}
            <div className="flex items-center justify-between">
              <p className="section-label">Operations Feed</p>
              {logEntries.length > 0 && (
                <button
                  onClick={clearLog}
                  className="text-[10px] font-medium px-2 py-0.5 rounded transition-colors"
                  style={{ color: "var(--text-muted)", background: "var(--surface-2)" }}
                >
                  Clear
                </button>
              )}
            </div>

            {logEntries.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-16 rounded-xl"
                style={{ background: "var(--surface-1)", border: "1px solid var(--border-subtle)" }}
              >
                <div className="text-2xl mb-2 opacity-20">{">"}_</div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  No alerts triggered yet
                </p>
                <p className="text-[10px] mt-1" style={{ color: "var(--text-faint)" }}>
                  Monitoring {stats.active} active alert{stats.active !== 1 ? "s" : ""}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {logEntries.map((entry, idx) => {
                  const sc = SEVERITY_COLORS[entry.severity];
                  return (
                    <div
                      key={entry.id}
                      className="rounded-lg p-2.5 transition-all"
                      style={{
                        background: sc.bg,
                        borderLeft: `3px solid ${sc.dot}`,
                        animation: idx === 0 ? "fadeInSlide 0.3s var(--ease-out-expo)" : undefined,
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ background: sc.dot }}
                            />
                            <span
                              className="text-[11px] font-semibold truncate"
                              style={{ color: sc.text }}
                            >
                              {entry.alertName}
                            </span>
                          </div>
                          <p
                            className="text-[10px] mt-1 ml-3.5 leading-relaxed"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {entry.details}
                          </p>
                          <div className="flex items-center gap-2 mt-1 ml-3.5">
                            <span className="data-value text-[10px]" style={{ color: "var(--text-muted)" }}>
                              {entry.aircraftCallsign || entry.aircraftIcao}
                            </span>
                            {entry.aircraftRegistration && (
                              <span className="data-value text-[10px]" style={{ color: "var(--text-faint)" }}>
                                {entry.aircraftRegistration}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="data-value text-[10px]" style={{ color: "var(--text-muted)" }}>
                            {formatTimestamp(entry.timestamp)}
                          </p>
                          <p className="text-[9px]" style={{ color: "var(--text-faint)" }}>
                            {formatDate(entry.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* CREATE TAB */}
        {/* ============================================================ */}
        {tab === "create" && (
          <div className="p-3 space-y-4">
            <div
              className="rounded-xl p-4 space-y-4"
              style={{
                background: "linear-gradient(180deg, var(--surface-2) 0%, var(--surface-1) 100%)",
                border: "1px solid var(--border-default)",
              }}
            >
              <p className="section-label">New Alert Rule</p>

              {/* Name */}
              <div>
                <label className="block text-[11px] font-medium mb-1.5" style={{ color: "var(--text-tertiary)" }}>
                  Alert Name
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Track N12345"
                  className={inputClass}
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-[11px] font-medium mb-1.5" style={{ color: "var(--text-tertiary)" }}>
                  Alert Type
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as AlertType)}
                  className={selectClass}
                >
                  {Object.entries(ALERT_TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Conditional fields */}
              {formType === "aircraft_spotted" && (
                <div className="space-y-3">
                  <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
                    Match any of the following (at least one required):
                  </p>
                  <div>
                    <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--text-tertiary)" }}>
                      Registration
                    </label>
                    <input
                      type="text"
                      value={formRegistration}
                      onChange={(e) => setFormRegistration(e.target.value)}
                      placeholder="e.g. N12345"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--text-tertiary)" }}>
                      Callsign
                    </label>
                    <input
                      type="text"
                      value={formCallsign}
                      onChange={(e) => setFormCallsign(e.target.value)}
                      placeholder="e.g. UAL123"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--text-tertiary)" }}>
                      ICAO Hex
                    </label>
                    <input
                      type="text"
                      value={formHex}
                      onChange={(e) => setFormHex(e.target.value)}
                      placeholder="e.g. A0B1C2"
                      className={inputClass}
                    />
                  </div>
                </div>
              )}

              {(formType === "airspace_entry" || formType === "military_activity" || formType === "ground_stop") && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--text-tertiary)" }}>
                        Latitude
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={formLat}
                        onChange={(e) => setFormLat(e.target.value)}
                        placeholder="20.0"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--text-tertiary)" }}>
                        Longitude
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={formLon}
                        onChange={(e) => setFormLon(e.target.value)}
                        placeholder="78.0"
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--text-tertiary)" }}>
                      Radius (NM)
                    </label>
                    <input
                      type="number"
                      value={formRadius}
                      onChange={(e) => setFormRadius(e.target.value)}
                      placeholder="50"
                      className={inputClass}
                    />
                  </div>
                  {formType === "ground_stop" && (
                    <div>
                      <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--text-tertiary)" }}>
                        Ground Count Threshold
                      </label>
                      <input
                        type="number"
                        value={formGroundThreshold}
                        onChange={(e) => setFormGroundThreshold(e.target.value)}
                        placeholder="10"
                        className={inputClass}
                      />
                    </div>
                  )}
                </div>
              )}

              {formType === "altitude_alert" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--text-tertiary)" }}>
                      Altitude (ft)
                    </label>
                    <input
                      type="number"
                      value={formAltitude}
                      onChange={(e) => setFormAltitude(e.target.value)}
                      placeholder="1000"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--text-tertiary)" }}>
                      Trigger When
                    </label>
                    <div className="flex gap-2">
                      {(["above", "below"] as const).map((op) => (
                        <button
                          key={op}
                          onClick={() => setFormAltitudeOp(op)}
                          className="flex-1 py-2 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all"
                          style={{
                            background: formAltitudeOp === op ? "var(--accent-primary-dim)" : "var(--surface-1)",
                            color: formAltitudeOp === op ? "var(--accent-primary)" : "var(--text-muted)",
                            border: `1px solid ${formAltitudeOp === op ? "rgba(56,189,248,0.3)" : "var(--border-subtle)"}`,
                          }}
                        >
                          {op === "above" ? "Above" : "Below"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {formType === "squawk_alert" && (
                <div>
                  <label className="block text-[11px] font-medium mb-2" style={{ color: "var(--text-tertiary)" }}>
                    Squawk Codes
                  </label>
                  <div className="space-y-2">
                    {[
                      { code: "7500", label: "Hijack", color: "#e2e8f0" },
                      { code: "7600", label: "Comms Failure", color: "#94a3b8" },
                      { code: "7700", label: "Emergency", color: "#94a3b8" },
                    ].map((sq) => (
                      <label
                        key={sq.code}
                        className="flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-colors"
                        style={{
                          background: formSquawkCodes.includes(sq.code) ? `${sq.color}10` : "var(--surface-1)",
                          border: `1px solid ${formSquawkCodes.includes(sq.code) ? `${sq.color}30` : "var(--border-subtle)"}`,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={formSquawkCodes.includes(sq.code)}
                          onChange={() => {
                            setFormSquawkCodes((prev) =>
                              prev.includes(sq.code)
                                ? prev.filter((c) => c !== sq.code)
                                : [...prev, sq.code]
                            );
                          }}
                          className="accent-[var(--accent-primary)]"
                        />
                        <span className="data-value text-[12px] font-bold" style={{ color: sq.color }}>
                          {sq.code}
                        </span>
                        <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                          {sq.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Create button */}
              <button
                onClick={createAlert}
                disabled={!formName.trim()}
                className="w-full py-2.5 rounded-lg text-[12px] font-bold uppercase tracking-wider transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: formName.trim() ? "var(--accent-primary)" : "var(--surface-3)",
                  color: formName.trim() ? "var(--surface-0)" : "var(--text-muted)",
                }}
              >
                Create Alert
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Inline keyframe animation */}
      <style>{`
        @keyframes fadeInSlide {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--border-default);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--border-strong);
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Condition Badge sub-component
// ---------------------------------------------------------------------------

function ConditionBadge({ label }: { label: string }) {
  return (
    <span
      className="data-value inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium"
      style={{
        background: "var(--surface-3)",
        color: "var(--text-tertiary)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      {label}
    </span>
  );
}
