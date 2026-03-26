import type { FlightState, FlightHistoryEntry } from "@/types/flight";
import type { FlightHistoryMap } from "./flightHistory";

export interface InstabilityResult {
  score: number; // 0-100 (0 = stable, 100 = highly unstable)
  factors: InstabilityFactor[];
}

export interface InstabilityFactor {
  name: string;
  value: number; // 0-100 contribution
  detail: string;
}

/**
 * Compute a composite instability score (0-100) for a flight.
 * Uses current state + recent history to detect erratic behavior.
 */
export function computeInstability(
  flight: FlightState,
  history: FlightHistoryEntry[] | undefined
): InstabilityResult {
  const factors: InstabilityFactor[] = [];

  // 1. Vertical rate volatility — rapid altitude changes
  if (history && history.length >= 3) {
    const vRates: number[] = [];
    for (let i = 1; i < history.length; i++) {
      const alt0 = history[i - 1].altitude;
      const alt1 = history[i].altitude;
      const t0 = history[i - 1].timestamp;
      const t1 = history[i].timestamp;
      if (alt0 !== null && alt1 !== null && t1 > t0) {
        const dt = (t1 - t0) / 1000; // seconds
        if (dt > 0 && dt < 120) {
          vRates.push(((alt1 - alt0) / dt) * 196.85); // m/s -> fpm
        }
      }
    }

    if (vRates.length >= 2) {
      // Count sign changes (oscillation)
      let signChanges = 0;
      for (let i = 1; i < vRates.length; i++) {
        if ((vRates[i] > 100 && vRates[i - 1] < -100) ||
            (vRates[i] < -100 && vRates[i - 1] > 100)) {
          signChanges++;
        }
      }

      // Std deviation of vertical rates
      const mean = vRates.reduce((s, v) => s + v, 0) / vRates.length;
      const variance = vRates.reduce((s, v) => s + (v - mean) ** 2, 0) / vRates.length;
      const stddev = Math.sqrt(variance);

      const volatility = Math.min((stddev / 1500) * 100, 100);
      const oscillation = Math.min((signChanges / Math.max(vRates.length - 1, 1)) * 200, 100);
      const vrScore = Math.min((volatility * 0.6 + oscillation * 0.4), 100);

      if (vrScore > 5) {
        factors.push({
          name: "Altitude volatility",
          value: Math.round(vrScore),
          detail: `σ=${Math.round(stddev)} fpm, ${signChanges} oscillations`,
        });
      }
    }
  }

  // 2. Speed variance — erratic speed changes
  if (history && history.length >= 3) {
    const speeds: number[] = [];
    for (const h of history) {
      if (h.velocity !== null) speeds.push(h.velocity * 1.94384); // m/s to kts
    }
    if (speeds.length >= 3) {
      const mean = speeds.reduce((s, v) => s + v, 0) / speeds.length;
      const variance = speeds.reduce((s, v) => s + (v - mean) ** 2, 0) / speeds.length;
      const stddev = Math.sqrt(variance);
      const cv = mean > 0 ? (stddev / mean) * 100 : 0; // coefficient of variation %

      const speedScore = Math.min(cv * 5, 100); // 20% CV = 100
      if (speedScore > 5) {
        factors.push({
          name: "Speed variance",
          value: Math.round(speedScore),
          detail: `σ=${Math.round(stddev)} kts, CV=${cv.toFixed(1)}%`,
        });
      }
    }
  }

  // 3. Heading instability — frequent course corrections
  if (history && history.length >= 4) {
    let totalHeadingChange = 0;
    let headingChanges = 0;
    for (let i = 1; i < history.length; i++) {
      const h0 = history[i - 1].heading;
      const h1 = history[i].heading;
      if (h0 !== null && h1 !== null) {
        let delta = Math.abs(h1 - h0);
        if (delta > 180) delta = 360 - delta;
        totalHeadingChange += delta;
        if (delta > 5) headingChanges++;
      }
    }

    // High heading change rate = instability (not holding pattern — that's detected separately)
    const avgChange = totalHeadingChange / Math.max(history.length - 1, 1);
    const headingScore = Math.min((avgChange / 15) * 100, 100); // 15° avg = 100
    if (headingScore > 5) {
      factors.push({
        name: "Heading instability",
        value: Math.round(headingScore),
        detail: `${Math.round(totalHeadingChange)}° total, ${headingChanges} corrections`,
      });
    }
  }

  // 4. Rapid descent (current state)
  if (flight.verticalRate !== null && !flight.onGround) {
    const fpm = flight.verticalRate * 196.85;
    if (fpm < -1500) {
      const descentScore = Math.min(Math.abs(fpm + 1500) / 25, 100);
      factors.push({
        name: "Steep descent",
        value: Math.round(descentScore),
        detail: `${Math.round(fpm)} fpm`,
      });
    }
  }

  // 5. Unusual altitude for speed
  if (flight.baroAltitude !== null && flight.velocity !== null && !flight.onGround) {
    const feet = flight.baroAltitude * 3.28084;
    const kts = flight.velocity * 1.94384;

    // Too slow for altitude
    if (feet > 15000 && kts < 150) {
      factors.push({
        name: "Low speed at altitude",
        value: Math.round(Math.min((15000 / Math.max(feet, 1)) * (150 / Math.max(kts, 1)) * 10, 80)),
        detail: `${Math.round(kts)} kts at ${Math.round(feet).toLocaleString()} ft`,
      });
    }
  }

  // 6. Squawk anomaly bonus
  if (flight.squawk === "7700" || flight.squawk === "7600" || flight.squawk === "7500") {
    factors.push({
      name: "Emergency squawk",
      value: 100,
      detail: `Squawk ${flight.squawk}`,
    });
  }

  // Composite score — weighted average of top factors
  if (factors.length === 0) {
    return { score: 0, factors: [] };
  }

  factors.sort((a, b) => b.value - a.value);
  const topFactors = factors.slice(0, 4);
  const weights = [0.4, 0.3, 0.2, 0.1];
  let weightedSum = 0;
  let weightSum = 0;
  for (let i = 0; i < topFactors.length; i++) {
    const w = weights[i] ?? 0.1;
    weightedSum += topFactors[i].value * w;
    weightSum += w;
  }

  const score = Math.round(Math.min(weightedSum / weightSum, 100));
  return { score, factors };
}

/**
 * Batch-compute instability scores for all flights.
 * Returns a Map<icao24, score> for efficient lookup.
 */
export function computeAllInstabilities(
  flights: FlightState[],
  history: FlightHistoryMap
): Map<string, number> {
  const scores = new Map<string, number>();
  for (const f of flights) {
    if (f.onGround) continue; // Skip ground aircraft
    const h = history.get(f.icao24);
    const result = computeInstability(f, h);
    if (result.score > 10) {
      scores.set(f.icao24, result.score);
    }
  }
  return scores;
}

export function getInstabilityColor(score: number): string {
  if (score >= 70) return "#ef4444"; // red
  if (score >= 40) return "#f97316"; // orange
  if (score >= 20) return "#eab308"; // yellow
  return "#22c55e"; // green
}

export function getInstabilityLabel(score: number): string {
  if (score >= 70) return "Unstable";
  if (score >= 40) return "Erratic";
  if (score >= 20) return "Moderate";
  return "Stable";
}
