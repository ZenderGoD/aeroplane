import type { FlightState } from "@/types/flight";

// ── Turbulence severity levels ─────────────────────────────────────
export type TurbulenceSeverity = "light" | "moderate" | "severe";

export interface TurbulencePoint {
  id: string;
  lat: number;
  lon: number;
  altitude: number; // feet
  severity: TurbulenceSeverity;
  verticalRateVariance: number; // fpm
  speedVariance: number; // kts
  timestamp: number;
  reportingAircraft: string[]; // callsigns or icao24s
  flightLevel: number; // FL (e.g. 350 = FL350)
}

export interface AircraftTrack {
  icao24: string;
  callsign: string;
  verticalRates: number[]; // last N vertical rate readings (fpm)
  speeds: number[]; // last N speed readings (kts)
  positions: Array<{ lat: number; lon: number; alt: number; ts: number }>;
  isTurbulent: boolean;
  severity: TurbulenceSeverity | null;
  maxVrVariance: number;
  maxSpdVariance: number;
}

// ── Constants ──────────────────────────────────────────────────────
const MAX_HISTORY = 10;
const VR_LIGHT_THRESHOLD = 500; // fpm change between readings
const VR_MODERATE_THRESHOLD = 1000;
const VR_SEVERE_THRESHOLD = 2000;
const SPEED_VARIANCE_THRESHOLD = 20; // kts

const CLUSTER_RADIUS_DEG = 0.5; // ~30nm at mid latitudes
const POINT_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

// ── Altitude helpers ───────────────────────────────────────────────
export function metersToFeet(m: number): number {
  return m * 3.28084;
}

export function feetToFlightLevel(ft: number): number {
  return Math.round(ft / 100);
}

export function getAltitudeBand(fl: number): string {
  if (fl < 100) return "Below FL100";
  if (fl < 200) return "FL100-200";
  if (fl < 300) return "FL200-300";
  if (fl < 400) return "FL300-400";
  return "FL400+";
}

export const ALTITUDE_BANDS = [
  { label: "FL100-200", min: 100, max: 200 },
  { label: "FL200-300", min: 200, max: 300 },
  { label: "FL300-400", min: 300, max: 400 },
  { label: "FL400+", min: 400, max: 999 },
] as const;

// ── Severity classification ────────────────────────────────────────
export function classifySeverity(vrVariance: number, spdVariance: number): TurbulenceSeverity | null {
  if (vrVariance >= VR_SEVERE_THRESHOLD) return "severe";
  if (vrVariance >= VR_MODERATE_THRESHOLD) return "moderate";
  if (vrVariance >= VR_LIGHT_THRESHOLD) return "light";
  if (spdVariance >= SPEED_VARIANCE_THRESHOLD * 3) return "severe";
  if (spdVariance >= SPEED_VARIANCE_THRESHOLD * 2) return "moderate";
  if (spdVariance >= SPEED_VARIANCE_THRESHOLD) return "light";
  return null;
}

export function severityColor(severity: TurbulenceSeverity): string {
  switch (severity) {
    case "light": return "var(--text-secondary)";
    case "moderate": return "var(--text-tertiary)";
    case "severe": return "var(--accent-primary)";
  }
}

export function severityLabel(severity: TurbulenceSeverity): string {
  return severity.charAt(0).toUpperCase() + severity.slice(1);
}

// ── Track management ───────────────────────────────────────────────
export function updateTracks(
  tracks: Map<string, AircraftTrack>,
  flights: FlightState[]
): Map<string, AircraftTrack> {
  const now = Date.now();

  for (const f of flights) {
    if (f.latitude === null || f.longitude === null) continue;
    if (f.onGround) continue;

    const key = f.icao24;
    const callsign = f.callsign?.trim() || f.icao24;
    const vrFpm = f.verticalRate !== null ? f.verticalRate * 196.85 : null; // m/s to fpm
    const spdKts = f.velocity !== null ? f.velocity * 1.94384 : null; // m/s to kts
    const altFt = f.baroAltitude !== null ? metersToFeet(f.baroAltitude) : 0;

    let track = tracks.get(key);
    if (!track) {
      track = {
        icao24: key,
        callsign,
        verticalRates: [],
        speeds: [],
        positions: [],
        isTurbulent: false,
        severity: null,
        maxVrVariance: 0,
        maxSpdVariance: 0,
      };
      tracks.set(key, track);
    }

    track.callsign = callsign;

    if (vrFpm !== null) {
      track.verticalRates.push(vrFpm);
      if (track.verticalRates.length > MAX_HISTORY) track.verticalRates.shift();
    }

    if (spdKts !== null) {
      track.speeds.push(spdKts);
      if (track.speeds.length > MAX_HISTORY) track.speeds.shift();
    }

    track.positions.push({ lat: f.latitude, lon: f.longitude, alt: altFt, ts: now });
    if (track.positions.length > MAX_HISTORY) track.positions.shift();

    // Compute max vertical rate variance (consecutive changes)
    let maxVrChange = 0;
    for (let i = 1; i < track.verticalRates.length; i++) {
      const change = Math.abs(track.verticalRates[i] - track.verticalRates[i - 1]);
      if (change > maxVrChange) maxVrChange = change;
    }
    track.maxVrVariance = maxVrChange;

    // Compute speed variance (max - min over window)
    let maxSpdVar = 0;
    if (track.speeds.length >= 2) {
      const minSpd = Math.min(...track.speeds);
      const maxSpd = Math.max(...track.speeds);
      maxSpdVar = maxSpd - minSpd;
    }
    track.maxSpdVariance = maxSpdVar;

    // Classify
    const severity = classifySeverity(maxVrChange, maxSpdVar);
    track.isTurbulent = severity !== null;
    track.severity = severity;
  }

  // Prune old tracks (no update in 2 minutes)
  for (const [key, track] of tracks) {
    const lastPos = track.positions[track.positions.length - 1];
    if (!lastPos || now - lastPos.ts > 120_000) {
      tracks.delete(key);
    }
  }

  return tracks;
}

// ── Generate turbulence point cloud ────────────────────────────────
export function generateTurbulencePoints(
  tracks: Map<string, AircraftTrack>,
  existingPoints: TurbulencePoint[]
): TurbulencePoint[] {
  const now = Date.now();

  // Keep existing points that haven't expired
  const points = existingPoints.filter((p) => now - p.timestamp < POINT_MAX_AGE_MS);

  // Add new points from turbulent tracks
  for (const track of tracks.values()) {
    if (!track.isTurbulent || !track.severity) continue;
    const lastPos = track.positions[track.positions.length - 1];
    if (!lastPos) continue;

    // Check if there's already a nearby point we should merge with
    const existing = points.find(
      (p) =>
        Math.abs(p.lat - lastPos.lat) < CLUSTER_RADIUS_DEG &&
        Math.abs(p.lon - lastPos.lon) < CLUSTER_RADIUS_DEG &&
        Math.abs(p.altitude - lastPos.alt) < 5000
    );

    if (existing) {
      // Merge: upgrade severity if needed, add reporting aircraft
      const severityRank = { light: 1, moderate: 2, severe: 3 };
      if (severityRank[track.severity] > severityRank[existing.severity]) {
        existing.severity = track.severity;
      }
      existing.verticalRateVariance = Math.max(existing.verticalRateVariance, track.maxVrVariance);
      existing.speedVariance = Math.max(existing.speedVariance, track.maxSpdVariance);
      existing.timestamp = now;
      if (!existing.reportingAircraft.includes(track.callsign)) {
        existing.reportingAircraft.push(track.callsign);
      }
    } else {
      points.push({
        id: `turb-${track.icao24}-${now}`,
        lat: lastPos.lat,
        lon: lastPos.lon,
        altitude: lastPos.alt,
        severity: track.severity,
        verticalRateVariance: track.maxVrVariance,
        speedVariance: track.maxSpdVariance,
        timestamp: now,
        reportingAircraft: [track.callsign],
        flightLevel: feetToFlightLevel(lastPos.alt),
      });
    }
  }

  return points;
}

// ── Severity counts ────────────────────────────────────────────────
export function countBySeverity(points: TurbulencePoint[]): Record<TurbulenceSeverity, number> {
  const counts: Record<TurbulenceSeverity, number> = { light: 0, moderate: 0, severe: 0 };
  for (const p of points) {
    counts[p.severity]++;
  }
  return counts;
}
