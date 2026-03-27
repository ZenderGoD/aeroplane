import { NextResponse } from "next/server";

export async function GET() {
  if (!process.env.REDIS_URL) {
    return NextResponse.json({ active: false, lastTick: null, message: "Redis not configured" });
  }

  try {
    const { ensureRedisConnected, getRawRedis, KEYS } = await import("@/lib/redis");
    await ensureRedisConnected();
    const r = getRawRedis();
    if (!r || r.status !== "ready") {
      return NextResponse.json({ active: false, lastTick: null, message: "Redis not connected" });
    }

    const lastTick = await r.get(KEYS.workerHeartbeat);
    const active = lastTick ? Date.now() - parseInt(lastTick, 10) < 30_000 : false;

    return NextResponse.json({
      active,
      lastTick: lastTick ? parseInt(lastTick, 10) : null,
      message: active ? "Worker active" : "Worker inactive",
    });
  } catch {
    return NextResponse.json({ active: false, lastTick: null, message: "Error checking worker" });
  }
}
