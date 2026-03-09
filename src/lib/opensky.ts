import type { FlightState, BoundingBox } from "@/types/flight";

export const OPENSKY_API_URL = "https://opensky-network.org/api/states/all";

export function parseStateVector(raw: unknown[]): FlightState | null {
  const lat = raw[6] as number | null;
  const lon = raw[5] as number | null;
  if (lat === null || lon === null) return null;

  return {
    icao24: raw[0] as string,
    callsign: raw[1] ? (raw[1] as string).trim() : null,
    originCountry: raw[2] as string,
    timePosition: raw[3] as number | null,
    lastContact: raw[4] as number,
    longitude: lon,
    latitude: lat,
    baroAltitude: raw[7] as number | null,
    onGround: raw[8] as boolean,
    velocity: raw[9] as number | null,
    trueTrack: raw[10] as number | null,
    verticalRate: raw[11] as number | null,
    geoAltitude: raw[13] as number | null,
    squawk: raw[14] as string | null,
    category: (raw[17] as number) ?? 0,
  };
}

export function buildQueryString(bbox?: BoundingBox): string {
  if (!bbox) return "";
  const params = new URLSearchParams({
    lamin: String(bbox.lamin),
    lomin: String(bbox.lomin),
    lamax: String(bbox.lamax),
    lomax: String(bbox.lomax),
  });
  return params.toString();
}
