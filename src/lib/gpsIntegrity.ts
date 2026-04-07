/**
 * GPS Integrity / Spoofing Detection
 *
 * Detects GPS interference and spoofing by analysing behavioural patterns in
 * ADS-B position history:
 *   - Impossible position jumps (teleportation)
 *   - Impossible speed changes
 *   - Position-velocity inconsistency (heading vs actual track)
 *   - Impossible altitude spikes
 */

import type { FlightState, FlightHistoryEntry } from "@/types/flight";
import { haversineNm, bearing } from "@/lib/geo";

/* ── Public types ─────────────────────────────────────── */

export interface GPSIntegrityResult {
  icao24: string;
  callsign: string | null;
  score: number; // 0-100, 100 = perfect integrity
  issues: GPSIssue[];
  severity: "nominal" | "degraded" | "compromised";
  integrityFields?: {
    nic?: number;
    nacP?: number;
    sil?: number;
    rc?: number;
    gva?: number;
    sda?: number;
    nicBaro?: number;
    positionSource?: string;
  };
}

export interface GPSIssue {
  type:
    | "position_jump"
    | "speed_inconsistency"
    | "heading_mismatch"
    | "altitude_spike"
    | "low_nic"
    | "low_nacp"
    | "low_sil"
    | "large_containment"
    | "low_gva";
  description: string;
  value: number;
  threshold: number;
}

/* ── Helpers ──────────────────────────────────────────── */

/** Smallest angular difference between two headings (0-180) */
function headingDiff(a: number, b: number): number {
  let d = Math.abs(a - b) % 360;
  if (d > 180) d = 360 - d;
  return d;
}

/* ── Core check ───────────────────────────────────────── */

/**
 * Analyse a flight's recent position history for signs of GPS
 * interference or spoofing.
 *
 * Returns `null` when there is insufficient data (< 3 history entries).
 */
export function checkGPSIntegrity(
  flight: FlightState,
  history: FlightHistoryEntry[]
): GPSIntegrityResult | null {
  if (history.length < 3) return null;

  const issues: GPSIssue[] = [];

  /* ── Pass 1: Real integrity fields (airplanes.live) ────── */

  if (flight.nic !== undefined && flight.nic < 3) {
    issues.push({
      type: "low_nic",
      description: `Low Navigation Integrity (NIC=${flight.nic})`,
      value: flight.nic,
      threshold: 3,
    });
  }

  if (flight.nacP !== undefined && flight.nacP < 5) {
    issues.push({
      type: "low_nacp",
      description: `Low Position Accuracy (NACp=${flight.nacP})`,
      value: flight.nacP,
      threshold: 5,
    });
  }

  if (flight.sil !== undefined && flight.sil < 2) {
    issues.push({
      type: "low_sil",
      description: `Low Surveillance Integrity (SIL=${flight.sil})`,
      value: flight.sil,
      threshold: 2,
    });
  }

  if (flight.rc !== undefined && flight.rc > 1000) {
    issues.push({
      type: "large_containment",
      description: `Large containment radius (${flight.rc}m)`,
      value: flight.rc,
      threshold: 1000,
    });
  }

  if (flight.gva !== undefined && flight.gva < 2) {
    issues.push({
      type: "low_gva",
      description: `Low Geometric Vertical Accuracy (GVA=${flight.gva})`,
      value: flight.gva,
      threshold: 2,
    });
  }

  /* ── Pass 2: Behavioural checks (works for any data source) ──
   * We track the WORST instance of each issue type to avoid score
   * inflation from normal manoeuvres across many history samples. */

  let worstPositionJump: GPSIssue | null = null;
  let worstSpeedChange: GPSIssue | null = null;
  let worstHeadingDiff: GPSIssue | null = null;
  let worstAltSpike: GPSIssue | null = null;

  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1];
    const curr = history[i];

    const dtSec = (curr.timestamp - prev.timestamp) / 1000;
    if (dtSec <= 0 || dtSec > 120) continue; // skip stale gaps

    // --- Position jump ---------------------------------------------------
    const actualDistNm = haversineNm(prev.lat, prev.lon, curr.lat, curr.lon);
    const avgSpeedMs =
      prev.velocity !== null && curr.velocity !== null
        ? (prev.velocity + curr.velocity) / 2
        : prev.velocity ?? curr.velocity ?? 0;
    const expectedDistNm = (avgSpeedMs * dtSec) / 1852;

    // Only flag if expected distance is meaningful (> 0.5 NM) and ratio > 5x
    if (expectedDistNm > 0.5 && actualDistNm > 5 * expectedDistNm) {
      const issue: GPSIssue = {
        type: "position_jump",
        description: `Position jumped ${actualDistNm.toFixed(1)} NM but expected ~${expectedDistNm.toFixed(1)} NM`,
        value: actualDistNm,
        threshold: 5 * expectedDistNm,
      };
      if (!worstPositionJump || actualDistNm > worstPositionJump.value) {
        worstPositionJump = issue;
      }
    }

    // --- Speed inconsistency (> 300 kts change between samples) ----------
    if (prev.velocity !== null && curr.velocity !== null) {
      const speedChangeKts =
        Math.abs(curr.velocity - prev.velocity) * 1.94384;
      if (speedChangeKts > 300) {
        const issue: GPSIssue = {
          type: "speed_inconsistency",
          description: `Speed changed by ${Math.round(speedChangeKts)} kts between samples`,
          value: speedChangeKts,
          threshold: 300,
        };
        if (!worstSpeedChange || speedChangeKts > worstSpeedChange.value) {
          worstSpeedChange = issue;
        }
      }
    }

    // --- Heading mismatch ------------------------------------------------
    // Only flag when speed is high (straight flight) and mismatch is extreme
    if (curr.heading !== null && curr.velocity !== null && curr.velocity > 80) {
      const computedBearing = bearing(prev.lat, prev.lon, curr.lat, curr.lon);
      const diff = headingDiff(computedBearing, curr.heading);
      if (diff > 90) {
        const issue: GPSIssue = {
          type: "heading_mismatch",
          description: `Reported heading ${Math.round(curr.heading)}° but actual track ${Math.round(computedBearing)}° (diff ${Math.round(diff)}°)`,
          value: diff,
          threshold: 90,
        };
        if (!worstHeadingDiff || diff > worstHeadingDiff.value) {
          worstHeadingDiff = issue;
        }
      }
    }

    // --- Altitude spike (> 8 000 ft in < 20 s) ---------------------------
    if (
      prev.altitude !== null &&
      curr.altitude !== null &&
      dtSec < 20
    ) {
      const altChangeFt =
        Math.abs(curr.altitude - prev.altitude) * 3.28084;
      if (altChangeFt > 8000) {
        const issue: GPSIssue = {
          type: "altitude_spike",
          description: `Altitude changed ${Math.round(altChangeFt)} ft in ${dtSec.toFixed(0)}s`,
          value: altChangeFt,
          threshold: 8000,
        };
        if (!worstAltSpike || altChangeFt > worstAltSpike.value) {
          worstAltSpike = issue;
        }
      }
    }
  }

  // Only add the worst instance of each behavioural anomaly
  if (worstPositionJump) issues.push(worstPositionJump);
  if (worstSpeedChange) issues.push(worstSpeedChange);
  if (worstHeadingDiff) issues.push(worstHeadingDiff);
  if (worstAltSpike) issues.push(worstAltSpike);

  // --- Score calculation --------------------------------------------------
  let score = 100;
  for (const issue of issues) {
    switch (issue.type) {
      case "position_jump":
        score -= 25;
        break;
      case "speed_inconsistency":
        score -= 15;
        break;
      case "heading_mismatch":
        score -= 10;
        break;
      case "altitude_spike":
        score -= 20;
        break;
      case "low_nic":
        score -= 20;
        break;
      case "low_nacp":
        score -= 15;
        break;
      case "low_sil":
        score -= 15;
        break;
      case "large_containment":
        score -= 10;
        break;
      case "low_gva":
        score -= 10;
        break;
    }
  }
  score = Math.max(0, Math.min(100, score));

  const severity: GPSIntegrityResult["severity"] =
    score >= 80 ? "nominal" : score >= 50 ? "degraded" : "compromised";

  // Collect raw integrity fields when available (airplanes.live data)
  const hasIntegrityFields =
    flight.nic !== undefined ||
    flight.nacP !== undefined ||
    flight.sil !== undefined ||
    flight.rc !== undefined ||
    flight.gva !== undefined ||
    flight.sda !== undefined ||
    flight.nicBaro !== undefined ||
    flight.positionSource !== undefined;

  const integrityFields = hasIntegrityFields
    ? {
        nic: flight.nic,
        nacP: flight.nacP,
        sil: flight.sil,
        rc: flight.rc,
        gva: flight.gva,
        sda: flight.sda,
        nicBaro: flight.nicBaro,
        positionSource: flight.positionSource,
      }
    : undefined;

  return {
    icao24: flight.icao24,
    callsign: flight.callsign,
    score,
    issues,
    severity,
    integrityFields,
  };
}
