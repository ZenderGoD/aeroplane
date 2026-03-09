import type { FlightState, FlightHistoryEntry } from "@/types/flight";
import type { Anomaly, AnomalyType } from "@/types/anomaly";
import { ANOMALY_SEVERITY } from "@/types/anomaly";
import type { FlightHistoryMap } from "./flightHistory";

function checkSquawk(f: FlightState): AnomalyType | null {
  if (f.squawk === "7500") return "squawk_7500";
  if (f.squawk === "7600") return "squawk_7600";
  if (f.squawk === "7700") return "squawk_7700";
  return null;
}

// Rapid descent: vertical rate below -2000 fpm (-10.16 m/s)
function checkRapidDescent(f: FlightState): boolean {
  return f.verticalRate !== null && f.verticalRate < -10.16 && !f.onGround;
}

// Unusual speed: too slow for altitude or near supersonic
function checkUnusualSpeed(f: FlightState): boolean {
  if (f.velocity === null || f.baroAltitude === null || f.onGround) return false;
  const knots = f.velocity * 1.94384;
  const feet = f.baroAltitude * 3.28084;
  if (feet > 10000 && knots < 100) return true;
  if (knots > 600) return true;
  return false;
}

// Holding pattern: detect circular motion from heading history
function checkHoldingPattern(history: FlightHistoryEntry[]): boolean {
  if (history.length < 6) return false;
  let totalBearingChange = 0;
  for (let i = 1; i < history.length; i++) {
    const h0 = history[i - 1].heading;
    const h1 = history[i].heading;
    if (h0 === null || h1 === null) return false;
    let delta = h1 - h0;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    totalBearingChange += delta;
  }
  return Math.abs(totalBearingChange) > 300;
}

// Ground stop: nearly stationary at low altitude but not marked on ground
function checkGroundStop(f: FlightState): boolean {
  if (f.onGround) return false;
  return (
    f.velocity !== null &&
    f.velocity < 2 &&
    f.baroAltitude !== null &&
    f.baroAltitude < 500
  );
}

function buildMessage(type: AnomalyType, f: FlightState): string {
  const cs = f.callsign?.trim() || f.icao24.toUpperCase();
  switch (type) {
    case "squawk_7500":
      return `${cs} squawking 7500 (hijack code)`;
    case "squawk_7600":
      return `${cs} squawking 7600 (radio failure)`;
    case "squawk_7700":
      return `${cs} squawking 7700 (general emergency)`;
    case "rapid_descent":
      return `${cs} descending at ${Math.round((f.verticalRate ?? 0) * 196.85)} fpm`;
    case "unusual_speed":
      return `${cs} unusual speed: ${Math.round((f.velocity ?? 0) * 1.94384)} kts`;
    case "holding_pattern":
      return `${cs} appears to be in a holding pattern`;
    case "ground_stop":
      return `${cs} stationary but not marked on-ground`;
  }
}

export function detectAnomalies(
  flights: FlightState[],
  history: FlightHistoryMap
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const now = Date.now();

  for (const f of flights) {
    const squawk = checkSquawk(f);
    if (squawk) {
      anomalies.push({
        icao24: f.icao24,
        callsign: f.callsign,
        type: squawk,
        severity: ANOMALY_SEVERITY[squawk],
        message: buildMessage(squawk, f),
        detectedAt: now,
      });
    }

    if (checkRapidDescent(f)) {
      anomalies.push({
        icao24: f.icao24,
        callsign: f.callsign,
        type: "rapid_descent",
        severity: "warning",
        message: buildMessage("rapid_descent", f),
        detectedAt: now,
      });
    }

    if (checkUnusualSpeed(f)) {
      anomalies.push({
        icao24: f.icao24,
        callsign: f.callsign,
        type: "unusual_speed",
        severity: "info",
        message: buildMessage("unusual_speed", f),
        detectedAt: now,
      });
    }

    const flightHistory = history.get(f.icao24);
    if (flightHistory && checkHoldingPattern(flightHistory)) {
      anomalies.push({
        icao24: f.icao24,
        callsign: f.callsign,
        type: "holding_pattern",
        severity: "info",
        message: buildMessage("holding_pattern", f),
        detectedAt: now,
      });
    }

    if (checkGroundStop(f)) {
      anomalies.push({
        icao24: f.icao24,
        callsign: f.callsign,
        type: "ground_stop",
        severity: "info",
        message: buildMessage("ground_stop", f),
        detectedAt: now,
      });
    }
  }

  const order = { critical: 0, warning: 1, info: 2 };
  anomalies.sort((a, b) => order[a.severity] - order[b.severity]);

  return anomalies;
}
