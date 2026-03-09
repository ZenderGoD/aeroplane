import { NextRequest, NextResponse } from "next/server";

const NOAA_METAR_URL = "https://aviationweather.gov/api/data/metar";

// In-memory cache: ICAO -> { data, timestamp }
const weatherCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export async function GET(request: NextRequest) {
  const icao = request.nextUrl.searchParams.get("icao");
  if (!icao || !/^[A-Z]{4}$/i.test(icao)) {
    return NextResponse.json(
      { error: "Valid 4-letter ICAO code required" },
      { status: 400 }
    );
  }

  const upperIcao = icao.toUpperCase();
  const now = Date.now();

  // Check cache
  const cached = weatherCache.get(upperIcao);
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    const response = await fetch(
      `${NOAA_METAR_URL}?ids=${upperIcao}&format=json&taf=false&hours=1`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      if (cached) return NextResponse.json(cached.data);
      return NextResponse.json(
        { error: "METAR fetch failed" },
        { status: 502 }
      );
    }

    const raw = await response.json();
    const metar = Array.isArray(raw) ? raw[0] : null;

    if (!metar) {
      return NextResponse.json(null);
    }

    const parsed = parseMetar(metar);
    weatherCache.set(upperIcao, { data: parsed, timestamp: now });

    return NextResponse.json(parsed);
  } catch {
    if (cached) return NextResponse.json(cached.data);
    return NextResponse.json(
      { error: "Weather service unavailable" },
      { status: 500 }
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseMetar(raw: any) {
  return {
    raw: raw.rawOb ?? raw.rawMETAR ?? "",
    station: raw.icaoId ?? raw.stationId ?? "",
    observationTime: raw.reportTime ?? raw.obsTime ?? "",
    temperature: raw.temp ?? null,
    dewpoint: raw.dewp ?? null,
    windDirection: raw.wdir ?? null,
    windSpeed: raw.wspd ?? null,
    windGust: raw.wgst ?? null,
    visibility: raw.visib ?? null,
    ceiling: raw.ceil ?? null,
    cloudLayers: (raw.clouds ?? []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c: any) => ({
        coverage: c.cover ?? "Unknown",
        base: c.base ?? 0,
      })
    ),
    conditions: parseConditions(raw.wxString ?? ""),
    flightCategory: raw.fltcat ?? "Unknown",
    altimeter: raw.altim ?? null,
    humidity: raw.relHumid ?? raw.humidity ?? null,
  };
}

function parseConditions(wxString: string): string[] {
  if (!wxString) return [];
  const map: Record<string, string> = {
    RA: "Rain",
    SN: "Snow",
    TS: "Thunderstorm",
    FG: "Fog",
    BR: "Mist",
    HZ: "Haze",
    DZ: "Drizzle",
    GR: "Hail",
    SQ: "Squall",
    FC: "Tornado",
    FU: "Smoke",
    VA: "Volcanic Ash",
    DU: "Dust",
    SA: "Sand",
  };
  const conditions: string[] = [];
  for (const [code, label] of Object.entries(map)) {
    if (wxString.includes(code)) conditions.push(label);
  }
  return conditions.length > 0 ? conditions : [wxString];
}
