import { NextRequest, NextResponse } from "next/server";
import { AIRPLANES_LIVE_URL, parseAirplanesLive } from "@/lib/airplaneslive";
import type { FlightState } from "@/types/flight";

export const runtime = "edge";

/**
 * GET /api/fleet?airline=AAL
 *
 * Fetches all active flights for a given airline ICAO code prefix
 * from the airplanes.live callsign endpoint, then normalizes
 * them into FlightState[].
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const airline = searchParams.get("airline")?.toUpperCase().trim();

  if (!airline || airline.length < 2 || airline.length > 4) {
    return NextResponse.json(
      { error: "Missing or invalid 'airline' query param (2-4 char ICAO code)" },
      { status: 400 },
    );
  }

  try {
    const url = `${AIRPLANES_LIVE_URL}/callsign/${airline}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream API returned ${res.status}` },
        { status: 502 },
      );
    }

    const data = await res.json();
    const acList: unknown[] = data.ac ?? data.aircraft ?? [];

    const flights: FlightState[] = [];
    for (const ac of acList) {
      if (typeof ac !== "object" || ac === null) continue;
      const parsed = parseAirplanesLive(ac as Record<string, unknown>);
      if (parsed) flights.push(parsed);
    }

    return NextResponse.json(
      { flights, total: flights.length, airline },
      {
        headers: {
          "Cache-Control": "public, max-age=3, s-maxage=3",
        },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
