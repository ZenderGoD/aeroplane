import type { Processor } from "./base";
import type { FlightState } from "../../src/types/flight";
import type { CorridorHealth, CorridorPredictability } from "../../src/types/corridor";
import { redis, KEYS } from "../../src/lib/redis";

/**
 * Corridor Predictability Processor
 *
 * Maintains a rolling window of corridor health snapshots in Redis
 * and computes predictability metrics:
 *
 * - avgHealthScore: mean health over last N samples
 * - healthStdDev: standard deviation (lower = more predictable)
 * - predictabilityScore: 0-100 (100 = perfectly predictable)
 * - trend: linear regression slope (positive = improving)
 * - recentScores: last 12 health scores for sparkline display
 */

const HISTORY_KEY = "corridor:history";
const MAX_HISTORY = 60; // keep last 60 health snapshots per corridor (~60 min)
const MIN_SAMPLES = 3;  // need at least 3 samples to compute predictability

function mean(arr: number[]): number {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stddev(arr: number[], avg: number): number {
  const variance = arr.reduce((s, v) => s + (v - avg) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

/** Simple linear regression slope */
function linearSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const xMean = (n - 1) / 2;
  const yMean = mean(values);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (values[i] - yMean);
    den += (i - xMean) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

export class CorridorPredictabilityProcessor implements Processor {
  name = "CorridorPredictability";

  async process(_flights: FlightState[], tickCount: number): Promise<void> {
    // Run every 4th tick, offset by 1 so it runs right after CorridorHealth
    if ((tickCount - 1) % 4 !== 0) return;

    if (redis.status !== "ready") return;

    // 1. Read current corridor health scores
    const rawHealth = await redis.get(KEYS.allCorridorHealth);
    if (!rawHealth) return;

    const healthScores: CorridorHealth[] = JSON.parse(rawHealth);
    if (healthScores.length === 0) return;

    // 2. Append each corridor's current health to its history list
    const pipeline = redis.pipeline();
    for (const h of healthScores) {
      const histKey = `${HISTORY_KEY}:${h.corridorId}`;
      const entry = JSON.stringify({
        healthScore: h.healthScore,
        flightCount: h.flightCount,
        spacingNm: h.avgSpacingNm,
        ts: Date.now(),
      });
      pipeline.rpush(histKey, entry);
      pipeline.ltrim(histKey, -MAX_HISTORY, -1); // keep only last N
      pipeline.expire(histKey, 7200); // 2 hour TTL
    }
    await pipeline.exec();

    // 3. Compute predictability for each corridor
    const predictabilities: CorridorPredictability[] = [];

    for (const h of healthScores) {
      const histKey = `${HISTORY_KEY}:${h.corridorId}`;
      const rawEntries = await redis.lrange(histKey, 0, -1);

      if (rawEntries.length < MIN_SAMPLES) continue;

      const entries = rawEntries.map((r) => JSON.parse(r));
      const scores: number[] = entries.map((e: { healthScore: number }) => e.healthScore);
      const flightCounts: number[] = entries.map((e: { flightCount: number }) => e.flightCount);
      const spacings: (number | null)[] = entries.map((e: { spacingNm: number | null }) => e.spacingNm);

      const avgScore = mean(scores);
      const sd = stddev(scores, avgScore);
      const slope = linearSlope(scores);

      // Predictability: inverse of normalized stddev (max std = 50)
      // Score 100 = stddev 0, Score 0 = stddev >= 50
      const predictabilityScore = Math.max(0, Math.min(100, Math.round(100 - (sd / 50) * 100)));

      // Trend classification
      let trendLabel: CorridorPredictability["trendLabel"] = "stable";
      if (slope > 0.3) trendLabel = "improving";
      else if (slope < -0.3) trendLabel = "degrading";

      // Average spacing (ignore nulls)
      const validSpacings = spacings.filter((s): s is number => s !== null);
      const avgSpacing = validSpacings.length > 0 ? mean(validSpacings) : null;

      // Recent scores for sparkline (last 12)
      const recentScores = scores.slice(-12);

      predictabilities.push({
        corridorId: h.corridorId,
        corridorName: h.corridorName,
        avgHealthScore: Math.round(avgScore * 10) / 10,
        healthStdDev: Math.round(sd * 10) / 10,
        predictabilityScore,
        trend: Math.round(slope * 100) / 100,
        trendLabel,
        avgFlightCount: Math.round(mean(flightCounts) * 10) / 10,
        avgSpacing: avgSpacing !== null ? Math.round(avgSpacing * 10) / 10 : null,
        sampleCount: entries.length,
        recentScores,
        updatedAt: Date.now(),
      });
    }

    // 4. Cache in Redis
    if (predictabilities.length > 0) {
      const pipe2 = redis.pipeline();

      for (const p of predictabilities) {
        pipe2.set(
          KEYS.corridorPredictability(p.corridorId),
          JSON.stringify(p),
          "EX",
          120
        );
      }

      pipe2.set(
        KEYS.allCorridorPredictability,
        JSON.stringify(predictabilities),
        "EX",
        120
      );

      await pipe2.exec();

      // Log summary
      const avg = mean(predictabilities.map((p) => p.predictabilityScore));
      const worst = predictabilities.sort((a, b) => a.predictabilityScore - b.predictabilityScore)[0];
      console.log(
        `  [Predictability] ${predictabilities.length} corridors, avg score: ${Math.round(avg)}, worst: ${worst?.corridorId}=${worst?.predictabilityScore} (${worst?.trendLabel})`
      );
    }
  }
}
