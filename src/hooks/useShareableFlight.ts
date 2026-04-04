"use client";

import { useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";

export function useShareableFlight(): {
  initialFlightIcao: string | null;
  updateFlightUrl: (icao24: string | null) => void;
} {
  const searchParams = useSearchParams();

  const [initialFlightIcao] = useState<string | null>(() => {
    return searchParams.get("flight");
  });

  // Track last value to avoid redundant replaceState calls
  const lastIcaoRef = useRef<string | null>(null);

  const updateFlightUrl = useCallback((icao24: string | null) => {
    if (icao24 === lastIcaoRef.current) return;
    lastIcaoRef.current = icao24;

    const params = new URLSearchParams(window.location.search);

    if (icao24) {
      params.set("flight", icao24);
    } else {
      params.delete("flight");
    }

    const queryString = params.toString();
    const newUrl = queryString
      ? `${window.location.pathname}?${queryString}`
      : window.location.pathname;

    window.history.replaceState(null, "", newUrl);
  }, []);

  return { initialFlightIcao, updateFlightUrl };
}
