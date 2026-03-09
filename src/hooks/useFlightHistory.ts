"use client";

import { useRef, useCallback } from "react";
import type { FlightState } from "@/types/flight";
import { updateFlightHistory, type FlightHistoryMap } from "@/lib/flightHistory";

export function useFlightHistory(flights: FlightState[]): {
  history: FlightHistoryMap;
  update: () => void;
} {
  const historyRef = useRef<FlightHistoryMap>(new Map());
  const flightsRef = useRef(flights);
  flightsRef.current = flights;

  const update = useCallback(() => {
    if (flightsRef.current.length === 0) return;
    historyRef.current = updateFlightHistory(
      historyRef.current,
      flightsRef.current,
      Date.now()
    );
  }, []);

  // Update history whenever flights change
  if (flights.length > 0) {
    historyRef.current = updateFlightHistory(
      historyRef.current,
      flights,
      Date.now()
    );
  }

  return { history: historyRef.current, update };
}
