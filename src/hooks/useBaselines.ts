"use client";

import useSWR from "swr";
import type { AirportBaseline } from "@/types/baseline";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useBaselines() {
  const { data, error, isLoading } = useSWR<AirportBaseline[]>(
    "/api/baselines?all=true",
    fetcher,
    {
      refreshInterval: 120_000,
      dedupingInterval: 60_000,
      keepPreviousData: true,
    }
  );

  return {
    baselines: Array.isArray(data) ? data : [],
    error,
    isLoading,
  };
}
