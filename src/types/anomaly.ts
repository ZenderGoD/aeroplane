export type AnomalyType =
  | "squawk_7500"
  | "squawk_7600"
  | "squawk_7700"
  | "holding_pattern"
  | "rapid_descent"
  | "unusual_speed"
  | "ground_stop";

export interface Anomaly {
  icao24: string;
  callsign: string | null;
  type: AnomalyType;
  severity: "critical" | "warning" | "info";
  message: string;
  detectedAt: number;
}

export const ANOMALY_LABELS: Record<AnomalyType, string> = {
  squawk_7500: "Hijack Alert (7500)",
  squawk_7600: "Radio Failure (7600)",
  squawk_7700: "Emergency (7700)",
  holding_pattern: "Holding Pattern",
  rapid_descent: "Rapid Descent",
  unusual_speed: "Unusual Speed",
  ground_stop: "Unexpected Ground Stop",
};

export const ANOMALY_SEVERITY: Record<AnomalyType, "critical" | "warning" | "info"> = {
  squawk_7500: "critical",
  squawk_7600: "critical",
  squawk_7700: "critical",
  holding_pattern: "info",
  rapid_descent: "warning",
  unusual_speed: "info",
  ground_stop: "info",
};
