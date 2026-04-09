export interface FlightState {
  icao24: string;
  callsign: string | null;
  originCountry: string;
  timePosition: number | null;
  lastContact: number;
  longitude: number | null;
  latitude: number | null;
  baroAltitude: number | null;
  onGround: boolean;
  velocity: number | null;
  trueTrack: number | null;
  verticalRate: number | null;
  geoAltitude: number | null;
  squawk: string | null;
  category: number; // 0=unknown, 1=none, 2=light, 3=small, 4=large, 5=high-vortex, 6=heavy, 7=high-perf, 8=rotorcraft

  // Aircraft identity (from airplanes.live)
  registration?: string;
  typeCode?: string;
  dbFlags?: number;

  // Navigation integrity
  nic?: number;
  nacP?: number;
  nacV?: number;
  sil?: number;
  silType?: string;
  nicBaro?: number;
  gva?: number;
  sda?: number;
  rc?: number;

  // Speed variants
  ias?: number;
  tas?: number;
  mach?: number;

  // Nav modes
  navModes?: string[];
  roll?: number;

  // Derived weather
  windSpeed?: number;
  windDirection?: number;
  oat?: number;
  tat?: number;

  // Position source (adsb_icao, adsb_icao_nt, adsr_icao, tisb_icao, tisb_trackfile, mlat, etc.)
  positionSource?: string;

  // Signal type derived from positionSource
  signalType?: "adsb" | "mlat" | "tisb" | "adsr" | "ogn" | "unknown";

  // Data source tracking (which network provided this aircraft)
  dataSource?: "opensky" | "airplaneslive" | "adsbfi" | "adsblol" | "adsbone" | "ogn";

  // Aircraft description from registry enrichment
  aircraftDesc?: string;       // e.g. "CESSNA 172S"
  ownerName?: string;          // e.g. "XYZ Flight School"
  isMilitary?: boolean;        // military dbFlags or registry
}

export interface FlightHistoryEntry {
  lat: number;
  lon: number;
  altitude: number | null;
  heading: number | null;
  velocity: number | null;
  timestamp: number;
}

export interface BoundingBox {
  lamin: number;
  lomin: number;
  lamax: number;
  lomax: number;
}
