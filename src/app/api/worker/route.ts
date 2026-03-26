import { NextResponse } from "next/server";
import { redis, ensureRedisConnected, KEYS } from "@/lib/redis";

export async function GET() {
  try {
    await ensureRedisConnected();
  } catch {
    return NextResponse.json({
      active: false,
      lastTick: null,
      message: "Redis not available",
    });
  }

  if (redis.status !== "ready") {
    return NextResponse.json({
      active: false,
      lastTick: null,
      message: "Redis not connected",
    });
  }

  const heartbeat = await redis.get(KEYS.workerHeartbeat);
  const flightCount = await redis.get(KEYS.latestFlights);

  if (!heartbeat) {
    return NextResponse.json({
      active: false,
      lastTick: null,
      message: "Worker not running. Start with: npm run worker:dev",
    });
  }

  const lastTick = parseInt(heartbeat, 10);
  const age = Date.now() - lastTick;

  return NextResponse.json({
    active: age < 60_000, // active if heartbeat within 60s
    lastTick,
    ageMs: age,
    flightCount: flightCount ? parseInt(flightCount, 10) : null,
    message:
      age < 60_000
        ? "Worker is running"
        : `Worker stale (last tick ${Math.round(age / 1000)}s ago)`,
  });
}
