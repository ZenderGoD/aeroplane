"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FlightState } from "@/types/flight";
import type { FlightHistoryMap } from "@/lib/flightHistory";
import { playAlertSound } from "@/lib/sounds";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Props {
  flights: FlightState[];
  flightHistory?: FlightHistoryMap;
}

type EventKind =
  | "entered"
  | "departed"
  | "emergency"
  | "rapid_descent"
  | "rapid_climb"
  | "military"
  | "landed"
  | "takeoff";

interface FeedEvent {
  id: string;
  kind: EventKind;
  icao24: string;
  text: string;
  icon: string;
  color: string;
  ts: number;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const MAX_EVENTS = 8;
const EXPIRE_MS = 2 * 60 * 1000; // 2 minutes
const DEDUP_MS = 30 * 1000; // 30 seconds
const SOUND_STORAGE_KEY = "aerointel-sound-enabled";

function isSoundEnabled(): boolean {
  try {
    return localStorage.getItem(SOUND_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

/** Map event kinds to sound types */
function soundForKind(kind: EventKind): "emergency" | "military" | "alert" | "info" | null {
  switch (kind) {
    case "emergency":
      return "emergency";
    case "military":
      return "military";
    case "rapid_descent":
    case "rapid_climb":
      return "alert";
    case "entered":
    case "departed":
    case "landed":
    case "takeoff":
      return "info";
    default:
      return null;
  }
}
const BORDER_COLORS: Record<string, string> = {
  emergency: "#e2e8f0",
  military: "#94a3b8",
  entered: "#cbd5e1",
  departed: "#94a3b8",
  rapid_descent: "#cbd5e1",
  rapid_climb: "#cbd5e1",
  landed: "#cbd5e1",
  takeoff: "#cbd5e1",
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function callsign(f: FlightState): string {
  return (f.callsign?.trim() || f.registration || f.icao24).toUpperCase();
}

function flightLevel(alt: number | null | undefined): string {
  if (alt == null) return "???";
  return `FL${Math.round(alt / 100)}`;
}

function relativeTime(ts: number): string {
  const diff = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diff < 5) return "now";
  if (diff < 60) return `${diff}s ago`;
  const m = Math.floor(diff / 60);
  return `${m}m ago`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

function LiveActivityFeed({ flights }: Props) {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [collapsed, setCollapsed] = useState(true);
  const [, setTick] = useState(0); // forces re-render for relative timestamps

  const prevFlightsRef = useRef<Map<string, FlightState>>(new Map());
  const seenMilitaryRef = useRef<Set<string>>(new Set());
  const dedupeRef = useRef<Map<string, number>>(new Map());

  /* ---------- timestamp updater ---------- */
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(id);
  }, []);

  /* ---------- add event (with dedup) ---------- */
  const pushEvent = useCallback(
    (kind: EventKind, icao24: string, text: string, icon: string) => {
      const dedupeKey = `${icao24}:${kind}`;
      const now = Date.now();
      const last = dedupeRef.current.get(dedupeKey);
      if (last && now - last < DEDUP_MS) return;
      dedupeRef.current.set(dedupeKey, now);

      const evt: FeedEvent = {
        id: `${dedupeKey}-${now}`,
        kind,
        icao24,
        text,
        icon,
        color: BORDER_COLORS[kind] ?? "#64748b",
        ts: now,
      };

      setEvents((prev) => [evt, ...prev].slice(0, MAX_EVENTS));

      // Play notification sound if enabled
      if (isSoundEnabled()) {
        const soundType = soundForKind(kind);
        if (soundType) playAlertSound(soundType);
      }
    },
    [],
  );

  /* ---------- detect events ---------- */
  useEffect(() => {
    const prevMap = prevFlightsRef.current;
    const currMap = new Map<string, FlightState>();

    for (const f of flights) {
      currMap.set(f.icao24, f);
      const prev = prevMap.get(f.icao24);

      /* New aircraft */
      if (!prev) {
        pushEvent("entered", f.icao24, `${callsign(f)} entered airspace`, "\u{2708}\u{FE0F}");
      }

      /* Emergency squawk */
      if (f.squawk === "7700" || f.squawk === "7600" || f.squawk === "7500") {
        pushEvent("emergency", f.icao24, `SQUAWK ${f.squawk} \u2014 ${callsign(f)}`, "\u26A0\uFE0F");
      }

      /* Rapid descent */
      if (f.verticalRate != null && f.verticalRate < -3000) {
        const fpm = Math.round(f.verticalRate);
        pushEvent("rapid_descent", f.icao24, `${callsign(f)} descending rapidly (${fpm} fpm)`, "\u26A1");
      }

      /* Rapid climb */
      if (f.verticalRate != null && f.verticalRate > 3000) {
        const from = prev ? flightLevel(prev.baroAltitude) : "???";
        const to = flightLevel(f.baroAltitude);
        pushEvent("rapid_climb", f.icao24, `${callsign(f)} climbing ${from}\u2192${to}`, "\uD83D\uDD3C");
      }

      /* Military */
      if (f.dbFlags != null && (f.dbFlags & 1) !== 0 && !seenMilitaryRef.current.has(f.icao24)) {
        seenMilitaryRef.current.add(f.icao24);
        pushEvent("military", f.icao24, "Military aircraft detected", "\uD83C\uDF96\uFE0F");
      }

      /* Landed */
      if (prev && !prev.onGround && f.onGround) {
        pushEvent("landed", f.icao24, `${callsign(f)} landed`, "\uD83D\uDEEC");
      }

      /* Takeoff */
      if (prev && prev.onGround && !f.onGround) {
        pushEvent("takeoff", f.icao24, `${callsign(f)} departing`, "\uD83D\uDEEB");
      }
    }

    /* Departed */
    for (const [icao, prev] of prevMap) {
      if (!currMap.has(icao)) {
        pushEvent("departed", icao, `${callsign(prev)} left coverage`, "\uD83D\uDCA8");
      }
    }

    prevFlightsRef.current = currMap;
  }, [flights, pushEvent]);

  /* ---------- expire old events ---------- */
  useEffect(() => {
    const id = setInterval(() => {
      const cutoff = Date.now() - EXPIRE_MS;
      setEvents((prev) => {
        const next = prev.filter((e) => e.ts > cutoff);
        return next.length !== prev.length ? next : prev;
      });

      /* clean stale dedup keys */
      const now = Date.now();
      for (const [k, t] of dedupeRef.current) {
        if (now - t > DEDUP_MS) dedupeRef.current.delete(k);
      }
    }, 10_000);
    return () => clearInterval(id);
  }, []);

  /* ---------- memoised count ---------- */
  const eventCount = useMemo(() => events.length, [events]);

  /* ---------- collapsed badge ---------- */
  if (collapsed) {
    return (
      <div style={styles.collapsedContainer}>
        <button
          onClick={() => setCollapsed(false)}
          style={styles.collapsedButton}
          aria-label="Expand live feed"
        >
          <span style={styles.pulsingDot} />
          <span style={{ fontFamily: "monospace", fontSize: 11, color: "#e2e8f0" }}>
            {eventCount} event{eventCount !== 1 ? "s" : ""}
          </span>
        </button>
      </div>
    );
  }

  /* ---------- expanded feed ---------- */
  return (
    <div style={styles.container}>
      <style>{keyframes}</style>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.pulsingDot} />
          <span style={styles.headerLabel}>LIVE FEED</span>
          {eventCount > 0 && <span style={styles.badge}>{eventCount}</span>}
        </div>
        <button
          onClick={() => setCollapsed(true)}
          style={styles.collapseBtn}
          aria-label="Collapse live feed"
        >
          {"\u2015"}
        </button>
      </div>

      {/* Events */}
      <div style={styles.list}>
        {events.length === 0 && (
          <div style={styles.empty}>Listening for events\u2026</div>
        )}
        {events.map((evt) => (
          <div
            key={evt.id}
            style={{
              ...styles.eventRow,
              borderLeftColor: evt.color,
              animation: "livefeed-slidein 0.3s ease forwards",
            }}
          >
            <span style={styles.eventIcon}>{evt.icon}</span>
            <div style={styles.eventBody}>
              <span style={styles.eventText}>{evt.text}</span>
              <span style={styles.eventTime}>{relativeTime(evt.ts)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Keyframe animation                                                 */
/* ------------------------------------------------------------------ */

const keyframes = `
@keyframes livefeed-slidein {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes livefeed-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}
`;

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const glass = {
  background: "rgba(10, 12, 16, 0.88)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255, 255, 255, 0.06)",
  borderRadius: 12,
} as const;

const styles: Record<string, React.CSSProperties> = {
  container: {
    ...glass,
    position: "absolute",
    bottom: 32,
    left: 64,
    zIndex: 800,
    maxWidth: 380,
    width: "100%",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    pointerEvents: "auto",
  },
  collapsedContainer: {
    position: "absolute",
    bottom: 32,
    left: 64,
    zIndex: 800,
    pointerEvents: "auto",
  },
  collapsedButton: {
    ...glass,
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 14px",
    cursor: "pointer",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 20,
    background: "rgba(10,12,16,0.88)",
  },

  /* Header */
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 10px 6px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.08em",
    color: "#94a3b8",
    fontFamily: "monospace",
  },
  badge: {
    fontSize: 10,
    fontWeight: 600,
    color: "#94a3b8",
    background: "rgba(148, 163, 184, 0.12)",
    borderRadius: 8,
    padding: "1px 6px",
    fontFamily: "monospace",
  },
  collapseBtn: {
    background: "none",
    border: "none",
    color: "#64748b",
    fontSize: 14,
    cursor: "pointer",
    padding: "2px 4px",
    lineHeight: 1,
  },

  /* Pulsing dot */
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#e2e8f0",
    display: "inline-block",
    animation: "livefeed-pulse 1.8s ease-in-out infinite",
    flexShrink: 0,
  },

  /* Event list */
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 1,
    maxHeight: 280,
    overflowY: "auto",
    overflowX: "hidden",
    scrollBehavior: "smooth",
    padding: "4px 0",
  },
  empty: {
    fontSize: 11,
    color: "#64748b",
    textAlign: "center",
    padding: "14px 12px",
    fontStyle: "italic",
  },

  /* Event row */
  eventRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    padding: "6px 10px 6px 10px",
    borderLeft: "3px solid transparent",
    opacity: 0,
    transform: "translateY(8px)",
  },
  eventIcon: {
    fontSize: 13,
    lineHeight: "18px",
    flexShrink: 0,
  },
  eventBody: {
    display: "flex",
    flexDirection: "column",
    gap: 1,
    minWidth: 0,
    flex: 1,
  },
  eventText: {
    fontSize: 12,
    color: "#e2e8f0",
    fontFamily: "system-ui, -apple-system, sans-serif",
    lineHeight: 1.35,
    wordBreak: "break-word",
  },
  eventTime: {
    fontSize: 10,
    color: "#64748b",
    fontFamily: "monospace",
  },
};

export default LiveActivityFeed;
