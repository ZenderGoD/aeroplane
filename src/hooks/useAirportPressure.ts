"use client";

import useSWR from "swr";
import type { AirportPressureScore } from "@/types/pressure";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/** Get pressure scores for all tracked airports */
export function useAirportPressure() {
  const { data, error, isLoading } = useSWR<AirportPressureScore[]>(
    "/api/pressure",
    fetcher,
    {
      refreshInterval: 30_000,
      dedupingInterval: 15_000,
      keepPreviousData: true,
    }
  );

  return {
    pressureScores: Array.isArray(data) ? data : [],
    error,
    isLoading,
  };
}

/** Get pressure score for a single airport */
export function useSingleAirportPressure(icao: string | null) {
  const { data, error, isLoading } = useSWR<AirportPressureScore>(
    icao ? `/api/pressure?icao=${icao}` : null,
    fetcher,
    {
      refreshInterval: 30_000,
      dedupingInterval: 15_000,
      keepPreviousData: true,
    }
  );

  return {
    pressure: data ?? null,
    error,
    isLoading,
  };
}
