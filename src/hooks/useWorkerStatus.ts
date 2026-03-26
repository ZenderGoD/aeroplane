"use client";

import useSWR from "swr";

interface WorkerStatus {
  active: boolean;
  lastTick: number | null;
  ageMs?: number;
  flightCount: number | null;
  message: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useWorkerStatus() {
  const { data, error, isLoading } = useSWR<WorkerStatus>(
    "/api/worker",
    fetcher,
    {
      refreshInterval: 30_000,
      dedupingInterval: 15_000,
      keepPreviousData: true,
    }
  );

  return {
    workerActive: data?.active ?? false,
    lastTick: data?.lastTick ?? null,
    flightCount: data?.flightCount ?? null,
    message: data?.message ?? "Checking worker...",
    error,
    isLoading,
  };
}
