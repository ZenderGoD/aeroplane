// Redis is optional — all features degrade gracefully without it.
// Only connects when REDIS_URL is explicitly set.

const REDIS_AVAILABLE = !!process.env.REDIS_URL;

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

// Lazy-load ioredis only when needed
let _redis: import("ioredis").default | null = null;

function getRedis() {
  if (!REDIS_AVAILABLE) return null;
  if (_redis) return _redis;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Redis = require("ioredis").default || require("ioredis");
  _redis = new Redis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: 3,
    retryStrategy(times: number) {
      if (times > 3) return null;
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
    connectTimeout: 5000,
  });
  return _redis;
}

export const redis = {
  get status() {
    const r = getRedis();
    return r ? r.status : "end";
  },
} as { status: string };

/** Ensure Redis is connected (no-ops if REDIS_URL is not set) */
export async function ensureRedisConnected(): Promise<void> {
  if (!REDIS_AVAILABLE) throw new Error("Redis not configured");
  const r = getRedis();
  if (!r) throw new Error("Redis not configured");
  if (r.status === "ready") return;
  if (r.status === "connecting") {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Redis connect timeout")), 5000);
      r.once("ready", () => { clearTimeout(timeout); resolve(); });
      r.once("error", (err) => { clearTimeout(timeout); reject(err); });
    });
    return;
  }
  await r.connect();
}

/** Get the raw ioredis client (null if not configured) */
export function getRawRedis() {
  return getRedis();
}

/** Publish an event to a Redis channel */
export async function publishEvent(channel: string, data: unknown): Promise<void> {
  const r = getRedis();
  if (!r) return;
  await r.publish(channel, JSON.stringify(data));
}

/** Create a duplicate Redis client for subscriptions */
export function createSubscriber() {
  if (!REDIS_AVAILABLE) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Redis = require("ioredis").default || require("ioredis");
  return new Redis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: 3,
    retryStrategy(times: number) {
      if (times > 3) return null;
      return Math.min(times * 200, 2000);
    },
    connectTimeout: 5000,
  });
}

export async function cacheFlightPositions(
  icao24: string, lat: number, lon: number,
  altitude: number | null, speed: number | null, heading: number | null,
  verticalRate: number | null, onGround: boolean, timestamp: number,
  maxCount = 50, ttlSeconds = 1800
): Promise<void> {
  const r = getRedis();
  if (!r || r.status !== "ready") return;
  const key = KEYS.flightPositions(icao24);
  const value = JSON.stringify({ lat, lon, altitude, speed, heading, verticalRate, onGround, ts: timestamp });
  const pipe = r.pipeline();
  pipe.zadd(key, timestamp, value);
  pipe.zremrangebyrank(key, 0, -(maxCount + 1));
  pipe.expire(key, ttlSeconds);
  await pipe.exec();
}

export async function getCachedFlightPositions(
  icao24: string, maxCount = 50
): Promise<Array<{ lat: number; lon: number; altitude: number | null; speed: number | null; heading: number | null; verticalRate: number | null; onGround: boolean; ts: number }>> {
  const r = getRedis();
  if (!r || r.status !== "ready") return [];
  const raw = await r.zrevrange(KEYS.flightPositions(icao24), 0, maxCount - 1);
  return raw.map((s) => JSON.parse(s));
}
