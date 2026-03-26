import { NextRequest, NextResponse } from "next/server";
import { redis, KEYS, ensureRedisConnected } from "@/lib/redis";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const corridorId = searchParams.get("id");

  try {
    await ensureRedisConnected();
  } catch {
    return NextResponse.json([]);
  }

  // Single corridor
  if (corridorId) {
    if (redis.status === "ready") {
      const cached = await redis.get(KEYS.corridorHealth(corridorId));
      if (cached) {
        return NextResponse.json(JSON.parse(cached));
      }
    }
    return NextResponse.json(null, { status: 404 });
  }

  // All corridors
  if (redis.status === "ready") {
    const cached = await redis.get(KEYS.allCorridorHealth);
    if (cached) {
      return NextResponse.json(JSON.parse(cached));
    }
  }

  return NextResponse.json([]);
}
