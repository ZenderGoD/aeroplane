import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redis: Redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 5) return null; // stop retrying
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
  });

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

// ── Key namespaces ──────────────────────────────────────────────────
export const KEYS = {
  flightPositions: (icao24: string) => `fp:${icao24}`,
  airportPressure: (icao: string) => `pressure:${icao}`,
  allPressureScores: "pressure:all",
  baseline: (icao: string, hour: number) => `baseline:${icao}:${hour}`,
  corridorHealth: (corridorId: string) => `corridor:${corridorId}`,
  allCorridorHealth: "corridor:all",
  corridorPredictability: (corridorId: string) => `corridor:pred:${corridorId}`,
  allCorridorPredictability: "corridor:pred:all",
  eventStream: "events:stream",
  workerHeartbeat: "worker:heartbeat",
  latestFlights: "flights:latest",
} as const;

// ── Pub/sub channels ────────────────────────────────────────────────
export const CHANNELS = {
  flightEvents: "ch:flight-events",
  pressureUpdates: "ch:pressure-updates",
  corridorUpdates: "ch:corridor-updates",
} as const;

// ── Helpers ─────────────────────────────────────────────────────────

/** Ensure Redis is connected (call before first operation) */
export async function ensureRedisConnected(): Promise<void> {
  if (redis.status === "ready") return;
  if (redis.status === "connecting") {
    await new Promise<void>((resolve) => redis.once("ready", resolve));
    return;
  }
  await redis.connect();
}

/**
 * Store flight positions in a Redis sorted set (score = timestamp).
 * Trims to maxCount entries and sets TTL.
 */
export async function cacheFlightPositions(
  icao24: string,
  lat: number,
  lon: number,
  altitude: number | null,
  speed: number | null,
  heading: number | null,
  verticalRate: number | null,
  onGround: boolean,
  timestamp: number,
  maxCount = 50,
  ttlSeconds = 1800
): Promise<void> {
  const key = KEYS.flightPositions(icao24);
  const value = JSON.stringify({
    lat,
    lon,
    altitude,
    speed,
    heading,
    verticalRate,
    onGround,
    ts: timestamp,
  });

  const pipe = redis.pipeline();
  pipe.zadd(key, timestamp, value);
  // Trim to most recent maxCount entries
  pipe.zremrangebyrank(key, 0, -(maxCount + 1));
  pipe.expire(key, ttlSeconds);
  await pipe.exec();
}

/** Get cached flight positions (most recent first) */
export async function getCachedFlightPositions(
  icao24: string,
  maxCount = 50
): Promise<
  Array<{
    lat: number;
    lon: number;
    altitude: number | null;
    speed: number | null;
    heading: number | null;
    verticalRate: number | null;
    onGround: boolean;
    ts: number;
  }>
> {
  const key = KEYS.flightPositions(icao24);
  const raw = await redis.zrevrange(key, 0, maxCount - 1);
  return raw.map((r) => JSON.parse(r));
}

/** Publish an event to a Redis channel */
export async function publishEvent(
  channel: string,
  data: unknown
): Promise<void> {
  await redis.publish(channel, JSON.stringify(data));
}

/** Create a duplicate Redis client for subscriptions */
export function createSubscriber(): Redis {
  return new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 5) return null;
      return Math.min(times * 200, 2000);
    },
  });
}
