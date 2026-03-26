export interface Corridor {
  id: string; // e.g. "DEL-BOM"
  name: string; // e.g. "Delhi - Mumbai"
  originIcao: string;
  destinationIcao: string;
  originLat: number;
  originLon: number;
  destLat: number;
  destLon: number;
  bufferNm: number; // width of corridor in nm
}

export interface CorridorHealth {
  corridorId: string;
  corridorName: string;
  flightCount: number;
  avgAltitude: number | null;
  avgSpeed: number | null;
  avgSpacingNm: number | null;
  anomalyCount: number;
  healthScore: number; // 0-100
  status: "normal" | "compressed" | "congested" | "disrupted";
  updatedAt: number; // unix ms
}

/** Rolling predictability metrics computed from historical corridor snapshots */
export interface CorridorPredictability {
  corridorId: string;
  corridorName: string;
  /** Average health score over the last N snapshots */
  avgHealthScore: number;
  /** Standard deviation of health score — lower = more predictable */
  healthStdDev: number;
  /** Predictability score 0-100 (100 = rock solid, 0 = chaotic) */
  predictabilityScore: number;
  /** Trend: positive = improving, negative = degrading */
  trend: number;
  trendLabel: "improving" | "stable" | "degrading";
  /** Average flight count over window */
  avgFlightCount: number;
  /** Average spacing over window */
  avgSpacing: number | null;
  /** Number of snapshots used */
  sampleCount: number;
  /** Recent health scores for sparkline (newest last) */
  recentScores: number[];
  updatedAt: number;
}
