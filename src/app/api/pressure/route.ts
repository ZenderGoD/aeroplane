import { NextRequest, NextResponse } from "next/server";
import { redis, KEYS, ensureRedisConnected } from "@/lib/redis";
import { getLatestPressure } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const icao = searchParams.get("icao");

  try {
    await ensureRedisConnected();
  } catch {
    // Redis not available, fall through to Supabase
  }

  // Single airport
  if (icao) {
    // Try Redis first
    if (redis.status === "ready") {
      const cached = await redis.get(KEYS.airportPressure(icao.toUpperCase()));
      if (cached) {
        return NextResponse.json(JSON.parse(cached));
      }
    }

    // Fall back to Supabase
    const data = await getLatestPressure(icao.toUpperCase());
    if (data) {
      return NextResponse.json({
        airportIcao: data.airport_icao,
        airportName: data.airport_name,
        pressureScore: data.pressure_score,
        components: {
          inboundCount: data.inbound_count,
          outboundCount: data.outbound_count,
          groundCount: data.ground_count,
          holdingCount: data.holding_count,
          goAroundCount: data.go_around_count,
        },
        baselineDeviation: null,
        updatedAt: new Date(data.recorded_at).getTime(),
      });
    }

    return NextResponse.json(null, { status: 404 });
  }

  // All airports
  if (redis.status === "ready") {
    const cached = await redis.get(KEYS.allPressureScores);
    if (cached) {
      return NextResponse.json(JSON.parse(cached));
    }
  }

  return NextResponse.json([]);
}
