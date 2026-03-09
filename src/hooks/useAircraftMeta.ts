"use client";

import useSWR from "swr";

export interface AircraftMeta {
  registration: string | null;
  type: string | null;
  typeCode: string | null;
  manufacturer: string | null;
  owner: string | null;
}

const fetcher = (url: string) =>
  fetch(url).then((res) => (res.ok ? res.json() : null));

export function useAircraftMeta(icao24: string | null) {
  const { data, isLoading } = useSWR<AircraftMeta | null>(
    icao24 ? `/api/aircraft?icao24=${icao24}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  return { meta: data ?? null, isLoading };
}
