"use client";

import { useState, useCallback } from "react";

interface AirportAnalysis {
  situation: string;
  comparison: string;
  weatherImpact: string;
  outlook: string;
}

interface Props {
  airportIcao: string;
  airportName: string;
  pressure: unknown;
  baseline: unknown | null;
  weather: unknown | null;
  events: unknown[];
  turnarounds: {
    activeCount: number;
    recentCount: number;
    avgTurnaroundMinutes: number | null;
    longestActiveMinutes: number | null;
  };
  corridors: Array<{
    name: string;
    healthScore: number;
    status: string;
    trend: string;
  }>;
}

const RISK_BADGE: Record<string, { bg: string; text: string }> = {
  normal: { bg: "bg-gray-800/40", text: "text-gray-400" },
  elevated: { bg: "bg-gray-800/40", text: "text-gray-300" },
  high: { bg: "bg-gray-800/40", text: "text-gray-300" },
  critical: { bg: "bg-gray-800/40", text: "text-gray-200" },
};

export default function AirportIntelCard({
  airportIcao, airportName, pressure, baseline, weather, events, turnarounds, corridors
}: Props) {
  const [analysis, setAnalysis] = useState<AirportAnalysis | null>(null);
  const [riskLevel, setRiskLevel] = useState<string>("normal");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  const analyze = useCallback(async () => {
    setIsLoading(true);
    setError(false);

    try {
      const res = await fetch("/api/airport-intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          airport: { icao: airportIcao, name: airportName, pressure, baseline, weather },
          events,
          turnarounds,
          corridors,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setAnalysis(data.analysis);
      setRiskLevel(data.riskLevel || "normal");
    } catch {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, [airportIcao, airportName, pressure, baseline, weather, events, turnarounds, corridors]);

  if (!analysis && !isLoading && !error) {
    return (
      <button
        onClick={analyze}
        className="w-full mt-2 flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-gray-700/10 hover:bg-gray-700/20 border border-gray-700/30 text-gray-300 text-[10px] font-medium transition-colors"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        AI Analysis
      </button>
    );
  }

  if (isLoading) {
    return (
      <div className="mt-2 flex items-center justify-center gap-2 py-3">
        <div className="w-3 h-3 border-2 border-gray-500/30 border-t-gray-400 rounded-full animate-spin" />
        <span className="text-[10px] text-gray-400">Analyzing {airportIcao}...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-2 text-center py-2">
        <p className="text-[10px] text-gray-400">Analysis failed</p>
        <button onClick={analyze} className="text-[10px] text-gray-300 hover:underline">Retry</button>
      </div>
    );
  }

  if (!analysis) return null;

  const badge = RISK_BADGE[riskLevel] || RISK_BADGE.normal;

  return (
    <div className="mt-2 rounded-lg border border-gray-700/30 bg-gray-900/15 px-3 py-2.5 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">AI Intelligence</span>
        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${badge.bg} ${badge.text}`}>
          {riskLevel}
        </span>
      </div>

      {analysis.situation && (
        <div>
          <div className="text-[9px] font-semibold text-gray-500 uppercase">Situation</div>
          <p className="text-[10px] text-gray-300 leading-relaxed">{analysis.situation}</p>
        </div>
      )}

      {analysis.comparison && (
        <div>
          <div className="text-[9px] font-semibold text-gray-500 uppercase">vs Baseline</div>
          <p className="text-[10px] text-gray-300 leading-relaxed">{analysis.comparison}</p>
        </div>
      )}

      {analysis.weatherImpact && (
        <div>
          <div className="text-[9px] font-semibold text-gray-500 uppercase">Weather Impact</div>
          <p className="text-[10px] text-gray-300 leading-relaxed">{analysis.weatherImpact}</p>
        </div>
      )}

      {analysis.outlook && (
        <div>
          <div className="text-[9px] font-semibold text-gray-500 uppercase">Outlook</div>
          <p className="text-[10px] text-gray-400/80 leading-relaxed">{analysis.outlook}</p>
        </div>
      )}
    </div>
  );
}
