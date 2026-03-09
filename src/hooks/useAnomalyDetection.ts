"use client";

import { useMemo } from "react";
import type { FlightState } from "@/types/flight";
import type { Anomaly } from "@/types/anomaly";
import type { FlightHistoryMap } from "@/lib/flightHistory";
import { detectAnomalies } from "@/lib/anomalyDetection";

export function useAnomalyDetection(
  flights: FlightState[],
  history: FlightHistoryMap
): {
  anomalies: Anomaly[];
  anomalyByIcao: Map<string, Anomaly[]>;
  anomalyIcaos: Set<string>;
} {
  return useMemo(() => {
    const anomalies = detectAnomalies(flights, history);
    const anomalyByIcao = new Map<string, Anomaly[]>();
    for (const a of anomalies) {
      const existing = anomalyByIcao.get(a.icao24) ?? [];
      existing.push(a);
      anomalyByIcao.set(a.icao24, existing);
    }
    const anomalyIcaos = new Set(anomalies.map((a) => a.icao24));
    return { anomalies, anomalyByIcao, anomalyIcaos };
  }, [flights, history]);
}
