"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { FlightState } from "@/types/flight";
import type { AircraftMeta } from "./useAircraftMeta";
import type { FlightAirportEstimate } from "@/types/airport";
import type { MetarData } from "@/types/weather";

const DAILY_LIMIT = 10;
const STORAGE_KEY = "ai-insights-usage";

interface DailyUsage {
  date: string; // YYYY-MM-DD
  count: number;
}

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getUsageToday(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const usage: DailyUsage = JSON.parse(raw);
    if (usage.date !== getTodayKey()) return 0;
    return usage.count;
  } catch {
    return 0;
  }
}

function incrementUsage(): number {
  const today = getTodayKey();
  const current = getUsageToday();
  const newCount = current + 1;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ date: today, count: newCount })
  );
  return newCount;
}

export interface NarrationResult {
  narration: string | null;
  isLoading: boolean;
  error: boolean;
  generate: () => void;
  remainingToday: number;
  usedToday: number;
  dailyLimit: number;
}

export function useFlightNarration(
  flight: FlightState | null,
  meta: AircraftMeta | null,
  airport?: FlightAirportEstimate | null,
  weather?: MetarData | null
): NarrationResult {
  const [narration, setNarration] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [usedToday, setUsedToday] = useState(() => getUsageToday());

  // Cache narrations per icao24 so switching back doesn't waste a credit
  const cacheRef = useRef<Map<string, string>>(new Map());

  // Reset narration when flight changes
  const icao24 = flight?.icao24 ?? null;
  useEffect(() => {
    const cached = icao24 ? cacheRef.current.get(icao24) ?? null : null;
    setNarration(cached);
    setError(false);
    setIsLoading(false);
  }, [icao24]);

  const generate = useCallback(() => {
    if (!flight) return;

    // Check if already cached
    const cached = cacheRef.current.get(flight.icao24);
    if (cached) {
      setNarration(cached);
      return;
    }

    // Check rate limit
    const currentUsage = getUsageToday();
    if (currentUsage >= DAILY_LIMIT) {
      return;
    }

    setIsLoading(true);
    setError(false);
    setNarration(null);

    fetch("/api/narrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        flight,
        meta,
        airport: airport ?? undefined,
        weather: weather ?? undefined,
      }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`Narration failed: ${r.status}`);
        return r.json();
      })
      .then((d) => {
        const text = d.narration as string;
        setNarration(text);
        cacheRef.current.set(flight.icao24, text);
        const newCount = incrementUsage();
        setUsedToday(newCount);
      })
      .catch(() => {
        setError(true);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [flight, meta, airport, weather]);

  return {
    narration,
    isLoading,
    error,
    generate,
    remainingToday: Math.max(0, DAILY_LIMIT - usedToday),
    usedToday,
    dailyLimit: DAILY_LIMIT,
  };
}
