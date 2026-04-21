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
  source: "airplaneslive" | "opensky" | "secondary";
  timestamp: number; // cache write time (Date.now())
}

const regionCache = new Map<string, CacheEntry>();
// Cache TTL: without an API key, airplanes.live rate-limits at ~1 req/10s
// per IP.  Since Vercel shares IPs across all users, we need longer caches.
// 2-minute fresh cache + 30-minute stale tolerance keeps the site working
// even when airplanes.live blocks us temporarily.
const CACHE_TTL = HAS_API_KEY ? 15_000 : 120_000;
const STALE_TTL = HAS_API_KEY ? 600_000 : 1_800_000;

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
// airplanes.live API cap: 250nm max radius per request
const MAX_TILE_RADIUS = 250;

/**
 * Compute tile centers to cover a bounding box.
 *
 * Key insight: the previous implementation's inner loop broke early,
 * clustering all 6 tiles in the south-west corner of the bbox and
 * leaving the north and east uncovered — which is why only commercial
 * jets around Bangalore/Mumbai/Chennai were visible.
 *
 * We now evenly sample tiles across the whole bbox so every region
 * gets coverage.  Tiles are fired in parallel by fetchAirplanesLive,
 * so the total runs in ~1 API roundtrip regardless of tile count.
 */
function computeTiles(bbox: BoundingBox): [number, number, number][] {
  const centerLat = (bbox.lamin + bbox.lamax) / 2;
  const centerLon = (bbox.lomin + bbox.lomax) / 2;
  const midLatRad = (centerLat * Math.PI) / 180;

  const heightNm = Math.abs(bbox.lamax - bbox.lamin) * 60;
  const widthNm = Math.abs(bbox.lomax - bbox.lomin) * 60 * Math.cos(midLatRad);
  const neededRadius = Math.ceil(
    Math.sqrt((heightNm / 2) ** 2 + (widthNm / 2) ** 2),
  );

  // Small enough for a single tile
  if (neededRadius <= MAX_TILE_RADIUS) {
    return [[centerLat, centerLon, neededRadius]];
  }

  // Large area: lay out a grid with enough tiles that the CORNERS of
  // each grid cell are still inside a tile's 250nm radius.  This was
  // previously broken — our 3x3 grid had 580nm spacing but only 250nm
  // radius, leaving 161nm gaps at cell corners (Bangalore sat in one
  // of those gaps and showed 0 aircraft).
  //
  // Math: for a cell of size (cellLat × cellLon) with the tile at the
  // center, the corner is at distance sqrt((cellLat/2)² + (cellLon/2)²)
  // from the center.  For 250nm radius we need cellSize <= 350nm so
  // corners are covered (350nm × sqrt(2)/2 ≈ 247nm from center).
  const MAX_CELL_SIZE_NM = 350;
  const rows = Math.max(1, Math.ceil(heightNm / MAX_CELL_SIZE_NM));
  const cols = Math.max(1, Math.ceil(widthNm / MAX_CELL_SIZE_NM));

  // Cap to stop pathological cases (don't fire 100s of tiles)
  const safeRows = Math.min(rows, 6);
  const safeCols = Math.min(cols, 6);

  const latStep = (bbox.lamax - bbox.lamin) / safeRows;
  const lonStep = (bbox.lomax - bbox.lomin) / safeCols;

  const tiles: [number, number, number][] = [];
  for (let r = 0; r < safeRows; r++) {
    for (let c = 0; c < safeCols; c++) {
      const lat = bbox.lamin + latStep * (r + 0.5);
      const lon = bbox.lomin + lonStep * (c + 0.5);
      tiles.push([lat, lon, MAX_TILE_RADIUS]);
    }
  }

  return tiles.length > 0 ? tiles : [[centerLat, centerLon, MAX_TILE_RADIUS]];
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
    const apiKey = process.env.AIRPLANES_LIVE_API_KEY;
    const headers: HeadersInit = {};
    if (apiKey) headers["api-auth"] = apiKey;

    // Fire ALL tiles in parallel. Rate-limited tiles (429) return 0
    // aircraft — that's fine, the other tiles still give partial coverage
    // covering the REST of the bbox.  Previously sequential+break-on-429
    // meant a single early 429 killed all subsequent tiles.
    const results = await Promise.allSettled(
      tiles.map(async ([lat, lon, radius]) => {
        const url = `${AIRPLANES_LIVE_URL}/point/${lat.toFixed(4)}/${lon.toFixed(4)}/${radius}`;
        const res = await fetch(url, {
          cache: "no-store",
          headers,
          signal: AbortSignal.timeout(8000),
        });
        if (res.status === 429) return { aircraft: [], limited: true };
        if (!res.ok) return { aircraft: [], limited: false };
        const data = await res.json();
        return {
          aircraft: Array.isArray(data?.ac) ? data.ac : [],
          limited: false,
        };
      }),
    );

    const allAircraft = new Map<string, FlightState>();
    let limitedCount = 0;
    let successCount = 0;

    for (const r of results) {
      if (r.status !== "fulfilled") continue;
      if (r.value.limited) {
        limitedCount++;
        continue;
      }
      successCount++;
      for (const ac of r.value.aircraft) {
        const parsed = parseAirplanesLive(ac as Record<string, unknown>);
        if (parsed?.icao24) {
          allAircraft.set(parsed.icao24, parsed);
        }
      }
    }

    // Only trigger global backoff if ALL tiles rate-limited — with a
    // 25-tile grid, it's normal for some tiles to 429 while others
    // succeed. Only block further requests if literally nothing worked.
    if (limitedCount >= tiles.length && successCount === 0) {
      airplanesLiveRateLimitedUntil = Date.now() + 15_000;
    }

    console.log(
      `[Flights] airplanes.live: ${allAircraft.size} aircraft from ` +
        `${successCount}/${tiles.length} tiles (${limitedCount} rate-limited)`,
    );

    if (allAircraft.size === 0) return null;
    return Array.from(allAircraft.values());
  } catch (err) {
    console.error("[Flights] airplanes.live fetch failed:", err);
    return null;
  }
}

/**
 * Query secondary ADS-B networks (adsb.fi, ADSB One) for any aircraft
 * airplanes.live didn't see. Each secondary gets ONE request at the
 * bbox center — keeps total API calls minimal but catches aircraft
 * on feeders that only one network has.
 *
 * Returns a Map of icao24 → FlightState. Caller merges into the
 * primary result set, keeping airplanes.live data for duplicates.
 */
async function fetchSecondarySources(
  bbox: BoundingBox | null,
): Promise<Map<string, FlightState>> {
  if (!bbox) return new Map(); // skip for global requests

  const tiles = computeTiles(bbox);
  // Give each secondary source the 4 tiles surrounding the bbox center.
  // Different feeder networks catch different aircraft, so each tile
  // lookup on each network contributes unique aircraft.
  // Secondary sources have their own rate limits (independent of
  // airplanes.live), so we can fire these in parallel without conflict.
  const centerIdx = Math.floor(tiles.length / 2);
  const offsets = [0, 1, -1, 2].map((o) => centerIdx + o).filter((i) => i >= 0 && i < tiles.length);
  const secondaryTiles = offsets.map((i) => tiles[i]).slice(0, 4);

  type Source = {
    name: "adsbfi" | "adsbone";
    urlFor: (lat: number, lon: number, radius: number) => string;
    responseKey: "aircraft" | "ac";
  };

  const sources: Source[] = [
    {
      name: "adsbfi",
      urlFor: (lat, lon, radius) =>
        `https://opendata.adsb.fi/api/v2/lat/${Math.round(lat)}/lon/${Math.round(lon)}/dist/${radius}`,
      responseKey: "aircraft",
    },
    {
      name: "adsbone",
      urlFor: (lat, lon, radius) =>
        `https://api.adsb.one/v2/point/${lat.toFixed(4)}/${lon.toFixed(4)}/${radius}`,
      responseKey: "ac",
    },
  ];

  // Build a request matrix: each source × each tile
  const allRequests = sources.flatMap((s) =>
    secondaryTiles.map((tile) => ({ source: s, tile })),
  );

  const results = await Promise.allSettled(
    allRequests.map(async ({ source, tile }) => {
      const [lat, lon, radius] = tile;
      try {
        const res = await fetch(source.urlFor(lat, lon, radius), {
          cache: "no-store",
          signal: AbortSignal.timeout(6000),
        });
        if (!res.ok) return { name: source.name, aircraft: [] };
        const data = await res.json();
        const ac = Array.isArray(data?.[source.responseKey])
          ? data[source.responseKey]
          : [];
        return { name: source.name, aircraft: ac };
      } catch {
        return { name: source.name, aircraft: [] };
      }
    }),
  );

  const extras = new Map<string, FlightState>();
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const ac of r.value.aircraft) {
      const parsed = parseAirplanesLive(ac as Record<string, unknown>);
      if (parsed?.icao24 && !extras.has(parsed.icao24)) {
        extras.set(parsed.icao24, parsed);
      }
    }
  }

  return extras;
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
  source: "airplaneslive" | "opensky" | "secondary";
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

  // Helper to build stale response.
  // Tries exact-key match first, then falls back to any cached entry that
  // geographically covers the requested bbox — a point query at Bangalore
  // can reuse cached data from a wider India bbox query, keeping the UI
  // populated even when airplanes.live rate-limits us.
  const serveStale = (extraHeaders: Record<string, string> = {}) => {
    let source: CacheEntry | null = null;
    let filtered: FlightState[] | null = null;

    if (cached && now - cached.timestamp < STALE_TTL) {
      source = cached;
    } else if (bbox) {
      // Scan all cached entries for one that covers our bbox and filter it
      let best: { entry: CacheEntry; age: number } | null = null;
      for (const [, entry] of regionCache) {
        const age = now - entry.timestamp;
        if (age >= STALE_TTL) continue;
        if (best && age >= best.age) continue;
        best = { entry, age };
      }
      if (best) {
        source = best.entry;
        filtered = best.entry.flights.filter(
          (f) =>
            f.latitude !== null &&
            f.longitude !== null &&
            f.latitude >= bbox.lamin &&
            f.latitude <= bbox.lamax &&
            f.longitude >= bbox.lomin &&
            f.longitude <= bbox.lomax,
        );
      }
    }

    if (source) {
      const flights = filtered ?? source.flights;
      if (flights.length === 0) return null;
      const resp: NormalizedResponse = {
        flights,
        time: source.time,
        source: source.source,
        total: flights.length,
      };
      return NextResponse.json(resp, {
        headers: {
          "X-Data-Source": "stale",
          "X-Cache-Age": String(now - source.timestamp),
          "X-Cache-Filtered": filtered ? "true" : "false",
          ...extraHeaders,
        },
      });
    }
    return null;
  };

  // ── Primary + secondary sources in parallel ───────────────────────
  // airplanes.live (primary) gets the full tiled query for bbox coverage.
  // adsb.fi + ADSB One (secondaries) each get a single center-tile query
  // and contribute any aircraft airplanes.live didn't see. Different
  // feeder networks catch different aircraft — merging the union closes
  // gaps especially for regional traffic.
  const [alFlights, secondaryExtras] = await Promise.all([
    fetchAirplanesLive(bbox),
    fetchSecondarySources(bbox),
  ]);

  if (alFlights && alFlights.length > 0) {
    // Merge secondary-only aircraft into the primary result set.
    // Primary wins on duplicates (airplanes.live generally has richer
    // data fields like registration, type, callsign).
    let secondaryAdded = 0;
    if (secondaryExtras.size > 0) {
      const seen = new Set(alFlights.map((f) => f.icao24));
      for (const [icao, flight] of secondaryExtras) {
        if (!seen.has(icao)) {
          alFlights.push(flight);
          secondaryAdded++;
        }
      }
      if (secondaryAdded > 0) {
        console.log(`[Flights] +${secondaryAdded} unique aircraft from secondary sources`);
      }
    }

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
        "X-Secondary-Added": String(secondaryAdded),
        "X-Aircraft-Count": String(alFlights.length),
        "X-Worker-Active": workerActive ? "true" : "false",
      },
    });
  }

  // ── If airplanes.live failed but secondaries returned data, use them ─
  if (secondaryExtras.size > 0) {
    const flights = Array.from(secondaryExtras.values());
    const time = Math.floor(now / 1000);
    regionCache.set(cacheKey, {
      flights,
      time,
      source: "secondary",
      timestamp: now,
    });
    return NextResponse.json(
      {
        flights,
        time,
        source: "secondary" as const,
        total: flights.length,
      },
      {
        headers: {
          "X-Data-Source": "secondary",
          "X-Aircraft-Count": String(flights.length),
        },
      },
    );
  }

  // ── Fall back to OpenSky ──────────────────────────────────────────
  // Before hitting OpenSky (which has tight quotas), try to serve stale
  // cached data.  When airplanes.live is rate-limiting us, stale data
  // from 30 seconds ago is much better than 0 aircraft.
  const preOpenSkyStale = serveStale({ "X-Stale-Reason": "airplaneslive-failed" });
  if (preOpenSkyStale) return preOpenSkyStale;

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
