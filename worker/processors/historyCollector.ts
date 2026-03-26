import type { Processor } from "./base";
import type { FlightState } from "../../src/types/flight";
import { redis, cacheFlightPositions, KEYS } from "../../src/lib/redis";
import { insertFlightPositions, cleanupOldPositions } from "../../src/lib/db/queries";

export class HistoryCollector implements Processor {
  name = "HistoryCollector";

  // Buffer positions for batch insert to Supabase
  private positionBuffer: Array<{
    icao24: string;
    callsign: string | null;
    latitude: number;
    longitude: number;
    baro_altitude: number | null;
    velocity: number | null;
    true_track: number | null;
    vertical_rate: number | null;
    on_ground: boolean;
    squawk: string | null;
    origin_country: string;
    recorded_at: string;
  }> = [];

  async process(flights: FlightState[], tickCount: number): Promise<void> {
    const now = Date.now();
    const isoNow = new Date(now).toISOString();

    // 1. Cache each flight position in Redis (sorted set, max 50, 30min TTL)
    if (redis.status === "ready") {
      const pipeline = redis.pipeline();

      for (const f of flights) {
        if (f.latitude === null || f.longitude === null) continue;

        const key = KEYS.flightPositions(f.icao24);
        const value = JSON.stringify({
          lat: f.latitude,
          lon: f.longitude,
          altitude: f.baroAltitude,
          speed: f.velocity,
          heading: f.trueTrack,
          verticalRate: f.verticalRate,
          onGround: f.onGround,
          ts: now,
        });

        pipeline.zadd(key, now, value);
        pipeline.zremrangebyrank(key, 0, -51); // keep last 50
        pipeline.expire(key, 1800); // 30 min TTL
      }

      // Store latest flight count
      pipeline.set(KEYS.latestFlights, flights.length.toString(), "EX", 60);

      await pipeline.exec();
    }

    // 2. Buffer positions for Supabase batch insert
    for (const f of flights) {
      if (f.latitude === null || f.longitude === null) continue;

      this.positionBuffer.push({
        icao24: f.icao24,
        callsign: f.callsign,
        latitude: f.latitude,
        longitude: f.longitude,
        baro_altitude: f.baroAltitude,
        velocity: f.velocity,
        true_track: f.trueTrack,
        vertical_rate: f.verticalRate,
        on_ground: f.onGround,
        squawk: f.squawk,
        origin_country: f.originCountry,
        recorded_at: isoNow,
      });
    }

    // 3. Flush to Supabase every 4th tick (~60s)
    if (tickCount % 4 === 0 && this.positionBuffer.length > 0) {
      // Sample: insert only a subset to manage storage
      // On free tier, we sample ~25% of positions to stay under 500MB
      const sampled = this.positionBuffer.filter(() => Math.random() < 0.25);

      if (sampled.length > 0) {
        await insertFlightPositions(sampled);
        console.log(
          `  [HistoryCollector] Flushed ${sampled.length} positions to Supabase`
        );
      }

      this.positionBuffer = [];
    }

    // 4. Cleanup old positions every 60 ticks (~15 min)
    if (tickCount % 60 === 0) {
      const deleted = await cleanupOldPositions(24);
      if (deleted > 0) {
        console.log(
          `  [HistoryCollector] Cleaned up ${deleted} old positions`
        );
      }
    }
  }
}
