/**
 * Great circle calculation utilities for flight route rendering.
 * Builds on top of the core geo.ts functions.
 */

import { greatCircleIntermediate, haversineNm } from "@/lib/geo";

/**
 * Generate intermediate points along a great circle arc.
 * @returns Array of [lat, lon] tuples
 */
export function greatCirclePoints(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  numPoints: number = 20
): [number, number][] {
  const points: [number, number][] = [];
  for (let i = 0; i <= numPoints; i++) {
    points.push(greatCircleIntermediate(lat1, lon1, lat2, lon2, i / numPoints));
  }
  return points;
}

/**
 * Great circle distance between two points in nautical miles.
 */
export function greatCircleDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  return haversineNm(lat1, lon1, lat2, lon2);
}

/**
 * Estimate fraction (0-1) of progress along a great circle route
 * based on current position. Uses closest-point-on-route projection.
 */
export function progressAlongRoute(
  originLat: number,
  originLon: number,
  destLat: number,
  destLon: number,
  currentLat: number,
  currentLon: number
): number {
  const totalDist = haversineNm(originLat, originLon, destLat, destLon);
  if (totalDist < 0.1) return 0;

  // Sample the route and find the closest point
  const samples = 40;
  let bestFrac = 0;
  let bestDist = Infinity;

  for (let i = 0; i <= samples; i++) {
    const f = i / samples;
    const [pLat, pLon] = greatCircleIntermediate(
      originLat,
      originLon,
      destLat,
      destLon,
      f
    );
    const d = haversineNm(currentLat, currentLon, pLat, pLon);
    if (d < bestDist) {
      bestDist = d;
      bestFrac = f;
    }
  }

  // Clamp to [0, 1]
  return Math.max(0, Math.min(1, bestFrac));
}
