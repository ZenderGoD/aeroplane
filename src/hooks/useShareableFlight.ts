"use client";

import { useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export function useShareableFlight(): {
  initialFlightIcao: string | null;
  updateFlightUrl: (icao24: string | null) => void;
} {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [initialFlightIcao] = useState<string | null>(() => {
    return searchParams.get("flight");
  });

  const updateFlightUrl = useCallback(
    (icao24: string | null) => {
      const params = new URLSearchParams(searchParams.toString());

      if (icao24) {
        params.set("flight", icao24);
      } else {
        params.delete("flight");
      }

      const queryString = params.toString();
      const newUrl = queryString
        ? `${window.location.pathname}?${queryString}`
        : window.location.pathname;

      router.replace(newUrl, { scroll: false });
    },
    [searchParams, router]
  );

  return { initialFlightIcao, updateFlightUrl };
}
