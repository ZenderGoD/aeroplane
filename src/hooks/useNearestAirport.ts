"use client";

import { useMemo } from "react";
import type { FlightState } from "@/types/flight";
import type { FlightAirportEstimate } from "@/types/airport";
import { estimateFlightAirports } from "@/lib/airports";

export function useNearestAirport(
  flight: FlightState | null
): FlightAirportEstimate {
  return useMemo(() => {
    if (!flight) return { nearest: null, departure: null };
    return estimateFlightAirports(flight);
  }, [flight]);
}
