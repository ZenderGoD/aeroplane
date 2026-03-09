"use client";

import useSWR from "swr";
import type { MetarData } from "@/types/weather";

const fetcher = (url: string) =>
  fetch(url).then((res) => (res.ok ? res.json() : null));

export function useWeather(icao: string | null) {
  const { data, isLoading, error } = useSWR<MetarData | null>(
    icao ? `/api/weather?icao=${icao}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30 * 60 * 1000, // 30 minutes
      revalidateIfStale: false,
    }
  );

  return { weather: data ?? null, isLoading, error: !!error };
}
