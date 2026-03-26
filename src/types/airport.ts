export type AirportType = "large" | "medium" | "small" | "heliport" | "seaplane" | "balloon" | "other";

export interface Airport {
  id: number;
  name: string;
  city: string;
  country: string;
  iata: string | null;
  icao: string | null;
  lat: number;
  lon: number;
  altitude: number; // elevation in feet
  timezone: string;
  type?: AirportType;
}

export interface NearestAirportResult {
  airport: Airport;
  distanceNm: number;
}

export interface FlightAirportEstimate {
  nearest: NearestAirportResult | null;
  departure: NearestAirportResult | null;
}
