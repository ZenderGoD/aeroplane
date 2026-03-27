import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Pressure requires Redis/Supabase — return empty when not configured
  if (!process.env.REDIS_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json([]);
  }

  try {
    const { ensureRedisConnected, getRawRedis, KEYS } = await import("@/lib/redis");
    const { searchParams } = new URL(request.url);
    const icao = searchParams.get("icao");

    try {
      await ensureRedisConnected();
    } catch {
      // Redis not available
    }

    const r = getRawRedis();

    if (icao) {
      if (r && r.status === "ready") {
        const cached = await r.get(KEYS.airportPressure(icao.toUpperCase()));
        if (cached) return NextResponse.json(JSON.parse(cached));
      }

      try {
        const { getLatestPressure } = await import("@/lib/db/queries");
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
      } catch {
        // DB not available
      }

      return NextResponse.json(null, { status: 404 });
    }

    // All airports
    if (r && r.status === "ready") {
      const cached = await r.get(KEYS.allPressureScores);
      if (cached) return NextResponse.json(JSON.parse(cached));
    }

    return NextResponse.json([]);
  } catch {
    return NextResponse.json([]);
  }
}
