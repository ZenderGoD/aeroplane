/**
 * Route deviation detection utilities.
 * Computes cross-track distance from a flight's position to its expected
 * great-circle route between estimated departure and destination airports.
 */

import type { FlightState, FlightHistoryEntry } from "@/types/flight";
import type { FlightAirportEstimate } from "@/types/airport";
import { haversineNm, bearing, greatCircleArc } from "@/lib/geo";

const DEG_TO_RAD = Math.PI / 180;
const EARTH_RADIUS_NM = 3440.065;

export interface RouteDeviationResult {
  deviationNm: number; // current cross-track distance
  maxRecentDeviationNm: number; // max from recent history
  expectedRoute: { lat: number; lon: number }[]; // great-circle arc points
  departureIcao: string;
  destinationIcao: string;
}

/**
 * Compute perpendicular (cross-track) distance in NM from a point
 * to the great-circle line defined by start → end.
 *
 * Formula: d_xt = asin(sin(d13/R) * sin(θ13 - θ12)) * R
 * where d13 = distance from start to point, θ13 = bearing start→point,
 * θ12 = bearing start→end, R = Earth radius in NM.
 */
export function crossTrackDistanceNm(
  pointLat: number,
  pointLon: number,
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number
): number {
  const d13 = haversineNm(startLat, startLon, pointLat, pointLon);
  const theta13 = bearing(startLat, startLon, pointLat, pointLon) * DEG_TO_RAD;
  const theta12 = bearing(startLat, startLon, endLat, endLon) * DEG_TO_RAD;

  const dXt =
    Math.asin(
      Math.sin(d13 / EARTH_RADIUS_NM) * Math.sin(theta13 - theta12)
    ) * EARTH_RADIUS_NM;

  return Math.abs(dXt);
}

/**
 * Compute along-track distance in NM — how far along the start→end
 * great circle the point's closest position is. Used to check if a
 * point is "between" the two endpoints.
 */
function alongTrackDistanceNm(
  pointLat: number,
  pointLon: number,
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number
): number {
  const d13 = haversineNm(startLat, startLon, pointLat, pointLon);
  const dXt = crossTrackDistanceNm(
    pointLat,
    pointLon,
    startLat,
    startLon,
    endLat,
    endLon
  );
  return (
    Math.acos(
      Math.cos(d13 / EARTH_RADIUS_NM) / Math.cos(dXt / EARTH_RADIUS_NM)
    ) * EARTH_RADIUS_NM
  );
}

/**
 * Check if a flight is deviating from its expected great-circle route.
 * Returns null if no deviation detected or if data is insufficient.
 */
export function checkRouteDeviation(
  flight: FlightState,
  history: FlightHistoryEntry[],
  airports: FlightAirportEstimate
): RouteDeviationResult | null {
  // Guards: need both airports, flight must be airborne, enough history
  if (flight.onGround) return null;
  if (flight.latitude === null || flight.longitude === null) return null;
  if (!airports.nearest?.airport.icao || !airports.departure?.airport.icao)
    return null;
  if (history.length < 5) return null;

  const depAirport = airports.departure.airport;
  const destAirport = airports.nearest.airport;

  // Skip very short routes (too much variance in SID/STAR)
  const routeDistNm = haversineNm(
    depAirport.lat,
    depAirport.lon,
    destAirport.lat,
    destAirport.lon
  );
  if (routeDistNm < 50) return null;

  // Skip flights at low altitude (still in departure/arrival phase)
  const altFeet =
    flight.baroAltitude !== null ? flight.baroAltitude * 3.28084 : 0;
  if (altFeet < 5000) return null;

  // Check that flight is between the two airports (along-track)
  const atDist = alongTrackDistanceNm(
    flight.latitude,
    flight.longitude,
    depAirport.lat,
    depAirport.lon,
    destAirport.lat,
    destAirport.lon
  );
  // If along-track distance is negative or exceeds route distance + buffer, skip
  if (isNaN(atDist) || atDist < 0 || atDist > routeDistNm + 30) return null;

  // Current cross-track distance
  const deviationNm = crossTrackDistanceNm(
    flight.latitude,
    flight.longitude,
    depAirport.lat,
    depAirport.lon,
    destAirport.lat,
    destAirport.lon
  );

  // Compute max deviation from recent history (last 5 entries)
  const recentHistory = history.slice(-5);
  let maxRecentDeviationNm = deviationNm;
  for (const h of recentHistory) {
    if (h.lat === null || h.lon === null) continue;
    const d = crossTrackDistanceNm(
      h.lat,
      h.lon,
      depAirport.lat,
      depAirport.lon,
      destAirport.lat,
      destAirport.lon
    );
    if (d > maxRecentDeviationNm) maxRecentDeviationNm = d;
  }

  // Threshold: higher altitude = more tolerance (airways aren't perfectly straight)
  const threshold = altFeet > 20000 ? 25 : 15;
  if (maxRecentDeviationNm < threshold) return null;

  // Generate expected route for visualization
  const arcPoints = greatCircleArc(
    depAirport.lat,
    depAirport.lon,
    destAirport.lat,
    destAirport.lon,
    30
  );

  return {
    deviationNm: Math.round(deviationNm * 10) / 10,
    maxRecentDeviationNm: Math.round(maxRecentDeviationNm * 10) / 10,
    expectedRoute: arcPoints.map(([lat, lon]) => ({ lat, lon })),
    departureIcao: depAirport.icao!,
    destinationIcao: destAirport.icao!,
  };
}
