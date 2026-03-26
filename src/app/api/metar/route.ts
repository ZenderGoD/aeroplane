import { NextRequest, NextResponse } from "next/server";

// ── Types ────────────────────────────────────────────────────────────
interface RawMetarCloud {
  cover: string;
  base: number | null;
}

interface RawMetar {
  icaoId: string;
  rawOb: string;
  temp: number | null;
  dewp: number | null;
  wdir: number | string | null;
  wspd: number | null;
  wgst: number | null;
  visib: number | string | null;
  altim: number | null;
  fltcat: string | null;
  clouds: RawMetarCloud[];
  lat: number;
  lon: number;
  elev: number | null;
  reportTime: string;
  name?: string;
}

export interface MetarStation {
  icaoId: string;
  rawOb: string;
  temp: number | null;
  dewp: number | null;
  wdir: number | null;
  wspd: number | null;
  wgst: number | null;
  visib: number | null;
  altim: number | null;
  fltcat: "VFR" | "MVFR" | "IFR" | "LIFR" | null;
  clouds: { cover: string; base: number | null }[];
  lat: number;
  lon: number;
  elev: number | null;
  reportTime: string;
  name: string | null;
}

// ── Constants ────────────────────────────────────────────────────────
const AWC_BASE = "https://aviationweather.gov/api/data/metar";
const CACHE_SECONDS = 300; // 5 minutes

// ── Helpers ──────────────────────────────────────────────────────────

function parseNumeric(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

function parseFltCat(val: unknown): MetarStation["fltcat"] {
  if (typeof val !== "string") return null;
  const upper = val.toUpperCase();
  if (["VFR", "MVFR", "IFR", "LIFR"].includes(upper)) {
    return upper as MetarStation["fltcat"];
  }
  return null;
}

function parseWdir(val: unknown): number | null {
  if (val === "VRB" || val === "vrb") return null;
  return parseNumeric(val);
}

function cleanStation(raw: RawMetar): MetarStation {
  return {
    icaoId: raw.icaoId,
    rawOb: raw.rawOb ?? "",
    temp: parseNumeric(raw.temp),
    dewp: parseNumeric(raw.dewp),
    wdir: parseWdir(raw.wdir),
    wspd: parseNumeric(raw.wspd),
    wgst: parseNumeric(raw.wgst),
    visib: parseNumeric(raw.visib),
    altim: parseNumeric(raw.altim),
    fltcat: parseFltCat(raw.fltcat),
    clouds: Array.isArray(raw.clouds)
      ? raw.clouds.map((c) => ({
          cover: c.cover ?? "CLR",
          base: parseNumeric(c.base),
        }))
      : [],
    lat: raw.lat,
    lon: raw.lon,
    elev: parseNumeric(raw.elev),
    reportTime: raw.reportTime ?? "",
    name: raw.name ?? null,
  };
}

// ── Route Handler ────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const icao = searchParams.get("icao");
  const bbox = searchParams.get("bbox");

  if (!icao && !bbox) {
    return NextResponse.json(
      { error: "Provide either ?icao=KJFK or ?bbox=lamin,lomin,lamax,lomax" },
      { status: 400 }
    );
  }

  try {
    let url: string;

    if (icao) {
      // Single airport or comma-separated list
      const ids = icao
        .toUpperCase()
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .join(",");
      url = `${AWC_BASE}?ids=${encodeURIComponent(ids)}&format=json`;
    } else {
      // Bounding box: lamin,lomin,lamax,lomax
      const parts = bbox!.split(",").map((s) => s.trim());
      if (parts.length !== 4 || parts.some((p) => isNaN(Number(p)))) {
        return NextResponse.json(
          { error: "bbox must be 4 comma-separated numbers: lamin,lomin,lamax,lomax" },
          { status: 400 }
        );
      }
      const [lamin, lomin, lamax, lomax] = parts;
      url = `${AWC_BASE}?bbox=${lamin},${lomin},${lamax},${lomax}&format=json`;
    }

    const upstream = await fetch(url, {
      next: { revalidate: CACHE_SECONDS },
      headers: { Accept: "application/json" },
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      return NextResponse.json(
        { error: `aviationweather.gov returned ${upstream.status}`, detail: text },
        { status: 502 }
      );
    }

    const raw: RawMetar[] = await upstream.json();

    if (!Array.isArray(raw)) {
      return NextResponse.json({ stations: [] }, {
        status: 200,
        headers: { "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=60` },
      });
    }

    const stations: MetarStation[] = raw.map(cleanStation);

    return NextResponse.json(
      { stations, count: stations.length, cached: true },
      {
        status: 200,
        headers: {
          "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=60`,
        },
      }
    );
  } catch (err) {
    console.error("[METAR API] fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch METAR data", detail: String(err) },
      { status: 500 }
    );
  }
}
