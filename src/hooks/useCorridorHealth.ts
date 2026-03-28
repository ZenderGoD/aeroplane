"use client";

import useSWR from "swr";
import type { CorridorHealth } from "@/types/corridor";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useCorridorHealth() {
  const { data, error, isLoading } = useSWR<CorridorHealth[]>(
    "/api/corridors",
    fetcher,
    {
      refreshInterval: 60_000,
      dedupingInterval: 30_000,
      keepPreviousData: true,
    }
  );

  return {
    corridors: Array.isArray(data) ? data : [],
    error,
    isLoading,
  };
}
