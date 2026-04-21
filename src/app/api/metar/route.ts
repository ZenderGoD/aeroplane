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

async function fetchFromAwc(url: string): Promise<RawMetar[] | null> {
  try {
    const res = await fetch(url, {
      next: { revalidate: CACHE_SECONDS },
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (!text.trim()) return [];
    try {
      const data = JSON.parse(text);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  } catch {
    return null;
  }
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const icao = searchParams.get("icao");
  const bbox = searchParams.get("bbox");
  const latParam = searchParams.get("lat");
  const lonParam = searchParams.get("lon");
  // When true, if the direct ICAO lookup returns no data, fall back to
  // the nearest station within a widening bbox. Essential for airports
  // outside AWC coverage (e.g. most of India, Africa) where the local
  // ICAO isn't reported but nearby major airports are.
  const allowFallback = searchParams.get("fallback") !== "false";
  const lat = latParam ? parseFloat(latParam) : null;
  const lon = lonParam ? parseFloat(lonParam) : null;

  if (!icao && !bbox) {
    return NextResponse.json(
      { error: "Provide either ?icao=KJFK or ?bbox=lamin,lomin,lamax,lomax" },
      { status: 400 }
    );
  }

  try {
    // ── Try direct ICAO lookup first ────────────────────────────────
    if (icao) {
      const ids = icao
        .toUpperCase()
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .join(",");

      const raw = await fetchFromAwc(
        `${AWC_BASE}?ids=${encodeURIComponent(ids)}&format=json`,
      );
      const stations = Array.isArray(raw) ? raw.map(cleanStation) : [];

      if (stations.length > 0) {
        return NextResponse.json(
          { stations, count: stations.length, cached: true },
          {
            status: 200,
            headers: {
              "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=60`,
            },
          },
        );
      }

      // ── Nearest-station fallback (for airports outside AWC coverage) ─
      if (allowFallback && lat !== null && lon !== null && !isNaN(lat) && !isNaN(lon)) {
        // Widen search bbox until we find a station (max ~3 degrees ≈ 180nm)
        const searchRadii = [1, 2, 3]; // degrees
        for (const r of searchRadii) {
          const raw = await fetchFromAwc(
            `${AWC_BASE}?bbox=${lat - r},${lon - r},${lat + r},${lon + r}&format=json`,
          );
          if (!Array.isArray(raw) || raw.length === 0) continue;

          const stations = raw
            .map(cleanStation)
            .map((s) => ({
              station: s,
              distanceKm: haversineKm(lat, lon, s.lat, s.lon),
            }))
            .sort((a, b) => a.distanceKm - b.distanceKm);

          if (stations.length === 0) continue;
          const nearest = stations[0];

          return NextResponse.json(
            {
              stations: [nearest.station],
              count: 1,
              cached: true,
              fallback: {
                requestedIcao: ids,
                usedStation: nearest.station.icaoId,
                distanceKm: Math.round(nearest.distanceKm),
                distanceNm: Math.round(nearest.distanceKm * 0.539957),
              },
            },
            {
              status: 200,
              headers: {
                "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=60`,
              },
            },
          );
        }
      }

      // No data anywhere — return empty
      return NextResponse.json(
        { stations: [], count: 0, cached: true },
        {
          status: 200,
          headers: {
            "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=60`,
          },
        },
      );
    }

    // ── bbox path ───────────────────────────────────────────────────
    const parts = bbox!.split(",").map((s) => s.trim());
    if (parts.length !== 4 || parts.some((p) => isNaN(Number(p)))) {
      return NextResponse.json(
        { error: "bbox must be 4 comma-separated numbers: lamin,lomin,lamax,lomax" },
        { status: 400 }
      );
    }
    const [lamin, lomin, lamax, lomax] = parts;
    const raw = await fetchFromAwc(
      `${AWC_BASE}?bbox=${lamin},${lomin},${lamax},${lomax}&format=json`,
    );
    const stations = Array.isArray(raw) ? raw.map(cleanStation) : [];

    return NextResponse.json(
      { stations, count: stations.length, cached: true },
      {
        status: 200,
        headers: {
          "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=60`,
        },
      },
    );
  } catch (err) {
    console.error("[METAR API] fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch METAR data", detail: String(err) },
      { status: 500 }
    );
  }
}
