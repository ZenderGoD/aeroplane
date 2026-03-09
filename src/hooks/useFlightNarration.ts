"use client";

import useSWR from "swr";
import type { FlightState } from "@/types/flight";
import type { AircraftMeta } from "./useAircraftMeta";
import type { FlightAirportEstimate } from "@/types/airport";
import type { MetarData } from "@/types/weather";

interface NarrationResult {
  narration: string | null;
  isLoading: boolean;
  error: boolean;
}

export function useFlightNarration(
  flight: FlightState | null,
  meta: AircraftMeta | null,
  airport?: FlightAirportEstimate | null,
  weather?: MetarData | null
): NarrationResult {
  const key = flight ? `/api/narrate/${flight.icao24}` : null;

  const { data, isLoading, error } = useSWR(
    key,
    () =>
      fetch("/api/narrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flight,
          meta,
          airport: airport ?? undefined,
          weather: weather ?? undefined,
        }),
      }).then((r) => {
        if (!r.ok) throw new Error(`Narration failed: ${r.status}`);
        return r.json().then((d) => d.narration as string);
      }),
    {
      revalidateOnFocus: false,
      dedupingInterval: 300_000, // 5 minutes
      revalidateIfStale: false,
      shouldRetryOnError: false,
    }
  );

  return {
    narration: data ?? null,
    isLoading,
    error: !!error,
  };
}
