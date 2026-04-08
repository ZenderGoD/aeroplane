"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { Anomaly } from "@/types/anomaly";
import type { InstabilityResult } from "@/lib/instabilityScore";

interface NearbyAnomaly {
  callsign: string;
  anomalyTypes: string[];
  distance: number;
}

interface AirportContext {
  icao: string;
  name: string;
  pressure: unknown | null;
  weather: unknown | null;
  activeEvents: unknown[];
}

interface Props {
  flight: {
    callsign: string | null;
    icao24: string;
    latitude: number | null;
    longitude: number | null;
    baroAltitude: number | null;
    velocity: number | null;
    verticalRate: number | null;
    trueTrack: number | null;
  };
  anomalies: Anomaly[];
  instability: InstabilityResult | null;
  nearbyAnomalies: NearbyAnomaly[];
  airport: AirportContext | null;
  corridor: unknown | null;
}

interface RootCauseResult {
  rootCause: string;
  factors: string[];
  relatedFlights: string[];
  confidence: "high" | "medium" | "low";
  suggestion: string;
}

const CONFIDENCE_COLORS = {
  high: { bg: "bg-gray-800/30", text: "text-gray-300", label: "High Confidence" },
  medium: { bg: "bg-gray-800/30", text: "text-gray-400", label: "Medium Confidence" },
  low: { bg: "bg-gray-800/30", text: "text-gray-300", label: "Low Confidence" },
};

export default function AnomalyRootCause({ flight, anomalies, instability, nearbyAnomalies, airport, corridor }: Props) {
  const [result, setResult] = useState<RootCauseResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const cacheRef = useRef<Map<string, RootCauseResult>>(new Map());

  // Reset when flight changes
  useEffect(() => {
    const cached = cacheRef.current.get(flight.icao24);
    setResult(cached || null);
    setError(false);
    setIsLoading(false);
  }, [flight.icao24]);

  const analyze = useCallback(async () => {
    const cached = cacheRef.current.get(flight.icao24);
    if (cached) { setResult(cached); return; }

    setIsLoading(true);
    setError(false);

    try {
      const res = await fetch("/api/anomaly-explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flight: {
            callsign: flight.callsign,
            icao24: flight.icao24,
            position: { lat: flight.latitude, lon: flight.longitude },
            altitude: flight.baroAltitude ? Math.round(flight.baroAltitude * 3.28084) : null,
            speed: flight.velocity ? Math.round(flight.velocity * 1.94384) : null,
            verticalRate: flight.verticalRate ? Math.round(flight.verticalRate * 196.85) : null,
            heading: flight.trueTrack ? Math.round(flight.trueTrack) : null,
          },
          anomalies,
          instability,
          nearbyAnomalies,
          airport,
          corridor,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setResult(data);
      cacheRef.current.set(flight.icao24, data);
    } catch {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, [flight, anomalies, instability, nearbyAnomalies, airport, corridor]);

  if (anomalies.length === 0) return null;

  return (
    <div className="space-y-2">
      {!result && !isLoading && !error && (
        <button
          onClick={analyze}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-gray-700/15 hover:bg-gray-700/25 border border-gray-600/30 text-gray-300 text-xs font-medium transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Explain these anomalies
        </button>
      )}

      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-4">
          <div className="w-3.5 h-3.5 border-2 border-gray-500/30 border-t-gray-400 rounded-full animate-spin" />
          <span className="text-xs text-gray-400">Analyzing root causes...</span>
        </div>
      )}

      {error && (
        <div className="text-center py-2">
          <p className="text-xs text-gray-400">Analysis failed</p>
          <button onClick={analyze} className="text-xs text-gray-300 hover:underline">Retry</button>
        </div>
      )}

      {result && !isLoading && (
        <div className="rounded-lg border border-gray-700/40 bg-gray-900/20 px-3 py-2.5 space-y-2">
          {/* Header with confidence */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Root Cause Analysis</span>
            <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${CONFIDENCE_COLORS[result.confidence].bg} ${CONFIDENCE_COLORS[result.confidence].text}`}>
              {CONFIDENCE_COLORS[result.confidence].label}
            </span>
          </div>

          {/* Root cause */}
          <p className="text-xs text-gray-300 leading-relaxed">{result.rootCause}</p>

          {/* Factors */}
          {result.factors.length > 0 && (
            <div className="space-y-1">
              <div className="text-[11px] font-semibold text-gray-500 uppercase">Contributing Factors</div>
              {result.factors.map((f, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <span className="text-gray-500 text-xs mt-0.5">•</span>
                  <span className="text-xs text-gray-400 leading-relaxed">{f}</span>
                </div>
              ))}
            </div>
          )}

          {/* Related flights */}
          {result.relatedFlights.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[11px] text-gray-500">Related:</span>
              {result.relatedFlights.map((f) => (
                <span key={f} className="text-[11px] font-mono text-gray-300 bg-gray-800/30 px-1.5 py-0.5 rounded">
                  {f}
                </span>
              ))}
            </div>
          )}

          {/* Watch suggestion */}
          {result.suggestion && (
            <p className="text-xs text-gray-400/80 leading-relaxed">
              ⚠ {result.suggestion}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
