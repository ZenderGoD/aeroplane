import airportsData from "@/data/airports.json";
import type {
  Airport,
  NearestAirportResult,
  FlightAirportEstimate,
} from "@/types/airport";
import type { FlightState } from "@/types/flight";
import { haversineNm } from "@/lib/geo";

// Parse raw JSON into typed Airport array (runs once at module load)
const airports: Airport[] = (airportsData as Record<string, unknown>[]).map(
  (raw) => ({
    id: raw.id as number,
    name: raw.name as string,
    city: raw.city as string,
    country: raw.country as string,
    iata: (raw.iata as string) || null,
    icao: (raw.icao as string) || null,
    lat: raw.lat as number,
    lon: raw.lon as number,
    altitude: raw.alt as number,
    timezone: (raw.tz as string) || "",
    type: (raw.type as Airport["type"]) || undefined,
  })
);

// Build ICAO lookup for fast weather queries
const icaoMap = new Map<string, Airport>();
for (const a of airports) {
  if (a.icao) icaoMap.set(a.icao, a);
}

export function nearestAirport(
  lat: number,
  lon: number
): NearestAirportResult | null {
  let best: Airport | null = null;
  let bestDist = Infinity;

  for (const a of airports) {
    const dist = haversineNm(lat, lon, a.lat, a.lon);
    if (dist < bestDist) {
      bestDist = dist;
      best = a;
    }
  }

  return best
    ? { airport: best, distanceNm: Math.round(bestDist * 10) / 10 }
    : null;
}

export function getAirportByIcao(icao: string): Airport | null {
  return icaoMap.get(icao.toUpperCase()) ?? null;
}

// Build IATA lookup
const iataMap = new Map<string, Airport>();
for (const a of airports) {
  if (a.iata) iataMap.set(a.iata.toUpperCase(), a);
}

/**
 * Find an airport by ICAO code, IATA code, city name, or airport name.
 * Returns the best match or null.
 */
export function findAirport(query: string): Airport | null {
  const q = query.trim().toUpperCase();
  if (!q) return null;

  // Exact ICAO match
  const byIcao = icaoMap.get(q);
  if (byIcao) return byIcao;

  // Exact IATA match
  const byIata = iataMap.get(q);
  if (byIata) return byIata;

  // City or name match (prefer large/medium airports)
  const lowerQ = q.toLowerCase();
  let best: Airport | null = null;
  let bestScore = 0;

  for (const a of airports) {
    const cityMatch = a.city?.toLowerCase() === lowerQ;
    const nameMatch = a.name?.toLowerCase().includes(lowerQ);
    if (!cityMatch && !nameMatch) continue;

    // Score: exact city match > name match, large > medium > small
    let score = cityMatch ? 100 : 10;
    if (a.type === "large") score += 50;
    else if (a.type === "medium") score += 20;
    else if (a.type === "small") score += 5;

    if (score > bestScore) {
      bestScore = score;
      best = a;
    }
  }

  return best;
}

export function estimateFlightAirports(
  flight: FlightState
): FlightAirportEstimate {
  if (flight.latitude === null || flight.longitude === null) {
    return { nearest: null, departure: null };
  }

  const nearest = nearestAirport(flight.latitude, flight.longitude);

  // Estimate departure: project backward along reverse heading
  let departure: NearestAirportResult | null = null;
  if (
    flight.trueTrack !== null &&
    flight.baroAltitude !== null &&
    !flight.onGround
  ) {
    const reverseHeading = (flight.trueTrack + 180) % 360;
    const headingRad = (reverseHeading * Math.PI) / 180;

    // Estimate distance based on altitude (rough heuristic)
    const altFeet = flight.baroAltitude * 3.28084;
    const estimatedNm = Math.min(Math.max(altFeet / 20, 30), 2000);

    // Project point backward
    const depLat =
      flight.latitude + (estimatedNm / 60) * Math.cos(headingRad);
    const depLon =
      flight.longitude +
      ((estimatedNm / 60) * Math.sin(headingRad)) /
        Math.cos((flight.latitude * Math.PI) / 180);

    departure = nearestAirport(depLat, depLon);

    // Don't show departure if it's the same as nearest
    if (
      departure &&
      nearest &&
      departure.airport.icao === nearest.airport.icao
    ) {
      departure = null;
    }
  }

  return { nearest, departure };
}
