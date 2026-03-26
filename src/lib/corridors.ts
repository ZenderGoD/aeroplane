/**
 * Shared corridor definitions — used by both the worker and the client.
 * Extracted from worker/processors/corridorHealth.ts so the map can
 * render corridors without importing the whole processor.
 */

import type { Corridor } from "@/types/corridor";

export const CORRIDORS: Corridor[] = [
  // Indian domestic
  { id: "VIDP-VABB", name: "Delhi - Mumbai", originIcao: "VIDP", destinationIcao: "VABB", originLat: 28.5562, originLon: 77.1000, destLat: 19.0896, destLon: 72.8656, bufferNm: 40 },
  { id: "VIDP-VOBL", name: "Delhi - Bangalore", originIcao: "VIDP", destinationIcao: "VOBL", originLat: 28.5562, originLon: 77.1000, destLat: 13.1979, destLon: 77.7063, bufferNm: 40 },
  { id: "VIDP-VECC", name: "Delhi - Kolkata", originIcao: "VIDP", destinationIcao: "VECC", originLat: 28.5562, originLon: 77.1000, destLat: 22.6547, destLon: 88.4467, bufferNm: 40 },
  { id: "VABB-VOBL", name: "Mumbai - Bangalore", originIcao: "VABB", destinationIcao: "VOBL", originLat: 19.0896, originLon: 72.8656, destLat: 13.1979, destLon: 77.7063, bufferNm: 30 },
  { id: "VABB-VOHY", name: "Mumbai - Hyderabad", originIcao: "VABB", destinationIcao: "VOHY", originLat: 19.0896, originLon: 72.8656, destLat: 17.2403, destLon: 78.4294, bufferNm: 30 },
  { id: "VIDP-VOHY", name: "Delhi - Hyderabad", originIcao: "VIDP", destinationIcao: "VOHY", originLat: 28.5562, originLon: 77.1000, destLat: 17.2403, destLon: 78.4294, bufferNm: 40 },
  { id: "VOBL-VOMM", name: "Bangalore - Chennai", originIcao: "VOBL", destinationIcao: "VOMM", originLat: 13.1979, originLon: 77.7063, destLat: 12.9900, destLon: 80.1693, bufferNm: 25 },
  { id: "VIDP-VOMM", name: "Delhi - Chennai", originIcao: "VIDP", destinationIcao: "VOMM", originLat: 28.5562, originLon: 77.1000, destLat: 12.9900, destLon: 80.1693, bufferNm: 40 },
  // International
  { id: "EGLL-KJFK", name: "London - New York", originIcao: "EGLL", destinationIcao: "KJFK", originLat: 51.4700, originLon: -0.4543, destLat: 40.6413, destLon: -73.7781, bufferNm: 60 },
  { id: "OMDB-EGLL", name: "Dubai - London", originIcao: "OMDB", destinationIcao: "EGLL", originLat: 25.2528, originLon: 55.3644, destLat: 51.4700, destLon: -0.4543, bufferNm: 50 },
  { id: "VIDP-OMDB", name: "Delhi - Dubai", originIcao: "VIDP", destinationIcao: "OMDB", originLat: 28.5562, originLon: 77.1000, destLat: 25.2528, destLon: 55.3644, bufferNm: 40 },
  { id: "VABB-OMDB", name: "Mumbai - Dubai", originIcao: "VABB", destinationIcao: "OMDB", originLat: 19.0896, originLon: 72.8656, destLat: 25.2528, destLon: 55.3644, bufferNm: 40 },
  { id: "WSSS-VHHH", name: "Singapore - Hong Kong", originIcao: "WSSS", destinationIcao: "VHHH", originLat: 1.3644, originLon: 103.9915, destLat: 22.3080, destLon: 113.9185, bufferNm: 40 },
  { id: "VIDP-WSSS", name: "Delhi - Singapore", originIcao: "VIDP", destinationIcao: "WSSS", originLat: 28.5562, originLon: 77.1000, destLat: 1.3644, destLon: 103.9915, bufferNm: 50 },
];

/** Quick lookup by corridor ID */
export const CORRIDOR_MAP = new Map(CORRIDORS.map((c) => [c.id, c]));

/**
 * Check if a flight position is within a corridor's buffer zone.
 * Uses cross-track distance and along-track bounds checking.
 */
export function isFlightInCorridor(
  flightLat: number,
  flightLon: number,
  corridor: Corridor
): boolean {
  // Import here to avoid circular dependency at module level
  const { crossTrackDistanceNm } = require("./routeDeviation") as {
    crossTrackDistanceNm: (
      pLat: number, pLon: number,
      sLat: number, sLon: number,
      eLat: number, eLon: number,
    ) => number;
  };
  const { haversineNm: hav } = require("./geo") as {
    haversineNm: (lat1: number, lon1: number, lat2: number, lon2: number) => number;
  };

  // Cross-track distance check
  const xtDist = crossTrackDistanceNm(
    flightLat, flightLon,
    corridor.originLat, corridor.originLon,
    corridor.destLat, corridor.destLon
  );
  if (xtDist > corridor.bufferNm) return false;

  // Along-track bounds check: flight must be roughly between endpoints
  const d1 = hav(corridor.originLat, corridor.originLon, flightLat, flightLon);
  const d2 = hav(corridor.destLat, corridor.destLon, flightLat, flightLon);
  const routeDist = hav(corridor.originLat, corridor.originLon, corridor.destLat, corridor.destLon);

  // Allow buffer beyond endpoints
  return d1 <= routeDist + corridor.bufferNm && d2 <= routeDist + corridor.bufferNm;
}
