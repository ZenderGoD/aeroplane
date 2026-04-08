import { NextRequest, NextResponse } from "next/server";
import { getRawRedis, KEYS } from "@/lib/redis";
import { parseAirplanesLive } from "@/lib/airplaneslive";
import { parseStateVector } from "@/lib/opensky";
import type { FlightState, BoundingBox } from "@/types/flight";

// ── Data source URLs ────────────────────────────────────────────────
// Three ADS-B aggregator networks — each has different feeders.
// Querying all three and merging by ICAO24 gives us the UNION of all
// aircraft that ANY receiver in ANY network can see. This is critical
// for small/GA/training aircraft that only appear on one network.
const ADSB_SOURCES = [
  {
    name: "airplaneslive" as const,
    baseUrl: "https://api.airplanes.live/v2",
    // URL: /point/{lat}/{lon}/{radius}  Response key: "ac"
    urlBuilder: (lat: number, lon: number, radius: number) =>
      `https://api.airplanes.live/v2/point/${lat.toFixed(4)}/${lon.toFixed(4)}/${radius}`,
    responseKey: "ac" as const,
  },
  {
    name: "adsbfi" as const,
    baseUrl: "https://opendata.adsb.fi/api/v2",
    // URL: /lat/{lat}/lon/{lon}/dist/{radius}  Response key: "aircraft"
    // adsb.fi requires integer coordinates (decimals return 400)
    urlBuilder: (lat: number, lon: number, radius: number) =>
      `https://opendata.adsb.fi/api/v2/lat/${Math.round(lat)}/lon/${Math.round(lon)}/dist/${radius}`,
    responseKey: "aircraft" as const,
  },
  {
    name: "adsblol" as const,
    baseUrl: "https://api.adsb.lol/v2",
    // URL: /point/{lat}/{lon}/{radius}  Response key: "ac"
    urlBuilder: (lat: number, lon: number, radius: number) =>
      `https://api.adsb.lol/v2/point/${lat.toFixed(4)}/${lon.toFixed(4)}/${radius}`,
    responseKey: "ac" as const,
  },
];

const OPENSKY_URL = "https://opensky-network.org/api/states/all";
const TOKEN_URL =
  "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token";

// ── Strategic center points for global count (landing page only) ────
// Only 1 tile — just enough for an approximate flight count.
// The tracker page sends a bbox and gets proper multi-tile coverage.
const GLOBAL_TILES: [number, number, number][] = [
  [50, 10, 250],    // Europe central (busiest airspace = best count proxy)
];

// ── API key detection ───────────────────────────────────────────────
const HAS_API_KEY = !!process.env.AIRPLANES_LIVE_API_KEY;

// ── Cache layer ─────────────────────────────────────────────────────
interface CacheEntry {
  flights: FlightState[];
  time: number;
  source: string;
  sources: string[];       // which networks contributed
  timestamp: number;
}

const regionCache = new Map<string, CacheEntry>();
const CACHE_TTL = HAS_API_KEY ? 15_000 : 30_000; // shorter cache = fresher data
const STALE_TTL = 600_000;

// ── Daily request counter ───────────────────────────────────────────
let dailyRequestCount = 0;
let dailyCounterResetDate = new Date().toISOString().slice(0, 10);
// Higher limits since we query multiple sources
const DAILY_WARN_THRESHOLD = HAS_API_KEY ? 7_000 : 1_200;
const DAILY_HARD_LIMIT = HAS_API_KEY ? 8_000 : 1_440; // 3 sources × 480

function trackDailyRequest(): boolean {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== dailyCounterResetDate) {
    dailyRequestCount = 0;
    dailyCounterResetDate = today;
  }
  dailyRequestCount++;
  if (dailyRequestCount >= DAILY_HARD_LIMIT) {
    console.warn(`[Flights] Daily limit reached: ${dailyRequestCount}/${DAILY_HARD_LIMIT}`);
    return false;
  }
  return true;
}

// ── Per-source rate limiting ────────────────────────────────────────
const sourceState = new Map<string, { lastRequest: number; backoffUntil: number }>();

function getSourceState(name: string) {
  if (!sourceState.has(name)) {
    sourceState.set(name, { lastRequest: 0, backoffUntil: 0 });
  }
  return sourceState.get(name)!;
}

// ── OpenSky auth ────────────────────────────────────────────────────
let accessToken: string | null = null;
let tokenExpiresAt = 0;

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.OPENSKY_CLIENT_ID;
  const clientSecret = process.env.OPENSKY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  if (accessToken && Date.now() < tokenExpiresAt - 30_000) return accessToken;

  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    accessToken = data.access_token;
    tokenExpiresAt = Date.now() + (data.expires_in ?? 1800) * 1000;
    return accessToken;
  } catch {
    return null;
  }
}

// ── OpenSky rate limit tracking ─────────────────────────────────────
let osRateLimitedUntil = 0;
let osQuotaExhausted = false;
let osRateLimitMessage = "";

// ── Helpers ─────────────────────────────────────────────────────────

function bboxFromParams(searchParams: URLSearchParams): BoundingBox | null {
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  const radius = searchParams.get("radius");
  if (lat && lon && radius) {
    const latF = parseFloat(lat);
    const lonF = parseFloat(lon);
    const radiusNm = parseFloat(radius);
    const latDelta = radiusNm / 60;
    const lonDelta = radiusNm / (60 * Math.cos((latF * Math.PI) / 180));
    return {
      lamin: latF - latDelta,
      lomin: lonF - lonDelta,
      lamax: latF + latDelta,
      lomax: lonF + lonDelta,
    };
  }

  const lamin = searchParams.get("lamin");
  const lomin = searchParams.get("lomin");
  const lamax = searchParams.get("lamax");
  const lomax = searchParams.get("lomax");
  if (!lamin || !lomin || !lamax || !lomax) return null;
  return {
    lamin: parseFloat(lamin),
    lomin: parseFloat(lomin),
    lamax: parseFloat(lamax),
    lomax: parseFloat(lomax),
  };
}

const MAX_TILE_RADIUS = 250;

/**
 * Compute a SINGLE tile (center + 250nm) for the bbox.
 * Free ADS-B APIs only allow ~1 request per 10 seconds,
 * so we cannot split into multiple tiles.  We query 3 sources
 * in parallel instead — that's how we get broad coverage.
 */
function computeTile(bbox: BoundingBox): [number, number, number] {
  const centerLat = (bbox.lamin + bbox.lamax) / 2;
  const centerLon = (bbox.lomin + bbox.lomax) / 2;
  const midLatRad = (centerLat * Math.PI) / 180;

  const heightNm = Math.abs(bbox.lamax - bbox.lamin) * 60;
  const widthNm = Math.abs(bbox.lomax - bbox.lomin) * 60 * Math.cos(midLatRad);
  const neededRadius = Math.min(
    Math.ceil(Math.sqrt((heightNm / 2) ** 2 + (widthNm / 2) ** 2)),
    MAX_TILE_RADIUS,
  );

  return [centerLat, centerLon, neededRadius];
}

// ── Fetch from a single ADS-B v2 source (1 request) ────────────────
async function fetchFromAdsbSource(
  source: typeof ADSB_SOURCES[number],
  tile: [number, number, number],
): Promise<{ flights: Map<string, FlightState>; name: string }> {
  const state = getSourceState(source.name);
  const now = Date.now();
  const result = new Map<string, FlightState>();

  // Skip if in backoff (free APIs need ~10s between requests)
  if (now < state.backoffUntil) {
    return { flights: result, name: source.name };
  }

  // Per-source throttle: 10s between requests (tested empirically)
  const wait = 10_000 - (now - state.lastRequest);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  state.lastRequest = Date.now();

  if (!trackDailyRequest()) return { flights: result, name: source.name };

  const [lat, lon, radius] = tile;

  try {
    const url = source.urlBuilder(lat, lon, radius);

    const headers: HeadersInit = {};
    if (source.name === "airplaneslive" && process.env.AIRPLANES_LIVE_API_KEY) {
      headers["api-auth"] = process.env.AIRPLANES_LIVE_API_KEY;
    }

    const res = await fetch(url, {
      cache: "no-store",
      headers,
      signal: AbortSignal.timeout(10_000),
    });

    if (res.status === 429) {
      state.backoffUntil = Date.now() + 15_000;
      console.warn(`[Flights] ${source.name} rate limited, backing off 15s`);
      return { flights: result, name: source.name };
    }
    if (!res.ok) {
      console.warn(`[Flights] ${source.name} returned ${res.status} for ${url}`);
      return { flights: result, name: source.name };
    }

    const data = await res.json();
    const acList = data?.[source.responseKey];
    if (!Array.isArray(acList)) {
      console.warn(`[Flights] ${source.name} missing "${source.responseKey}" key, got: ${Object.keys(data || {}).join(",")}`);
      return { flights: result, name: source.name };
    }

    for (const ac of acList) {
      const parsed = parseAirplanesLive(ac as Record<string, unknown>);
      if (parsed?.icao24) {
        parsed.dataSource = source.name as FlightState["dataSource"];
        result.set(parsed.icao24, parsed);
      }
    }
  } catch {
    // Timeout or network error
  }

  return { flights: result, name: source.name };
}

/**
 * Fetch from ALL ADS-B networks in parallel and merge by ICAO24.
 * Different networks have different feeders — the union captures
 * small/GA aircraft that only ONE network sees.
 */
async function fetchAllAdsbSources(
  bbox: BoundingBox | null
): Promise<{ merged: FlightState[]; sources: string[] } | null> {
  const tile: [number, number, number] = bbox
    ? computeTile(bbox)
    : GLOBAL_TILES[0];

  // For global (no-bbox) requests (e.g. landing page flight count),
  // only query the primary source — saves rate limit budget.
  // For regional (bbox) requests, query ALL sources in parallel —
  // each makes exactly 1 request with the same center tile.
  // Different feeder networks see different aircraft, so we get
  // the UNION of all three networks.
  const sourcesToQuery = bbox ? ADSB_SOURCES : [ADSB_SOURCES[0]];

  // All sources in parallel — each makes exactly 1 API request
  const results = await Promise.allSettled(
    sourcesToQuery.map((src) => fetchFromAdsbSource(src, tile))
  );

  // Merge all aircraft by ICAO24 — prefer the entry with most data
  const merged = new Map<string, FlightState>();
  const activeSources: string[] = [];

  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    const { flights, name } = result.value;

    if (flights.size > 0) activeSources.push(name);

    for (const [icao, flight] of flights) {
      const existing = merged.get(icao);
      if (!existing) {
        merged.set(icao, flight);
      } else {
        // Keep whichever has more complete data (callsign, altitude, speed)
        const existingScore =
          (existing.callsign ? 1 : 0) +
          (existing.baroAltitude !== null ? 1 : 0) +
          (existing.velocity !== null ? 1 : 0) +
          (existing.registration ? 1 : 0);
        const newScore =
          (flight.callsign ? 1 : 0) +
          (flight.baroAltitude !== null ? 1 : 0) +
          (flight.velocity !== null ? 1 : 0) +
          (flight.registration ? 1 : 0);
        if (newScore > existingScore) {
          merged.set(icao, flight);
        }
      }
    }
  }

  if (merged.size === 0) return null;

  console.log(
    `[Flights] Merged ${merged.size} aircraft from ${activeSources.length} sources: ${activeSources.join(", ")}`
  );

  return { merged: Array.from(merged.values()), sources: activeSources };
}

/**
 * Fetch from OpenSky (fallback).
 */
async function fetchOpenSky(
  bbox: BoundingBox | null
): Promise<FlightState[] | null> {
  const now = Date.now();
  if (now < osRateLimitedUntil) return null;

  const params = new URLSearchParams();
  if (bbox) {
    params.set("lamin", String(bbox.lamin));
    params.set("lomin", String(bbox.lomin));
    params.set("lamax", String(bbox.lamax));
    params.set("lomax", String(bbox.lomax));
  }

  const url = bbox ? `${OPENSKY_URL}?${params.toString()}` : OPENSKY_URL;
  const headers: HeadersInit = {};
  const token = await getAccessToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers,
      signal: AbortSignal.timeout(10000),
    });

    if (response.status === 429) {
      const retryAfterSec = parseInt(
        response.headers.get("x-rate-limit-retry-after-seconds") ?? "0", 10
      );
      osRateLimitedUntil = now + (retryAfterSec > 0 ? retryAfterSec * 1000 : 30_000);
      osQuotaExhausted = retryAfterSec > 3600;
      osRateLimitMessage = retryAfterSec > 3600
        ? `OpenSky quota exhausted. Resets in ~${Math.ceil(retryAfterSec / 3600)}h.`
        : "Rate limited by OpenSky.";
      return null;
    }

    if (!response.ok) return null;
    const data = await response.json();
    if (!data?.states) return null;

    osRateLimitedUntil = 0;
    osQuotaExhausted = false;
    osRateLimitMessage = "";

    return (data.states as unknown[][])
      .map((raw) => {
        const f = parseStateVector(raw);
        if (f) (f as FlightState).dataSource = "opensky";
        return f;
      })
      .filter((f): f is FlightState => f !== null);
  } catch {
    return null;
  }
}

// ── Normalized response ─────────────────────────────────────────────
interface NormalizedResponse {
  flights: FlightState[];
  time: number;
  source: string;
  sources: string[];
  total: number;
  error?: string;
  rateLimited?: boolean;
  retryAfter?: number;
  quotaExhausted?: boolean;
}

// ── Main handler ────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bbox = bboxFromParams(searchParams);

  const cacheKey = bbox
    ? `${bbox.lamin.toFixed(2)},${bbox.lomin.toFixed(2)},${bbox.lamax.toFixed(2)},${bbox.lomax.toFixed(2)}`
    : "__global__";

  const now = Date.now();

  // Return fresh cached data
  const cached = regionCache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(
      {
        flights: cached.flights,
        time: cached.time,
        source: cached.source,
        sources: cached.sources,
        total: cached.flights.length,
      } as NormalizedResponse,
      {
        headers: {
          "X-Data-Source": "cache",
          "X-Data-Sources": cached.sources.join(","),
          "X-Cache-Age": String(now - cached.timestamp),
          "X-Daily-Requests": String(dailyRequestCount),
        },
      }
    );
  }

  // Serve stale helper
  const serveStale = (extra: Record<string, string> = {}) => {
    if (cached && now - cached.timestamp < STALE_TTL) {
      return NextResponse.json(
        {
          flights: cached.flights,
          time: cached.time,
          source: cached.source,
          sources: cached.sources,
          total: cached.flights.length,
        } as NormalizedResponse,
        { headers: { "X-Data-Source": "stale", ...extra } }
      );
    }
    return null;
  };

  // ── Query all ADS-B networks in parallel ──────────────────────────
  const adsbResult = await fetchAllAdsbSources(bbox);

  if (adsbResult && adsbResult.merged.length > 0) {
    const time = Math.floor(now / 1000);
    regionCache.set(cacheKey, {
      flights: adsbResult.merged,
      time,
      source: adsbResult.sources[0] || "multi",
      sources: adsbResult.sources,
      timestamp: now,
    });

    let workerActive = false;
    try {
      const r = getRawRedis();
      if (r && r.status === "ready") {
        const hb = await r.get(KEYS.workerHeartbeat);
        workerActive = !!hb && Date.now() - parseInt(hb, 10) < 60_000;
      }
    } catch { /* Redis not available */ }

    return NextResponse.json(
      {
        flights: adsbResult.merged,
        time,
        source: "multi",
        sources: adsbResult.sources,
        total: adsbResult.merged.length,
      } as NormalizedResponse,
      {
        headers: {
          "X-Data-Source": "multi",
          "X-Data-Sources": adsbResult.sources.join(","),
          "X-Aircraft-Count": String(adsbResult.merged.length),
          "X-Worker-Active": workerActive ? "true" : "false",
        },
      }
    );
  }

  // ── Fall back to OpenSky ──────────────────────────────────────────
  console.log("[Flights] All ADS-B sources failed, falling back to OpenSky");

  if (now < osRateLimitedUntil) {
    const stale = serveStale({ "X-Rate-Limited": "true" });
    if (stale) return stale;

    return NextResponse.json(
      {
        flights: [],
        time: Math.floor(now / 1000),
        source: "opensky",
        sources: [],
        total: 0,
        error: osRateLimitMessage || "Rate limited. Waiting to retry...",
        rateLimited: true,
        quotaExhausted: osQuotaExhausted,
        retryAfter: Math.ceil((osRateLimitedUntil - now) / 1000),
      } as NormalizedResponse,
      { status: 429 }
    );
  }

  const osFlights = await fetchOpenSky(bbox);

  if (osFlights && osFlights.length > 0) {
    const time = Math.floor(now / 1000);
    regionCache.set(cacheKey, {
      flights: osFlights,
      time,
      source: "opensky",
      sources: ["opensky"],
      timestamp: now,
    });

    return NextResponse.json(
      {
        flights: osFlights,
        time,
        source: "opensky",
        sources: ["opensky"],
        total: osFlights.length,
      } as NormalizedResponse,
      { headers: { "X-Data-Source": "opensky" } }
    );
  }

  // All sources failed
  const stale = serveStale();
  if (stale) return stale;

  return NextResponse.json(
    {
      flights: [],
      time: Math.floor(now / 1000),
      source: "none",
      sources: [],
      total: 0,
      error: "Failed to fetch flight data from all sources",
    } as NormalizedResponse,
    { status: 500 }
  );
}
