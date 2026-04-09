import type { FlightState, BoundingBox } from "@/types/flight";

export const AIRPLANES_LIVE_URL = "https://api.airplanes.live/v2";

// Conversion constants
const FEET_TO_METERS = 1 / 3.28084;
const KNOTS_TO_MS = 1 / 1.94384;
const FTMIN_TO_MS = 1 / 196.85;

/**
 * Map airplanes.live category strings (e.g. "A3") to numeric category codes
 * matching the OpenSky/FlightState convention:
 *   0=unknown, 1=none, 2=light, 3=small, 4=large,
 *   5=high-vortex, 6=heavy, 7=high-perf, 8=rotorcraft
 */
function mapCategory(cat: unknown): number {
  if (typeof cat !== "string" || cat.length < 2) return 0;

  const letter = cat[0];
  const digit = parseInt(cat.substring(1), 10);
  if (isNaN(digit)) return 0;

  if (letter === "A") {
    // A1=light(2), A2=small(3), A3=large(4), A4=high-vortex(5),
    // A5=heavy(6), A6=high-perf(7), A7=rotorcraft(8)
    if (digit >= 1 && digit <= 7) return digit + 1;
    return 0;
  }

  if (letter === "B") {
    // B1-B7 map similarly to surface vehicles / obstacles — use same offset
    if (digit >= 1 && digit <= 7) return digit + 1;
    return 0;
  }

  if (letter === "C") {
    // C1-C3 map to similar range
    if (digit >= 1 && digit <= 3) return digit + 1;
    return 0;
  }

  return 0;
}

/**
 * Parse a single aircraft object from the airplanes.live API response
 * into our unified FlightState format. Returns null for aircraft
 * that lack valid position data.
 */
export function parseAirplanesLive(
  ac: Record<string, unknown>,
): FlightState | null {
  const lat = ac.lat;
  const lon = ac.lon;

  if (typeof lat !== "number" || typeof lon !== "number") return null;

  const now = Math.floor(Date.now() / 1000);

  const seen = typeof ac.seen === "number" ? ac.seen : 0;
  const seenPos = typeof ac.seen_pos === "number" ? ac.seen_pos : null;

  const altBaro =
    typeof ac.alt_baro === "number" ? ac.alt_baro * FEET_TO_METERS : null;
  const altGeom =
    typeof ac.alt_geom === "number" ? ac.alt_geom * FEET_TO_METERS : null;
  const gs = typeof ac.gs === "number" ? ac.gs * KNOTS_TO_MS : null;
  const baroRate =
    typeof ac.baro_rate === "number" ? ac.baro_rate * FTMIN_TO_MS : null;

  const flight =
    typeof ac.flight === "string" ? ac.flight.trim() || null : null;
  const hex = typeof ac.hex === "string" ? ac.hex.toLowerCase() : "";

  const onGround =
    ac.alt_baro === "ground" ||
    (typeof ac.alt_baro === "number" && ac.alt_baro === 0 && gs !== null && gs < 2);

  const result: FlightState = {
    icao24: hex,
    callsign: flight,
    originCountry: "",
    timePosition: seenPos !== null ? now - Math.floor(seenPos) : null,
    lastContact: now - Math.floor(seen),
    longitude: lon,
    latitude: lat,
    baroAltitude: altBaro,
    onGround,
    velocity: gs,
    trueTrack: typeof ac.track === "number" ? ac.track : null,
    verticalRate: baroRate,
    geoAltitude: altGeom,
    squawk: typeof ac.squawk === "string" ? ac.squawk : null,
    category: mapCategory(ac.category),

    // Data source
    dataSource: "airplaneslive",

    // Aircraft identity
    registration: typeof ac.r === "string" ? ac.r : undefined,
    typeCode: typeof ac.t === "string" ? ac.t : undefined,
    dbFlags: typeof ac.dbFlags === "number" ? ac.dbFlags : undefined,

    // Navigation integrity
    nic: typeof ac.nic === "number" ? ac.nic : undefined,
    nacP: typeof ac.nac_p === "number" ? ac.nac_p : undefined,
    nacV: typeof ac.nac_v === "number" ? ac.nac_v : undefined,
    sil: typeof ac.sil === "number" ? ac.sil : undefined,
    silType: typeof ac.sil_type === "string" ? ac.sil_type : undefined,
    nicBaro: typeof ac.nic_baro === "number" ? ac.nic_baro : undefined,
    gva: typeof ac.gva === "number" ? ac.gva : undefined,
    sda: typeof ac.sda === "number" ? ac.sda : undefined,
    rc: typeof ac.rc === "number" ? ac.rc : undefined,

    // Speed variants (stay in knots)
    ias: typeof ac.ias === "number" ? ac.ias : undefined,
    tas: typeof ac.tas === "number" ? ac.tas : undefined,
    mach: typeof ac.mach === "number" ? ac.mach : undefined,

    // Nav modes
    navModes: Array.isArray(ac.nav_modes) ? (ac.nav_modes as string[]) : undefined,
    roll: typeof ac.roll === "number" ? ac.roll : undefined,

    // Derived weather
    windSpeed: typeof ac.ws === "number" ? ac.ws : undefined,
    windDirection: typeof ac.wd === "number" ? ac.wd : undefined,
    oat: typeof ac.oat === "number" ? ac.oat : undefined,
    tat: typeof ac.tat === "number" ? ac.tat : undefined,

    // Position source
    positionSource: typeof ac.type === "string" ? ac.type : undefined,
  };

  return result;
}

/**
 * Build the airplanes.live API URL for a bounding box query.
 * The API uses point/{lat}/{lon}/{radius_nm} with max 250nm radius.
 * We compute the center of the bbox and a radius that covers it.
 */
export function buildAirplanesLiveUrl(bbox?: BoundingBox): string {
  if (!bbox) {
    // Default: center of Atlantic, max radius — won't cover everything
    // but serves as a fallback
    return `${AIRPLANES_LIVE_URL}/point/40.0/-30.0/250`;
  }

  const centerLat = (bbox.lamin + bbox.lamax) / 2;
  const centerLon = (bbox.lomin + bbox.lomax) / 2;

  // Approximate radius in nautical miles from center to corner
  const dlat = ((bbox.lamax - bbox.lamin) / 2) * 60; // 1 degree lat ~ 60 nm
  const midLatRad = (centerLat * Math.PI) / 180;
  const dlon =
    ((bbox.lomax - bbox.lomin) / 2) * 60 * Math.cos(midLatRad);

  const radiusNm = Math.min(Math.ceil(Math.sqrt(dlat * dlat + dlon * dlon)), 250);

  return `${AIRPLANES_LIVE_URL}/point/${centerLat.toFixed(4)}/${centerLon.toFixed(4)}/${radiusNm}`;
}
