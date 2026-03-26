export type EventType =
  | "go_around_cluster"
  | "holding_surge"
  | "diversion_cluster"
  | "ground_stop_mass"
  | "traffic_surge"
  | "approach_instability"
  | "corridor_congestion"
  | "departure_delay_wave";

export type EventSeverity = "critical" | "warning" | "info";

export interface FlightEvent {
  id?: number;
  eventType: EventType;
  severity: EventSeverity;
  airportIcao: string | null;
  corridorId: string | null;
  affectedFlights: string[];
  message: string;
  metadata: Record<string, unknown>;
  detectedAt: number; // unix ms
  resolvedAt: number | null;
}
