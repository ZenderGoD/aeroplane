import { NextRequest, NextResponse } from "next/server";
import { getAirportBaseline, getAllBaselinesForHour } from "@/lib/db/queries";

function formatBaseline(b: Record<string, unknown>) {
  return {
    airportIcao: b.airport_icao,
    hourOfWeek: b.hour_of_week,
    avgArrivals: b.avg_arrivals,
    avgDepartures: b.avg_departures,
    stddevArrivals: b.stddev_arrivals,
    stddevDepartures: b.stddev_departures,
    avgPressureScore: b.avg_pressure_score,
    sampleCount: b.sample_count,
    updatedAt: new Date(b.updated_at as string).getTime(),
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const all = searchParams.get("all");
  const icao = searchParams.get("icao");
  const hour = searchParams.get("hour");

  const now = new Date();
  const hourOfWeek = hour
    ? parseInt(hour, 10)
    : now.getUTCDay() * 24 + now.getUTCHours();

  // Return all baselines for the current hour
  if (all === "true") {
    const baselines = await getAllBaselinesForHour(hourOfWeek);
    return NextResponse.json(baselines.map(formatBaseline));
  }

  if (!icao) {
    return NextResponse.json(
      { error: "Missing icao or all parameter" },
      { status: 400 }
    );
  }

  const baseline = await getAirportBaseline(icao.toUpperCase(), hourOfWeek);

  if (!baseline) {
    return NextResponse.json(
      {
        airportIcao: icao.toUpperCase(),
        hourOfWeek,
        message: "No baseline data yet. Baselines build over time.",
        avgArrivals: null,
        avgDepartures: null,
        sampleCount: 0,
      },
      { status: 200 }
    );
  }

  return NextResponse.json(formatBaseline(baseline));
}
