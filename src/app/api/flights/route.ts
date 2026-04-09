import { NextRequest, NextResponse } from "next/server";
import { getRawRedis, KEYS } from "@/lib/redis";
import { parseAirplanesLive, AIRPLANES_LIVE_URL } from "@/lib/airplaneslive";
import { parseStateVector } from "@/lib/opensky";
import type { FlightState, BoundingBox } from "@/types/flight";

// ── Data source constants ────────────────────────────────────────────
const OPENSKY_URL = "https://opensky-network.org/api/states/all";
const TOKEN_URL =
  "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token";

// ── Strategic center points for global coverage via airplanes.live ───
// Each entry: [lat, lon, radius_nm]
const GLOBAL_TILES: [number, number, number][] = [
  [39, -98, 250],   // US central
  [50, 10, 250],    // Europe central
  [35, 105, 250],   // East Asia
  [25, 55, 250],    // Middle East
];

// ── OAuth2 Token Manager (OpenSky) ──────────────────────────────────
let accessToken: string | null = null;
let tokenExpiresAt = 0;
const TOKEN_REFRESH_MARGIN = 30_000;

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.OPENSKY_CLIENT_ID;
  const clientSecret = process.env.OPENSKY_CLIENT_SECRET;

  if (!clientId || !clientSecret) return null;

  const now = Date.now();
  if (accessToken && now < tokenExpiresAt - TOKEN_REFRESH_MARGIN) {
    return accessToken;
  }

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

    if (!res.ok) {
      console.error("OpenSky token error:", res.status, await res.text());
      accessToken = null;
      return null;
    }

    const data = await res.json();
    accessToken = data.access_token;
    tokenExpiresAt = now + (data.expires_in ?? 1800) * 1000;
    return accessToken;
  } catch (err) {
    console.error("OpenSky token fetch failed:", err);
    accessToken = null;
    return null;
  }
}

// ── API key detection ───────────────────────────────────────────────
const HAS_API_KEY = !!process.env.AIRPLANES_LIVE_API_KEY;

// ── Cache layer ─────────────────────────────────────────────────────
interface CacheEntry {
  flights: FlightState[];
  time: number;
  source: "airplaneslive" | "opensky";
  timestamp: number; // cache write time (Date.now())
}

const regionCache = new Map<string, CacheEntry>();
const CACHE_TTL = HAS_API_KEY ? 15_000 : 60_000; // 15s with key, 60s without
const STALE_TTL = 600_000; // 10min — serve stale data rather than burn quota

// ── Daily request counter (resets at midnight UTC) ──────────────────
let dailyRequestCount = 0;
let dailyCounterResetDate = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
// With API key: 8,640/day. Without: 500/day.
// We use smaller tiles for better GA coverage, so need more headroom.
const DAILY_WARN_THRESHOLD = HAS_API_KEY ? 7_000 : 400;
const DAILY_HARD_LIMIT = HAS_API_KEY ? 8_000 : 480;

function trackDailyRequest(): boolean {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== dailyCounterResetDate) {
    dailyRequestCount = 0;
    dailyCounterResetDate = today;
    console.log("[Flights] Daily request counter reset for", today);
  }
  dailyRequestCount++;
  if (dailyRequestCount >= DAILY_HARD_LIMIT) {
    console.warn(
      `[Flights] Daily request limit approaching! ${dailyRequestCount}/${DAILY_HARD_LIMIT} — blocking further upstream requests`
    );
    return false; // do not allow this request
  }
  if (dailyRequestCount >= DAILY_WARN_THRESHOLD) {
    console.warn(
      `[Flights] Daily requests: ${dailyRequestCount} — approaching limit`
    );
  }
  return true; // request allowed
}

// ── Airplanes.live rate limiter ──────────────────────────────────────
let lastAirplanesLiveRequest = 0;
const AIRPLANES_LIVE_MIN_INTERVAL = HAS_API_KEY ? 3_000 : 10_000; // 3s with key, 10s without
let airplanesLiveRateLimitedUntil = 0;

async function throttledFetch(url: string): Promise<Response> {
  const now = Date.now();
  const wait = AIRPLANES_LIVE_MIN_INTERVAL - (now - lastAirplanesLiveRequest);
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  lastAirplanesLiveRequest = Date.now();

  const headers: HeadersInit = {};
  const apiKey = process.env.AIRPLANES_LIVE_API_KEY;
  if (apiKey) {
    headers["api-auth"] = apiKey;
  }

  return fetch(url, { cache: "no-store", headers });
}

// ── OpenSky rate limit tracking ─────────────────────────────────────
let rateLimitedUntil = 0;
let quotaExhausted = false;
let rateLimitMessage = "";
const RATE_LIMIT_BACKOFF = 30_000;

// ── Helpers ─────────────────────────────────────────────────────────

function bboxFromParams(searchParams: URLSearchParams): BoundingBox | null {
  // Support lat/lon/radius params (used by AirportRadarMode etc.)
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  const radius = searchParams.get("radius");
  if (lat && lon && radius) {
    const latF = parseFloat(lat);
    const lonF = parseFloat(lon);
    const radiusNm = parseFloat(radius);
    // Convert radius in NM to approximate degrees
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

/**
 * Compute tile centers needed to cover a bounding box.
 *
 * IMPORTANT: Using smaller tiles (~250nm max) returns MORE aircraft.
 * The airplanes.live API caps results per request, so a single 500nm+
 * request misses small/GA aircraft. Breaking into smaller tiles ensures
 * we get complete data including training aircraft, Cessnas, etc.
 *
 * Returns array of [lat, lon, radius_nm].
 */
const MAX_TILE_RADIUS = 250; // sweet spot: complete results without too many requests

function computeTiles(bbox: BoundingBox): [number, number, number][] {
  const centerLat = (bbox.lamin + bbox.lamax) / 2;
  const centerLon = (bbox.lomin + bbox.lomax) / 2;
  const midLatRad = (centerLat * Math.PI) / 180;

  // Approximate bbox dimensions in NM
  const heightNm = Math.abs(bbox.lamax - bbox.lamin) * 60;
  const widthNm =
    Math.abs(bbox.lomax - bbox.lomin) * 60 * Math.cos(midLatRad);

  // Radius needed to cover the bbox from its center
  const neededRadius = Math.ceil(
    Math.sqrt((heightNm / 2) ** 2 + (widthNm / 2) ** 2)
  );

  // Small enough for a single request — return as-is
  if (neededRadius <= MAX_TILE_RADIUS) {
    return [[centerLat, centerLon, neededRadius]];
  }

  // Large area: split into a grid of smaller tiles for complete coverage
  // Each tile covers ~250nm radius, overlap ensures no gaps
  const tileSpacingNm = MAX_TILE_RADIUS * 1.5; // 1.5x radius = overlap
  const tileSpacingLat = tileSpacingNm / 60;
  const tileSpacingLon = tileSpacingNm / (60 * Math.cos(midLatRad));

  const tiles: [number, number, number][] = [];
  const maxTiles = 6; // cap to avoid rate limiting (each tile = 1 API call)

  for (let lat = bbox.lamin + tileSpacingLat / 2; lat < bbox.lamax; lat += tileSpacingLat) {
    for (let lon = bbox.lomin + tileSpacingLon / 2; lon < bbox.lomax; lon += tileSpacingLon) {
      tiles.push([lat, lon, MAX_TILE_RADIUS]);
      if (tiles.length >= maxTiles) break;
    }
    if (tiles.length >= maxTiles) break;
  }

  // If grid produced no tiles (shouldn't happen), fallback to center
  if (tiles.length === 0) {
    return [[centerLat, centerLon, MAX_TILE_RADIUS]];
  }

  return tiles;
}

/**
 * Fetch from airplanes.live using tile strategy.
 * Returns parsed FlightState array or null on failure.
 */
async function fetchAirplanesLive(
  bbox: BoundingBox | null
): Promise<FlightState[] | null> {
  // Skip if we're in a rate-limit backoff
  if (Date.now() < airplanesLiveRateLimitedUntil) return null;

  // Check daily quota before making upstream requests
  if (!trackDailyRequest()) return null;

  const tiles = bbox ? computeTiles(bbox) : GLOBAL_TILES;

  try {
    const allAircraft = new Map<string, FlightState>();

    // Fetch tiles sequentially with throttle to avoid rate limits
    for (const [lat, lon, radius] of tiles) {
      const url = `${AIRPLANES_LIVE_URL}/point/${lat.toFixed(4)}/${lon.toFixed(4)}/${radius}`;
      const res = await throttledFetch(url);

      if (res.status === 429) {
        // Back off for 60s on rate limit — stop fetching more tiles
        airplanesLiveRateLimitedUntil = Date.now() + 60_000;
        console.warn("[Flights] airplanes.live rate limited, backing off 60s");
        break;
      }
      if (!res.ok) {
        console.warn(`[Flights] airplanes.live tile error: ${res.status}`);
        continue;
      }

      const data = await res.json();
      const acList = data?.ac;
      if (!Array.isArray(acList)) continue;

      for (const ac of acList) {
        const parsed = parseAirplanesLive(ac as Record<string, unknown>);
        if (parsed && parsed.icao24) {
          allAircraft.set(parsed.icao24, parsed);
        }
      }
    }

    if (allAircraft.size === 0) return null;
    return Array.from(allAircraft.values());
  } catch (err) {
    console.error("[Flights] airplanes.live fetch failed:", err);
    return null;
  }
}

/**
 * Fetch from OpenSky (existing logic preserved).
 * Returns parsed FlightState array or null on failure.
 */
async function fetchOpenSky(
  bbox: BoundingBox | null
): Promise<{ flights: FlightState[]; rawData: unknown } | null> {
  const now = Date.now();

  // Respect rate limit backoff
  if (now < rateLimitedUntil) {
    return null;
  }

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
  const hasAuth = !!token;
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, { cache: "no-store", headers });

    if (response.status === 429) {
      const retryAfterSec = parseInt(
        response.headers.get("x-rate-limit-retry-after-seconds") ?? "0",
        10
      );
      const backoffMs =
        retryAfterSec > 0
          ? Math.min(retryAfterSec * 1000, 86_400_000)
          : RATE_LIMIT_BACKOFF;
      rateLimitedUntil = now + backoffMs;

      const retryHours =
        retryAfterSec > 3600 ? Math.ceil(retryAfterSec / 3600) : null;

      quotaExhausted = retryAfterSec > 3600;
      rateLimitMessage = retryHours
        ? `Daily API quota exhausted. Resets in ~${retryHours}h.${!hasAuth ? " Add OpenSky credentials for 10x higher limits." : ""}`
        : `Rate limited by OpenSky API.${!hasAuth ? " Create a free account for higher limits." : ""}`;

      return null;
    }

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data?.states) return null;

    // Reset rate limit state on success
    rateLimitedUntil = 0;
    quotaExhausted = false;
    rateLimitMessage = "";

    const flights = (data.states as unknown[][])
      .map((raw) => {
        const f = parseStateVector(raw);
        if (f) (f as FlightState).dataSource = "opensky";
        return f;
      })
      .filter((f): f is FlightState => f !== null);

    return { flights, rawData: data };
  } catch (err) {
    console.error("[Flights] OpenSky fetch failed:", err);
    return null;
  }
}

// ── Normalized response format ──────────────────────────────────────
interface NormalizedResponse {
  flights: FlightState[];
  time: number;
  source: "airplaneslive" | "opensky";
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
    ? `${bbox.lamin},${bbox.lomin},${bbox.lamax},${bbox.lomax}`
    : "__global__";

  const now = Date.now();

  // Return fresh cached data if available
  const cached = regionCache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_TTL) {
    const resp: NormalizedResponse = {
      flights: cached.flights,
      time: cached.time,
      source: cached.source,
      total: cached.flights.length,
    };
    const remainingTtl = Math.max(0, CACHE_TTL - (now - cached.timestamp));
    return NextResponse.json(resp, {
      headers: {
        "X-Data-Source": "cache",
        "X-Cache-Age": String(now - cached.timestamp),
        "X-Cache-TTL": String(remainingTtl),
        "X-Daily-Requests": String(dailyRequestCount),
      },
    });
  }

  // Helper to build stale response
  const serveStale = (extraHeaders: Record<string, string> = {}) => {
    if (cached && now - cached.timestamp < STALE_TTL) {
      const resp: NormalizedResponse = {
        flights: cached.flights,
        time: cached.time,
        source: cached.source,
        total: cached.flights.length,
      };
      return NextResponse.json(resp, {
        headers: {
          "X-Data-Source": "stale",
          "X-Cache-Age": String(now - cached.timestamp),
          ...extraHeaders,
        },
      });
    }
    return null;
  };

  // ── Try airplanes.live first (primary) ────────────────────────────
  const alFlights = await fetchAirplanesLive(bbox);

  if (alFlights && alFlights.length > 0) {
    const time = Math.floor(now / 1000);
    regionCache.set(cacheKey, {
      flights: alFlights,
      time,
      source: "airplaneslive",
      timestamp: now,
    });

    // Check if worker is active
    let workerActive = false;
    try {
      const r = getRawRedis();
      if (r && r.status === "ready") {
        const hb = await r.get(KEYS.workerHeartbeat);
        workerActive = !!hb && Date.now() - parseInt(hb, 10) < 60_000;
      }
    } catch {
      // Redis not available
    }

    const resp: NormalizedResponse = {
      flights: alFlights,
      time,
      source: "airplaneslive",
      total: alFlights.length,
    };

    return NextResponse.json(resp, {
      headers: {
        "X-Data-Source": "airplaneslive",
        "X-Worker-Active": workerActive ? "true" : "false",
      },
    });
  }

  // ── Fall back to OpenSky ──────────────────────────────────────────
  console.log(
    "[Flights] airplanes.live returned empty/failed, falling back to OpenSky"
  );

  // Check if we're in rate-limit backoff for OpenSky
  if (now < rateLimitedUntil) {
    const stale = serveStale({
      "X-Rate-Limited": "true",
      "X-Quota-Exhausted": quotaExhausted ? "true" : "false",
      "X-Rate-Limit-Message": rateLimitMessage || "",
    });
    if (stale) return stale;

    return NextResponse.json(
      {
        flights: [],
        time: Math.floor(now / 1000),
        source: "opensky" as const,
        total: 0,
        error:
          rateLimitMessage || "Rate limited by OpenSky. Waiting to retry...",
        rateLimited: true,
        quotaExhausted,
        retryAfter: Math.ceil((rateLimitedUntil - now) / 1000),
      },
      { status: 429, headers: { "X-Rate-Limited": "true" } }
    );
  }

  const osResult = await fetchOpenSky(bbox);

  if (osResult && osResult.flights.length > 0) {
    const time = Math.floor(now / 1000);
    regionCache.set(cacheKey, {
      flights: osResult.flights,
      time,
      source: "opensky",
      timestamp: now,
    });

    let workerActive = false;
    try {
      const r = getRawRedis();
      if (r && r.status === "ready") {
        const hb = await r.get(KEYS.workerHeartbeat);
        workerActive = !!hb && Date.now() - parseInt(hb, 10) < 60_000;
      }
    } catch {
      // Redis not available
    }

    const resp: NormalizedResponse = {
      flights: osResult.flights,
      time,
      source: "opensky",
      total: osResult.flights.length,
    };

    return NextResponse.json(resp, {
      headers: {
        "X-Data-Source": "opensky",
        "X-Worker-Active": workerActive ? "true" : "false",
      },
    });
  }

  // Both sources failed — serve stale or error
  const stale = serveStale();
  if (stale) return stale;

  return NextResponse.json(
    {
      flights: [],
      time: Math.floor(now / 1000),
      source: "opensky" as const,
      total: 0,
      error: "Failed to fetch flight data from all sources",
    },
    { status: 500 }
  );
}
