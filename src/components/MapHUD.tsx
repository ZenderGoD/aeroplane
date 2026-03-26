"use client";

import { useEffect, useState, useMemo } from "react";
import type { FlightState } from "@/types/flight";

interface Props {
  totalCount: number;
  filteredCount: number;
  isRefreshing: boolean;
  lastUpdated: Date | null;
  dataSource?: string;
  flights: FlightState[];
}

export default function MapHUD({
  totalCount,
  filteredCount,
  isRefreshing,
  lastUpdated,
  dataSource,
  flights,
}: Props) {
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    if (!lastUpdated) return;

    const update = () => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  const stats = useMemo(() => {
    const airborne = flights.filter((f) => !f.onGround);
    const ground = flights.filter((f) => f.onGround);
    const military = flights.filter((f) => f.dbFlags && f.dbFlags & 1);

    const avgAlt =
      airborne.length > 0
        ? Math.round(
            airborne.reduce((sum, f) => sum + (f.baroAltitude ?? 0), 0) /
              airborne.length
          )
        : 0;

    return {
      airborne: airborne.length,
      ground: ground.length,
      avgAlt,
      military: military.length,
    };
  }, [flights]);

  const formatAlt = (alt: number) => alt.toLocaleString("en-US");

  const freshnessLabel = lastUpdated
    ? secondsAgo < 60
      ? `${secondsAgo}s ago`
      : `${Math.floor(secondsAgo / 60)}m ago`
    : "--";

  const source = dataSource || "airplanes.live";

  return (
    <div style={panelStyle}>
      {/* Gradient top bar */}
      <div style={gradientBarStyle} />

      {/* Tracking header */}
      <div style={trackingSection}>
        <div style={trackingRow}>
          <span style={pulsingDotStyle} />
          <span style={trackingLabel}>TRACKING</span>
        </div>
        <div style={countStyle}>{totalCount}</div>
        {filteredCount !== totalCount && (
          <div style={filteredLabel}>{filteredCount} in view</div>
        )}
      </div>

      {/* Data freshness */}
      <div style={freshnessRow}>
        {isRefreshing ? (
          <span style={refreshRow}>
            <span style={spinnerStyle} />
            <span style={freshnessText}>Refreshing...</span>
          </span>
        ) : (
          <span style={freshnessText}>Updated {freshnessLabel}</span>
        )}
      </div>

      {/* Source badge */}
      <div style={badgeRow}>
        <span style={sourceBadge}>{source}</span>
        <span style={adsbBadge}>ADS-B</span>
      </div>

      {/* Divider */}
      <div style={dividerStyle} />

      {/* Quick stats 2x2 grid */}
      <div style={statsGrid}>
        <div style={statCard}>
          <span style={statLabel}>AIRBORNE</span>
          <span style={statValue}>{stats.airborne}</span>
        </div>
        <div style={statCard}>
          <span style={statLabel}>GROUND</span>
          <span style={statValue}>{stats.ground}</span>
        </div>
        <div style={statCard}>
          <span style={statLabel}>AVG ALT</span>
          <span style={statValue}>{formatAlt(stats.avgAlt)}</span>
        </div>
        <div style={statCard}>
          <span style={statLabel}>MILITARY</span>
          <span style={statValue}>{stats.military}</span>
        </div>
      </div>

      {/* Coverage */}
      <div style={coverageStyle}>250 NM radius</div>

      {/* Keyframe injection */}
      <style>{keyframes}</style>
    </div>
  );
}

/* ── Keyframes ─────────────────────────────────── */

const keyframes = `
@keyframes hud-pulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 8px rgba(52,211,153,0.5); }
  50%      { opacity: 0.5; box-shadow: 0 0 4px rgba(52,211,153,0.2); }
}
@keyframes hud-spin {
  to { transform: rotate(360deg); }
}
`;

/* ── Styles ────────────────────────────────────── */

const mono = "'Geist Mono', 'JetBrains Mono', monospace";

const panelStyle: React.CSSProperties = {
  position: "absolute",
  top: 16,
  right: 16,
  zIndex: 900,
  width: 220,
  background: "rgba(10, 12, 16, 0.85)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255, 255, 255, 0.06)",
  borderRadius: 14,
  overflow: "hidden",
  color: "var(--text-primary, #e2e8f0)",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  userSelect: "none",
  pointerEvents: "auto",
};

const gradientBarStyle: React.CSSProperties = {
  height: 2,
  background: "linear-gradient(90deg, #22d3ee, #3b82f6)",
  width: "100%",
};

/* ── Tracking ──────────────────────────────────── */

const trackingSection: React.CSSProperties = {
  padding: "12px 14px 4px",
};

const trackingRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
};

const pulsingDotStyle: React.CSSProperties = {
  width: 7,
  height: 7,
  borderRadius: "50%",
  backgroundColor: "#34d399",
  boxShadow: "0 0 8px rgba(52,211,153,0.5)",
  animation: "hud-pulse 2s ease-in-out infinite",
  flexShrink: 0,
};

const trackingLabel: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 600,
  letterSpacing: "0.1em",
  color: "var(--text-muted, #94a3b8)",
  textTransform: "uppercase",
};

const countStyle: React.CSSProperties = {
  fontSize: 32,
  fontWeight: 700,
  fontFamily: mono,
  lineHeight: 1.1,
  marginTop: 2,
  color: "var(--text-primary, #f1f5f9)",
};

const filteredLabel: React.CSSProperties = {
  fontSize: 10,
  color: "var(--text-muted, #94a3b8)",
  fontFamily: mono,
  marginTop: 2,
};

/* ── Freshness ─────────────────────────────────── */

const freshnessRow: React.CSSProperties = {
  padding: "4px 14px 6px",
};

const refreshRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
};

const freshnessText: React.CSSProperties = {
  fontSize: 10,
  color: "var(--text-muted, #94a3b8)",
  fontFamily: mono,
};

const spinnerStyle: React.CSSProperties = {
  width: 10,
  height: 10,
  border: "1.5px solid rgba(255,255,255,0.15)",
  borderTopColor: "#22d3ee",
  borderRadius: "50%",
  animation: "hud-spin 0.8s linear infinite",
  flexShrink: 0,
};

/* ── Source Badges ──────────────────────────────── */

const badgeRow: React.CSSProperties = {
  display: "flex",
  gap: 6,
  padding: "2px 14px 10px",
};

const badgeBase: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 600,
  fontFamily: mono,
  padding: "2px 7px",
  borderRadius: 6,
  letterSpacing: "0.04em",
};

const sourceBadge: React.CSSProperties = {
  ...badgeBase,
  background: "rgba(34, 211, 238, 0.12)",
  color: "#22d3ee",
  border: "1px solid rgba(34, 211, 238, 0.2)",
};

const adsbBadge: React.CSSProperties = {
  ...badgeBase,
  background: "rgba(99, 102, 241, 0.12)",
  color: "#818cf8",
  border: "1px solid rgba(99, 102, 241, 0.2)",
};

/* ── Divider ───────────────────────────────────── */

const dividerStyle: React.CSSProperties = {
  height: 1,
  background: "rgba(255, 255, 255, 0.06)",
  margin: "0 14px",
};

/* ── Stats Grid ────────────────────────────────── */

const statsGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 1,
  padding: "10px 14px 8px",
};

const statCard: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 1,
  padding: "4px 0",
};

const statLabel: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 500,
  letterSpacing: "0.08em",
  color: "var(--text-muted, #64748b)",
  textTransform: "uppercase",
};

const statValue: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  fontFamily: mono,
  color: "var(--text-primary, #e2e8f0)",
};

/* ── Coverage ──────────────────────────────────── */

const coverageStyle: React.CSSProperties = {
  fontSize: 9,
  color: "var(--text-muted, #64748b)",
  fontFamily: mono,
  textAlign: "center",
  padding: "4px 14px 10px",
  letterSpacing: "0.04em",
};
