export interface TurnaroundRecord {
  id?: number;
  icao24: string;
  callsign: string | null;
  airportIcao: string;
  airlineIcao: string | null;
  aircraftType: string | null;
  arrivalTime: number; // unix ms
  departureTime: number | null; // unix ms
  turnaroundMinutes: number | null;
  status: "on_ground" | "departed" | "completed";
}

export interface TurnaroundState {
  icao24: string;
  callsign: string | null;
  wasOnGround: boolean;
  nearAirportIcao: string | null;
  nearAirportName: string | null;
  lastSeen: number; // unix ms
  landedAt: number | null; // unix ms
}
