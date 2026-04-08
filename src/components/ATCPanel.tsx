"use client";

import { useState, useCallback, useMemo } from "react";
import { getFrequenciesByIcao } from "@/data/atcFrequencies";
import { getApproachesByIcao } from "@/data/approaches";
import type { ATCFrequency } from "@/data/atcFrequencies";
import type { ApproachProcedure } from "@/data/approaches";

// ── Color config per frequency type ─────────────────────────────────────

const FREQ_TYPE_CONFIG: Record<
  ATCFrequency["type"],
  { bg: string; border: string; text: string; label: string }
> = {
  ATIS: { bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.25)", text: "#cbd5e1", label: "ATIS" },
  GND: { bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.25)", text: "#cbd5e1", label: "GND" },
  TWR: { bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.25)", text: "#94a3b8", label: "TWR" },
  DEP: { bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.25)", text: "#cbd5e1", label: "DEP" },
  APP: { bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.25)", text: "#94a3b8", label: "APP" },
  CTR: { bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.25)", text: "#e2e8f0", label: "CTR" },
  UNICOM: { bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.25)", text: "#94a3b8", label: "UNI" },
};

const APPROACH_TYPE_CONFIG: Record<
  ApproachProcedure["type"],
  { bg: string; border: string; text: string }
> = {
  ILS: { bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.25)", text: "#cbd5e1" },
  RNAV: { bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.25)", text: "#cbd5e1" },
  VOR: { bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.25)", text: "#94a3b8" },
  NDB: { bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.25)", text: "#94a3b8" },
  VISUAL: { bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.25)", text: "#94a3b8" },
  LOC: { bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.25)", text: "#cbd5e1" },
};

// ── Frequency ordering ──────────────────────────────────────────────────

const FREQ_ORDER: ATCFrequency["type"][] = ["ATIS", "GND", "TWR", "DEP", "APP", "CTR", "UNICOM"];

// ── Component ───────────────────────────────────────────────────────────

interface ATCPanelProps {
  icao: string;
  onClose: () => void;
}

export default function ATCPanel({ icao, onClose }: ATCPanelProps) {
  const [copiedFreq, setCopiedFreq] = useState<string | null>(null);
  const [expandedApproach, setExpandedApproach] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"freq" | "app">("freq");

  const freqData = useMemo(() => getFrequenciesByIcao(icao), [icao]);
  const approachData = useMemo(() => getApproachesByIcao(icao), [icao]);

  // Group frequencies by type, maintaining order
  const groupedFreqs = useMemo(() => {
    if (!freqData) return [];
    const groups: { type: ATCFrequency["type"]; items: ATCFrequency[] }[] = [];
    const map = new Map<ATCFrequency["type"], ATCFrequency[]>();

    for (const f of freqData.frequencies) {
      if (!map.has(f.type)) map.set(f.type, []);
      map.get(f.type)!.push(f);
    }

    for (const type of FREQ_ORDER) {
      const items = map.get(type);
      if (items && items.length > 0) {
        groups.push({ type, items });
      }
    }

    return groups;
  }, [freqData]);

  const copyFrequency = useCallback((freq: string) => {
    navigator.clipboard.writeText(freq).then(() => {
      setCopiedFreq(freq);
      setTimeout(() => setCopiedFreq(null), 1500);
    }).catch(() => {
      // clipboard not available
    });
  }, []);

  const toggleApproach = useCallback((name: string) => {
    setExpandedApproach((prev) => (prev === name ? null : name));
  }, []);

  const hasData = freqData || approachData;

  return (
    <div
      className="absolute top-0 right-0 bottom-0 z-[1100] flex flex-col overflow-hidden transition-all duration-300"
      style={{
        width: "340px",
        background: "rgba(6,8,13,0.95)",
        borderLeft: "1px solid var(--border-default)",
        backdropFilter: "blur(16px)",
      }}
    >
      {/* Header */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-4"
        style={{
          height: "48px",
          borderBottom: "1px solid var(--border-default)",
          background: "rgba(6,8,13,0.98)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{
              background: "rgba(148,163,184,0.1)",
              border: "1px solid rgba(148,163,184,0.2)",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#94a3b8"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 16.1A5 5 0 0 1 5.9 20M2 12.05A9 9 0 0 1 9.95 20M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6" />
              <line x1="2" y1="20" x2="2.01" y2="20" />
            </svg>
          </div>
          <div>
            <span
              className="font-mono text-xs font-bold"
              style={{ color: "#94a3b8" }}
            >
              {icao}
            </span>
            <span
              className="ml-2 text-xs"
              style={{ color: "var(--text-secondary)" }}
            >
              ATC / Approaches
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors"
          style={{ color: "var(--text-muted)" }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div
        className="flex-shrink-0 flex"
        style={{ borderBottom: "1px solid var(--border-default)" }}
      >
        <button
          onClick={() => setActiveTab("freq")}
          className="flex-1 py-2 text-center transition-colors"
          style={{
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.05em",
            color: activeTab === "freq" ? "#cbd5e1" : "var(--text-muted)",
            background:
              activeTab === "freq"
                ? "rgba(148,163,184,0.08)"
                : "transparent",
            borderBottom:
              activeTab === "freq"
                ? "2px solid #cbd5e1"
                : "2px solid transparent",
          }}
        >
          FREQUENCIES
          {freqData && (
            <span
              className="ml-1.5 text-[11px] px-1.5 py-0.5 rounded-full"
              style={{
                background: "rgba(148,163,184,0.15)",
                color: "#cbd5e1",
              }}
            >
              {freqData.frequencies.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("app")}
          className="flex-1 py-2 text-center transition-colors"
          style={{
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.05em",
            color: activeTab === "app" ? "#cbd5e1" : "var(--text-muted)",
            background:
              activeTab === "app"
                ? "rgba(148,163,184,0.08)"
                : "transparent",
            borderBottom:
              activeTab === "app"
                ? "2px solid #cbd5e1"
                : "2px solid transparent",
          }}
        >
          APPROACHES
          {approachData && (
            <span
              className="ml-1.5 text-[11px] px-1.5 py-0.5 rounded-full"
              style={{
                background: "rgba(148,163,184,0.15)",
                color: "#cbd5e1",
              }}
            >
              {approachData.approaches.length}
            </span>
          )}
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-3">
        {!hasData && (
          <div className="text-center py-12">
            <div
              className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-3"
              style={{
                background: "rgba(148,163,184,0.06)",
                border: "1px solid rgba(148,163,184,0.1)",
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--text-faint)"
                strokeWidth="1.5"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
            </div>
            <p
              className="text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              No ATC data available for{" "}
              <span className="font-mono font-bold">{icao}</span>
            </p>
          </div>
        )}

        {/* ── Frequencies Tab ──────────────────────── */}
        {activeTab === "freq" && freqData && (
          <div className="space-y-3">
            {/* Airport name sub-header */}
            <div
              className="text-xs font-semibold uppercase tracking-wider px-1"
              style={{ color: "var(--text-faint)" }}
            >
              {freqData.name}
            </div>

            {groupedFreqs.map((group) => {
              const config = FREQ_TYPE_CONFIG[group.type];
              return (
                <div key={group.type} className="space-y-1">
                  {/* Group header */}
                  <div className="flex items-center gap-2 px-1 mb-1.5">
                    <span
                      className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-md"
                      style={{
                        background: config.bg,
                        border: `1px solid ${config.border}`,
                        color: config.text,
                      }}
                    >
                      {config.label}
                    </span>
                    <div
                      className="flex-1 h-px"
                      style={{ background: "var(--border-subtle)" }}
                    />
                  </div>

                  {/* Frequency rows */}
                  {group.items.map((f, idx) => (
                    <button
                      key={`${f.type}-${idx}`}
                      onClick={() => copyFrequency(f.frequency)}
                      className="w-full flex items-center justify-between rounded-lg px-3 py-2 transition-all hover:brightness-125 group/row cursor-pointer"
                      style={{
                        background: "var(--surface-2)",
                        border: "1px solid var(--border-subtle)",
                      }}
                      title={`Click to copy ${f.frequency}`}
                    >
                      <span
                        className="text-xs"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {f.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className="font-mono text-xs font-bold tabular-nums tracking-wide"
                          style={{ color: config.text }}
                        >
                          {f.frequency}
                        </span>
                        {copiedFreq === f.frequency ? (
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#94a3b8"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : (
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="var(--text-faint)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="opacity-0 group-hover/row:opacity-100 transition-opacity"
                          >
                            <rect
                              x="9"
                              y="9"
                              width="13"
                              height="13"
                              rx="2"
                              ry="2"
                            />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "freq" && !freqData && hasData && (
          <div className="text-center py-8">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              No frequency data for this airport
            </p>
          </div>
        )}

        {/* ── Approaches Tab ───────────────────────── */}
        {activeTab === "app" && approachData && (
          <div className="space-y-1.5">
            {approachData.approaches.map((app) => {
              const config = APPROACH_TYPE_CONFIG[app.type];
              const isExpanded = expandedApproach === app.name;

              return (
                <div key={app.name}>
                  <button
                    onClick={() => toggleApproach(app.name)}
                    className="w-full flex items-center justify-between rounded-lg px-3 py-2.5 transition-all hover:brightness-110"
                    style={{
                      background: isExpanded
                        ? "var(--surface-3)"
                        : "var(--surface-2)",
                      border: isExpanded
                        ? `1px solid ${config.border}`
                        : "1px solid var(--border-subtle)",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[11px] font-bold px-1.5 py-0.5 rounded"
                        style={{
                          background: config.bg,
                          border: `1px solid ${config.border}`,
                          color: config.text,
                        }}
                      >
                        {app.type}
                      </span>
                      <span
                        className="text-xs font-medium"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {app.name}
                      </span>
                    </div>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--text-muted)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        transform: isExpanded
                          ? "rotate(180deg)"
                          : "rotate(0deg)",
                        transition: "transform 0.2s ease",
                      }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {isExpanded && (
                    <div
                      className="mx-1 mt-1 rounded-lg px-3 py-3 space-y-2.5 animate-slide-up"
                      style={{
                        background: "var(--surface-1)",
                        border: `1px solid ${config.border}`,
                      }}
                    >
                      {/* Course & Glideslope */}
                      <div className="grid grid-cols-3 gap-2">
                        <DetailCell
                          label="Course"
                          value={`${app.course.toString().padStart(3, "0")}${"\u00B0"}`}
                        />
                        {app.glideslope !== undefined && (
                          <DetailCell
                            label="Glideslope"
                            value={`${app.glideslope.toFixed(1)}${"\u00B0"}`}
                          />
                        )}
                        {app.frequency && (
                          <DetailCell
                            label="ILS Freq"
                            value={app.frequency}
                            highlight
                          />
                        )}
                      </div>

                      {/* Minimums */}
                      <div>
                        <div
                          className="text-[11px] font-bold uppercase tracking-wider mb-1.5"
                          style={{ color: "var(--text-faint)" }}
                        >
                          Minimums
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <DetailCell
                            label="DH"
                            value={`${app.minimums.dh} ft`}
                          />
                          <DetailCell
                            label="Visibility"
                            value={`${app.minimums.visibility} SM`}
                          />
                          {app.minimums.rvr !== undefined && (
                            <DetailCell
                              label="RVR"
                              value={`${app.minimums.rvr} ft`}
                            />
                          )}
                        </div>
                      </div>

                      {/* Missed Approach */}
                      <div>
                        <div
                          className="text-[11px] font-bold uppercase tracking-wider mb-1"
                          style={{ color: "var(--text-faint)" }}
                        >
                          Missed Approach
                        </div>
                        <p
                          className="text-xs leading-relaxed"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {app.missed}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "app" && !approachData && hasData && (
          <div className="text-center py-8">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              No approach data for this airport
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Detail cell sub-component ───────────────────────────────────────────

function DetailCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="rounded-md px-2 py-1.5 text-center"
      style={{ background: "var(--surface-2)" }}
    >
      <div
        className="text-[11px] uppercase tracking-wider mb-0.5"
        style={{ color: "var(--text-faint)" }}
      >
        {label}
      </div>
      <div
        className="text-xs font-mono font-bold tabular-nums"
        style={{ color: highlight ? "#cbd5e1" : "var(--text-primary)" }}
      >
        {value}
      </div>
    </div>
  );
}
