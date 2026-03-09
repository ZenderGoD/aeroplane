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
}

export interface NearestAirportResult {
  airport: Airport;
  distanceNm: number;
}

export interface FlightAirportEstimate {
  nearest: NearestAirportResult | null;
  departure: NearestAirportResult | null;
}
