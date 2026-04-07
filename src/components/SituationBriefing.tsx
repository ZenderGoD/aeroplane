"use client";

import { useState, useCallback, useRef } from "react";
import { checkRateLimit, incrementUsage, getUsageToday } from "@/lib/ai";

const FEATURE_KEY = "briefing-usage";
const DAILY_LIMIT = 5;
const STALE_MS = 5 * 60 * 1000; // 5 minutes

interface BriefingData {
  summary: string;
  hotspots: string;
  corridors: string;
  outlook: string;
  generatedAt: number;
}

interface Props {
  events: unknown[];
  pressure: unknown[];
  corridors: unknown[];
  predictability: unknown[];
  baselines: unknown[];
  turnarounds: { activeCount: number; recentCount: number; avgMinutes: number | null };
  flightStats: { total: number; airborne: number; onGround: number; anomalyCount: number };
}

export default function SituationBriefing({
  events, pressure, corridors, predictability, baselines, turnarounds, flightStats
}: Props) {
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [usedToday, setUsedToday] = useState(() => getUsageToday(FEATURE_KEY));
  const cacheRef = useRef<BriefingData | null>(null);

  const isStale = briefing ? Date.now() - briefing.generatedAt > STALE_MS : false;
  const remaining = Math.max(0, DAILY_LIMIT - usedToday);

  const generate = useCallback(async () => {
    if (!checkRateLimit(FEATURE_KEY, DAILY_LIMIT)) return;

    setIsLoading(true);
    setError(false);

    try {
      const res = await fetch("/api/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          events, pressure, corridors, predictability, baselines, turnarounds, flightStats,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setBriefing(data.briefing);
      cacheRef.current = data.briefing;
      setUsedToday(incrementUsage(FEATURE_KEY));
    } catch {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, [events, pressure, corridors, predictability, baselines, turnarounds, flightStats]);

  return (
    <div className="mx-5 mb-3">
      <div className="rounded-xl border border-gray-700/40 bg-gradient-to-br from-gray-900/30 to-gray-950/80 overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-800/20 transition-colors"
        >
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <span className="text-sm font-semibold text-gray-300">AI Situation Briefing</span>
          {briefing && (
            <span className="text-[9px] text-gray-500 ml-auto mr-2">
              {isStale ? "Stale" : "Fresh"} · {new Date(briefing.generatedAt).toLocaleTimeString()}
            </span>
          )}
          <span className="text-[9px] text-gray-600">{remaining}/{DAILY_LIMIT}</span>
          <svg
            className={`w-3.5 h-3.5 text-gray-500 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {expanded && (
          <div className="px-4 pb-3">
            {!briefing && !isLoading && !error && (
              <button
                onClick={generate}
                disabled={remaining === 0}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gray-700/20 hover:bg-gray-700/30 border border-gray-600/30 text-gray-300 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Generate Airspace Briefing
              </button>
            )}

            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-6">
                <div className="w-4 h-4 border-2 border-gray-500/30 border-t-gray-400 rounded-full animate-spin" />
                <span className="text-xs text-gray-400">Analyzing airspace...</span>
              </div>
            )}

            {error && (
              <div className="text-center py-4">
                <p className="text-xs text-gray-400">Failed to generate briefing</p>
                <button onClick={generate} className="text-[10px] text-gray-300 hover:underline mt-1">
                  Retry
                </button>
              </div>
            )}

            {briefing && !isLoading && (
              <div className="space-y-3">
                {/* Summary */}
                <div>
                  <div className="text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-1">Summary</div>
                  <p className="text-xs text-gray-300 leading-relaxed">{briefing.summary}</p>
                </div>

                {/* Hotspots */}
                {briefing.hotspots && (
                  <div>
                    <div className="text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                      🔥 Hotspots
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed">{briefing.hotspots}</p>
                  </div>
                )}

                {/* Corridors */}
                {briefing.corridors && (
                  <div>
                    <div className="text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                      Corridors
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed">{briefing.corridors}</p>
                  </div>
                )}

                {/* Outlook */}
                {briefing.outlook && (
                  <div>
                    <div className="text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                      Outlook
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed">{briefing.outlook}</p>
                  </div>
                )}

                {/* Regenerate */}
                {isStale && remaining > 0 && (
                  <button
                    onClick={generate}
                    className="w-full text-[10px] text-gray-400 hover:text-gray-300 py-1 transition-colors"
                  >
                    ↻ Briefing is stale — regenerate
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
