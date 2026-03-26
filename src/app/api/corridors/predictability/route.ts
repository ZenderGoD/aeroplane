import { NextResponse } from "next/server";
import { redis, KEYS, ensureRedisConnected } from "@/lib/redis";

export async function GET() {
  try {
    await ensureRedisConnected();
  } catch {
    return NextResponse.json([]);
  }

  if (redis.status === "ready") {
    const cached = await redis.get(KEYS.allCorridorPredictability);
    if (cached) {
      return NextResponse.json(JSON.parse(cached));
    }
  }

  return NextResponse.json([]);
}
