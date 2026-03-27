import { NextResponse } from "next/server";

export async function GET() {
  if (!process.env.REDIS_URL) return NextResponse.json([]);

  try {
    const { ensureRedisConnected, getRawRedis, KEYS } = await import("@/lib/redis");
    await ensureRedisConnected();
    const r = getRawRedis();
    if (!r || r.status !== "ready") return NextResponse.json([]);
    const cached = await r.get(KEYS.allCorridorPredictability);
    return cached ? NextResponse.json(JSON.parse(cached)) : NextResponse.json([]);
  } catch {
    return NextResponse.json([]);
  }
}
