"use client";

import { useState, useCallback } from "react";
import { checkRateLimit, incrementUsage, getUsageToday } from "@/lib/ai";
import { ScrollArea } from "@/components/ui/scroll-area";

const FEATURE_KEY = "risk-assessment-usage";
const DAILY_LIMIT = 8;

interface RiskAssessment {
  entity: string;
  entityType: string;
  riskLevel: string;
  reason: string;
  recommendation: string;
}

interface Props {
  riskyFlights: Array<{
    callsign: string;
    icao24: string;
    instabilityScore: number;
    factors: string;
    anomalies: string[];
    altitude: number | null;
    speed: number | null;
  }>;
  airports: Array<{
    icao: string;
    name: string;
    pressureScore: number;
    baselineDeviation: number | null;
    holdingCount: number;
    goAroundCount: number;
    activeEventCount: number;
  }>;
  corridors: Array<{
    name: string;
    health: number;
    status: string;
    trend: number;
    trendLabel: string;
    flights: number;
  }>;
}

const RISK_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  critical: { bg: "bg-gray-900/60", border: "border-gray-600/50", text: "text-gray-200", dot: "bg-gray-400" },
  high: { bg: "bg-gray-900/50", border: "border-gray-600/40", text: "text-gray-300", dot: "bg-gray-400" },
  moderate: { bg: "bg-gray-900/40", border: "border-gray-700/30", text: "text-gray-300", dot: "bg-gray-500" },
  low: { bg: "bg-gray-900/30", border: "border-gray-700/30", text: "text-gray-400", dot: "bg-gray-500" },
};

const ENTITY_ICONS: Record<string, string> = {
  flight: "M12 19l9 2-9-18-9 18 9-2zm0 0v-8",
  airport: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  corridor: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7",
};

const OVERALL_LABELS: Record<string, { text: string; color: string }> = {
  high: { text: "HIGH RISK", color: "text-gray-200" },
  elevated: { text: "ELEVATED", color: "text-gray-300" },
  moderate: { text: "MODERATE", color: "text-gray-300" },
  low: { text: "LOW RISK", color: "text-gray-400" },
};

export default function RiskAssessmentTab({ riskyFlights, airports, corridors }: Props) {
  const [assessments, setAssessments] = useState<RiskAssessment[]>([]);
  const [overallRisk, setOverallRisk] = useState<string>("low");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<number | null>(null);
  const [usedToday, setUsedToday] = useState(() => getUsageToday(FEATURE_KEY));

  const remaining = Math.max(0, DAILY_LIMIT - usedToday);

  const generate = useCallback(async () => {
    if (!checkRateLimit(FEATURE_KEY, DAILY_LIMIT)) return;
    setIsLoading(true);
    setError(false);

    try {
      const res = await fetch("/api/risk-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ riskyFlights, airports, corridors }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setAssessments(data.assessments || []);
      setOverallRisk(data.overallRisk || "low");
      setGeneratedAt(data.generatedAt);
      setUsedToday(incrementUsage(FEATURE_KEY));
    } catch {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, [riskyFlights, airports, corridors]);

  return (
    <ScrollArea className="h-[calc(100vh-200px)]">
      <div className="space-y-3 pb-6 pr-2">
        {/* Generate button or overall risk */}
        {assessments.length === 0 && !isLoading && !error && (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-800/30 border border-gray-700/40 flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <p className="text-xs text-gray-400 mb-3">AI analyzes trends and predicts emerging risks</p>
            <button
              onClick={generate}
              disabled={remaining === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700/20 hover:bg-gray-700/30 border border-gray-600/30 text-gray-300 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Generate Risk Assessment
            </button>
            <p className="text-[11px] text-gray-600 mt-2">{remaining}/{DAILY_LIMIT} remaining today</p>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-12">
            <div className="w-5 h-5 border-2 border-gray-500/30 border-t-gray-400 rounded-full animate-spin" />
            <span className="text-xs text-gray-400">Assessing risks...</span>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <p className="text-xs text-gray-400">Failed to generate assessment</p>
            <button onClick={generate} className="text-xs text-gray-300 hover:underline mt-1">
              Retry
            </button>
          </div>
        )}

        {assessments.length > 0 && !isLoading && (
          <>
            {/* Overall risk header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold ${OVERALL_LABELS[overallRisk]?.color || "text-gray-400"}`}>
                  {OVERALL_LABELS[overallRisk]?.text || overallRisk.toUpperCase()}
                </span>
                <span className="text-[11px] text-gray-600">
                  {assessments.length} items · {generatedAt ? new Date(generatedAt).toLocaleTimeString() : ""}
                </span>
              </div>
              <button
                onClick={generate}
                disabled={remaining === 0}
                className="text-xs text-gray-400 hover:text-gray-300 disabled:opacity-40"
              >
                ↻ Refresh
              </button>
            </div>

            {/* Risk cards */}
            {assessments.map((a, i) => {
              const colors = RISK_COLORS[a.riskLevel] || RISK_COLORS.low;
              const icon = ENTITY_ICONS[a.entityType] || ENTITY_ICONS.flight;
              return (
                <div
                  key={`${a.entity}-${i}`}
                  className={`rounded-lg border ${colors.bg} ${colors.border} px-3 py-2.5 space-y-1.5`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg className={`w-3.5 h-3.5 ${colors.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                      </svg>
                      <span className="text-xs font-mono font-bold text-gray-200">{a.entity}</span>
                      <span className="text-[11px] text-gray-500 capitalize">{a.entityType}</span>
                    </div>
                    <span className={`text-[11px] font-bold uppercase ${colors.text} px-1.5 py-0.5 rounded-full ${colors.bg}`}>
                      {a.riskLevel}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">{a.reason}</p>
                  <p className="text-xs text-gray-400/70 leading-relaxed">→ {a.recommendation}</p>
                </div>
              );
            })}
          </>
        )}
      </div>
    </ScrollArea>
  );
}
