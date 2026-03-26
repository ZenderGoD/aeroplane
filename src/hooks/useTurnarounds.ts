"use client";

import useSWR from "swr";

interface TurnaroundRow {
  id: number;
  icao24: string;
  callsign: string | null;
  airport_icao: string;
  airline_icao: string | null;
  aircraft_type: string | null;
  arrival_time: string;
  departure_time: string | null;
  turnaround_minutes: number | null;
  status: string;
  updated_at: string;
}

interface TurnaroundResponse {
  active: TurnaroundRow[];
  recent: TurnaroundRow[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useTurnarounds() {
  const { data, error, isLoading } = useSWR<TurnaroundResponse>(
    "/api/turnarounds",
    fetcher,
    {
      refreshInterval: 60_000,
      dedupingInterval: 30_000,
      keepPreviousData: true,
    }
  );

  return {
    active: data?.active ?? [],
    recent: data?.recent ?? [],
    error,
    isLoading,
  };
}

export type { TurnaroundRow };
