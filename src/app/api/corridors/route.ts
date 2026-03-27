import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  if (!process.env.REDIS_URL) return NextResponse.json([]);

  try {
    const { ensureRedisConnected, getRawRedis, KEYS } = await import("@/lib/redis");
    const { searchParams } = new URL(request.url);
    const corridorId = searchParams.get("id");

    await ensureRedisConnected();
    const r = getRawRedis();
    if (!r || r.status !== "ready") return NextResponse.json([]);

    if (corridorId) {
      const cached = await r.get(KEYS.corridorHealth(corridorId));
      return cached ? NextResponse.json(JSON.parse(cached)) : NextResponse.json(null, { status: 404 });
    }

    const cached = await r.get(KEYS.allCorridorHealth);
    return cached ? NextResponse.json(JSON.parse(cached)) : NextResponse.json([]);
  } catch {
    return NextResponse.json([]);
  }
}
