/**
 * Geographic calculation utilities for aviation.
 * All distances in nautical miles unless otherwise noted.
 */

const EARTH_RADIUS_NM = 3440.065;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/** Haversine distance in nautical miles between two lat/lon points */
export function haversineNm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLon = (lon2 - lon1) * DEG_TO_RAD;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG_TO_RAD) *
      Math.cos(lat2 * DEG_TO_RAD) *
      Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_NM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Haversine distance in kilometers */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  return haversineNm(lat1, lon1, lat2, lon2) * 1.852;
}

/** Initial bearing (forward azimuth) from point 1 to point 2 in degrees [0,360) */
export function bearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLon = (lon2 - lon1) * DEG_TO_RAD;
  const la1 = lat1 * DEG_TO_RAD;
  const la2 = lat2 * DEG_TO_RAD;
  const y = Math.sin(dLon) * Math.cos(la2);
  const x =
    Math.cos(la1) * Math.sin(la2) -
    Math.sin(la1) * Math.cos(la2) * Math.cos(dLon);
  return ((Math.atan2(y, x) * RAD_TO_DEG) + 360) % 360;
}

/**
 * Compute closing speed between two flights in knots.
 * Positive = closing, negative = separating.
 */
export function closingSpeedKts(
  lat1: number, lon1: number, heading1: number, speed1Ms: number,
  lat2: number, lon2: number, heading2: number, speed2Ms: number
): number {
  const kts1 = speed1Ms * 1.94384;
  const kts2 = speed2Ms * 1.94384;
  const h1 = heading1 * DEG_TO_RAD;
  const h2 = heading2 * DEG_TO_RAD;

  const vn1 = kts1 * Math.cos(h1);
  const ve1 = kts1 * Math.sin(h1);
  const vn2 = kts2 * Math.cos(h2);
  const ve2 = kts2 * Math.sin(h2);

  const dvn = vn2 - vn1;
  const dve = ve2 - ve1;

  const b = bearing(lat1, lon1, lat2, lon2) * DEG_TO_RAD;
  const un = Math.cos(b);
  const ue = Math.sin(b);

  return -(dvn * un + dve * ue);
}

/**
 * Vertical separation between two altitudes in feet.
 * Inputs in meters (baro altitude), output in feet.
 */
export function verticalSeparationFt(
  altMeters1: number | null,
  altMeters2: number | null
): number | null {
  if (altMeters1 === null || altMeters2 === null) return null;
  return Math.abs((altMeters1 - altMeters2) * 3.28084);
}

/**
 * Estimated time to closest approach in minutes.
 * Returns null if flights are separating.
 */
export function timeToClosestApproachMin(
  distNm: number,
  closingKts: number
): number | null {
  if (closingKts <= 0) return null;
  return (distNm / closingKts) * 60;
}

/**
 * Great circle intermediate point for drawing arcs.
 * fraction = 0 returns point1, fraction = 1 returns point2.
 */
export function greatCircleIntermediate(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
  fraction: number
): [number, number] {
  const la1 = lat1 * DEG_TO_RAD;
  const lo1 = lon1 * DEG_TO_RAD;
  const la2 = lat2 * DEG_TO_RAD;
  const lo2 = lon2 * DEG_TO_RAD;

  const d = 2 * Math.asin(
    Math.sqrt(
      Math.sin((la2 - la1) / 2) ** 2 +
      Math.cos(la1) * Math.cos(la2) * Math.sin((lo2 - lo1) / 2) ** 2
    )
  );

  if (d < 1e-10) return [lat1, lon1];

  const A = Math.sin((1 - fraction) * d) / Math.sin(d);
  const B = Math.sin(fraction * d) / Math.sin(d);

  const x = A * Math.cos(la1) * Math.cos(lo1) + B * Math.cos(la2) * Math.cos(lo2);
  const y = A * Math.cos(la1) * Math.sin(lo1) + B * Math.cos(la2) * Math.sin(lo2);
  const z = A * Math.sin(la1) + B * Math.sin(la2);

  return [
    Math.atan2(z, Math.sqrt(x * x + y * y)) * RAD_TO_DEG,
    Math.atan2(y, x) * RAD_TO_DEG,
  ];
}

/** Generate N points along a great circle arc */
export function greatCircleArc(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
  segments = 30
): [number, number][] {
  const points: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    points.push(greatCircleIntermediate(lat1, lon1, lat2, lon2, i / segments));
  }
  return points;
}

/** Format distance for display */
export function formatDistance(nm: number): string {
  if (nm < 1) return `${(nm * 1852).toFixed(0)} m`;
  if (nm < 10) return `${nm.toFixed(2)} NM`;
  if (nm < 100) return `${nm.toFixed(1)} NM`;
  return `${Math.round(nm)} NM`;
}

/** Convert meters/second to knots */
export function msToKts(ms: number): number {
  return ms * 1.94384;
}

/** Convert meters to feet */
export function mToFt(m: number): number {
  return m * 3.28084;
}
