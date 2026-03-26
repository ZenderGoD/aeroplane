"use client";

import useSWR from "swr";
import type { CorridorPredictability } from "@/types/corridor";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useCorridorPredictability() {
  const { data, error, isLoading } = useSWR<CorridorPredictability[]>(
    "/api/corridors/predictability",
    fetcher,
    {
      refreshInterval: 60_000,
      dedupingInterval: 30_000,
      fallbackData: [],
    }
  );

  return {
    predictabilities: data ?? [],
    error,
    isLoading,
  };
}
