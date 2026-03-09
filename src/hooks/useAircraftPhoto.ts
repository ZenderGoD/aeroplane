"use client";

import useSWR from "swr";
import type { AircraftPhoto } from "@/types/photo";

const fetcher = (url: string) =>
  fetch(url).then((res) => (res.ok ? res.json() : null));

export function useAircraftPhoto(
  icao24: string | null,
  registration: string | null
) {
  const params = new URLSearchParams();
  if (icao24) params.set("icao24", icao24);
  if (registration) params.set("reg", registration);

  const key = icao24 ? `/api/photo?${params.toString()}` : null;

  const { data, isLoading } = useSWR<AircraftPhoto | null>(key, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 24 * 60 * 60 * 1000, // 24 hours
    revalidateIfStale: false,
  });

  return { photo: data ?? null, isLoading };
}
